import { Hono } from 'hono';
import type { Env } from '../env';
import { getAllSettings, setSetting, updatePortfolio } from '../services/db';
import { setTradingMode } from '../services/kv';

const settings = new Hono<{ Bindings: Env }>();

settings.get('/', async (c) => {
  const data = await getAllSettings(c.env);
  return c.json({ success: true, data, timestamp: new Date().toISOString() });
});

settings.put('/', async (c) => {
  const body = await c.req.json<Record<string, string>>();
  for (const [key, value] of Object.entries(body)) {
    await setSetting(c.env, key, value);
  }
  return c.json({ success: true, data: { updated: Object.keys(body) }, timestamp: new Date().toISOString() });
});

settings.put('/mode', async (c) => {
  const body = await c.req.json<{ mode: 'paper' | 'live'; confirmation?: string }>();
  if (body.mode === 'live' && body.confirmation !== 'I UNDERSTAND THIS USES REAL MONEY') {
    return c.json({ success: false, error: 'Confirmation phrase required to enable live trading', timestamp: new Date().toISOString() }, 400);
  }
  await setSetting(c.env, 'trading_mode', body.mode);
  await setTradingMode(c.env, body.mode);
  await updatePortfolio(c.env, { mode: body.mode });
  return c.json({ success: true, data: { mode: body.mode }, timestamp: new Date().toISOString() });
});

export { settings };
