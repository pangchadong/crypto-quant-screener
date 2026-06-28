// src/components/dashboard/Heatmap.tsx
import { HeatmapItem } from '@/hooks/useDashboard'
import { clsx } from 'clsx'

interface HeatmapProps {
  data: HeatmapItem[]
}

function getColor(change: number): string {
  if (change >= 10) return 'bg-bull text-white'
  if (change >= 5) return 'bg-bull/70 text-white'
  if (change >= 2) return 'bg-bull/40 text-bull'
  if (change >= 0) return 'bg-bull/20 text-bull'
  if (change >= -2) return 'bg-bear/20 text-bear'
  if (change >= -5) return 'bg-bear/40 text-white'
  if (change >= -10) return 'bg-bear/70 text-white'
  return 'bg-bear text-white'
}

function getSize(volume: number, maxVolume: number): string {
  const ratio = volume / maxVolume
  if (ratio > 0.5) return 'col-span-2 row-span-2'
  if (ratio > 0.2) return 'col-span-2'
  return 'col-span-1'
}

export default function Heatmap({ data }: HeatmapProps) {
  const maxVolume = Math.max(...data.map(d => d.volume), 1)

  return (
    <div className="grid grid-cols-8 gap-1 auto-rows-[40px]">
      {data.map((item) => {
        const symbol = item.symbol.replace('THB_', '')
        return (
          <div
            key={item.symbol}
            className={clsx(
              'rounded flex flex-col items-center justify-center cursor-default',
              'transition-all duration-200 hover:opacity-80 hover:scale-105',
              getColor(item.change_pct_24h)
            )}
            title={`${symbol}: ${item.change_pct_24h >= 0 ? '+' : ''}${item.change_pct_24h.toFixed(2)}%`}
          >
            <span className="text-[10px] font-bold leading-none">{symbol}</span>
            <span className="text-[9px] leading-none mt-0.5 opacity-90">
              {item.change_pct_24h >= 0 ? '+' : ''}{item.change_pct_24h.toFixed(1)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
