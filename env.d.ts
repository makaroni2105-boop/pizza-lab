/**
 * Pizza Lab Worker / Next サーバー用環境変数（シークレット名のみ — 値は含めない）。
 */

declare namespace NodeJS {
  interface ProcessEnv {
    OPENWEATHER_API_KEY?: string;
    CF_ACCESS_TEAM_DOMAIN?: string;
    CF_ACCESS_AUD?: string;
    CF_ACCESS_ALLOWED_EMAILS?: string;
    PIZZA_LAB_DEV_SKIP_ACCESS_AUTH?: string;
    PIZZA_LAB_ALLOW_MEMORY_PERSISTENCE?: string;
  }
}

export {};