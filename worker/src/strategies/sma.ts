export interface SmaResult {
  sma_fast: number;
  sma_slow: number;
  crossover: 'bullish' | 'bearish' | 'none';
  trend: 'up' | 'down' | 'sideways';
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
}

function sma(closes: number[], period: number): number {
  const slice = closes.slice(-period);
  return slice.reduce((s, c) => s + c, 0) / slice.length;
}

export function calcSma(closes: number[], fastPeriod = 9, slowPeriod = 21): SmaResult {
  if (closes.length < slowPeriod + 1) {
    return { sma_fast: 0, sma_slow: 0, crossover: 'none', trend: 'sideways', signal: 'neutral', strength: 0 };
  }

  const smaFast = sma(closes, fastPeriod);
  const smaSlow = sma(closes, slowPeriod);
  const prevSmaFast = sma(closes.slice(0, -1), fastPeriod);
  const prevSmaSlow = sma(closes.slice(0, -1), slowPeriod);

  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (prevSmaFast <= prevSmaSlow && smaFast > smaSlow) crossover = 'bullish';
  else if (prevSmaFast >= prevSmaSlow && smaFast < smaSlow) crossover = 'bearish';

  const latestClose = closes[closes.length - 1];
  const smaFast5dAgo = sma(closes.slice(0, -5), fastPeriod);
  const slope = (smaFast - smaFast5dAgo) / 5;

  let trend: 'up' | 'down' | 'sideways' = 'sideways';
  if (slope > 0.002 * smaSlow) trend = 'up';
  else if (slope < -0.002 * smaSlow) trend = 'down';

  let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
  let strength = 0;

  const gap = (smaFast - smaSlow) / smaSlow;

  if (crossover === 'bullish' || (smaFast > smaSlow && latestClose > smaSlow && trend === 'up')) {
    signal = 'buy';
    strength = crossover === 'bullish' ? 0.9 : Math.min(Math.abs(gap) * 20, 0.7);
  } else if (crossover === 'bearish' || (smaFast < smaSlow && trend === 'down')) {
    signal = 'sell';
    strength = crossover === 'bearish' ? 0.9 : Math.min(Math.abs(gap) * 20, 0.7);
  }

  return {
    sma_fast: Math.round(smaFast * 100) / 100,
    sma_slow: Math.round(smaSlow * 100) / 100,
    crossover,
    trend,
    signal,
    strength: Math.min(strength, 1),
  };
}
