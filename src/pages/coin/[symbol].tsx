// src/pages/coin/[symbol].tsx
import { useState, useEffect } from 'react'
import { useMounted } from '@/hooks/useMounted'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { Card, ScoreBadge, SignalBadge, Change, ScoreBar, RSIBadge, Spinner } from '@/components/ui'
import PriceChart from '@/components/charts/PriceChart'
import ScoreRadar from '@/components/charts/ScoreRadar'
import { getOHLCV } from '@/services/bitkub'

interface CoinDetail {
  id: string
  symbol: string
  base_currency: string
  market_data: {
    last_price: number
    bid: number
    ask: number
    change_pct_24h: number
    volume: number
    high_24h: number
    low_24h: number
    timestamp: string
  } | null
  indicators: {
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
    calculated_at: string
  } | null
  scores: {
    total_score: number
    trend_score: number
    volume_score: number
    momentum_score: number
    breakout_score: number
    relative_strength_score: number
    score_details: Record<string, unknown>
    scored_at: string
  } | null
  signals: {
    signal_type: 'BUY' | 'SELL'
    signal_strength: string
    entry_price: number
    stop_loss: number
    take_profit: number
    risk_reward_ratio: number
    reasons: string[]
    triggered_at: string
    is_active: boolean
  } | null
}

