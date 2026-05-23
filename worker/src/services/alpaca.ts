import type { Env } from '../env';
import { getTradingMode } from './kv';

export interface AlpacaAccount {
  id: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  buying_power: string;
}

export interface AlpacaPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  unrealized_pl: string;
  market_value: string;
  side: string;
}

export interface AlpacaOrder {
  id: string;
  symbol: string;
  side: string;
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  status: string;
  order_type: string;
  limit_price: string | null;
  created_at: string;
}

async function alpacaFetch(env: Env, path: string, options: RequestInit = {}): Promise<Response> {
  const mode = await getTradingMode(env);
  const base = mode === 'live'
    ? 'https://api.alpaca.markets'
    : env.ALPACA_BASE_URL;

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'APCA-API-KEY-ID': env.ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': env.ALPACA_API_SECRET,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Alpaca API ${path} → ${res.status}: ${body}`);
  }
  return res;
}

export async function getAccount(env: Env): Promise<AlpacaAccount> {
  const res = await alpacaFetch(env, '/v2/account');
  return res.json<AlpacaAccount>();
}

export async function getPositions(env: Env): Promise<AlpacaPosition[]> {
  const res = await alpacaFetch(env, '/v2/positions');
  return res.json<AlpacaPosition[]>();
}

export async function closePosition(env: Env, symbol: string): Promise<AlpacaOrder> {
  const res = await alpacaFetch(env, `/v2/positions/${symbol}`, { method: 'DELETE' });
  return res.json<AlpacaOrder>();
}

export async function placeLimitOrder(env: Env, opts: {
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  limit_price: number;
}): Promise<AlpacaOrder> {
  const body = {
    symbol: opts.symbol,
    qty: opts.qty.toFixed(3),
    side: opts.side,
    type: 'limit',
    time_in_force: 'day',
    limit_price: opts.limit_price.toFixed(2),
  };
  const res = await alpacaFetch(env, '/v2/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json<AlpacaOrder>();
}

export async function closeAllPositions(env: Env): Promise<void> {
  await alpacaFetch(env, '/v2/positions', { method: 'DELETE' });
}

export async function getOrder(env: Env, orderId: string): Promise<AlpacaOrder> {
  const res = await alpacaFetch(env, `/v2/orders/${orderId}`);
  return res.json<AlpacaOrder>();
}
