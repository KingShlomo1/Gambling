import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

interface Trade {
  id: number; symbol: string; side: string; quantity: number;
  entry_price: number | null; exit_price: number | null;
  status: string; strategy: string; signal_data: string | null;
  realized_pnl: number | null; mode: string; opened_at: string; closed_at: string | null;
}

export default function Trades() {
  const [symbol, setSymbol] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Trade | null>(null);

  const { data: trades, isLoading } = useQuery({
    queryKey: ['trades', symbol, status],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' });
      if (symbol) params.set('symbol', symbol.toUpperCase());
      if (status) params.set('status', status);
      return api.get<Trade[]>(`/api/trades?${params}`);
    },
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Trades</h1>

      <div className="flex gap-3">
        <input
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          placeholder="Filter by symbol..."
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:border-indigo-500"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="filled">Filled</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Symbol</th>
              <th className="text-left px-4 py-3">Side</th>
              <th className="text-left px-4 py-3">Qty</th>
              <th className="text-left px-4 py-3">Entry</th>
              <th className="text-left px-4 py-3">Exit</th>
              <th className="text-left px-4 py-3">P&L</th>
              <th className="text-left px-4 py-3">Strategy</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : !trades?.length ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No trades found</td></tr>
            ) : trades.map(t => (
              <tr
                key={t.id}
                onClick={() => setSelected(t)}
                className="border-b border-gray-800 last:border-0 hover:bg-gray-800 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium">{t.symbol}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${t.side === 'buy' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {t.side.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">{t.quantity}</td>
                <td className="px-4 py-3 text-gray-300">{t.entry_price != null ? `$${t.entry_price.toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3 text-gray-300">{t.exit_price != null ? `$${t.exit_price.toFixed(2)}` : '—'}</td>
                <td className={`px-4 py-3 font-medium ${t.realized_pnl == null ? 'text-gray-500' : t.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {t.realized_pnl != null ? `${t.realized_pnl >= 0 ? '+' : ''}$${t.realized_pnl.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-400">{t.strategy}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'filled' ? 'bg-green-900 text-green-300' : t.status === 'pending' ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-700 text-gray-300'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.opened_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signal drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-end z-50" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 border-l border-gray-800 w-96 h-full p-6 overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{selected.symbol} — {selected.side.toUpperCase()}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Strategy</span><span>{selected.strategy}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Status</span><span>{selected.status}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Qty</span><span>{selected.quantity}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Entry</span><span>{selected.entry_price != null ? `$${selected.entry_price.toFixed(2)}` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Exit</span><span>{selected.exit_price != null ? `$${selected.exit_price.toFixed(2)}` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Mode</span><span>{selected.mode}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Opened</span><span>{new Date(selected.opened_at).toLocaleString()}</span></div>
            </div>
            {selected.signal_data && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Signal Data</p>
                <pre className="bg-gray-800 rounded p-3 text-xs text-gray-300 overflow-auto">
                  {JSON.stringify(JSON.parse(selected.signal_data), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
