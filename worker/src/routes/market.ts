import { Hono } from 'hono';
import type { Env } from '../env';
import { getBars, getLatestQuote } from '../services/market-data';
import { calcComposite } from '../strategies/composite';

const market = new Hono<{ Bindings: Env }>();

market.get('/quote/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();
  const quote = await getLatestQuote(c.env, symbol);
  return c.json({ success: true, data: quote, timestamp: new Date().toISOString() });
});

market.get('/bars/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();
  const timeframe = (c.req.query('timeframe') ?? '1Day') as '1Day' | '1Hour' | '15Min';
  const limit = parseInt(c.req.query('limit') ?? '50');
  const bars = await getBars(c.env, symbol, timeframe, limit);
  return c.json({ success: true, data: bars, timestamp: new Date().toISOString() });
});

market.get('/signals/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();
  const bars = await getBars(c.env, symbol, '1Day', 50);
  const signal = calcComposite(symbol, bars);
  return c.json({ success: true, data: signal, timestamp: new Date().toISOString() });
});

export { market };
