// src/pages/coins.tsx
import { useState, useEffect, useCallback } from 'react'
import { useMounted } from '@/hooks/useMounted'
import Head from 'next/head'
import Link from 'next/link'
import { Card, ScoreBadge, SignalBadge, Change, RSIBadge, Spinner } from '@/components/ui'

interface CoinRow {
  id: string
  symbol: string
  base_currency: string
  market_data: {
    last_price: number
    change_pct_24h: number
    volume: number
    high_24h: number
    low_24h: number
  } | null
  scores: {
    total_score: number
    trend_score: number
    volume_score: number
    momentum_score: number
  } | null
  indicators: {
    rsi14: number | null
    macd_histogram: number | null
    ema20: number | null
  } | null
  signals: {
    signal_type: 'BUY' | 'SELL'
    signal_strength: string
    is_active: boolean
  } | null
}

type SortKey = 'symbol' | 'last_price' | 'change_pct_24h' | 'volume' | 'total_score' | 'rsi14'
type SortDir = 'asc' | 'desc'

export default function CoinsPage() {
  const [coins, setCoins] = useState<CoinRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('total_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterSignal, setFilterSignal] = useState<'ALL' | 'BUY' | 'SELL'>('ALL')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const mounted = useMounted()
  const LIMIT = 50

  const fetchCoins = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search ? { search } : {}),
      })
      const res = await fetch(`/api/coins?${params}`)
      const json = await res.json()
      setCoins(json.data?.data || [])
      setTotal(json.data?.total || 0)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchCoins() }, [fetchCoins])

  // Client-side sort & filter
  const processed = [...coins]
    .filter(c => {
      if (filterSignal === 'ALL') return true
      return c.signals?.signal_type === filterSignal && c.signals?.is_active
    })
    .sort((a, b) => {
      let av: number, bv: number
      switch (sortKey) {
        case 'symbol': return sortDir === 'asc'
          ? a.symbol.localeCompare(b.symbol)
          : b.symbol.localeCompare(a.symbol)
        case 'last_price':
          av = a.market_data?.last_price ?? 0; bv = b.market_data?.last_price ?? 0; break
        case 'change_pct_24h':
          av = a.market_data?.change_pct_24h ?? 0; bv = b.market_data?.change_pct_24h ?? 0; break
        case 'volume':
          av = a.market_data?.volume ?? 0; bv = b.market_data?.volume ?? 0; break
        case 'total_score':
          av = a.scores?.total_score ?? 0; bv = b.scores?.total_score ?? 0; break
        case 'rsi14':
          av = a.indicators?.rsi14 ?? 0; bv = b.indicators?.rsi14 ?? 0; break
        default: return 0
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="text-text-muted ml-1">↕</span>
    return <span className="text-accent ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <>
      <Head><title>All Coins — Quant Screener</title></Head>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
            <Link href="/" className="text-text-secondary hover:text-accent text-sm transition-colors">
              ← Dashboard
            </Link>
            <h1 className="text-sm font-bold text-text-primary">รายการเหรียญทั้งหมด</h1>
            <span className="text-xs text-text-secondary font-mono ml-auto">{total} coins</span>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-4 py-5">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              placeholder="ค้นหา symbol..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent w-48 font-mono"
            />
            <div className="flex gap-1">
              {(['ALL', 'BUY', 'SELL'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterSignal(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    filterSignal === f
                      ? f === 'BUY' ? 'bg-bull text-white'
                        : f === 'SELL' ? 'bg-bear text-white'
                        : 'bg-accent text-background'
                      : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {f === 'ALL' ? 'ทั้งหมด' : f}
                </button>
              ))}
            </div>
          </div>

          <Card>
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        { key: 'symbol', label: 'Symbol' },
                        { key: 'last_price', label: 'ราคา (฿)' },
                        { key: 'change_pct_24h', label: '24H%' },
                        { key: 'volume', label: 'Volume' },
                        { key: 'rsi14', label: 'RSI14' },
                        { key: 'total_score', label: 'Score' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => toggleSort(col.key as SortKey)}
                          className="text-left py-2 px-3 text-xs text-text-secondary font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                        >
                          {col.label}<SortIcon k={col.key as SortKey} />
                        </th>
                      ))}
                      <th className="text-left py-2 px-3 text-xs text-text-secondary font-medium">Signal</th>
                      <th className="text-left py-2 px-3 text-xs text-text-secondary font-medium">MACD</th>
                      <th className="text-left py-2 px-3 text-xs text-text-secondary font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processed.map((coin) => {
                      const macdH = coin.indicators?.macd_histogram
                      const isBullMacd = macdH !== null && macdH !== undefined && macdH > 0
                      const price = coin.market_data?.last_price ?? 0
                      const ema20 = coin.indicators?.ema20
                      const aboveEma = ema20 ? price > ema20 : null
                      return (
                        <tr key={coin.id} className="border-b border-border/40 hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-text-primary">
                              {coin.symbol.replace('THB_', '')}
                            </span>
                            <span className="text-text-secondary text-xs">/THB</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs text-text-primary text-right">
                            {price > 0 ? mounted ? `฿${price.toLocaleString('th-TH', { maximumFractionDigits: 6 })}` : `฿${price}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {coin.market_data
                              ? <Change value={coin.market_data.change_pct_24h} />
                              : <span className="text-text-secondary">—</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs text-text-secondary text-right">
                            {coin.market_data
                              ? mounted ? coin.market_data.volume.toLocaleString('th-TH', { maximumFractionDigits: 0 }) : String(coin.market_data.volume)
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <RSIBadge value={coin.indicators?.rsi14 ?? null} />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {coin.scores
                              ? <ScoreBadge score={coin.scores.total_score} />
                              : <span className="text-text-secondary font-mono text-xs">—</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            {coin.signals?.is_active
                              ? <SignalBadge type={coin.signals.signal_type} />
                              : <span className="text-text-muted text-xs">—</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            {macdH !== null && macdH !== undefined ? (
                              <span className={`font-mono text-xs ${isBullMacd ? 'text-bull' : 'text-bear'}`}>
                                {isBullMacd ? '▲' : '▼'} {Math.abs(macdH).toFixed(4)}
                              </span>
                            ) : <span className="text-text-muted text-xs">—</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            {aboveEma !== null ? (
                              <span className={`text-xs ${aboveEma ? 'text-bull' : 'text-bear'}`}>
                                {aboveEma ? '↑ Above EMA20' : '↓ Below EMA20'}
                              </span>
                            ) : <span className="text-text-muted text-xs">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {processed.length === 0 && (
                  <div className="text-center py-12 text-text-secondary text-sm">
                    ไม่พบเหรียญที่ตรงกับเงื่อนไข
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {total > LIMIT && (
              <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
                <span className="text-xs text-text-secondary">
                  หน้า {page} / {Math.ceil(total / LIMIT)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-xs border border-border rounded-lg text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
                  >
                    ← ก่อนหน้า
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(total / LIMIT)}
                    className="px-3 py-1 text-xs border border-border rounded-lg text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
                  >
                    ถัดไป →
                  </button>
                </div>
              </div>
            )}
          </Card>
        </main>
      </div>
    </>
  )
}
