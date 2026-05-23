export interface MomentumResult {
  roc_10: number;
  roc_5: number;
  signal: 'buy' | 'sell' | 'neutral';
  decelerating: boolean;
  strength: number;
}

function roc(closes: number[], period: number): number {
  if (closes.length < period + 1) return 0;
  const prev = closes[closes.length - 1 - period];
  const curr = closes[closes.length - 1];
  return prev === 0 ? 0 : (curr - prev) / prev;
}

export function calcMomentum(closes: number[], threshold = 0.02): MomentumResult {
  const roc10 = roc(closes, 10);
  const roc5 = roc(closes, 5);

  const decelerating = roc5 < roc10 && roc10 > 0;

  let signal: 'buy' | 'sell' | 'neutral' = 'neutral';
  let strength = 0;

  if (roc10 > threshold && roc5 > threshold / 2) {
    signal = 'buy';
    strength = Math.min((roc10 / threshold) * 0.5, 1);
    if (decelerating) strength *= 0.6;
  } else if (roc10 < -threshold && roc5 < -threshold / 2) {
    signal = 'sell';
    strength = Math.min((Math.abs(roc10) / threshold) * 0.5, 1);
  }

  return {
    roc_10: Math.round(roc10 * 10000) / 100,
    roc_5: Math.round(roc5 * 10000) / 100,
    signal,
    decelerating,
    strength: Math.min(strength, 1),
  };
}
