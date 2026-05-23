interface Props {
  initial: number;
  current: number;
  target: number;
  gain: number;
  gainPct: number;
  targetProgress: number;
  mode: string;
}

export default function PortfolioCard({ initial, current, target, gain, gainPct, targetProgress, mode }: Props) {
  const pct = Math.round(targetProgress * 100);
  const barColor = gain < 0 ? 'bg-red-500' : pct >= 50 ? 'bg-green-500' : 'bg-yellow-500';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Portfolio Value</p>
          <p className="text-3xl font-bold mt-1">${current.toFixed(2)}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${mode === 'live' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`}>
          {mode.toUpperCase()}
        </span>
      </div>
      <div className="flex gap-4 text-sm mb-4">
        <div>
          <span className="text-gray-400">Started: </span>
          <span>${initial.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-400">Target: </span>
          <span>${target.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-400">Gain: </span>
          <span className={gain >= 0 ? 'text-green-400' : 'text-red-400'}>
            {gain >= 0 ? '+' : ''}{gain.toFixed(2)} ({(gainPct * 100).toFixed(1)}%)
          </span>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progress to goal</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
