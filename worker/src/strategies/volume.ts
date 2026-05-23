import type { Bar } from '../services/market-data';

export interface VolumeResult {
  volume_ratio: number;
  obv_trend: 'up' | 'down' | 'flat';
  amplifier: number;
}

export function calcVolume(bars: Bar[]): VolumeResult {
  if (bars.length < 21) {
    return { volume_ratio: 1, obv_trend: 'flat', amplifier: 1 };
  }

  const recent = bars.slice(-21);
  const avgVolume = recent.slice(0, 20).reduce((s, b) => s + b.v, 0) / 20;
  const todayVolume = recent[recent.length - 1].v;
  const volumeRatio = avgVolume > 0 ? todayVolume / avgVolume : 1;

  // On-balance volume over last 10 bars
  let obv = 0;
  const last10 = bars.slice(-10);
  for (let i = 1; i < last10.length; i++) {
    if (last10[i].c > last10[i - 1].c) obv += last10[i].v;
    else if (last10[i].c < last10[i - 1].c) obv -= last10[i].v;
  }

  const obvTrend = obv > 0 ? 'up' : obv < 0 ? 'down' : 'flat';

  // Amplifier: high volume + price confirmation = boost; low volume = reduce
  let amplifier = 1;
  const latestBar = bars[bars.length - 1];
  const priceUp = latestBar.c > latestBar.o;

  if (volumeRatio > 2 && priceUp) amplifier = 1.5;
  else if (volumeRatio > 1.5) amplifier = 1.2;
  else if (volumeRatio < 0.5) amplifier = 0.5;
  else if (volumeRatio < 0.8) amplifier = 0.8;

  return {
    volume_ratio: Math.round(volumeRatio * 100) / 100,
    obv_trend: obvTrend,
    amplifier,
  };
}
