// src/pages/index.tsx
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useDashboard } from '@/hooks/useDashboard'
import { StatCard, Card, Spinner } from '@/components/ui'
import SignalBoard from '@/components/dashboard/SignalBoard'
import TopCoinsTable from '@/components/dashboard/TopCoinsTable'
import Heatmap from '@/components/dashboard/Heatmap'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'

type TabKey = 'signals' | 'top_score' | 'volume' | 'momentum' | 'breakout' | 'rs' | 'heatmap'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'signals', label: 'สัญญาณ' },
  { key: 'top_score', label: 'Quant Score' },
  { key: 'volume', label: 'Volume' },
  { key: 'momentum', label: 'Momentum' },
  { key: 'breakout', label: 'Breakout' },
  { key: 'rs', label: 'Rel. Strength' },
  { key: 'heatmap', label: 'Heatmap' },
]

export default function Dashboard() {
  const { data, loading, error, warning, lastUpdated, refresh } = useDashboard(true, 30000)
  const [activeTab, setActiveTab] = useState<TabKey>('signals')
  const [now, setNow] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <Head>
        <title>Crypto Quant Screener — Bitkub</title>
        <meta name="description" content="Real-time crypto screening for Bitkub exchange" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-accent" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-text-primary tracking-tight">Quant Screener</h1>
                <p className="text-[10px] text-text-secondary font-mono">Bitkub · Real-time</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {mounted && lastUpdated && (
                <span className="text-[11px] text-text-secondary font-mono hidden sm:block">
                  อัปเดต {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: th })}
                </span>
              )}
              <button
                onClick={refresh}
                disabled={loading}
                className="text-xs text-accent border border-accent/30 rounded-lg px-3 py-1.5 hover:bg-accent/10 transition-colors disabled:opacity-50"
              >
                {loading ? 'กำลังโหลด...' : '↻ รีเฟรช'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-4 py-5">
          {/* Setup Warning / Error */}
          {warning && (
            <div className="mb-4 rounded-xl border border-warn/30 bg-warn/5 overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <span className="text-warn text-lg mt-0.5 flex-shrink-0">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-warn font-semibold text-sm">{warning}</p>
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide">วิธีตั้งค่า:</p>
                    {[
                      { step: '1', text: 'ไปที่ supabase.com → สร้าง Project ใหม่' },
                      { step: '2', text: 'รัน database/migrations/001_initial_schema.sql ใน SQL Editor' },
                      { step: '3', text: 'คัดลอก URL และ API Keys จาก Settings → API' },
                      { step: '4', text: 'แก้ไขไฟล์ .env.local ใส่ค่า SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY' },
                      { step: '5', text: 'หยุด server แล้วรัน npm run dev ใหม่' },
                    ].map(item => (
                      <div key={item.step} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-warn/20 text-warn text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {item.step}
                        </span>
                        <p className="text-xs text-text-secondary">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-bear/10 border border-bear/30 rounded-lg text-bear text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard
              label="สัญญาณที่ใช้งาน"
              value={data?.stats.active_signals ?? '—'}
              color="text-accent"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
            />
            <StatCard
              label="สัญญาณซื้อ"
              value={data?.stats.buy_signals ?? '—'}
              color="text-bull"
              sub="BUY Signals"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
            />
            <StatCard
              label="สัญญาณขาย"
              value={data?.stats.sell_signals ?? '—'}
              color="text-bear"
              sub="SELL Signals"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>}
            />
            <StatCard
              label="สแกนล่าสุด"
              value={mounted && data?.stats.last_scan
                ? formatDistanceToNow(new Date(data.stats.last_scan), { addSuffix: true, locale: th })
                : '—'
              }
              color="text-warn"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            />
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  text-xs px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-all
                  ${activeTab === tab.key
                    ? 'bg-accent text-background'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface border border-border'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {loading && !data ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-3">
                <Spinner size="lg" />
                <p className="text-text-secondary text-sm">กำลังดึงข้อมูลตลาด...</p>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              {activeTab === 'signals' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card title="🟢 สัญญาณซื้อ" subtitle={`${data?.stats.buy_signals || 0} สัญญาณ`}>
                    <SignalBoard signals={data?.signals.filter(s => s.signal_type === 'BUY') || []} />
                  </Card>
                  <Card title="🔴 สัญญาณขาย" subtitle={`${data?.stats.sell_signals || 0} สัญญาณ`}>
                    <SignalBoard signals={data?.signals.filter(s => s.signal_type === 'SELL') || []} />
                  </Card>
                </div>
              )}

              {activeTab === 'top_score' && (
                <Card title="🏆 Top Quant Score" subtitle="เหรียญที่มีคะแนนรวมสูงสุด">
                  <TopCoinsTable
                    coins={data?.top_quant_score || []}
                    scoreKey="total_score"
                    label="Score"
                    maxScore={100}
                  />
                </Card>
              )}

              {activeTab === 'volume' && (
                <Card title="📊 Top Volume Growth" subtitle="เหรียญที่มี Volume สูงสุด">
                  <TopCoinsTable
                    coins={data?.top_volume_growth || []}
                    scoreKey="volume_score"
                    label="Vol Score"
                    maxScore={25}
                  />
                </Card>
              )}

              {activeTab === 'momentum' && (
                <Card title="⚡ Top Momentum" subtitle="เหรียญที่มี Momentum สูงสุด (RSI + MACD)">
                  <TopCoinsTable
                    coins={data?.top_momentum || []}
                    scoreKey="momentum_score"
                    label="Momentum"
                    maxScore={20}
                  />
                </Card>
              )}

              {activeTab === 'breakout' && (
                <Card title="🚀 Top Breakout" subtitle="เหรียญที่ทะลุแนวต้าน 20 วัน">
                  <TopCoinsTable
                    coins={data?.top_breakout || []}
                    scoreKey="breakout_score"
                    label="Breakout"
                    maxScore={15}
                  />
                </Card>
              )}

              {activeTab === 'rs' && (
                <Card title="💪 Top Relative Strength" subtitle="เหรียญที่ทำผลตอบแทนได้ดีกว่า BTC">
                  <TopCoinsTable
                    coins={data?.top_relative_strength || []}
                    scoreKey="relative_strength_score"
                    label="RS Score"
                    maxScore={15}
                  />
                </Card>
              )}

              {activeTab === 'heatmap' && (
                <Card title="🌡️ Market Heatmap" subtitle="ภาพรวมตลาด Bitkub">
                  <div className="mb-3 flex gap-3 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-bull inline-block"/>&gt;+5%</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-bull/40 inline-block"/>+2%</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-bull/20 inline-block"/>+0%</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-bear/20 inline-block"/>-2%</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-bear/70 inline-block"/>-5%</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-bear inline-block"/>&lt;-10%</span>
                  </div>
                  <Heatmap data={data?.heatmap || []} />
                </Card>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-10 py-4">
          <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-between">
            <p className="text-xs text-text-secondary">
              Crypto Quant Screener · ข้อมูลจาก Bitkub API · สแกนทุก 5 นาที
            </p>
            <p className="text-xs text-text-secondary font-mono">
              {mounted && now ? now.toLocaleTimeString('th-TH') : '—'}
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
