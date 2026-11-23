/**
 * Cloudflare Access JWT（Cf-Access-Jwt-Assertion）の検証。
 * ヘッダー値は無条件に信用せず、署名・aud・有効期限を確認する。
 */

export interface CloudflareAccessJwtConfig {
  teamDomain: string;
  audience: string;
  /** 追加防御（任意）。未設定時は Access ポリシー側の許可に委ねる */
  allowedEmails?: string[];
  fetchImpl?: typeof fetch;
}

export interface AccessJwtPayload {
  aud?: string[] | string;
  iss?: string;
  email?: string;
  sub?: string;
  exp?: number;
  iat?: number;
}

export function expectedAccessIssuer(teamDomain: string): string {
  return `https://${teamDomain}.cloudflareaccess.com`;
}

export function issuerMatches(payload: AccessJwtPayload, teamDomain: string): boolean {
  if (!payload.iss) {
    return false;
  }

  return payload.iss === expectedAccessIssuer(teamDomain);
}

export function emailAllowed(
  payload: AccessJwtPayload,
  allowlist: string[] | undefined,
): boolean {
  if (!allowlist || allowlist.length === 0) {
    return true;
  }

  const email = payload.email?.trim().toLowerCase();
  if (!email) {
    return false;
  }

  return allowlist.some((entry) => entry.trim().toLowerCase() === email);
}

export interface AccessJwtVerifyResult {
  ok: boolean;
  email?: string;
  sub?: string;
  reason?: string;
}

function decodeBase64UrlJson(segment: string): unknown {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLen);
  const json = Buffer.from(base64, "base64").toString("utf8");
  return JSON.parse(json) as unknown;
}

export function audienceMatches(payload: AccessJwtPayload, audience: string): boolean {
  if (!payload.aud) {
    return false;
  }

  if (Array.isArray(payload.aud)) {
    return payload.aud.includes(audience);
  }

  return payload.aud === audience;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  const binary = Buffer.from(b64, "base64");
  return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
}

async function importCertPublicKey(certPem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(certPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

async function fetchAccessPublicKey(
  config: CloudflareAccessJwtConfig,
  kid: string,
): Promise<CryptoKey | null> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const url = `https://${config.teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;

  const response = await fetchImpl(url, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    public_certs?: { kid: string; cert: string }[];
    public_cert?: { kid: string; cert: string };
  };

  const certs = data.public_certs ?? (data.public_cert ? [data.public_cert] : []);
  const match = certs.find((entry) => entry.kid === kid);

  if (!match?.cert) {
    return null;
  }

  return importCertPublicKey(match.cert);
}

function signatureBase(token: string): string {
  const parts = token.split(".");
  return `${parts[0]}.${parts[1]}`;
}

function signatureBytes(token: string): Uint8Array<ArrayBuffer> {
  const part = token.split(".")[2] ?? "";
  const padded = part.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLen);
  const buf = Buffer.from(base64, "base64");
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  return copy;
}

export async function verifyCloudflareAccessJwt(
  token: string | null | undefined,
  config: CloudflareAccessJwtConfig,
): Promise<AccessJwtVerifyResult> {
  if (!token || token.trim() === "") {
    return { ok: false, reason: "missing_token" };
  }

  if (!config.teamDomain || !config.audience) {
    return { ok: false, reason: "auth_not_configured" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, reason: "malformed_jwt" };
  }

  let header: { alg?: string; kid?: string };
  let payload: AccessJwtPayload;

  try {
    header = decodeBase64UrlJson(parts[0]) as { alg?: string; kid?: string };
    payload = decodeBase64UrlJson(parts[1]) as AccessJwtPayload;
  } catch {
    return { ok: false, reason: "decode_failed" };
  }

  if (header.alg !== "RS256" || !header.kid) {
    return { ok: false, reason: "unsupported_alg" };
  }

  if (!audienceMatches(payload, config.audience)) {
    return { ok: false, reason: "audience_mismatch" };
  }

  if (!issuerMatches(payload, config.teamDomain)) {
    return { ok: false, reason: "issuer_mismatch" };
  }

  if (!emailAllowed(payload, config.allowedEmails)) {
    return { ok: false, reason: "email_not_allowed" };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < nowSec) {
    return { ok: false, reason: "expired" };
  }

  try {
    const key = await fetchAccessPublicKey(config, header.kid);
    if (!key) {
      return { ok: false, reason: "cert_not_found" };
    }

    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signatureBytes(token),
      new TextEncoder().encode(signatureBase(token)),
    );

    if (!valid) {
      return { ok: false, reason: "invalid_signature" };
    }

    return {
      ok: true,
      email: payload.email,
      sub: payload.sub,
    };
  } catch {
    return { ok: false, reason: "verify_failed" };
  }
}

export function readAccessJwtFromRequest(request: Request): string | null {
  const direct = request.headers.get("Cf-Access-Jwt-Assertion");
  if (direct) {
    return direct;
  }

  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/CF_Authorization=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function loadAccessConfigFromEnv(): CloudflareAccessJwtConfig | null {
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN?.trim() ?? "";
  const audience = process.env.CF_ACCESS_AUD?.trim() ?? "";
  const allowedRaw = process.env.CF_ACCESS_ALLOWED_EMAILS?.trim() ?? "";

  if (!teamDomain || !audience) {
    return null;
  }

  const allowedEmails = allowedRaw
    ? allowedRaw.split(",").map((entry) => entry.trim()).filter(Boolean)
    : undefined;

  return { teamDomain, audience, allowedEmails };
}