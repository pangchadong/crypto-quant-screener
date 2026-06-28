// src/services/indicators.ts
import {
  EMA,
  RSI,
  MACD,
  ATR,
  BollingerBands,
} from 'technicalindicators'

export interface IndicatorResult {
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
}

export interface OHLCV {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function calculateIndicators(candles: OHLCV[]): IndicatorResult {
  if (candles.length < 20) {
    return {
      ema20: null, ema50: null, ema200: null,
      rsi14: null, macd: null, macd_signal: null, macd_histogram: null,
      atr: null, bb_upper: null, bb_middle: null, bb_lower: null,
      volume_ma20: null, high_20d: null, low_20d: null,
    }
  }

  const closes = candles.map(c => c.close)
  const highs = candles.map(c => c.high)
  const lows = candles.map(c => c.low)
  const volumes = candles.map(c => c.volume)

  // EMA 20
  const ema20Vals = EMA.calculate({ period: 20, values: closes })
  const ema20 = ema20Vals.length > 0 ? ema20Vals[ema20Vals.length - 1] : null

  // EMA 50
  const ema50Vals = candles.length >= 50
    ? EMA.calculate({ period: 50, values: closes })
    : []
  const ema50 = ema50Vals.length > 0 ? ema50Vals[ema50Vals.length - 1] : null

  // EMA 200
  const ema200Vals = candles.length >= 200
    ? EMA.calculate({ period: 200, values: closes })
    : []
  const ema200 = ema200Vals.length > 0 ? ema200Vals[ema200Vals.length - 1] : null

  // RSI 14
  const rsiVals = candles.length >= 15
    ? RSI.calculate({ period: 14, values: closes })
    : []
  const rsi14 = rsiVals.length > 0 ? rsiVals[rsiVals.length - 1] : null

  // MACD (12, 26, 9)
  let macd: number | null = null
  let macd_signal: number | null = null
  let macd_histogram: number | null = null

  if (candles.length >= 35) {
    const macdVals = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })

    if (macdVals.length > 0) {
      const lastMacd = macdVals[macdVals.length - 1]
      macd = lastMacd.MACD ?? null
      macd_signal = lastMacd.signal ?? null
      macd_histogram = lastMacd.histogram ?? null
    }
  }

  // ATR 14
  let atr: number | null = null
  if (candles.length >= 15) {
    const atrVals = ATR.calculate({
      period: 14,
      high: highs,
      low: lows,
      close: closes,
    })
    atr = atrVals.length > 0 ? atrVals[atrVals.length - 1] : null
  }

  // Bollinger Bands (20, 2)
  let bb_upper: number | null = null
  let bb_middle: number | null = null
  let bb_lower: number | null = null

  if (candles.length >= 20) {
    const bbVals = BollingerBands.calculate({
      period: 20,
      values: closes,
      stdDev: 2,
    })

    if (bbVals.length > 0) {
      const lastBB = bbVals[bbVals.length - 1]
      bb_upper = lastBB.upper
      bb_middle = lastBB.middle
      bb_lower = lastBB.lower
    }
  }

  // Volume MA20
  const recentVolumes = volumes.slice(-20)
  const volume_ma20 = recentVolumes.length >= 20
    ? recentVolumes.reduce((a, b) => a + b, 0) / 20
    : null

  // 20-day High / Low
  const recent20Highs = highs.slice(-20)
  const recent20Lows = lows.slice(-20)
  const high_20d = recent20Highs.length > 0 ? Math.max(...recent20Highs) : null
  const low_20d = recent20Lows.length > 0 ? Math.min(...recent20Lows) : null

  return {
    ema20,
    ema50,
    ema200,
    rsi14,
    macd,
    macd_signal,
    macd_histogram,
    atr,
    bb_upper,
    bb_middle,
    bb_lower,
    volume_ma20,
    high_20d,
    low_20d,
  }
}

// Simple moving average helper
export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null
  const slice = values.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}
