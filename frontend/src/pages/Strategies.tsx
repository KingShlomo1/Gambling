import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

interface Strategy {
  id: number; name: string; enabled: number; parameters: string;
  win_rate: number; total_trades: number; total_pnl: number;
}

export default function Strategies() {
  const qc = useQueryClient();

  const { data: strategies, isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => api.get<Strategy[]>('/api/strategies'),
  });

  const toggle = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: number }) =>
      api.put(`/api/strategies/${name}`, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['strategies'] }),
  });

  if (isLoading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Strategies</h1>
      <p className="text-gray-400 text-sm">Toggle strategies and view their performance. The AI agent uses only enabled strategies.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies?.map(s => {
          const params = JSON.parse(s.parameters);
          return (
            <div key={s.id} className={`bg-gray-900 border rounded-xl p-5 ${s.enabled ? 'border-indigo-800' : 'border-gray-800'}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold capitalize">{s.name.replace(/_/g, ' ')}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{s.total_trades} trades</p>
                </div>
                <button
                  onClick={() => toggle.mutate({ name: s.name, enabled: s.enabled ? 0 : 1 })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.enabled ? 'bg-indigo-600' : 'bg-gray-700'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${s.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Win Rate</p>
                  <p className="text-sm font-medium">{(s.win_rate * 100).toFixed(0)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Total P&L</p>
                  <p className={`text-sm font-medium ${s.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {s.total_pnl >= 0 ? '+' : ''}${s.total_pnl.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Trades</p>
                  <p className="text-sm font-medium">{s.total_trades}</p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Parameters</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(params).map(([k, v]) => (
                    <span key={k} className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                      {k}: <span className="text-indigo-300">{String(v)}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
