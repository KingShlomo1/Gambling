import type { Env } from '../../env';
import { getPortfolio, getTrades, updatePortfolio } from '../../services/db';
import { getPositions, closeAllPositions } from '../../services/alpaca';
import { isDailyHalted, setDailyHalt, setAgentStatus, getPositionHighWater, setPositionHighWater } from '../../services/kv';
import { log } from '../../lib/logger';

export interface RiskAssessment {
  can_trade: boolean;
  halt_reason?: string;
  available_cash: number;
  daily_pnl: number;
  daily_pnl_pct: number;
  open_positions: number;
  max_position_value: number;
}

export async function assessRisk(env: Env, runId: string): Promise<RiskAssessment> {
  const halted = await isDailyHalted(env);
  if (halted) {
    return { can_trade: false, halt_reason: 'Daily loss limit breached — halted until market close', available_cash: 0, daily_pnl: 0, daily_pnl_pct: 0, open_positions: 0, max_position_value: 0 };
  }

  const portfolio = await getPortfolio(env);
  const positions = await getPositions(env);
  const maxPositions = 3;
  const dailyLossLimit = 0.03;
  const maxPositionPct = portfolio.risk_level === 'aggressive' ? 0.25 : portfolio.risk_level === 'moderate' ? 0.20 : 0.15;

  // Compute daily P&L from today's closed trades
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = await getTrades(env, { status: 'filled' });
  const realizedToday = todayTrades
    .filter(t => t.closed_at?.startsWith(today) && t.realized_pnl != null)
    .reduce((s, t) => s + (t.realized_pnl ?? 0), 0);

  const unrealizedPnl = positions.reduce((s, p) => s + parseFloat(String(p.unrealized_pl ?? 0)), 0);
  const dailyPnl = realizedToday + unrealizedPnl;
  const dailyPnlPct = portfolio.current_value > 0 ? dailyPnl / portfolio.current_value : 0;

  if (dailyPnlPct <= -dailyLossLimit) {
    await setDailyHalt(env, true);
    await setAgentStatus(env, 'halted');
    await closeAllPositions(env);
    await log(env, runId, 'error', `Daily loss limit breached: ${(dailyPnlPct * 100).toFixed(2)}% — halting all trading`, {
      subagent: 'risk-manager',
      data: { daily_pnl: dailyPnl, daily_pnl_pct: dailyPnlPct, limit: dailyLossLimit },
    });
    return { can_trade: false, halt_reason: `Daily loss ${(dailyPnlPct * 100).toFixed(2)}% exceeds ${(dailyLossLimit * 100).toFixed(0)}% limit`, available_cash: 0, daily_pnl: dailyPnl, daily_pnl_pct: dailyPnlPct, open_positions: positions.length, max_position_value: 0 };
  }

  // Check trailing stops and take-profits on open positions
  for (const pos of positions) {
    const price = parseFloat(String(pos.current_price ?? 0));
    const entry = parseFloat(String(pos.avg_entry_price));
    const gainPct = entry > 0 ? (price - entry) / entry : 0;

    // Hard stop-loss: -3%
    if (gainPct <= -0.03) {
      await log(env, runId, 'action', `Stop-loss triggered for ${pos.symbol}: ${(gainPct * 100).toFixed(2)}%`, {
        subagent: 'risk-manager',
        symbol: pos.symbol,
      });
    }

    // Track high-water for trailing stop
    if (price > 0) {
      const hw = await getPositionHighWater(env, pos.symbol);
      if (!hw || price > hw) {
        await setPositionHighWater(env, pos.symbol, price);
      }
    }
  }

  const maxPositionValue = portfolio.current_value * maxPositionPct;
  const cashAvailable = parseFloat(String(portfolio.cash_available ?? 0));

  return {
    can_trade: positions.length < maxPositions && cashAvailable > 1,
    available_cash: cashAvailable,
    daily_pnl: dailyPnl,
    daily_pnl_pct: dailyPnlPct,
    open_positions: positions.length,
    max_position_value: Math.min(maxPositionValue, cashAvailable),
  };
}

export async function validateOrder(
  env: Env,
  symbol: string,
  side: string,
  quantity: number,
  limitPrice: number,
  risk: RiskAssessment
): Promise<{ valid: boolean; reason?: string }> {
  const orderValue = quantity * limitPrice;

  if (side === 'buy') {
    if (orderValue > risk.max_position_value) {
      return { valid: false, reason: `Order value $${orderValue.toFixed(2)} exceeds max position $${risk.max_position_value.toFixed(2)}` };
    }
    if (orderValue > risk.available_cash) {
      return { valid: false, reason: `Insufficient cash: need $${orderValue.toFixed(2)}, have $${risk.available_cash.toFixed(2)}` };
    }
    if (orderValue < 1) {
      return { valid: false, reason: 'Order value below $1 minimum' };
    }
  }

  return { valid: true };
}
