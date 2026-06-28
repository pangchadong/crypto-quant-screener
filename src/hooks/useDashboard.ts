// src/hooks/useDashboard.ts
import { useState, useEffect, useCallback } from 'react'

interface DashboardData {
  stats: {
    active_signals: number
    buy_signals: number
    sell_signals: number
    last_scan: string | null
  }
  signals: Signal[]
  top_quant_score: TopCoin[]
  top_volume_growth: TopCoin[]
  top_momentum: TopCoin[]
  top_breakout: TopCoin[]
  top_relative_strength: TopCoin[]
  heatmap: HeatmapItem[]
}

interface Signal {
  id: string
  symbol: string
  signal_type: 'BUY' | 'SELL'
  signal_strength: 'STRONG' | 'MODERATE' | 'WEAK'
  score: number
  entry_price: number
  stop_loss: number
  take_profit: number
  risk_reward_ratio: number
  reasons: string[]
  triggered_at: string
}

interface TopCoin {
  symbol: string
  total_score?: number
  volume_score?: number
  momentum_score?: number
  breakout_score?: number
  relative_strength_score?: number
  market_data?: {
    last_price: number
    change_pct_24h: number
    volume: number
  }
  indicators?: {
    rsi14: number
    macd_histogram: number
  }
}

interface HeatmapItem {
  symbol: string
  change_pct_24h: number
  volume: number
}

const EMPTY_DATA: DashboardData = {
  stats: { active_signals: 0, buy_signals: 0, sell_signals: 0, last_scan: null },
  signals: [],
  top_quant_score: [],
  top_volume_growth: [],
  top_momentum: [],
  top_breakout: [],
  top_relative_strength: [],
  heatmap: [],
}

export function useDashboard(autoRefresh = true, intervalMs = 30000) {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard')

      // ถ้า response ไม่ใช่ JSON (เช่น HTML error page)
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        setWarning('API ยังไม่พร้อม — กรุณาตั้งค่า .env.local แล้วรีสตาร์ท server')
        setData(EMPTY_DATA)
        setLoading(false)
        return
      }

      const json = await response.json()

      if (json.warning) setWarning(json.warning)
      else setWarning(null)

      if (json.error) {
        setError(json.error)
        setData(EMPTY_DATA)
      } else {
        setData(json.data || EMPTY_DATA)
        setError(null)
      }

      setLastUpdated(new Date())
    } catch (err) {
      setWarning('ไม่สามารถเชื่อมต่อ API ได้ — ตรวจสอบ .env.local')
      setData(EMPTY_DATA)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    if (autoRefresh) {
      const interval = setInterval(fetchData, intervalMs)
      return () => clearInterval(interval)
    }
  }, [fetchData, autoRefresh, intervalMs])

  return { data, loading, error, warning, lastUpdated, refresh: fetchData }
}

export type { DashboardData, Signal, TopCoin, HeatmapItem }
