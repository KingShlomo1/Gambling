import type { Env } from '../env';

export interface Portfolio {
  id: number;
  initial_capital: number;
  current_value: number;
  target_value: number;
  cash_available: number;
  mode: string;
  risk_level: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  avg_entry_price: number;
  current_price: number | null;
  unrealized_pnl: number | null;
  market_value: number | null;
  side?: string;
}

export interface Trade {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number | null;
  exit_price: number | null;
  status: string;
  strategy: string;
  signal_data: string | null;
  realized_pnl: number | null;
  mode: string;
  opened_at: string;
  closed_at: string | null;
}

export async function getPortfolio(env: Env): Promise<Portfolio> {
  const row = await env.DB.prepare('SELECT * FROM portfolio WHERE id = 1').first<Portfolio>();
  if (!row) throw new Error('Portfolio not found');
  return row;
}

export async function updatePortfolio(env: Env, updates: Partial<Portfolio>): Promise<void> {
  const fields = Object.entries(updates)
    .filter(([k]) => k !== 'id')
    .map(([k]) => `${k} = ?`).join(', ');
  const values = Object.entries(updates)
    .filter(([k]) => k !== 'id')
    .map(([, v]) => v);
  values.push(new Date().toISOString(), 1);
  await env.DB.prepare(`UPDATE portfolio SET ${fields}, updated_at = ? WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function getSetting(env: Env, key: string): Promise<string | null> {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

export async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(key, value).run();
}

export async function getAllSettings(env: Env): Promise<Record<string, string>> {
  const rows = await env.DB.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  return Object.fromEntries((rows.results ?? []).map(r => [r.key, r.value]));
}

export async function getPositions(env: Env): Promise<Position[]> {
  const rows = await env.DB.prepare('SELECT * FROM positions WHERE portfolio_id = 1').all<Position>();
  return rows.results ?? [];
}

export async function upsertPosition(env: Env, pos: Omit<Position, 'id'>): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO positions (portfolio_id, symbol, quantity, avg_entry_price, current_price, unrealized_pnl, market_value, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(symbol) DO UPDATE SET
       quantity = excluded.quantity,
       avg_entry_price = excluded.avg_entry_price,
       current_price = excluded.current_price,
       unrealized_pnl = excluded.unrealized_pnl,
       market_value = excluded.market_value,
       updated_at = excluded.updated_at`
  ).bind(pos.symbol, pos.quantity, pos.avg_entry_price, pos.current_price, pos.unrealized_pnl, pos.market_value).run();
}

export async function deletePosition(env: Env, symbol: string): Promise<void> {
  await env.DB.prepare('DELETE FROM positions WHERE symbol = ?').bind(symbol).run();
}

export async function insertTrade(env: Env, trade: {
  alpaca_order_id?: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price?: number;
  status: string;
  strategy: string;
  signal_data?: unknown;
  mode: string;
}): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO trades (alpaca_order_id, symbol, side, quantity, entry_price, status, strategy, signal_data, mode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    trade.alpaca_order_id ?? null,
    trade.symbol,
    trade.side,
    trade.quantity,
    trade.entry_price ?? null,
    trade.status,
    trade.strategy,
    trade.signal_data ? JSON.stringify(trade.signal_data) : null,
    trade.mode
  ).run();
  return result.meta.last_row_id as number;
}

export async function updateTrade(env: Env, id: number, updates: {
  status?: string;
  exit_price?: number;
  realized_pnl?: number;
  closed_at?: string;
}): Promise<void> {
  const fields = Object.entries(updates).map(([k]) => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  await env.DB.prepare(`UPDATE trades SET ${fields} WHERE id = ?`).bind(...values).run();
}

export async function getTrades(env: Env, opts: { limit?: number; offset?: number; symbol?: string; status?: string } = {}): Promise<Trade[]> {
  let q = 'SELECT * FROM trades WHERE 1=1';
  const params: unknown[] = [];
  if (opts.symbol) { q += ' AND symbol = ?'; params.push(opts.symbol); }
  if (opts.status) { q += ' AND status = ?'; params.push(opts.status); }
  q += ' ORDER BY opened_at DESC LIMIT ? OFFSET ?';
  params.push(opts.limit ?? 50, opts.offset ?? 0);
  const rows = await env.DB.prepare(q).bind(...params).all<Trade>();
  return rows.results ?? [];
}

export async function getStrategies(env: Env) {
  const rows = await env.DB.prepare('SELECT * FROM strategies').all();
  return rows.results ?? [];
}

export async function updateStrategy(env: Env, name: string, updates: { enabled?: number; parameters?: string }) {
  const fields = Object.entries(updates).map(([k]) => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), new Date().toISOString(), name];
  await env.DB.prepare(`UPDATE strategies SET ${fields}, updated_at = ? WHERE name = ?`).bind(...values).run();
}
