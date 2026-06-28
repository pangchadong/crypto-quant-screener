// src/services/scanner.ts
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { getAllTickers, getOHLCV, NormalizedTicker } from './bitkub'
import { calculateIndicators } from './indicators'
import { calculateScore } from './scoring'
import { generateSignal } from './signals'

async function log(type: 'INFO' | 'WARNING' | 'ERROR' | 'CRON', message: string, details?: unknown) {
  console.log(`[${type}] ${message}`, details ? JSON.stringify(details) : '')
  try {
    if (isSupabaseConfigured()) {
      await supabaseAdmin.from('system_logs').insert({
        log_type: type, message,
        details: details as Record<string, unknown> | null,
      })
    }
  } catch (e) { /* ignore log errors */ }
}

export async function runMarketScan(): Promise<{ success: boolean; processed: number; errors: number }> {
  if (!isSupabaseConfigured()) {
    console.error('[SCAN] Supabase not configured')
    return { success: false, processed: 0, errors: 1 }
  }

  const startTime = Date.now()
  let processed = 0
  let errors = 0

  await log('CRON', 'Market scan started')

  try {
    const tickers = await getAllTickers()
    if (tickers.length === 0) {
      await log('WARNING', 'No tickers from Bitkub')
      return { success: false, processed: 0, errors: 1 }
    }
    await log('INFO', `Fetched ${tickers.length} tickers`)

    const btcTicker = tickers.find(t => t.symbol === 'THB_BTC')
    const btcChange = btcTicker?.change_pct_24h || 0

    await upsertCoins(tickers)
    await storeMarketData(tickers)

    // ดึง coin IDs ทั้งหมดครั้งเดียว
    const { data: coins } = await supabaseAdmin.from('coins').select('id, symbol')
    const coinMap = new Map(coins?.map(c => [c.symbol, c.id]) || [])

    for (const ticker of tickers) {
      try {
        const coinId = coinMap.get(ticker.symbol)
        if (!coinId) continue
        await processOneCoin(ticker, btcChange, coinId)
        processed++
        if (processed % 50 === 0) console.log(`[SCAN] Progress: ${processed}/${tickers.length}`)
      } catch (err) {
        errors++
        console.warn(`[SCAN] Failed: ${ticker.symbol}`, err instanceof Error ? err.message : err)
      }
    }

    const duration = Date.now() - startTime
    await log('CRON', `Scan complete: ${processed} processed, ${errors} errors, ${duration}ms`)
    return { success: true, processed, errors }

  } catch (error) {
    await log('ERROR', 'Market scan failed', { error: String(error) })
    return { success: false, processed, errors: errors + 1 }
  }
}

async function upsertCoins(tickers: NormalizedTicker[]) {
  const coins = tickers.map(t => ({
    symbol: t.symbol,
    base_currency: t.symbol.replace('THB_', ''),
    quote_currency: 'THB',
    is_active: true,
  }))
  for (let i = 0; i < coins.length; i += 100) {
    const { error } = await supabaseAdmin.from('coins')
      .upsert(coins.slice(i, i + 100), { onConflict: 'symbol' })
    if (error) throw new Error(`upsertCoins: ${error.message}`)
  }
}

async function storeMarketData(tickers: NormalizedTicker[]) {
  const { data: coins } = await supabaseAdmin.from('coins').select('id, symbol')
  const coinMap = new Map(coins?.map(c => [c.symbol, c.id]) || [])
  const now = new Date().toISOString()
  const rows = tickers.filter(t => coinMap.has(t.symbol)).map(t => ({
    coin_id: coinMap.get(t.symbol)!,
    symbol: t.symbol,
    last_price: t.last_price,
    bid: t.bid,
    ask: t.ask,
    volume: t.volume,
    volume_24h: t.volume_24h,
    change_24h: t.change_24h,
    change_pct_24h: t.change_pct_24h,
    high_24h: t.high_24h,
    low_24h: t.low_24h,
    open_24h: t.open_24h,
    timestamp: now,
  }))
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabaseAdmin.from('market_data').insert(rows.slice(i, i + 100))
    if (error) throw new Error(`storeMarketData: ${error.message}`)
  }
}

