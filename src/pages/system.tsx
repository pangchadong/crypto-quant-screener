// src/pages/system.tsx
import { useState, useEffect } from 'react'
import { useMounted } from '@/hooks/useMounted'
import Head from 'next/head'
import Link from 'next/link'
import { Card, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'

interface LogEntry {
  id: string
  log_type: 'INFO' | 'WARNING' | 'ERROR' | 'CRON'
  message: string
  details: Record<string, unknown> | null
  created_at: string
}

const LOG_COLOR = {
  INFO: 'text-accent',
  CRON: 'text-text-secondary',
  WARNING: 'text-warn',
  ERROR: 'text-bear',
}

const LOG_BG = {
  INFO: 'bg-accent/5 border-accent/20',
  CRON: 'bg-surface border-border',
  WARNING: 'bg-warn/5 border-warn/20',
  ERROR: 'bg-bear/5 border-bear/20',
}

export default function SystemPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'CRON' | 'ERROR' | 'WARNING'>('ALL')
  const mounted = useMounted()

  const fetchLogs = async () => {
    setLoading(true)
    let query = supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter !== 'ALL') {
      query = query.eq('log_type', filter)
    }

    const { data } = await query
    setLogs(data || [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs() }, [filter])

  const errorCount = logs.filter(l => l.log_type === 'ERROR').length
  const lastCron = logs.find(l => l.log_type === 'CRON')

  return (
    <>
      <Head><title>System — Quant Screener</title></Head>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <Link href="/" className="text-text-secondary hover:text-accent text-sm transition-colors">
              ← Dashboard
            </Link>
            <h1 className="text-sm font-bold text-text-primary">⚙️ System Status</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-secondary">สถานะระบบ</p>
              <p className="text-xl font-bold text-bull mt-1">🟢 Online</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-secondary">Cron ล่าสุด</p>
              <p className="text-sm font-mono text-text-primary mt-1">
                {lastCron
                  ? mounted ? formatDistanceToNow(new Date(lastCron.created_at), { addSuffix: true, locale: th }) : '—'
                  : '—'}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-secondary">Errors (100 ล่าสุด)</p>
              <p className={`text-xl font-bold font-mono mt-1 ${errorCount > 0 ? 'text-bear' : 'text-bull'}`}>
                {errorCount}
              </p>
            </div>
          </div>

          {/* Logs */}
          <Card
            title="System Logs"
            action={
              <div className="flex gap-1">
                {(['ALL', 'CRON', 'ERROR', 'WARNING'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-[10px] px-2 py-1 rounded transition-colors ${
                      filter === f ? 'bg-accent text-background' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          >
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <div className="space-y-1.5 font-mono text-xs max-h-[600px] overflow-y-auto">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className={`rounded-lg border px-3 py-2 ${LOG_BG[log.log_type]}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`font-semibold ${LOG_COLOR[log.log_type]} flex-shrink-0 w-16`}>
                        [{log.log_type}]
                      </span>
                      <span className="text-text-primary flex-1">{log.message}</span>
                      <span className="text-text-muted flex-shrink-0">
                        {mounted ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: th }) : '—'}
                      </span>
                    </div>
                    {log.details && (
                      <pre className="mt-1 text-text-secondary text-[10px] overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-8 text-text-secondary">ไม่มี Logs</div>
                )}
              </div>
            )}
          </Card>
        </main>
      </div>
    </>
  )
}
