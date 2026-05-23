import type Anthropic from '@anthropic-ai/sdk';

export const agentTools: Anthropic.Tool[] = [
  {
    name: 'place_order',
    description: 'Place a buy or sell limit order for a stock',
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Stock ticker symbol' },
        side: { type: 'string', enum: ['buy', 'sell'] },
        quantity: { type: 'number', description: 'Number of shares (fractional OK, min $1 notional)' },
        limit_price: { type: 'number', description: 'Limit price within 0.1% of current mid' },
        strategy: { type: 'string', enum: ['rsi_reversal', 'sma_crossover', 'momentum', 'manual'] },
        reasoning: { type: 'string', description: 'Brief explanation for this trade decision' },
      },
      required: ['symbol', 'side', 'quantity', 'limit_price', 'strategy', 'reasoning'],
    },
  },
  {
    name: 'close_position',
    description: 'Close an existing open position entirely',
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        reasoning: { type: 'string' },
      },
      required: ['symbol', 'reasoning'],
    },
  },
  {
    name: 'skip_turn',
    description: 'Do nothing this cycle — no good opportunities or risk limits are near',
    input_schema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string', description: 'Why no trades are made this cycle' },
      },
      required: ['reasoning'],
    },
  },
  {
    name: 'update_watchlist',
    description: 'Add or remove symbols from the scan watchlist',
    input_schema: {
      type: 'object',
      properties: {
        add_symbols: { type: 'array', items: { type: 'string' } },
        remove_symbols: { type: 'array', items: { type: 'string' } },
      },
    },
  },
];
