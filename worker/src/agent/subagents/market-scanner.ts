import type { Env } from '../../env';
import { getBars } from '../../services/market-data';
import { calcComposite, type CompositeSignal } from '../../strategies/composite';
import { log } from '../../lib/logger';

export async function runMarketScanner(
  env: Env,
  runId: string,
  symbols: string[]
): Promise<CompositeSignal[]> {
  const results: CompositeSignal[] = [];

  for (const symbol of symbols) {
    try {
      const bars = await getBars(env, symbol, '1Day', 50);
      if (bars.length < 22) {
        await log(env, runId, 'info', `Skipping ${symbol}: insufficient bar data`, { subagent: 'market-scanner', symbol });
        continue;
      }
      const signal = calcComposite(symbol, bars);
      results.push(signal);
    } catch (e) {
      await log(env, runId, 'error', `Failed to scan ${symbol}: ${String(e)}`, { subagent: 'market-scanner', symbol });
    }
  }

  // Sort by composite score descending
  results.sort((a, b) => b.composite_score - a.composite_score);

  await log(env, runId, 'info', `Scanned ${results.length} symbols`, {
    subagent: 'market-scanner',
    data: results.map(r => ({
      symbol: r.symbol,
      price: r.price,
      score: r.composite_score,
      confidence: r.confidence,
      direction: r.consensus_direction,
    })),
  });

  return results;
}
