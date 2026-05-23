import type { Env } from '../env';
import { runAgentLoop } from '../agent/loop';
import { isMarketOpen } from '../lib/utils';
import { getSetting } from '../services/db';
import { setDailyHalt } from '../services/kv';

export async function handleScheduled(event: ScheduledEvent, env: Env): Promise<void> {
  const cron = event.cron;

  // Reset daily halt at market open
  if (cron === '0 14 * * 1-5') {
    await setDailyHalt(env, false);
    return;
  }

  // Final sync at market close
  if (cron === '30 21 * * 1-5') {
    const runId = crypto.randomUUID();
    await runAgentLoop(env, runId);
    return;
  }

  // Regular 15-min trading loop
  if (!isMarketOpen()) return;

  const agentEnabled = await getSetting(env, 'agent_enabled');
  if (agentEnabled !== 'true') return;

  const runId = crypto.randomUUID();
  await runAgentLoop(env, runId);
}
