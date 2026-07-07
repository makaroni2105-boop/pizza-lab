import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext for Cloudflare — Pizza-Lab staging / deploy 設定。
 * R2 incremental cache は Phase 6 では未設定（最小構成）。
 * NALIPO リソース・binding は含めない。
 */
export default defineCloudflareConfig();
