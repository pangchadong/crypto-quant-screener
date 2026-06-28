// src/services/scoring.ts
import { IndicatorResult } from './indicators'
import { ScoreDetails } from '@/types'

export interface ScoringInput {
  last_price: number
  volume: number
  change_pct_24h: number
  indicators: IndicatorResult
  btc_change_pct_24h: number
}

export interface ScoringResult {
  trend_score: number
  volume_score: number
  momentum_score: number
  breakout_score: number
  relative_strength_score: number
  total_score: number
  score_details: ScoreDetails
}

export function calculateScore(input: ScoringInput): ScoringResult {
  const { last_price, volume, change_pct_24h, indicators, btc_change_pct_24h } = input
  const {
    ema20, ema50, ema200,
    rsi14, macd, macd_signal, macd_histogram,
    volume_ma20, high_20d,
  } = indicators

  // ── Trend Score (25 points) ──────────────────────────────
  let trend_score = 0
  const price_above_ema20 = ema20 !== null && last_price > ema20
  const ema20_above_ema50 = ema20 !== null && ema50 !== null && ema20 > ema50
  const ema50_above_ema200 = ema50 !== null && ema200 !== null && ema50 > ema200

  if (price_above_ema20) trend_score += 10
  if (ema20_above_ema50) trend_score += 10
  if (ema50_above_ema200) trend_score += 5

  // ── Volume Score (25 points) ─────────────────────────────
  let volume_score = 0
  const volume_ratio = volume_ma20 && volume_ma20 > 0 ? volume / volume_ma20 : 0
  const is_volume_spike = volume_ratio > 2.0

  if (volume_ratio >= 1.0) volume_score += 5
  if (volume_ratio >= 1.5) volume_score += 5
  if (volume_ratio >= 2.0) volume_score += 10
  if (volume_ratio >= 3.0) volume_score += 5

  // ── Momentum Score (20 points) ───────────────────────────
  let momentum_score = 0
  const rsi_in_zone = rsi14 !== null && rsi14 >= 55 && rsi14 <= 70
  const macd_bullish = macd !== null && macd_signal !== null && macd > macd_signal
  const macd_cross = macd_histogram !== null && macd_histogram > 0

  if (rsi_in_zone) momentum_score += 10
  if (macd_bullish) momentum_score += 7
  if (macd_cross) momentum_score += 3

  // ── Breakout Score (15 points) ───────────────────────────
  let breakout_score = 0
  const price_at_high_20d = high_20d !== null && last_price >= high_20d * 0.98
  const breakout_pct = high_20d && high_20d > 0
    ? ((last_price - high_20d) / high_20d) * 100
    : 0

  if (price_at_high_20d) breakout_score += 8
  if (last_price > (high_20d || 0)) breakout_score += 7

  // ── Relative Strength Score (15 points) ──────────────────
  let relative_strength_score = 0
  const outperforms_btc = change_pct_24h > btc_change_pct_24h
  const outperform_margin = change_pct_24h - btc_change_pct_24h

  if (outperforms_btc) relative_strength_score += 8
  if (outperform_margin > 2) relative_strength_score += 4
  if (outperform_margin > 5) relative_strength_score += 3

  // Cap each category
  trend_score = Math.min(25, trend_score)
  volume_score = Math.min(25, volume_score)
  momentum_score = Math.min(20, momentum_score)
  breakout_score = Math.min(15, breakout_score)
  relative_strength_score = Math.min(15, relative_strength_score)

  const total_score = trend_score + volume_score + momentum_score + breakout_score + relative_strength_score

  const score_details: ScoreDetails = {
    trend: {
      price_above_ema20,
      ema20_above_ema50,
      ema50_above_ema200,
      score: trend_score,
    },
    volume: {
      current_vs_ma20: volume_ratio,
      is_volume_spike,
      score: volume_score,
    },
    momentum: {
      rsi: rsi14 || 0,
      rsi_in_zone,
      macd_bullish,
      score: momentum_score,
    },
    breakout: {
      price_at_high_20d,
      breakout_pct,
      score: breakout_score,
    },
    relative_strength: {
      coin_return_1d: change_pct_24h,
      btc_return_1d: btc_change_pct_24h,
      outperforms_btc,
      score: relative_strength_score,
    },
  }

  return {
    trend_score,
    volume_score,
    momentum_score,
    breakout_score,
    relative_strength_score,
    total_score,
    score_details,
  }
}
