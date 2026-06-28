// src/pages/backtest.tsx
import { useState } from 'react'
import { useMounted } from '@/hooks/useMounted'
import Head from 'next/head'
import Link from 'next/link'
import { Card, StatCard, Spinner } from '@/components/ui'
import { BacktestResult } from '@/types'
import toast from 'react-hot-toast'

export default function BacktestPage() {
  const [symbol, setSymbol] = useState('THB_BTC')
  const [period, setPeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('3M')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const mounted = useMounted()

  const runBacktest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, period }),
      })
      const json = await response.json()
      if (json.error) throw new Error(json.error)
      setResult(json.data)
      toast.success('Backtest เสร็จสิ้น!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Backtest — Quant Screener</title></Head>
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/" className="text-text-secondary hover:text-accent text-sm">← Dashboard</Link>
            <h1 className="text-lg font-bold text-text-primary">Backtest Module</h1>
          </div>

          <Card title="ตั้งค่า Backtest" className="mb-5">
            <div className="flex gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono w-40 focus:outline-none focus:border-accent"
                  placeholder="THB_BTC"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Period</label>
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value as typeof period)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="1M">1 เดือน</option>
                  <option value="3M">3 เดือน</option>
                  <option value="6M">6 เดือน</option>
                  <option value="1Y">1 ปี</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={runBacktest}
                  disabled={loading}
                  className="bg-accent text-background px-5 py-2 rounded-lg text-sm font-semibold hover:bg-accent-dim transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <><Spinner size="sm" /> รันอยู่...</> : '▶ รัน Backtest'}
                </button>
              </div>
            </div>
          </Card>

          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard label="Win Rate" value={`${result.win_rate}%`} color={result.win_rate >= 50 ? 'text-bull' : 'text-bear'} />
                <StatCard label="Profit Factor" value={result.profit_factor} color={result.profit_factor >= 1.5 ? 'text-bull' : 'text-bear'} />
                <StatCard label="Max Drawdown" value={`${result.max_drawdown}%`} color="text-bear" />
                <StatCard label="Sharpe Ratio" value={result.sharpe_ratio} color={result.sharpe_ratio >= 1 ? 'text-bull' : 'text-warn'} />
                <StatCard label="Total Return" value={`${result.total_return}%`} color={result.total_return >= 0 ? 'text-bull' : 'text-bear'} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <StatCard label="ทั้งหมด" value={`${result.total_trades} เทรด`} />
                <StatCard label="ชนะ" value={result.winning_trades} color="text-bull" />
                <StatCard label="แพ้" value={result.losing_trades} color="text-bear" />
              </div>

              <Card title="รายการเทรด" subtitle={`${result.trades.length} รายการ`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-secondary">
                        <th className="text-left py-2 pr-3">Entry</th>
                        <th className="text-left py-2 pr-3">Exit</th>
                        <th className="text-right py-2 pr-3">Entry Price</th>
                        <th className="text-right py-2 pr-3">Exit Price</th>
                        <th className="text-right py-2 pr-3">P&L%</th>
                        <th className="text-right py-2">วัน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.map((t, i) => (
                        <tr key={i} className="border-b border-border/40 hover:bg-surface/50">
                          <td className="py-1.5 pr-3 font-mono text-text-secondary">{mounted ? new Date(t.entry_date).toLocaleDateString('th-TH') : t.entry_date.slice(0,10)}</td>
                          <td className="py-1.5 pr-3 font-mono text-text-secondary">{mounted ? new Date(t.exit_date).toLocaleDateString('th-TH') : t.exit_date.slice(0,10)}</td>
                          <td className="py-1.5 pr-3 font-mono text-right">฿{mounted ? t.entry_price.toLocaleString() : t.entry_price}</td>
                          <td className="py-1.5 pr-3 font-mono text-right">฿{mounted ? t.exit_price.toLocaleString() : t.exit_price}</td>
                          <td className={`py-1.5 pr-3 font-mono text-right ${t.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                            {t.pnl >= 0 ? '+' : ''}{t.pnl_pct.toFixed(2)}%
                          </td>
                          <td className="py-1.5 font-mono text-right text-text-secondary">{t.hold_days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
