import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { portfolio } from './routes/portfolio';
import { trades } from './routes/trades';
import { agent } from './routes/agent';
import { market } from './routes/market';
import { strategies } from './routes/strategies';
import { settings } from './routes/settings';
import { handleScheduled } from './cron/scheduler';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));

app.route('/api/portfolio', portfolio);
app.route('/api/trades', trades);
app.route('/api/agent', agent);
app.route('/api/market', market);
app.route('/api/strategies', strategies);
app.route('/api/settings', settings);

app.get('/api/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(event, env));
  },
};
