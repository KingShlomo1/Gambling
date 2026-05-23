import type { Env } from '../../env';
import { getAccount, getPositions as alpacaPositions } from '../../services/alpaca';
import { updatePortfolio, upsertPosition, deletePosition, getPositions as dbPositions } from '../../services/db';
import { log } from '../../lib/logger';

export async function runReporter(env: Env, runId: string): Promise<void> {
  try {
    const [account, positions] = await Promise.all([
      getAccount(env),
      alpacaPositions(env),
    ]);

    // Sync portfolio value
    const portfolioValue = parseFloat(account.equity);
    const cashAvailable = parseFloat(account.cash);

    await updatePortfolio(env, {
      current_value: portfolioValue,
      cash_available: cashAvailable,
    });

    // Sync positions
    const currentSymbols = new Set(positions.map(p => p.symbol));
    const dbPos = await dbPositions(env);
    const dbSymbols = new Set(dbPos.map(p => p.symbol));

    // Upsert all current positions
    for (const pos of positions) {
      await upsertPosition(env, {
        symbol: pos.symbol,
        quantity: parseFloat(pos.qty),
        avg_entry_price: parseFloat(pos.avg_entry_price),
        current_price: parseFloat(pos.current_price),
        unrealized_pnl: parseFloat(pos.unrealized_pl),
        market_value: parseFloat(pos.market_value),
        side: pos.side,
      });
    }

    // Remove closed positions
    for (const sym of dbSymbols) {
      if (!currentSymbols.has(sym)) {
        await deletePosition(env, sym);
      }
    }

    await log(env, runId, 'info', `Reporter: portfolio $${portfolioValue.toFixed(2)}, ${positions.length} positions`, {
      subagent: 'reporter',
      data: { equity: portfolioValue, cash: cashAvailable, positions: positions.length },
    });
  } catch (e) {
    await log(env, runId, 'error', `Reporter failed: ${String(e)}`, { subagent: 'reporter' });
  }
}
