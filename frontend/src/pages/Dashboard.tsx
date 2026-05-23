import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import PortfolioCard from '../components/PortfolioCard';
import RiskMeter from '../components/RiskMeter';

interface PortfolioData {
  portfolio: { initial_capital: number; current_value: number; target_value: number; cash_available: number; mode: string; risk_level: string };
  positions: Array<{ symbol: string; quantity: number; avg_entry_price: number; current_price: number | null; unrealized_pnl: number | null; market_value: number | null }>;
  gain: number;
  gainPct: number;
  targetProgress: number;
}

interface Trade {
  id: number; symbol: string; side: string; status: string; strategy: string;
  entry_price: number | null; realized_pnl: number | null; opened_at: string;
}

interface AgentLog {
  id: number; run_id: string; log_type: string; subagent: string | null; symbol: string | null; message: string; created_at: string;
}

export default function Dashboard() {
  const qc = useQueryClient();

  const { data: portData, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.get<PortfolioData>('/api/portfolio'),
    refetchInterval: 30000,
  });

  const { data: trades } = useQuery({
    queryKey: ['trades-recent'],
    queryFn: () => api.get<Trade[]>('/api/trades?limit=5'),
    refetchInterval: 30000,
  });

  const { data: logs } = useQuery({
    queryKey: ['logs-recent'],
    queryFn: () => api.get<AgentLog[]>('/api/agent/logs?limit=5'),
    refetchInterval: 15000,
  });

  const runAgent = useMutation({
    mutationFn: () => api.post<{ run_id: string; message: string }>('/api/agent/run'),
    onSuccess: () => setTimeout(() => qc.invalidateQueries(), 3000),
  });

  if (isLoading) return <div className="text-gray-400">Loading...</div>;

  const port = portData?.portfolio;
  if (!port) return <div className="text-gray-400">No portfolio data</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => runAgent.mutate()}
          disabled={runAgent.isPending}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {runAgent.isPending ? 'Running...' : 'Run Agent Now'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PortfolioCard
          initial={port.initial_capital}
          current={port.current_value}
          target={port.target_value}
          gain={portData.gain}
          gainPct={portData.gainPct}
          targetProgress={portData.targetProgress}
          mode={port.mode}
        />
        <RiskMeter dailyPnl={0} dailyPnlPct={0} limitPct={0.03} />
      </div>

      {/* Open Positions */}
      {portData?.positions && portData.positions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Open Positions</h2>
          <div className="space-y-2">
            {portData.positions.map(pos => (
              <div key={pos.symbol} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <span className="font-medium">{pos.symbol}</span>
                <span className="text-gray-400 text-sm">{pos.quantity} shares @ ${pos.avg_entry_price.toFixed(2)}</span>
                <span className={`text-sm font-medium ${(pos.unrealized_pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(pos.unrealized_pnl ?? 0) >= 0 ? '+' : ''}{(pos.unrealized_pnl ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Trades */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Recent Trades</h2>
          {!trades?.length ? (
            <p className="text-gray-500 text-sm">No trades yet</p>
          ) : (
            <div className="space-y-2">
              {trades.map(t => (
                <div key={t.id} className="flex justify-between items-center text-sm py-1">
                  <span className="font-medium">{t.symbol}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${t.side === 'buy' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{t.side.toUpperCase()}</span>
                  <span className="text-gray-400">{t.strategy}</span>
                  <span className={t.realized_pnl != null ? (t.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}>
                    {t.realized_pnl != null ? `${t.realized_pnl >= 0 ? '+' : ''}$${t.realized_pnl.toFixed(2)}` : t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Logs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Agent Activity</h2>
          {!logs?.length ? (
            <p className="text-gray-500 text-sm">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {logs.map(l => (
                <div key={l.id} className="text-sm py-1 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${l.log_type === 'error' ? 'bg-red-900 text-red-300' : l.log_type === 'action' ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>
                      {l.log_type}
                    </span>
                    {l.symbol && <span className="text-indigo-400 text-xs">{l.symbol}</span>}
                    <span className="text-gray-500 text-xs ml-auto">{new Date(l.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-gray-300 text-xs truncate">{l.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
