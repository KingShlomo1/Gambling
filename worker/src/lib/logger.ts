import type { Env } from '../env';

export type LogType = 'decision' | 'action' | 'error' | 'info';

export async function log(
  env: Env,
  runId: string,
  logType: LogType,
  message: string,
  opts: { subagent?: string; symbol?: string; data?: unknown } = {}
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO agent_logs (run_id, log_type, subagent, symbol, message, data)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      runId,
      logType,
      opts.subagent ?? null,
      opts.symbol ?? null,
      message,
      opts.data ? JSON.stringify(opts.data) : null
    )
    .run();
}
