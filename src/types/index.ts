// src/types/index.ts

export interface Coin {
  id: string
  symbol: string
  base_currency: string
  quote_currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MarketData {
  id: string
  coin_id: string
  symbol: string
  last_price: number
  bid: number
  ask: number
  volume: number
  volume_24h: number
  change_24h: number
  change_pct_24h: number
  high_24h: number
  low_24h: number
  open_24h: number
  timestamp: string
  created_at: string
}

export interface Indicators {
  id: string
  coin_id: string
  symbol: string
  ema20: number | null
  ema50: number | null
  ema200: number | null
  rsi14: number | null
  macd: number | null
  macd_signal: number | null
  macd_histogram: number | null
  atr: number | null
  bb_upper: number | null
  bb_middle: number | null
  bb_lower: number | null
  volume_ma20: number | null
  high_20d: number | null
  low_20d: number | null
  calculated_at: string
  created_at: string
}

export interface Score {
  id: string
  coin_id: string
  symbol: string
  trend_score: number
  volume_score: number
  momentum_score: number
  breakout_score: number
  relative_strength_score: number
  total_score: number
  score_details: ScoreDetails
  scored_at: string
  created_at: string
}

export interface ScoreDetails {
  trend: {
    price_above_ema20: boolean
    ema20_above_ema50: boolean
    ema50_above_ema200: boolean
    score: number
  }
  volume: {
    current_vs_ma20: number
    is_volume_spike: boolean
    score: number
  }
  momentum: {
    rsi: number
    rsi_in_zone: boolean
    macd_bullish: boolean
    score: number
  }
  breakout: {
    price_at_high_20d: boolean
    breakout_pct: number
    score: number
  }
  relative_strength: {
    coin_return_1d: number
    btc_return_1d: number
    outperforms_btc: boolean
    score: number
  }
}

export type SignalType = 'BUY' | 'SELL' | 'HOLD'
export type SignalStrength = 'STRONG' | 'MODERATE' | 'WEAK'

export interface Signal {
  id: string
  coin_id: string
  symbol: string
  signal_type: SignalType
  signal_strength: SignalStrength
  score: number
  entry_price: number
  stop_loss: number
  take_profit: number
  risk_reward_ratio: number
  reasons: string[]
  is_active: boolean
  triggered_at: string
  expired_at: string | null
  created_at: string
}

export interface Alert {
  id: string
  user_id: string | null
  coin_id: string
  symbol: string
  alert_type: 'PRICE' | 'SIGNAL' | 'SCORE'
  condition: string
  target_value: number
  is_triggered: boolean
  triggered_at: string | null
  is_active: boolean
  created_at: string
}

export interface SystemLog {
  id: string
  log_type: 'INFO' | 'WARNING' | 'ERROR' | 'CRON'
  message: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface Watchlist {
  id: string
  user_id: string
  name: string
  coins: string[]
  created_at: string
  updated_at: string
}

export interface BacktestResult {
  id: string
  strategy_name: string
  symbol: string | null
  period_start: string
  period_end: string
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  profit_factor: number
  max_drawdown: number
  sharpe_ratio: number
  expectancy: number
  total_return: number
  parameters: Record<string, unknown>
  trades: BacktestTrade[]
  created_at: string
}

export interface BacktestTrade {
  symbol: string
  entry_date: string
  exit_date: string
  entry_price: number
  exit_price: number
  side: 'LONG' | 'SHORT'
  pnl: number
  pnl_pct: number
  hold_days: number
}

// Bitkub API types
export interface BitkubTicker {
  id: number
  last: string
  lowestAsk: string
  highestBid: string
  percentChange: string
  baseVolume: string
  quoteVolume: string
  isFrozen: string
  high24hr: string
  low24hr: string
  change: string
  prevClose: string
  prevOpen: string
}

export interface BitkubTickerResponse {
  error: number
  result: Record<string, BitkubTicker>
}

// Dashboard types
export interface DashboardStats {
  total_coins: number
  active_signals: number
  buy_signals: number
  sell_signals: number
  last_scan: string
}

export interface TopCoin {
  symbol: string
  last_price: number
  change_pct_24h: number
  volume: number
  total_score: number
  signal_type: SignalType | null
  rsi14: number | null
  macd_histogram: number | null
}

export interface HeatmapData {
  symbol: string
  change_pct_24h: number
  volume: number
  total_score: number
}

// API Response types
export interface ApiResponse<T> {
  data: T
  error: string | null
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
}
