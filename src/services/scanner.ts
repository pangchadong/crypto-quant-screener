// src/services/scanner.ts - Fast version using only ticker data
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { getAllTickers, NormalizedTicker } from './bitkub'
import { calculateScore } from './scoring'
import { generateSignal } from './signals'

async function log(type: 'INFO' | 'WARNING' | 'ERROR' | 'CRON', message: string, details?: unknown) {
  console.log(`[${type}] ${message}`)
  try {
    if (isSupabaseConfigured()) {
      await supabaseAdmin.from('system_logs').insert({
        log_type: type, message,
        details: details as Record<string, unknown> | null,
      })
    }
  } catch (e) { /* ignore */ }
}

export async function runMarketScan(): Promise<{ success: boolean; processed: number; errors: number }> {
  if (!isSupabaseConfigured()) return { success: false, processed: 0, errors: 1 }

  const startTime = Date.now()
  await log('CRON', 'Market scan started (fast mode)')

  try {
    // 1. ดึง Tickers ทั้งหมดครั้งเดียว
    const tickers = await getAllTickers()
    if (tickers.length === 0) {
      await log('WARNING', 'No tickers from Bitkub')
      return { success: false, processed: 0, errors: 1 }
    }

    const btcTicker = tickers.find(t => t.symbol === 'THB_BTC')
    const btcChange = btcTicker?.change_pct_24h || 0

    // 2. Upsert coins (batch)
    const coins = tickers.map(t => ({
      symbol: t.symbol,
      base_currency: t.symbol.replace('THB_', ''),
      quote_currency: 'THB',
      is_active: true,
    }))
    for (let i = 0; i < coins.length; i += 100) {
      await supabaseAdmin.from('coins').upsert(coins.slice(i, i + 100), { onConflict: 'symbol' })
    }

    // 3. Get coin IDs
    const { data: coinRows } = await supabaseAdmin.from('coins').select('id, symbol')
    const coinMap = new Map(coinRows?.map(c => [c.symbol, c.id]) || [])

    // 4. Store market data (batch)
    const now = new Date().toISOString()
    const mdRows = tickers.filter(t => coinMap.has(t.symbol)).map(t => ({
      coin_id: coinMap.get(t.symbol)!,
      symbol: t.symbol,
      last_price: t.last_price, bid: t.bid, ask: t.ask,
      volume: t.volume, volume_24h: t.volume_24h,
      change_24h: t.change_24h, change_pct_24h: t.change_pct_24h,
      high_24h: t.high_24h, low_24h: t.low_24h, open_24h: t.open_24h,
      timestamp: now,
    }))
    for (let i = 0; i < mdRows.length; i += 100) {
      await supabaseAdmin.from('market_data').insert(mdRows.slice(i, i + 100))
    }

    // 5. Calculate indicators + scores + signals (all in memory, no OHLCV fetch)
    const indicatorRows: unknown[] = []
    const scoreRows: unknown[] = []
    const newSignals: unknown[] = []
    const expireSymbols: string[] = []

    for (const ticker of tickers) {
      const coinId = coinMap.get(ticker.symbol)
      if (!coinId) continue

      // Estimate indicators from 24H data
      const ind = estimateIndicators(ticker)

      indicatorRows.push({
        coin_id: coinId, symbol: ticker.symbol, ...ind,
        calculated_at: now,
      })

      // Score
      const score = calculateScore({
        last_price: ticker.last_price,
        volume: ticker.volume,
        change_pct_24h: ticker.change_pct_24h,
        indicators: ind,
        btc_change_pct_24h: btcChange,
      })

      scoreRows.push({
        coin_id: coinId, symbol: ticker.symbol,
        trend_score: score.trend_score,
        volume_score: score.volume_score,
        momentum_score: score.momentum_score,
        breakout_score: score.breakout_score,
        relative_strength_score: score.relative_strength_score,
        total_score: score.total_score,
        score_details: score.score_details,
        scored_at: now,
      })

      // Signal
      const sig = generateSignal(ticker.last_price, ticker.volume, ind.volume_ma20, ind, score)
      if (sig.is_valid && sig.signal_type !== 'HOLD') {
        expireSymbols.push(ticker.symbol)
        newSignals.push({
          coin_id: coinId, symbol: ticker.symbol,
          signal_type: sig.signal_type,
          signal_strength: sig.signal_strength,
          score: score.total_score,
          entry_price: sig.entry_price,
          stop_loss: sig.stop_loss,
          take_profit: sig.take_profit,
          risk_reward_ratio: sig.risk_reward_ratio,
          reasons: sig.reasons,
          is_active: true,
          triggered_at: now,
        })
      }
    }

    // 6. Batch upsert indicators & scores
    for (let i = 0; i < indicatorRows.length; i += 100) {
      await supabaseAdmin.from('indicators').upsert(indicatorRows.slice(i, i + 100) as Parameters<typeof supabaseAdmin.from>[0][], { onConflict: 'coin_id' })
    }
    for (let i = 0; i < scoreRows.length; i += 100) {
      await supabaseAdmin.from('scores').upsert(scoreRows.slice(i, i + 100) as Parameters<typeof supabaseAdmin.from>[0][], { onConflict: 'coin_id' })
    }

    // 7. Signals
    if (expireSymbols.length > 0) {
      await supabaseAdmin.from('signals').update({ is_active: false, expired_at: now })
        .in('symbol', expireSymbols).eq('is_active', true)
    }
    if (newSignals.length > 0) {
      await supabaseAdmin.from('signals').insert(newSignals as Parameters<typeof supabaseAdmin.from>[0][])
    }

    const duration = Date.now() - startTime
    await log('CRON', `Scan complete: ${tickers.length} processed in ${duration}ms`)
    return { success: true, processed: tickers.length, errors: 0 }

  } catch (error) {
    await log('ERROR', 'Scan failed', { error: String(error) })
    return { success: false, processed: 0, errors: 1 }
  }
}

function estimateIndicators(ticker: NormalizedTicker) {
  const { last_price, high_24h, low_24h, open_24h, volume, change_pct_24h } = ticker
  const estimated_rsi = Math.min(80, Math.max(20, 50 + change_pct_24h * 2))
  const estimated_atr = high_24h > 0 && low_24h > 0 ? (high_24h - low_24h) : last_price * 0.03
  return {
    ema20: last_price,
    ema50: null, ema200: null,
    rsi14: estimated_rsi,
    macd: null, macd_signal: null, macd_histogram: null,
    atr: estimated_atr,
    bb_upper: last_price * 1.02,
    bb_middle: last_price,
    bb_lower: last_price * 0.98,
    volume_ma20: volume,
    high_20d: high_24h,
    low_20d: low_24h,
  }
}