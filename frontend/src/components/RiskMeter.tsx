interface Props {
  dailyPnl: number;
  dailyPnlPct: number;
  limitPct: number;
}

export default function RiskMeter({ dailyPnl, dailyPnlPct, limitPct }: Props) {
  const used = Math.min(Math.abs(Math.min(dailyPnlPct, 0)) / limitPct, 1);
  const pct = Math.round(used * 100);
  const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Daily Risk</p>
      <div className="flex items-end gap-2 mb-3">
        <span className={`text-2xl font-bold ${dailyPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {dailyPnl >= 0 ? '+' : ''}{dailyPnl.toFixed(2)}
        </span>
        <span className="text-sm text-gray-400 mb-0.5">today</span>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Loss limit used</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1">Limit: {(limitPct * 100).toFixed(0)}% daily loss</p>
      </div>
    </div>
  );
}
