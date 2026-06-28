// src/services/signals.ts
import { SignalType, SignalStrength } from '@/types'
import { IndicatorResult } from './indicators'
import { ScoringResult } from './scoring'

export interface SignalResult {
  signal_type: SignalType
  signal_strength: SignalStrength
  entry_price: number
  stop_loss: number
  take_profit: number
  risk_reward_ratio: number
  reasons: string[]
  is_valid: boolean
}

export function generateSignal(
  last_price: number,
  volume: number,
  volume_ma20: number | null,
  indicators: IndicatorResult,
  scoring: ScoringResult
): SignalResult {
  const {
    rsi14, macd, macd_signal, macd_histogram,
    ema20, ema50, atr,
  } = indicators

  const { total_score } = scoring
  const reasons: string[] = []

  const volume_ratio = volume_ma20 && volume_ma20 > 0 ? volume / volume_ma20 : 0
  const macd_bullish = macd !== null && macd_signal !== null && macd > macd_signal
  const macd_bearish = macd !== null && macd_signal !== null && macd < macd_signal

  // ── BUY Signal Conditions ────────────────────────────────
  const buy_conditions = {
    score_high: total_score > 85,
    rsi_in_zone: rsi14 !== null && rsi14 >= 55 && rsi14 <= 70,
    macd_bullish,
    volume_spike: volume_ratio > 2.0,
    price_above_emas: ema20 !== null && ema50 !== null && last_price > ema20 && ema20 > ema50,
  }

  const buy_count = Object.values(buy_conditions).filter(Boolean).length

  // ── SELL Signal Conditions ───────────────────────────────
  const sell_conditions = {
    score_low: total_score < 70,
    macd_bearish,
    rsi_overbought: rsi14 !== null && rsi14 > 80,
  }

  const sell_count = Object.values(sell_conditions).filter(Boolean).length

  // Determine signal
  let signal_type: SignalType = 'HOLD'
  let signal_strength: SignalStrength = 'WEAK'

  if (buy_conditions.score_high && buy_conditions.rsi_in_zone && buy_conditions.macd_bullish) {
    signal_type = 'BUY'
    if (buy_count >= 5) {
      signal_strength = 'STRONG'
      reasons.push('ทุกเงื่อนไขผ่าน: Score > 85, RSI 55-70, MACD Bullish, Volume Spike, ราคา > EMA20 > EMA50')
    } else if (buy_count >= 4) {
      signal_strength = 'MODERATE'
      reasons.push('เงื่อนไขหลักผ่าน: Score สูง, Momentum ดี, Volume พุ่ง')
    } else {
      signal_strength = 'WEAK'
      reasons.push('เงื่อนไขพื้นฐานผ่าน: ต้องติดตามเพิ่มเติม')
    }

    if (buy_conditions.score_high) reasons.push(`Quant Score: ${total_score}/100`)
    if (buy_conditions.rsi_in_zone) reasons.push(`RSI: ${rsi14?.toFixed(1)} อยู่ใน Zone 55-70`)
    if (buy_conditions.macd_bullish) reasons.push('MACD > Signal Line (Bullish)')
    if (buy_conditions.volume_spike) reasons.push(`Volume Spike: ${(volume_ratio * 100).toFixed(0)}% ของ MA20`)
    if (buy_conditions.price_above_emas) reasons.push('ราคา > EMA20 > EMA50')

  } else if (sell_conditions.score_low && sell_conditions.macd_bearish) {
    signal_type = 'SELL'
    if (sell_count >= 3) {
      signal_strength = 'STRONG'
    } else if (sell_count >= 2) {
      signal_strength = 'MODERATE'
    } else {
      signal_strength = 'WEAK'
    }

    if (sell_conditions.score_low) reasons.push(`Score ต่ำ: ${total_score}/100`)
    if (sell_conditions.macd_bearish) reasons.push('MACD < Signal Line (Bearish)')
    if (sell_conditions.rsi_overbought) reasons.push(`RSI Overbought: ${rsi14?.toFixed(1)}`)
  }

  // ── Risk Management ──────────────────────────────────────
  const atr_value = atr || last_price * 0.02 // Default to 2% if no ATR

  let entry_price = last_price
  let stop_loss = 0
  let take_profit = 0
  let risk_reward_ratio = 0

  if (signal_type === 'BUY') {
    stop_loss = last_price - (atr_value * 1.5)
    // Ensure stop loss max 3%
    const max_stop = last_price * 0.97
    stop_loss = Math.max(stop_loss, max_stop)

    const risk = entry_price - stop_loss
    take_profit = entry_price + (risk * 3) // 1:3 R:R
    risk_reward_ratio = (take_profit - entry_price) / (entry_price - stop_loss)
  } else if (signal_type === 'SELL') {
    entry_price = last_price
    stop_loss = last_price * 1.03 // 3% above for short
    take_profit = last_price * 0.91 // 9% below
    risk_reward_ratio = 3
  }

  // Validate: R:R must be >= 1:3 and stop loss <= 3%
  const stop_loss_pct = Math.abs((entry_price - stop_loss) / entry_price) * 100
  const is_valid =
    signal_type !== 'HOLD' &&
    risk_reward_ratio >= 3 &&
    stop_loss_pct <= 3

  return {
    signal_type,
    signal_strength,
    entry_price: parseFloat(entry_price.toFixed(8)),
    stop_loss: parseFloat(stop_loss.toFixed(8)),
    take_profit: parseFloat(take_profit.toFixed(8)),
    risk_reward_ratio: parseFloat(risk_reward_ratio.toFixed(2)),
    reasons,
    is_valid,
  }
}
