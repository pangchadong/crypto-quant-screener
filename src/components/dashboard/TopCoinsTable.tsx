// src/components/dashboard/TopCoinsTable.tsx
import { useState, useEffect } from 'react'
import { TopCoin } from '@/hooks/useDashboard'
import { ScoreBadge, Change, ScoreBar, RSIBadge } from '@/components/ui'

interface TopCoinsTableProps {
  coins: TopCoin[]
  scoreKey: keyof TopCoin
  label: string
  maxScore: number
}

export default function TopCoinsTable({ coins, scoreKey, label, maxScore }: TopCoinsTableProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!coins || coins.length === 0) {
    return <div className="py-6 text-center text-text-secondary text-sm">ไม่มีข้อมูล</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-3 text-xs text-text-secondary font-medium">#</th>
            <th className="text-left py-2 pr-3 text-xs text-text-secondary font-medium">เหรียญ</th>
            <th className="text-right py-2 pr-3 text-xs text-text-secondary font-medium">ราคา</th>
            <th className="text-right py-2 pr-3 text-xs text-text-secondary font-medium">24H%</th>
            <th className="text-right py-2 pr-3 text-xs text-text-secondary font-medium">{label}</th>
            <th className="text-left py-2 text-xs text-text-secondary font-medium w-24">กราฟ</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin, i) => {
            const score = (coin[scoreKey] as number) || 0
            const price = coin.market_data?.last_price || 0
            const change = coin.market_data?.change_pct_24h || 0
            const symbol = coin.symbol.replace('THB_', '')

            return (
              <tr key={coin.symbol} className="border-b border-border/50 table-row-hover">
                <td className="py-2 pr-3 font-mono text-xs text-text-secondary">{i + 1}</td>
                <td className="py-2 pr-3">
                  <span className="font-semibold text-text-primary">{symbol}</span>
                  <span className="text-text-secondary text-xs ml-1">/THB</span>
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs text-text-primary">
                  ฿{mounted ? price.toLocaleString('th-TH', { maximumFractionDigits: 4 }) : price}
                </td>
                <td className="py-2 pr-3 text-right">
                  <Change value={change} />
                </td>
                <td className="py-2 pr-3 text-right">
                  <ScoreBadge score={score} />
                </td>
                <td className="py-2">
                  <ScoreBar value={score} max={maxScore} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
