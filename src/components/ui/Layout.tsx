// src/components/ui/Layout.tsx
import { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { clsx } from 'clsx'

interface LayoutProps {
  children: ReactNode
}

const NAV_ITEMS = [
  { href: '/',         label: 'Dashboard', icon: '📊' },
  { href: '/coins',    label: 'Coins',     icon: '🪙' },
  { href: '/backtest', label: 'Backtest',  icon: '🔁' },
  { href: '/alerts',   label: 'Alerts',    icon: '🔔' },
  { href: '/system',   label: 'System',    icon: '⚙️' },
]

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-14 lg:w-52 border-r border-border flex flex-col fixed left-0 top-0 bottom-0 z-50 bg-surface/80 backdrop-blur-sm">
        <div className="p-3 lg:p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-accent" stroke="currentColor" strokeWidth="2.5">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-bold text-text-primary leading-tight">Quant Screener</p>
              <p className="text-[10px] text-accent font-mono">Bitkub · Live</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const isActive = router.pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-2 lg:px-3 py-2.5 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                )}>
                <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                <span className="hidden lg:block">{item.label}</span>
                {isActive && <span className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-accent"/>}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-border hidden lg:block">
          <p className="text-[10px] text-text-secondary leading-relaxed">
            อัปเดตทุก 5 นาที<br/><span className="text-accent/60">Bitkub Public API</span>
          </p>
        </div>
      </aside>
      <main className="flex-1 ml-14 lg:ml-52 min-h-screen">{children}</main>
    </div>
  )
}
