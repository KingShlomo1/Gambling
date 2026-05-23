import { Hono } from 'hono';
import type { Env } from '../env';
import { runAgentLoop } from '../agent/loop';
import { getAgentStatus } from '../services/kv';

const agent = new Hono<{ Bindings: Env }>();

agent.post('/run', async (c) => {
  const runId = crypto.randomUUID();
  // Run asynchronously via waitUntil if available, else await
  c.executionCtx.waitUntil(runAgentLoop(c.env, runId));
  return c.json({ success: true, data: { run_id: runId, message: 'Agent loop started' }, timestamp: new Date().toISOString() });
});

agent.get('/status', async (c) => {
  const status = await getAgentStatus(c.env);
  return c.json({ success: true, data: { status }, timestamp: new Date().toISOString() });
});

agent.get('/logs', async (c) => {
  const runId = c.req.query('run_id');
  const limit = parseInt(c.req.query('limit') ?? '50');
  const offset = parseInt(c.req.query('offset') ?? '0');

  let q = 'SELECT * FROM agent_logs WHERE 1=1';
  const params: unknown[] = [];
  if (runId) { q += ' AND run_id = ?'; params.push(runId); }
  q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = await c.env.DB.prepare(q).bind(...params).all();
  return c.json({ success: true, data: rows.results ?? [], timestamp: new Date().toISOString() });
});

export { agent };
