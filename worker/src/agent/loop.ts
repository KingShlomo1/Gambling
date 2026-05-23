import type { Env } from '../env';
import { runMarketScanner } from './subagents/market-scanner';
import { assessRisk, validateOrder } from './subagents/risk-manager';
import { runReporter } from './subagents/reporter';
import { runBrain } from './brain';
import { getPortfolio, getTrades, getStrategies, insertTrade } from '../services/db';
import { placeLimitOrder, closePosition as alpacaClosePosition } from '../services/alpaca';
import { getWatchlist, setWatchlist, setAgentStatus } from '../services/kv';
import { log } from '../lib/logger';

export async function runAgentLoop(env: Env, runId: string): Promise<void> {
  await setAgentStatus(env, 'running');
  await log(env, runId, 'info', `Agent loop started`, { subagent: 'loop' });

  try {
    // Step 1: Scan market
    const watchlist = await getWatchlist(env);
    const signals = await runMarketScanner(env, runId, watchlist);

    // Step 2: Assess risk
    const risk = await assessRisk(env, runId);

    if (!risk.can_trade && risk.halt_reason) {
      await log(env, runId, 'info', `Trading halted: ${risk.halt_reason}`, { subagent: 'loop' });
      await setAgentStatus(env, 'halted');
      return;
    }

    // Step 3: Get portfolio state + recent trades + strategies
    const [portfolio, recentTrades, strategies] = await Promise.all([
      getPortfolio(env),
      getTrades(env, { limit: 5 }),
      getStrategies(env),
    ]);

    const activeStrategies = (strategies as Array<{ enabled: number; name: string; parameters: string }>)
      .filter(s => s.enabled === 1)
      .map(s => ({ name: s.name, parameters: JSON.parse(s.parameters) }));

    // Step 4: Run brain
    const actions = await runBrain(env, runId, portfolio, signals, risk, recentTrades, activeStrategies);

    // Step 5: Execute actions
    for (const action of actions) {
      if (action.type === 'place_order') {
        const { symbol, side, quantity, limit_price, strategy, reasoning } = action.params as {
          symbol: string; side: 'buy' | 'sell'; quantity: number; limit_price: number; strategy: string; reasoning: string;
        };

        const validation = await validateOrder(env, symbol, side, quantity, limit_price, risk);
        if (!validation.valid) {
          await log(env, runId, 'error', `Order rejected: ${validation.reason}`, { subagent: 'loop', symbol });
          continue;
        }

        try {
          const order = await placeLimitOrder(env, { symbol, side, qty: quantity, limit_price });
          await insertTrade(env, {
            alpaca_order_id: order.id,
            symbol,
            side,
            quantity,
            entry_price: limit_price,
            status: order.status,
            strategy,
            signal_data: { reasoning, limit_price },
            mode: portfolio.mode,
          });
          await log(env, runId, 'action', `Placed ${side} order for ${quantity} ${symbol} @ $${limit_price} (${strategy})`, {
            subagent: 'loop',
            symbol,
            data: { order_id: order.id, reasoning },
          });
        } catch (e) {
          await log(env, runId, 'error', `Order failed for ${symbol}: ${String(e)}`, { subagent: 'loop', symbol });
        }
      } else if (action.type === 'close_position') {
        const { symbol, reasoning } = action.params as { symbol: string; reasoning: string };
        try {
          await alpacaClosePosition(env, symbol);
          await log(env, runId, 'action', `Closed position ${symbol}: ${reasoning}`, { subagent: 'loop', symbol });
        } catch (e) {
          await log(env, runId, 'error', `Failed to close ${symbol}: ${String(e)}`, { subagent: 'loop', symbol });
        }
      } else if (action.type === 'skip_turn') {
        const { reasoning } = action.params as { reasoning: string };
        await log(env, runId, 'info', `Skip turn: ${reasoning}`, { subagent: 'loop' });
      } else if (action.type === 'update_watchlist') {
        const { add_symbols = [], remove_symbols = [] } = action.params as { add_symbols?: string[]; remove_symbols?: string[] };
        const current = await getWatchlist(env);
        const updated = [...new Set([...current.filter(s => !remove_symbols.includes(s)), ...add_symbols])]
          .slice(0, parseInt(env.MAX_WATCHLIST_SIZE));
        await setWatchlist(env, updated);
        await log(env, runId, 'action', `Watchlist updated: +${add_symbols.join(',')} -${remove_symbols.join(',')}`, { subagent: 'loop' });
      }
    }

    // Step 6: Sync portfolio + positions
    await runReporter(env, runId);

  } catch (e) {
    await log(env, runId, 'error', `Agent loop error: ${String(e)}`, { subagent: 'loop' });
    await setAgentStatus(env, 'error');
    return;
  }

  await setAgentStatus(env, 'idle');
  await log(env, runId, 'info', 'Agent loop completed', { subagent: 'loop' });
}
