import { Hono } from 'hono';
import type { Env } from '../env';
import { getTrades, insertTrade, getPortfolio } from '../services/db';
import { placeLimitOrder } from '../services/alpaca';

const trades = new Hono<{ Bindings: Env }>();

trades.get('/', async (c) => {
  const symbol = c.req.query('symbol');
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') ?? '50');
  const offset = parseInt(c.req.query('offset') ?? '0');
  const data = await getTrades(c.env, { symbol, status, limit, offset });
  return c.json({ success: true, data, timestamp: new Date().toISOString() });
});

trades.post('/manual', async (c) => {
  const body = await c.req.json<{ symbol: string; side: 'buy' | 'sell'; quantity: number; limit_price: number }>();
  const portfolio = await getPortfolio(c.env);
  const order = await placeLimitOrder(c.env, {
    symbol: body.symbol,
    side: body.side,
    qty: body.quantity,
    limit_price: body.limit_price,
  });
  const id = await insertTrade(c.env, {
    alpaca_order_id: order.id,
    symbol: body.symbol,
    side: body.side,
    quantity: body.quantity,
    entry_price: body.limit_price,
    status: order.status,
    strategy: 'manual',
    mode: portfolio.mode,
  });
  return c.json({ success: true, data: { trade_id: id, order_id: order.id, status: order.status }, timestamp: new Date().toISOString() });
});

export { trades };
