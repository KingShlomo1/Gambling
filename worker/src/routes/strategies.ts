import { Hono } from 'hono';
import type { Env } from '../env';
import { getStrategies, updateStrategy } from '../services/db';

const strategies = new Hono<{ Bindings: Env }>();

strategies.get('/', async (c) => {
  const data = await getStrategies(c.env);
  return c.json({ success: true, data, timestamp: new Date().toISOString() });
});

strategies.put('/:name', async (c) => {
  const name = c.req.param('name');
  const body = await c.req.json<{ enabled?: number; parameters?: string }>();
  await updateStrategy(c.env, name, body);
  return c.json({ success: true, data: { updated: name }, timestamp: new Date().toISOString() });
});

export { strategies };
