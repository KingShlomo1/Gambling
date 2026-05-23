export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT: string;
  ALPACA_BASE_URL: string;
  ALPACA_DATA_URL: string;
  MAX_WATCHLIST_SIZE: string;
  ALPACA_API_KEY: string;
  ALPACA_API_SECRET: string;
  ANTHROPIC_API_KEY: string;
}
