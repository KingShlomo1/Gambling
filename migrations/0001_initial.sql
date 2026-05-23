CREATE TABLE portfolio (
  id                INTEGER PRIMARY KEY DEFAULT 1,
  initial_capital   REAL NOT NULL,
  current_value     REAL NOT NULL,
  target_value      REAL NOT NULL,
  cash_available    REAL NOT NULL,
  mode              TEXT NOT NULL DEFAULT 'paper',
  risk_level        TEXT NOT NULL DEFAULT 'conservative',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE trades (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id    INTEGER NOT NULL DEFAULT 1,
  alpaca_order_id TEXT UNIQUE,
  symbol          TEXT NOT NULL,
  side            TEXT NOT NULL,
  quantity        REAL NOT NULL,
  entry_price     REAL,
  exit_price      REAL,
  status          TEXT NOT NULL DEFAULT 'pending',
  strategy        TEXT NOT NULL,
  signal_data     TEXT,
  realized_pnl    REAL,
  mode            TEXT NOT NULL DEFAULT 'paper',
  opened_at       TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at       TEXT,
  FOREIGN KEY (portfolio_id) REFERENCES portfolio(id)
);

CREATE INDEX trades_symbol_idx ON trades(symbol);
CREATE INDEX trades_status_idx ON trades(status);
CREATE INDEX trades_opened_at_idx ON trades(opened_at);

CREATE TABLE positions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id    INTEGER NOT NULL DEFAULT 1,
  symbol          TEXT NOT NULL UNIQUE,
  quantity        REAL NOT NULL,
  avg_entry_price REAL NOT NULL,
  current_price   REAL,
  unrealized_pnl  REAL,
  market_value    REAL,
  side            TEXT NOT NULL DEFAULT 'long',
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (portfolio_id) REFERENCES portfolio(id)
);

CREATE TABLE strategies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE,
  enabled       INTEGER NOT NULL DEFAULT 1,
  parameters    TEXT NOT NULL,
  win_rate      REAL DEFAULT 0,
  total_trades  INTEGER DEFAULT 0,
  total_pnl     REAL DEFAULT 0,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agent_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      TEXT NOT NULL,
  log_type    TEXT NOT NULL,
  subagent    TEXT,
  symbol      TEXT,
  message     TEXT NOT NULL,
  data        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX agent_logs_run_idx ON agent_logs(run_id);
CREATE INDEX agent_logs_created_idx ON agent_logs(created_at);

CREATE TABLE market_cache (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol      TEXT NOT NULL,
  timeframe   TEXT NOT NULL,
  data        TEXT NOT NULL,
  fetched_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(symbol, timeframe)
);

CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO portfolio (id, initial_capital, current_value, target_value, cash_available)
  VALUES (1, 15.00, 15.00, 30.00, 15.00);

INSERT INTO strategies (name, enabled, parameters) VALUES
  ('rsi_reversal',  1, '{"rsi_period":14,"oversold":30,"overbought":70,"position_pct":0.15}'),
  ('sma_crossover', 1, '{"fast_period":9,"slow_period":21,"position_pct":0.15}'),
  ('momentum',      1, '{"roc_period":10,"threshold":0.02,"position_pct":0.10}'),
  ('volume_spike',  0, '{"volume_multiplier":2.0,"position_pct":0.10}');

INSERT INTO settings (key, value) VALUES
  ('trading_mode',         'paper'),
  ('daily_loss_limit_pct', '0.03'),
  ('max_position_pct',     '0.20'),
  ('max_open_positions',   '3'),
  ('agent_enabled',        'true'),
  ('target_multiplier',    '2.0'),
  ('watchlist',            'QQQ,SPY,AAPL,MSFT,NVDA,TSLA');
