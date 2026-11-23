import { describe, expect, it } from "vitest";

import {
  audienceMatches,
  emailAllowed,
  expectedAccessIssuer,
  issuerMatches,
  verifyCloudflareAccessJwt,
  type AccessJwtPayload,
} from "@/lib/auth/cloudflare-access-jwt";

function b64Json(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fakeJwt(header: object, payload: object): string {
  return `${b64Json(header)}.${b64Json(payload)}.signature`;
}

describe("cloudflare-access-jwt", () => {
  const team = "nalipo";
  const audience = "pizza-lab-staging-aud";

  it("checks audience and issuer", () => {
    const payload: AccessJwtPayload = {
      aud: audience,
      iss: expectedAccessIssuer(team),
      email: "owner@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    expect(audienceMatches(payload, audience)).toBe(true);
    expect(audienceMatches(payload, "other-app-aud")).toBe(false);
    expect(issuerMatches(payload, team)).toBe(true);
    expect(issuerMatches(payload, "wrong-team")).toBe(false);
  });

  it("enforces optional email allowlist", () => {
    const payload: AccessJwtPayload = {
      email: "Owner@Example.com",
    };

    expect(emailAllowed(payload, ["owner@example.com"])).toBe(true);
    expect(emailAllowed(payload, ["other@example.com"])).toBe(false);
    expect(emailAllowed(payload, undefined)).toBe(true);
  });

  it("rejects wrong audience before network", async () => {
    const token = fakeJwt(
      { alg: "RS256", kid: "kid-1" },
      {
        aud: "nalipo-reservation-other",
        iss: expectedAccessIssuer(team),
        exp: Math.floor(Date.now() / 1000) + 60,
      },
    );

    const result = await verifyCloudflareAccessJwt(token, {
      teamDomain: team,
      audience,
      fetchImpl: async () => {
        throw new Error("should not fetch");
      },
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("audience_mismatch");
  });

  it("rejects expired token", async () => {
    const token = fakeJwt(
      { alg: "RS256", kid: "kid-1" },
      {
        aud: audience,
        iss: expectedAccessIssuer(team),
        exp: Math.floor(Date.now() / 1000) - 60,
      },
    );

    const result = await verifyCloudflareAccessJwt(token, {
      teamDomain: team,
      audience,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("expired");
  });
});