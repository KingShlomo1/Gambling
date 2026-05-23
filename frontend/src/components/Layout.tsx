import { Outlet, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/trades', label: 'Trades' },
  { to: '/strategies', label: 'Strategies' },
  { to: '/agent-log', label: 'Agent Log' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout() {
  const { data: status } = useQuery({
    queryKey: ['agent-status'],
    queryFn: () => api.get<{ status: string }>('/api/agent/status'),
    refetchInterval: 10000,
  });

  const statusColor = status?.status === 'running' ? 'bg-blue-500 animate-pulse'
    : status?.status === 'halted' ? 'bg-red-500'
    : status?.status === 'error' ? 'bg-orange-500'
    : 'bg-green-500';

  return (
    <div className="flex min-h-screen">
      <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-4 gap-1 shrink-0">
        <div className="mb-6 px-2">
          <span className="text-lg font-bold text-indigo-400">Wealth Agent</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span className="text-xs text-gray-400 capitalize">{status?.status ?? 'idle'}</span>
          </div>
        </div>
        {nav.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
