import type { Env } from '../env';

export async function kvGet(env: Env, key: string): Promise<string | null> {
  return env.KV.get(key);
}

export async function kvSet(env: Env, key: string, value: string, ttl?: number): Promise<void> {
  await env.KV.put(key, value, ttl ? { expirationTtl: ttl } : undefined);
}

export async function kvDel(env: Env, key: string): Promise<void> {
  await env.KV.delete(key);
}

export async function getAgentStatus(env: Env): Promise<string> {
  return (await kvGet(env, 'agent:status')) ?? 'idle';
}

export async function setAgentStatus(env: Env, status: 'idle' | 'running' | 'halted' | 'error'): Promise<void> {
  await kvSet(env, 'agent:status', status);
}

export async function getTradingMode(env: Env): Promise<'paper' | 'live'> {
  const v = await kvGet(env, 'settings:trading_mode');
  return (v as 'paper' | 'live') ?? 'paper';
}

export async function setTradingMode(env: Env, mode: 'paper' | 'live'): Promise<void> {
  await kvSet(env, 'settings:trading_mode', mode);
}

export async function getWatchlist(env: Env): Promise<string[]> {
  const v = await kvGet(env, 'agent:watchlist');
  if (v) return v.split(',').map(s => s.trim()).filter(Boolean);
  return ['QQQ', 'SPY', 'AAPL', 'MSFT', 'NVDA', 'TSLA'];
}

export async function setWatchlist(env: Env, symbols: string[]): Promise<void> {
  await kvSet(env, 'agent:watchlist', symbols.join(','));
}

export async function isDailyHalted(env: Env): Promise<boolean> {
  return (await kvGet(env, 'agent:daily_halt')) === 'true';
}

export async function setDailyHalt(env: Env, halted: boolean): Promise<void> {
  if (halted) {
    await kvSet(env, 'agent:daily_halt', 'true');
  } else {
    await kvDel(env, 'agent:daily_halt');
  }
}

export async function getPositionHighWater(env: Env, symbol: string): Promise<number | null> {
  const v = await kvGet(env, `position:${symbol}:high`);
  return v ? parseFloat(v) : null;
}

export async function setPositionHighWater(env: Env, symbol: string, price: number): Promise<void> {
  await kvSet(env, `position:${symbol}:high`, price.toString());
}
