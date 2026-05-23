import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export default function Settings() {
  const qc = useQueryClient();
  const [confirmation, setConfirmation] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Record<string, string>>('/api/settings'),
  });

  const updateSetting = useMutation({
    mutationFn: (body: Record<string, string>) => api.put('/api/settings', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const toggleMode = useMutation({
    mutationFn: ({ mode, confirmation }: { mode: string; confirmation?: string }) =>
      api.put('/api/settings/mode', { mode, confirmation }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const currentMode = settings?.trading_mode ?? 'paper';

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Trading Mode */}
      <div className={`rounded-xl border p-5 ${currentMode === 'live' ? 'border-red-700 bg-red-950/20' : 'border-gray-800 bg-gray-900'}`}>
        <h2 className="font-semibold mb-1">Trading Mode</h2>
        <p className="text-sm text-gray-400 mb-4">
          Paper mode uses simulated money. Live mode uses real funds from your Alpaca account.
        </p>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => toggleMode.mutate({ mode: 'paper' })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentMode === 'paper' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            Paper (Safe)
          </button>
          <button
            onClick={() => toggleMode.mutate({ mode: 'live' })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentMode === 'live' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            Live (Real Money)
          </button>
        </div>
        {currentMode !== 'live' && (
          <div>
            <p className="text-xs text-red-400 mb-2 font-medium">To enable live trading, type the confirmation phrase:</p>
            <input
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
              placeholder="I UNDERSTAND THIS USES REAL MONEY"
              className="w-full bg-gray-800 border border-red-700 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none"
            />
            <button
              onClick={() => toggleMode.mutate({ mode: 'live', confirmation })}
              disabled={confirmation !== 'I UNDERSTAND THIS USES REAL MONEY'}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              Activate Live Trading
            </button>
          </div>
        )}
      </div>

      {/* Risk Parameters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold mb-4">Risk Parameters</h2>
        <div className="space-y-3">
          {[
            { key: 'daily_loss_limit_pct', label: 'Daily Loss Limit', hint: 'e.g. 0.03 = 3%' },
            { key: 'max_position_pct', label: 'Max Position Size', hint: 'e.g. 0.20 = 20% of portfolio' },
            { key: 'max_open_positions', label: 'Max Open Positions', hint: 'e.g. 3' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-sm text-gray-300 block mb-1">{f.label}</label>
              <div className="flex gap-2">
                <input
                  defaultValue={settings?.[f.key] ?? ''}
                  onBlur={e => updateSetting.mutate({ [f.key]: e.target.value })}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-gray-500 self-center">{f.hint}</span>
              </div>
            </div>
          ))}
        </div>
        {saved && <p className="text-green-400 text-sm mt-2">Saved</p>}
      </div>

      {/* Agent Toggle */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-semibold">Auto-Trading Agent</h2>
            <p className="text-sm text-gray-400 mt-0.5">Enable/disable the scheduled agent cron runs</p>
          </div>
          <button
            onClick={() => updateSetting.mutate({ agent_enabled: settings?.agent_enabled === 'true' ? 'false' : 'true' })}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${settings?.agent_enabled === 'true' ? 'bg-indigo-600' : 'bg-gray-700'}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${settings?.agent_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Watchlist */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold mb-2">Watchlist</h2>
        <p className="text-xs text-gray-400 mb-3">Comma-separated stock symbols the agent will scan</p>
        <textarea
          defaultValue={settings?.watchlist ?? 'QQQ,SPY,AAPL,MSFT,NVDA,TSLA'}
          onBlur={e => updateSetting.mutate({ watchlist: e.target.value })}
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      {/* API Keys hint */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold mb-2">API Keys</h2>
        <p className="text-sm text-gray-400">
          API keys are stored as Cloudflare Worker Secrets and are never exposed here.
          To update them, run:
        </p>
        <pre className="mt-2 bg-gray-800 rounded p-3 text-xs text-gray-300">
{`wrangler secret put ALPACA_API_KEY
wrangler secret put ALPACA_API_SECRET
wrangler secret put ANTHROPIC_API_KEY`}
        </pre>
      </div>
    </div>
  );
}
