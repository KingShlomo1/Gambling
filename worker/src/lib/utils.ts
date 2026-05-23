export function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const hour = now.getUTCHours();
  const min = now.getUTCMinutes();
  const totalMin = hour * 60 + min;
  // 9:30 ET = 13:30 UTC, 4:00 ET = 20:00 UTC
  return totalMin >= 810 && totalMin < 1200;
}

export function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function err(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message, timestamp: new Date().toISOString() }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
