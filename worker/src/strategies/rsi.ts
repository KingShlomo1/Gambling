export interface RsiResult {
  rsi: number;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number;
}

export function calcRsi(closes: number[], period = 14): RsiResult {
  if (closes.length < period + 1) {
    return { rsi: 50, signal: 'neutral', strength: 0 };
  }

  const deltas = closes.slice(1).map((c, i) => c - closes[i]);

  // Initial averages
  let avgGain = deltas.slice(0, period).reduce((s, d) => s + Math.max(d, 0), 0) / period;
  let avgLoss = deltas.slice(0, period).reduce((s, d) => s + Math.max(-d, 0), 0) / period;

  // Wilder smoothing for subsequent periods
  for (let i = period; i < deltas.length; i++) {
    const gain = Math.max(deltas[i], 0);
    const loss = Math.max(-deltas[i], 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  // Previous RSI for crossover detection
  const prevCloses = closes.slice(0, -1);
  let prevRsi = 50;
  if (prevCloses.length >= period + 1) {
    prevRsi = calcRsi(prevCloses, period).rsi;
  }

  let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
  let strength = 0;

  if (rsi < 30 && prevRsi >= 30) {
    signal = 'buy';
    strength = (30 - rsi) / 30;
  } else if (rsi < 35) {
    signal = 'buy';
    strength = (35 - rsi) / 35 * 0.7;
  } else if (rsi > 70 && prevRsi <= 70) {
    signal = 'sell';
    strength = (rsi - 70) / 30;
  } else if (rsi > 65) {
    signal = 'sell';
    strength = (rsi - 65) / 35 * 0.7;
  }

  return { rsi: Math.round(rsi * 100) / 100, signal, strength: Math.min(strength, 1) };
}
