import type { Bar } from '../services/market-data';
import { calcRsi } from './rsi';
import { calcSma } from './sma';
import { calcMomentum } from './momentum';
import { calcVolume } from './volume';

export interface CompositeSignal {
  symbol: string;
  price: number;
  composite_score: number;
  confidence: 'high' | 'medium' | 'low';
  consensus_direction: 'buy' | 'sell' | 'neutral';
  signals: {
    rsi: ReturnType<typeof calcRsi>;
    sma: ReturnType<typeof calcSma>;
    momentum: ReturnType<typeof calcMomentum>;
    volume: ReturnType<typeof calcVolume>;
  };
}

export function calcComposite(symbol: string, bars: Bar[]): CompositeSignal {
  const closes = bars.map(b => b.c);
  const price = closes[closes.length - 1] ?? 0;

  const rsi = calcRsi(closes);
  const sma = calcSma(closes);
  const momentum = calcMomentum(closes);
  const volume = calcVolume(bars);

  const rsiScore = rsi.signal !== 'neutral' ? rsi.strength * 0.35 : 0;
  const smaScore = sma.signal !== 'neutral' ? sma.strength * 0.35 : 0;
  const momScore = momentum.signal !== 'neutral' ? momentum.strength * 0.20 : 0;
  const directionScore = [rsi.signal, sma.signal, momentum.signal].includes('buy') ||
    [rsi.signal, sma.signal, momentum.signal].includes('sell') ? 0.10 : 0;

  let composite = (rsiScore + smaScore + momScore + directionScore) * volume.amplifier;

  // Penalize if signals disagree on direction
  const signals = [rsi.signal, sma.signal, momentum.signal].filter(s => s !== 'neutral');
  const hasBuy = signals.includes('buy');
  const hasSell = signals.includes('sell');
  if (hasBuy && hasSell) composite *= 0.5;

  composite = Math.min(composite, 1);

  const buyCount = signals.filter(s => s === 'buy').length;
  const sellCount = signals.filter(s => s === 'sell').length;
  const consensusDirection = buyCount > sellCount ? 'buy' : sellCount > buyCount ? 'sell' : 'neutral';

  const confidence: 'high' | 'medium' | 'low' =
    composite >= 0.7 ? 'high' : composite >= 0.5 ? 'medium' : 'low';

  return {
    symbol,
    price,
    composite_score: Math.round(composite * 1000) / 1000,
    confidence,
    consensus_direction: consensusDirection,
    signals: { rsi, sma, momentum, volume },
  };
}
