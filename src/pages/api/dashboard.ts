// src/pages/api/dashboard.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

const MOCK_DATA = {
  stats: { active_signals: 0, buy_signals: 0, sell_signals: 0, last_scan: null },
  signals: [],
  top_quant_score: [],
  top_volume_growth: [],
  top_momentum: [],
  top_breakout: [],
  top_relative_strength: [],
  heatmap: [],
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (!isSupabaseConfigured()) {
    return res.status(200).json({
      data: MOCK_DATA,
      error: null,
      warning: 'Supabase ยังไม่ได้ตั้งค่า — กรุณาแก้ไข .env.local แล้วรีสตาร์ท server',
      timestamp: new Date().toISOString(),
    })
  }

  try {
    // Query แยกกันทั้งหมด — ไม่ใช้ foreign key join ข้ามตาราง
    const [
      signalsRes,
      scoresRes,
      marketDataRes,
      indicatorsRes,
      heatmapRes,
      logsRes,
    ] = await Promise.all([
      supabaseAdmin.from('signals').select('*')
        .eq('is_active', true)
        .order('triggered_at', { ascending: false })
        .limit(20),

      supabaseAdmin.from('scores').select(
        'symbol, total_score, trend_score, volume_score, momentum_score, breakout_score, relative_strength_score, scored_at'
      ).order('total_score', { ascending: false }).limit(50),

      supabaseAdmin.from('market_data').select(
        'symbol, last_price, change_pct_24h, volume, high_24h, low_24h, timestamp'
      ).order('timestamp', { ascending: false }).limit(200),

      supabaseAdmin.from('indicators').select(
        'symbol, rsi14, macd_histogram, ema20, ema50, atr'
      ).limit(200),

      supabaseAdmin.from('market_data').select(
        'symbol, change_pct_24h, volume'
      ).order('volume', { ascending: false }).limit(50),

      supabaseAdmin.from('system_logs').select('*')
        .eq('log_type', 'CRON')
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    // ตรวจสอบ errors
    const errors = [signalsRes, scoresRes, marketDataRes, indicatorsRes, heatmapRes, logsRes]
      .filter(r => r.error)
    if (errors.length > 0) {
      const errMsg = errors[0].error?.message || 'Unknown error'
      return res.status(200).json({
        data: MOCK_DATA,
        error: null,
        warning: `Supabase query error: ${errMsg} — ตรวจสอบว่าได้รัน SQL Schema แล้ว`,
        timestamp: new Date().toISOString(),
      })
    }

    // สร้าง Map สำหรับ market_data และ indicators (ใช้ symbol เป็น key)
    const mdMap = new Map<string, typeof marketDataRes.data[0]>()
    for (const md of (marketDataRes.data || [])) {
      if (!mdMap.has(md.symbol)) mdMap.set(md.symbol, md) // เอาแค่ล่าสุด
    }

    const indMap = new Map<string, typeof indicatorsRes.data[0]>()
    for (const ind of (indicatorsRes.data || [])) {
      indMap.set(ind.symbol, ind)
    }

    // Merge scores + market_data + indicators
    const scores = (scoresRes.data || []).map(s => ({
      ...s,
      market_data: mdMap.get(s.symbol) || null,
      indicators: indMap.get(s.symbol) || null,
    }))

    // Top lists
    const topScore = [...scores].sort((a, b) => b.total_score - a.total_score).slice(0, 10)
    const topVolume = [...scores].sort((a, b) => b.volume_score - a.volume_score).slice(0, 10)
    const topMomentum = [...scores].sort((a, b) => b.momentum_score - a.momentum_score).slice(0, 10)
    const topBreakout = [...scores].sort((a, b) => b.breakout_score - a.breakout_score).slice(0, 10)
    const topRS = [...scores].sort((a, b) => b.relative_strength_score - a.relative_strength_score).slice(0, 10)

    const signals = signalsRes.data || []
    const buy_signals = signals.filter(s => s.signal_type === 'BUY')
    const sell_signals = signals.filter(s => s.signal_type === 'SELL')

    // Heatmap — deduplicate by symbol (latest only)
    const heatmapMap = new Map<string, { symbol: string; change_pct_24h: number; volume: number }>()
    for (const h of (heatmapRes.data || [])) {
      if (!heatmapMap.has(h.symbol)) heatmapMap.set(h.symbol, h)
    }

    return res.status(200).json({
      data: {
        stats: {
          active_signals: signals.length,
          buy_signals: buy_signals.length,
          sell_signals: sell_signals.length,
          last_scan: logsRes.data?.[0]?.created_at || null,
        },
        signals,
        top_quant_score: topScore,
        top_volume_growth: topVolume,
        top_momentum: topMomentum,
        top_breakout: topBreakout,
        top_relative_strength: topRS,
        heatmap: Array.from(heatmapMap.values()).slice(0, 50),
      },
      error: null,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return res.status(200).json({
      data: MOCK_DATA,
      error: null,
      warning: `เกิดข้อผิดพลาด: ${String(error)}`,
      timestamp: new Date().toISOString(),
    })
  }
}
