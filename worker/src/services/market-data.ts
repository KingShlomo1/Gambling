import type { Env } from '../env';

export interface Bar {
  t: string;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
}

export interface Quote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  change: number;
  changePct: number;
}

export async function getBars(
  env: Env,
  symbol: string,
  timeframe: '1Day' | '1Hour' | '15Min' = '1Day',
  limit = 50
): Promise<Bar[]> {
  const cacheKey = `${symbol}_${timeframe}`;

  // Check D1 cache (fresh within 15 minutes)
  const cached = await env.DB.prepare(
    `SELECT data, fetched_at FROM market_cache WHERE symbol = ? AND timeframe = ?`
  ).bind(symbol, timeframe).first<{ data: string; fetched_at: string }>();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < 15 * 60 * 1000) {
      return JSON.parse(cached.data) as Bar[];
    }
  }

  const url = `${env.ALPACA_DATA_URL}/v2/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${limit}&sort=asc`;
  const res = await fetch(url, {
    headers: {
      'APCA-API-KEY-ID': env.ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': env.ALPACA_API_SECRET,
    },
  });

  if (!res.ok) {
    throw new Error(`Market data fetch failed for ${symbol}: ${res.status}`);
  }

  const body = await res.json<{ bars: Bar[] }>();
  const bars = body.bars ?? [];

  // Upsert cache
  await env.DB.prepare(
    `INSERT INTO market_cache (symbol, timeframe, data, fetched_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(symbol, timeframe) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`
  ).bind(symbol, timeframe, JSON.stringify(bars)).run();

  return bars;
}

export async function getLatestQuote(env: Env, symbol: string): Promise<Quote> {
  const url = `${env.ALPACA_DATA_URL}/v2/stocks/${symbol}/quotes/latest`;
  const snapUrl = `${env.ALPACA_DATA_URL}/v2/stocks/${symbol}/snapshot`;

  const res = await fetch(snapUrl, {
    headers: {
      'APCA-API-KEY-ID': env.ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': env.ALPACA_API_SECRET,
    },
  });

  if (!res.ok) {
    throw new Error(`Quote fetch failed for ${symbol}: ${res.status}`);
  }

  const snap = await res.json<{
    latestTrade?: { p: number };
    latestQuote?: { bp: number; ap: number };
    dailyBar?: { v: number; o: number };
  }>();

  const price = snap.latestTrade?.p ?? 0;
  const open = snap.dailyBar?.o ?? price;
  const change = price - open;

  return {
    symbol,
    price,
    bid: snap.latestQuote?.bp ?? price,
    ask: snap.latestQuote?.ap ?? price,
    volume: snap.dailyBar?.v ?? 0,
    change,
    changePct: open > 0 ? change / open : 0,
  };
}
