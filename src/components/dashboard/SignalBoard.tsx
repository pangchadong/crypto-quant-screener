// src/components/dashboard/SignalBoard.tsx
import { Signal } from '@/hooks/useDashboard'
import { SignalBadge, ScoreBadge } from '@/components/ui'
import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'

interface SignalBoardProps {
  signals: Signal[]
}

export default function SignalBoard({ signals }: SignalBoardProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (signals.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary text-sm">
        ยังไม่มีสัญญาณที่ใช้งานอยู่
      </div>
    )
  }

  const buySignals = signals.filter(s => s.signal_type === 'BUY')
  const sellSignals = signals.filter(s => s.signal_type === 'SELL')

  return (
    <div className="space-y-3">
      {[...buySignals, ...sellSignals].map(signal => (
        <div
          key={signal.id}
          className={`
            border rounded-lg p-3 transition-colors
            ${signal.signal_type === 'BUY'
              ? 'border-bull/30 bg-bull/5 hover:bg-bull/10'
              : 'border-bear/30 bg-bear/5 hover:bg-bear/10'
            }
          `}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-text-primary">
                {signal.symbol.replace('THB_', '')}
              </span>
              <SignalBadge type={signal.signal_type} />
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                signal.signal_strength === 'STRONG'
                  ? 'text-accent border-accent/30 bg-accent/5'
                  : signal.signal_strength === 'MODERATE'
                    ? 'text-warn border-warn/30 bg-warn/5'
                    : 'text-text-secondary border-border'
              }`}>
                {signal.signal_strength === 'STRONG' ? 'แรงมาก' :
                 signal.signal_strength === 'MODERATE' ? 'ปานกลาง' : 'อ่อน'}
              </span>
            </div>
            <ScoreBadge score={signal.score} />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <div>
              <p className="text-[10px] text-text-secondary">Entry</p>
              <p className="font-mono text-xs text-text-primary">
                ฿{mounted ? signal.entry_price.toLocaleString('th-TH', { maximumFractionDigits: 4 }) : signal.entry_price}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-secondary">Stop Loss</p>
              <p className="font-mono text-xs text-bear">
                ฿{mounted ? signal.stop_loss.toLocaleString('th-TH', { maximumFractionDigits: 4 }) : signal.stop_loss}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-secondary">Take Profit</p>
              <p className="font-mono text-xs text-bull">
                ฿{mounted ? signal.take_profit.toLocaleString('th-TH', { maximumFractionDigits: 4 }) : signal.take_profit}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-text-secondary">
              R:R = 1:{signal.risk_reward_ratio.toFixed(1)}
            </span>
            <span className="text-[10px] text-text-secondary">
              {mounted ? formatDistanceToNow(new Date(signal.triggered_at), { addSuffix: true, locale: th }) : '—'}
            </span>
          </div>

          {signal.reasons.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {signal.reasons.slice(0, 3).map((reason, i) => (
                <p key={i} className="text-[10px] text-text-secondary flex items-start gap-1">
                  <span className="text-accent mt-0.5">›</span>
                  {reason}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