export default function CoinDetailPage() {
  const router = useRouter()
  const { symbol } = router.query
  const [coin, setCoin] = useState<CoinDetail | null>(null)
  const [priceHistory, setPriceHistory] = useState<{ timestamp: number; close: number; volume: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [chartPeriod, setChartPeriod] = useState<'7D' | '30D' | '90D'>('30D')
  const mounted = useMounted()

  useEffect(() => {
    if (!symbol) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch coin details
        const res = await fetch(`/api/coins?search=${symbol}&limit=1`)
        const json = await res.json()
        if (json.data?.data?.[0]) setCoin(json.data.data[0])

        // Fetch price history from client API
        const histRes = await fetch(`/api/price-history?symbol=${symbol}&period=${chartPeriod}`)
        const histJson = await histRes.json()
        setPriceHistory(histJson.data || [])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol, chartPeriod])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!coin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-text-secondary">
        ไม่พบเหรียญ {symbol}
      </div>
    )
  }

  const displaySymbol = String(symbol).replace('THB_', '')
  const md = coin.market_data
  const ind = coin.indicators
  const sc = coin.scores
  const sig = coin.signals

  return (
    <>
      <Head><title>{displaySymbol}/THB — Quant Screener</title></Head>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-4">
            <Link href="/" className="text-text-secondary hover:text-accent text-sm transition-colors">
              ← Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-text-primary">{displaySymbol}</h1>
              <span className="text-text-secondary text-sm">/THB</span>
              {sig?.is_active && <SignalBadge type={sig.signal_type} />}
            </div>
            {sc && <ScoreBadge score={sc.total_score} />}
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-4 py-5">
          {/* Price Header */}
          <div className="flex flex-wrap items-end gap-4 mb-5">
            <div>
              <p className="text-3xl font-bold font-mono text-text-primary">
                ฿{mounted ? (md?.last_price.toLocaleString('th-TH', { maximumFractionDigits: 6 }) ?? '—') : (md?.last_price ?? '—')}
              </p>
              {md && <Change value={md.change_pct_24h} />}
            </div>
            <div className="flex gap-4 text-sm text-text-secondary ml-auto">
              <div><p className="text-xs">24H High</p><p className="font-mono text-bull">฿{mounted ? (md?.high_24h.toLocaleString() ?? '—') : (md?.high_24h ?? '—')}</p></div>
              <div><p className="text-xs">24H Low</p><p className="font-mono text-bear">฿{mounted ? (md?.low_24h.toLocaleString() ?? '—') : (md?.low_24h ?? '—')}</p></div>
              <div><p className="text-xs">Volume</p><p className="font-mono text-text-primary">{mounted ? (md?.volume.toLocaleString() ?? '—') : (md?.volume ?? '—')}</p></div>
              <div><p className="text-xs">Bid</p><p className="font-mono text-text-secondary">฿{mounted ? (md?.bid.toLocaleString() ?? '—') : (md?.bid ?? '—')}</p></div>
              <div><p className="text-xs">Ask</p><p className="font-mono text-text-secondary">฿{mounted ? (md?.ask.toLocaleString() ?? '—') : (md?.ask ?? '—')}</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart */}
            <div className="lg:col-span-2 space-y-4">
              <Card
                title="กราฟราคา"
                action={
                  <div className="flex gap-1">
                    {(['7D', '30D', '90D'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          chartPeriod === p
                            ? 'bg-accent text-background'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                }
              >
                <PriceChart data={priceHistory} />
              </Card>

              {/* Technical Indicators Table */}
              <Card title="Technical Indicators">
                {ind ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'EMA 20', value: ind.ema20?.toFixed(4) ?? '—', color: ind.ema20 && md && md.last_price > ind.ema20 ? 'text-bull' : 'text-bear' },
                      { label: 'EMA 50', value: ind.ema50?.toFixed(4) ?? '—', color: ind.ema50 && md && md.last_price > ind.ema50 ? 'text-bull' : 'text-bear' },
                      { label: 'EMA 200', value: ind.ema200?.toFixed(4) ?? '—', color: ind.ema200 && md && md.last_price > ind.ema200 ? 'text-bull' : 'text-bear' },
                      { label: 'RSI 14', value: ind.rsi14?.toFixed(2) ?? '—', color: ind.rsi14 && ind.rsi14 >= 55 && ind.rsi14 <= 70 ? 'text-bull' : ind.rsi14 && ind.rsi14 > 80 ? 'text-bear' : 'text-text-secondary' },
                      { label: 'MACD', value: ind.macd?.toFixed(6) ?? '—', color: ind.macd && ind.macd_signal && ind.macd > ind.macd_signal ? 'text-bull' : 'text-bear' },
                      { label: 'MACD Signal', value: ind.macd_signal?.toFixed(6) ?? '—', color: 'text-text-secondary' },
                      { label: 'MACD Histogram', value: ind.macd_histogram?.toFixed(6) ?? '—', color: ind.macd_histogram && ind.macd_histogram > 0 ? 'text-bull' : 'text-bear' },
                      { label: 'ATR 14', value: ind.atr?.toFixed(4) ?? '—', color: 'text-text-secondary' },
                      { label: 'BB Upper', value: ind.bb_upper?.toFixed(4) ?? '—', color: 'text-bear' },
                      { label: 'BB Middle', value: ind.bb_middle?.toFixed(4) ?? '—', color: 'text-text-secondary' },
                      { label: 'BB Lower', value: ind.bb_lower?.toFixed(4) ?? '—', color: 'text-bull' },
                    ].map(item => (
                      <div key={item.label} className="bg-background rounded-lg p-2.5">
                        <p className="text-[10px] text-text-secondary">{item.label}</p>
                        <p className={`font-mono text-sm font-medium ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-text-secondary text-sm">ยังไม่มีข้อมูล Indicators</div>
                )}
              </Card>
            </div>

            {/* Right Column: Score + Signal */}
            <div className="space-y-4">
              {/* Score Radar */}
              {sc && (
                <Card title="Quant Score Breakdown" subtitle={`คะแนนรวม: ${sc.total_score}/100`}>
                  <ScoreRadar
                    trend={sc.trend_score}
                    volume={sc.volume_score}
                    momentum={sc.momentum_score}
                    breakout={sc.breakout_score}
                    relative_strength={sc.relative_strength_score}
                  />
                  <div className="space-y-2 mt-3">
                    {[
                      { label: 'Trend', value: sc.trend_score, max: 25 },
                      { label: 'Volume', value: sc.volume_score, max: 25 },
                      { label: 'Momentum', value: sc.momentum_score, max: 20 },
                      { label: 'Breakout', value: sc.breakout_score, max: 15 },
                      { label: 'Relative Strength', value: sc.relative_strength_score, max: 15 },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-secondary">{row.label}</span>
                          <span className="font-mono text-text-primary">{row.value}/{row.max}</span>
                        </div>
                        <ScoreBar value={row.value} max={row.max} />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Signal Card */}
              {sig?.is_active && (
                <Card title="สัญญาณการซื้อขาย">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <SignalBadge type={sig.signal_type} />
                      <span className="text-xs text-text-secondary">{sig.signal_strength}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-text-secondary">Entry Price</span>
                        <span className="font-mono text-sm text-text-primary">฿{mounted ? sig.entry_price.toLocaleString('th-TH', { maximumFractionDigits: 4 }) : sig.entry_price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-text-secondary">Stop Loss</span>
                        <span className="font-mono text-sm text-bear">฿{mounted ? sig.stop_loss.toLocaleString('th-TH', { maximumFractionDigits: 4 }) : sig.stop_loss}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-text-secondary">Take Profit</span>
                        <span className="font-mono text-sm text-bull">฿{mounted ? sig.take_profit.toLocaleString('th-TH', { maximumFractionDigits: 4 }) : sig.take_profit}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2">
                        <span className="text-xs text-text-secondary">Risk:Reward</span>
                        <span className="font-mono text-sm text-accent">1:{sig.risk_reward_ratio.toFixed(1)}</span>
                      </div>
                    </div>
                    {sig.reasons.length > 0 && (
                      <div className="border-t border-border pt-2 space-y-1">
                        <p className="text-xs text-text-secondary mb-1">เหตุผล:</p>
                        {sig.reasons.map((r, i) => (
                          <p key={i} className="text-xs text-text-secondary flex gap-1">
                            <span className="text-accent">›</span>{r}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
