import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../env';
import { agentTools } from './tools';
import type { CompositeSignal } from '../strategies/composite';
import type { RiskAssessment } from './subagents/risk-manager';
import type { Portfolio } from '../services/db';
import { log } from '../lib/logger';

export interface AgentAction {
  type: 'place_order' | 'close_position' | 'skip_turn' | 'update_watchlist';
  params: Record<string, unknown>;
}

export async function runBrain(
  env: Env,
  runId: string,
  portfolio: Portfolio,
  signals: CompositeSignal[],
  risk: RiskAssessment,
  recentTrades: unknown[],
  activeStrategies: unknown[]
): Promise<AgentAction[]> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are an autonomous trading agent managing a brokerage account.
Goal: grow the portfolio from $${portfolio.initial_capital.toFixed(2)} to $${portfolio.target_value.toFixed(2)}.
Current mode: ${portfolio.mode}. Risk level: ${portfolio.risk_level}.

RISK RULES (non-negotiable):
- Max single position value: $${risk.max_position_value.toFixed(2)}
- Max open positions: 3
- Daily loss limit: 3% — DO NOT trade if daily_pnl_pct approaches this
- Only trade liquid US equities and ETFs
- No options, no leveraged ETFs, no crypto
- Always use limit orders

CURRENT STATE:
Portfolio value: $${portfolio.current_value.toFixed(2)} (started $${portfolio.initial_capital.toFixed(2)}, target $${portfolio.target_value.toFixed(2)})
Available cash: $${risk.available_cash.toFixed(2)}
Daily P&L: $${risk.daily_pnl.toFixed(2)} (${(risk.daily_pnl_pct * 100).toFixed(2)}%)
Open positions: ${risk.open_positions}
Can trade: ${risk.can_trade}

MARKET SIGNALS (pre-computed, sorted by score):
${JSON.stringify(signals.map(s => ({
  symbol: s.symbol,
  price: s.price,
  score: s.composite_score,
  confidence: s.confidence,
  direction: s.consensus_direction,
  rsi: s.signals.rsi.rsi,
  sma_fast: s.signals.sma.sma_fast,
  sma_slow: s.signals.sma.sma_slow,
  roc_10: s.signals.momentum.roc_10,
  volume_ratio: s.signals.volume.volume_ratio,
})), null, 2)}

ACTIVE STRATEGIES: ${JSON.stringify(activeStrategies)}

RECENT TRADES (last 5): ${JSON.stringify(recentTrades)}

Be conservative. Only act on signals with confidence 'high' (score >= 0.7). If no clear opportunity, call skip_turn.
Preserve capital — a bad trade is worse than missing a good one.`;

  const userMessage = `Analyze the market signals above and decide what trades to make, if any. Call the appropriate tool for each action. If conditions don't warrant trading, call skip_turn with your reasoning.`;

  await log(env, runId, 'info', 'Calling Claude brain', { subagent: 'brain', data: { signals_count: signals.length } });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    tools: agentTools,
  });

  const actions: AgentAction[] = [];

  for (const block of response.content) {
    if (block.type === 'tool_use') {
      actions.push({
        type: block.name as AgentAction['type'],
        params: block.input as Record<string, unknown>,
      });
    }
  }

  await log(env, runId, 'decision', `Brain decided: ${actions.map(a => a.type).join(', ') || 'no action'}`, {
    subagent: 'brain',
    data: { actions, stop_reason: response.stop_reason },
  });

  return actions;
}
