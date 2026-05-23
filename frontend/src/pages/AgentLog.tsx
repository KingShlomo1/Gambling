import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';

interface AgentLog {
  id: number; run_id: string; log_type: string; subagent: string | null;
  symbol: string | null; message: string; data: string | null; created_at: string;
}

const logColors: Record<string, string> = {
  error: 'bg-red-900 text-red-300',
  action: 'bg-blue-900 text-blue-300',
  decision: 'bg-purple-900 text-purple-300',
  info: 'bg-gray-700 text-gray-300',
};

export default function AgentLog() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['agent-logs'],
    queryFn: () => api.get<AgentLog[]>('/api/agent/logs?limit=100'),
    refetchInterval: 10000,
  });

  // Group by run_id
  const grouped = (logs ?? []).reduce<Record<string, AgentLog[]>>((acc, l) => {
    (acc[l.run_id] ??= []).push(l);
    return acc;
  }, {});

  const runs = Object.entries(grouped).sort(([, a], [, b]) =>
    new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime()
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Agent Log</h1>
      <p className="text-gray-400 text-sm">Full audit trail of agent decisions, actions, and errors. Grouped by run.</p>

      {isLoading && <div className="text-gray-400">Loading...</div>}

      {runs.map(([runId, entries]) => (
        <div key={runId} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
            <span className="text-xs font-mono text-gray-400">Run {runId.slice(0, 8)}...</span>
            <span className="text-xs text-gray-500">{new Date(entries[0].created_at).toLocaleString()}</span>
          </div>
          <div className="divide-y divide-gray-800">
            {entries.map(l => (
              <div key={l.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${logColors[l.log_type] ?? 'bg-gray-700 text-gray-300'}`}>
                    {l.log_type}
                  </span>
                  {l.subagent && <span className="text-xs text-gray-500">{l.subagent}</span>}
                  {l.symbol && <span className="text-xs text-indigo-400 font-medium">{l.symbol}</span>}
                  <span className="text-xs text-gray-500 ml-auto">{new Date(l.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-gray-300">{l.message}</p>
                {l.data && (
                  <button
                    onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                    className="text-xs text-indigo-400 mt-1 hover:underline"
                  >
                    {expanded === l.id ? 'Hide data' : 'Show data'}
                  </button>
                )}
                {expanded === l.id && l.data && (
                  <pre className="mt-2 bg-gray-800 rounded p-3 text-xs text-gray-300 overflow-auto max-h-48">
                    {JSON.stringify(JSON.parse(l.data), null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!isLoading && runs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No agent runs yet.</p>
          <p className="text-sm mt-1">Trigger a run from the Dashboard or wait for the scheduled cron.</p>
        </div>
      )}
    </div>
  );
}