async function processOneCoin(ticker: NormalizedTicker, btcChange: number, coinId: string) {
  // ลองดึง OHLCV ก่อน (daily candles)
  let candles = await getOHLCV(ticker.symbol, '1440', 300)

  let indicatorResult

  if (candles.length >= 20) {
    // มีข้อมูลเพียงพอ — คำนวณ indicators จริง
    indicatorResult = calculateIndicators(
      candles.map(c => ({ open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }))
    )
  } else {
    // ไม่มีข้อมูล OHLCV — ประมาณค่าจาก 24H data
    indicatorResult = estimateIndicatorsFromTicker(ticker)
  }

  // Upsert indicators
  await supabaseAdmin.from('indicators').upsert({
    coin_id: coinId,
    symbol: ticker.symbol,
    ...indicatorResult,
    calculated_at: new Date().toISOString(),
  }, { onConflict: 'coin_id' })

  // คำนวณ Score
  const scoreResult = calculateScore({
    last_price: ticker.last_price,
    volume: ticker.volume,
    change_pct_24h: ticker.change_pct_24h,
    indicators: indicatorResult,
    btc_change_pct_24h: btcChange,
  })

  // Upsert scores
  await supabaseAdmin.from('scores').upsert({
    coin_id: coinId,
    symbol: ticker.symbol,
    trend_score: scoreResult.trend_score,
    volume_score: scoreResult.volume_score,
    momentum_score: scoreResult.momentum_score,
    breakout_score: scoreResult.breakout_score,
    relative_strength_score: scoreResult.relative_strength_score,
    total_score: scoreResult.total_score,
    score_details: scoreResult.score_details,
    scored_at: new Date().toISOString(),
  }, { onConflict: 'coin_id' })

  // Generate & save signal
  const signalResult = generateSignal(
    ticker.last_price, ticker.volume,
    indicatorResult.volume_ma20, indicatorResult, scoreResult
  )

  if (signalResult.is_valid && signalResult.signal_type !== 'HOLD') {
    await supabaseAdmin.from('signals')
      .update({ is_active: false, expired_at: new Date().toISOString() })
      .eq('coin_id', coinId).eq('is_active', true)

    await supabaseAdmin.from('signals').insert({
      coin_id: coinId,
      symbol: ticker.symbol,
      signal_type: signalResult.signal_type,
      signal_strength: signalResult.signal_strength,
      score: scoreResult.total_score,
      entry_price: signalResult.entry_price,
      stop_loss: signalResult.stop_loss,
      take_profit: signalResult.take_profit,
      risk_reward_ratio: signalResult.risk_reward_ratio,
      reasons: signalResult.reasons,
      is_active: true,
      triggered_at: new Date().toISOString(),
    })
  }
}

// ประมาณค่า indicators จาก ticker 24H data เมื่อไม่มี OHLCV
function estimateIndicatorsFromTicker(ticker: NormalizedTicker) {
  const { last_price, high_24h, low_24h, open_24h, volume } = ticker

  // ประมาณ RSI จาก % change (rough estimate)
  const change_pct = open_24h > 0 ? ((last_price - open_24h) / open_24h) * 100 : 0
  const estimated_rsi = Math.min(80, Math.max(20, 50 + change_pct * 2))

  // ประมาณ ATR จาก High-Low range
  const estimated_atr = high_24h > 0 && low_24h > 0 ? (high_24h - low_24h) : last_price * 0.03

  return {
    ema20: last_price,  // ใช้ราคาปัจจุบันเป็น EMA20 (fallback)
    ema50: null,
    ema200: null,
    rsi14: estimated_rsi,
    macd: null,
    macd_signal: null,
    macd_histogram: null,
    atr: estimated_atr,
    bb_upper: last_price * 1.02,
    bb_middle: last_price,
    bb_lower: last_price * 0.98,
    volume_ma20: volume,  // ใช้ volume ปัจจุบันเป็น baseline
    high_20d: high_24h,
    low_20d: low_24h,
  }
}