// src/pages/alerts.tsx
import { useState, useEffect } from 'react'
import { useMounted } from '@/hooks/useMounted'
import Head from 'next/head'
import Link from 'next/link'
import { Card, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

interface AlertRow {
  id: string
  symbol: string
  alert_type: 'PRICE' | 'SIGNAL' | 'SCORE'
  condition: string
  target_value: number
  is_triggered: boolean
  triggered_at: string | null
  is_active: boolean
  created_at: string
}

const CONDITION_LABELS: Record<string, string> = {
  ABOVE: 'มากกว่า', BELOW: 'น้อยกว่า', EQUALS: 'เท่ากับ', CROSSES: 'ตัดผ่าน',
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    symbol: 'THB_BTC',
    alert_type: 'PRICE',
    condition: 'ABOVE',
    target_value: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const mounted = useMounted()

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/alert')
      const json = await res.json()
      setAlerts(json.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [])

  const handleSubmit = async () => {
    if (!form.target_value) return toast.error('กรุณาใส่ค่าเป้าหมาย')
    setSubmitting(true)
    try {
      // Need coin_id - in production fetch from /api/coins
      const res = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coin_id: null, // simplified for demo
          symbol: form.symbol.toUpperCase(),
          alert_type: form.alert_type,
          condition: form.condition,
          target_value: parseFloat(form.target_value),
        }),
      })
      if (!res.ok) throw new Error('Failed to create alert')
      toast.success('สร้าง Alert สำเร็จ!')
      setForm(f => ({ ...f, target_value: '' }))
      fetchAlerts()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteAlert = async (id: string) => {
    await fetch(`/api/alert?id=${id}`, { method: 'DELETE' })
    toast.success('ลบ Alert แล้ว')
    fetchAlerts()
  }

  return (
    <>
      <Head><title>Alerts — Quant Screener</title></Head>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <Link href="/" className="text-text-secondary hover:text-accent text-sm transition-colors">
              ← Dashboard
            </Link>
            <h1 className="text-sm font-bold text-text-primary">🔔 การแจ้งเตือน</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
          {/* Create Alert Form */}
          <Card title="สร้าง Alert ใหม่">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Symbol</label>
                <input
                  value={form.symbol}
                  onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
                  placeholder="THB_BTC"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">ประเภท</label>
                <select
                  value={form.alert_type}
                  onChange={e => setForm(f => ({ ...f, alert_type: e.target.value }))}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="PRICE">ราคา (PRICE)</option>
                  <option value="SCORE">คะแนน (SCORE)</option>
                  <option value="SIGNAL">สัญญาณ (SIGNAL)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">เงื่อนไข</label>
                <select
                  value={form.condition}
                  onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="ABOVE">มากกว่า (&gt;)</option>
                  <option value="BELOW">น้อยกว่า (&lt;)</option>
                  <option value="CROSSES">ตัดผ่าน</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">
                  {form.alert_type === 'PRICE' ? 'ราคา (฿)' :
                   form.alert_type === 'SCORE' ? 'คะแนน (0-100)' : 'ค่า'}
                </label>
                <input
                  type="number"
                  value={form.target_value}
                  onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
                  placeholder={form.alert_type === 'SCORE' ? '85' : '1500000'}
                />
              </div>
            </div>
            <div className="mt-3">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-accent text-background px-5 py-2 rounded-lg text-sm font-semibold hover:bg-accent-dim transition-colors disabled:opacity-50"
              >
                {submitting ? 'กำลังสร้าง...' : '+ สร้าง Alert'}
              </button>
            </div>
          </Card>

          {/* Alerts List */}
          <Card title="รายการ Alert" subtitle={`${alerts.length} รายการ`}>
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-10 text-text-secondary text-sm">ยังไม่มี Alert</div>
            ) : (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      alert.is_triggered
                        ? 'border-warn/30 bg-warn/5'
                        : 'border-border bg-background/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        alert.is_triggered ? 'bg-warn' : 'bg-bull animate-pulse'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text-primary">
                            {alert.symbol.replace('THB_', '')}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary">
                            {alert.alert_type}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {CONDITION_LABELS[alert.condition]}
                          </span>
                          <span className="font-mono text-xs text-accent">
                            {alert.alert_type === 'PRICE'
                              ? (mounted ? `฿${alert.target_value.toLocaleString()}` : `฿${alert.target_value}`)
                              : alert.target_value}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {alert.is_triggered
                            ? `✅ ถูก Trigger แล้ว${mounted ? ' เมื่อ ' + new Date(alert.triggered_at!).toLocaleString('th-TH') : ''}`
                            : 'รอ Trigger...'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="text-bear/60 hover:text-bear text-xs px-2 py-1 rounded transition-colors"
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>
      </div>
    </>
  )
}
