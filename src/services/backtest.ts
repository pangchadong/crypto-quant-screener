// src/services/backtest.ts
import { getOHLCV } from './bitkub'
import { calculateIndicators } from './indicators'
import { calculateScore } from './scoring'
import { generateSignal } from './signals'
import { BacktestResult, BacktestTrade } from '@/types'
// uuid replaced with crypto.randomUUID()

interface BacktestParams {
  symbol: string
  period: '1M' | '3M' | '6M' | '1Y'
  btc_symbol?: string
}

const PERIOD_DAYS: Record<string, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
}

export async function runBacktest(params: BacktestParams): Promise<BacktestResult> {
  const { symbol, period } = params
  const days = PERIOD_DAYS[period]

  // Get historical data (daily candles)
  const candles = await getOHLCV(symbol, '1440', days + 250) // extra for indicators

  if (candles.length < 50) {
    throw new Error(`Insufficient data for ${symbol}: only ${candles.length} candles`)
  }

  // Get BTC data for relative strength
  const btcCandles = await getOHLCV('THB_BTC', '1440', days + 250)

  const trades: BacktestTrade[] = []
  let position: { entry_date: string; entry_price: number } | null = null

  const testStartIdx = candles.length - days
  const testCandles = candles.slice(testStartIdx)

  for (let i = 50; i < testCandles.length; i++) {
    const lookback = candles.slice(0, testStartIdx + i)

    const indicators = calculateIndicators(
      lookback.map(c => ({
        open: c.open, high: c.high, low: c.low,
        close: c.close, volume: c.volume,
      }))
    )

    const current = testCandles[i]
    const btcIdx = btcCandles.length - testCandles.length + i
    const btcCurrent = btcCandles[btcIdx]
    const btcPrev = btcCandles[btcIdx - 1]
    const btcChange = btcPrev && btcCurrent
      ? ((btcCurrent.close - btcPrev.close) / btcPrev.close) * 100
      : 0

    const prev = testCandles[i - 1]
    const change_pct_24h = prev ? ((current.close - prev.close) / prev.close) * 100 : 0

    const scoring = calculateScore({
      last_price: current.close,
      volume: current.volume,
      change_pct_24h,
      indicators,
      btc_change_pct_24h: btcChange,
    })

    const signal = generateSignal(
      current.close,
      current.volume,
      indicators.volume_ma20,
      indicators,
      scoring
    )

    if (!position && signal.signal_type === 'BUY' && signal.is_valid) {
      position = {
        entry_date: new Date(current.timestamp).toISOString(),
        entry_price: current.close,
      }
    } else if (position) {
      const should_exit =
        signal.signal_type === 'SELL' ||
        current.close <= signal.stop_loss ||
        current.close >= signal.take_profit

      if (should_exit) {
        const pnl = current.close - position.entry_price
        const pnl_pct = (pnl / position.entry_price) * 100
        const entryDate = new Date(position.entry_date)
        const exitDate = new Date(current.timestamp)
        const hold_days = Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))

        trades.push({
          symbol,
          entry_date: position.entry_date,
          exit_date: exitDate.toISOString(),
          entry_price: position.entry_price,
          exit_price: current.close,
          side: 'LONG',
          pnl,
          pnl_pct,
          hold_days,
        })

        position = null
      }
    }
  }

  // Calculate performance metrics
  const total_trades = trades.length
  const winning_trades = trades.filter(t => t.pnl > 0).length
  const losing_trades = trades.filter(t => t.pnl <= 0).length
  const win_rate = total_trades > 0 ? (winning_trades / total_trades) * 100 : 0

  const gross_profit = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl_pct, 0)
  const gross_loss = Math.abs(trades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl_pct, 0))
  const profit_factor = gross_loss > 0 ? gross_profit / gross_loss : gross_profit > 0 ? 999 : 0

  // Max drawdown
  let peak = 0
  let max_drawdown = 0
  let cumulative = 0
  for (const trade of trades) {
    cumulative += trade.pnl_pct
    if (cumulative > peak) peak = cumulative
    const drawdown = peak - cumulative
    if (drawdown > max_drawdown) max_drawdown = drawdown
  }

  // Sharpe Ratio (simplified, assuming risk-free rate = 0)
  const returns = trades.map(t => t.pnl_pct)
  const avg_return = returns.reduce((a, b) => a + b, 0) / (returns.length || 1)
  const std_dev = Math.sqrt(
    returns.reduce((s, r) => s + Math.pow(r - avg_return, 2), 0) / (returns.length || 1)
  )
  const sharpe_ratio = std_dev > 0 ? avg_return / std_dev : 0

  // Expectancy
  const avg_win = winning_trades > 0
    ? trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl_pct, 0) / winning_trades
    : 0
  const avg_loss = losing_trades > 0
    ? Math.abs(trades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl_pct, 0) / losing_trades)
    : 0
  const win_rate_decimal = win_rate / 100
  const expectancy = (win_rate_decimal * avg_win) - ((1 - win_rate_decimal) * avg_loss)

  const total_return = trades.reduce((s, t) => s + t.pnl_pct, 0)

  const now = new Date()
  const period_end = now.toISOString()
  const period_start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

  return {
    id: Math.random().toString(36).substring(2) + Date.now().toString(36),
    strategy_name: 'Quant Screener Strategy',
    symbol,
    period_start,
    period_end,
    total_trades,
    winning_trades,
    losing_trades,
    win_rate: parseFloat(win_rate.toFixed(2)),
    profit_factor: parseFloat(profit_factor.toFixed(2)),
    max_drawdown: parseFloat(max_drawdown.toFixed(2)),
    sharpe_ratio: parseFloat(sharpe_ratio.toFixed(2)),
    expectancy: parseFloat(expectancy.toFixed(2)),
    total_return: parseFloat(total_return.toFixed(2)),
    parameters: {
      buy_score_threshold: 85,
      rsi_min: 55,
      rsi_max: 70,
      volume_spike_threshold: 2.0,
      max_stop_loss_pct: 3,
      min_risk_reward: 3,
    },
    trades,
    created_at: now.toISOString(),
  }
}