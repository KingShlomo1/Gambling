import { Hono } from 'hono';
import type { Env } from '../env';
import { getPortfolio, getPositions } from '../services/db';
import { runReporter } from '../agent/subagents/reporter';

const portfolio = new Hono<{ Bindings: Env }>();

portfolio.get('/', async (c) => {
  const [port, positions] = await Promise.all([
    getPortfolio(c.env),
    getPositions(c.env),
  ]);
  const gain = port.current_value - port.initial_capital;
  const gainPct = port.initial_capital > 0 ? gain / port.initial_capital : 0;
  const targetProgress = port.initial_capital > 0
    ? Math.max(0, Math.min((port.current_value - port.initial_capital) / (port.target_value - port.initial_capital), 1))
    : 0;

  return c.json({ success: true, data: { portfolio: port, positions, gain, gainPct, targetProgress }, timestamp: new Date().toISOString() });
});

portfolio.post('/sync', async (c) => {
  const runId = crypto.randomUUID();
  await runReporter(c.env, runId);
  const port = await getPortfolio(c.env);
  return c.json({ success: true, data: port, timestamp: new Date().toISOString() });
});

export { portfolio };
