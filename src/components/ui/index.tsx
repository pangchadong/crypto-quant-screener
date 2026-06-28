// src/components/ui/index.tsx
import { ReactNode } from 'react'
import { clsx } from 'clsx'

// ── Card ────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: ReactNode
}

export function Card({ children, className, title, subtitle, action }: CardProps) {
  return (
    <div className={clsx('bg-surface border border-border rounded-xl', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
          <div>
            {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
            {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

// ── Score Badge ──────────────────────────────────────────────
export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? 'text-bull border-bull/30 bg-bull/10' :
    score >= 70 ? 'text-accent border-accent/30 bg-accent/10' :
    score >= 50 ? 'text-warn border-warn/30 bg-warn/10' :
    'text-bear border-bear/30 bg-bear/10'

  return (
    <span className={clsx('font-mono text-xs font-semibold px-2 py-0.5 rounded-full border', color)}>
      {score}
    </span>
  )
}

// ── Signal Badge ─────────────────────────────────────────────
export function SignalBadge({ type }: { type: 'BUY' | 'SELL' | 'HOLD' }) {
  const styles = {
    BUY: 'badge-buy',
    SELL: 'badge-sell',
    HOLD: 'badge-hold',
  }
  return <span className={styles[type]}>{type}</span>
}

// ── Change ───────────────────────────────────────────────────
export function Change({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const isPositive = value >= 0
  return (
    <span className={clsx('font-mono text-sm', isPositive ? 'text-bull' : 'text-bear')}>
      {isPositive ? '+' : ''}{value.toFixed(2)}{suffix}
    </span>
  )
}

// ── Score Bar ────────────────────────────────────────────────
export function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100)
  const color =
    pct >= 85 ? 'bg-bull' :
    pct >= 70 ? 'bg-accent' :
    pct >= 50 ? 'bg-warn' :
    'bg-bear'

  return (
    <div className="score-bar">
      <div className={clsx('score-bar-fill', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Loading Spinner ──────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className={clsx('border-2 border-border border-t-accent rounded-full animate-spin', sizes[size])} />
  )
}

// ── Stat Card ────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: string
  icon?: ReactNode
}

export function StatCard({ label, value, sub, color = 'text-text-primary', icon }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex items-start gap-3">
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs text-text-secondary">{label}</p>
        <p className={clsx('text-2xl font-bold font-mono mt-0.5', color)}>{value}</p>
        {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────
export function EmptyState({ message = 'ไม่มีข้อมูล' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-text-secondary">
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ── RSI Indicator ────────────────────────────────────────────
export function RSIBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-text-secondary font-mono text-xs">—</span>
  const color =
    value > 80 ? 'text-bear' :
    value >= 55 && value <= 70 ? 'text-bull' :
    value < 30 ? 'text-accent' :
    'text-text-secondary'
  return <span className={clsx('font-mono text-sm', color)}>{value.toFixed(1)}</span>
}
