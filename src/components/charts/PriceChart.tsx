// src/components/charts/PriceChart.tsx
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface PricePoint {
  timestamp: number
  close: number
  volume: number
}

interface PriceChartProps {
  data: PricePoint[]
  color?: string
}

export default function PriceChart({ data, color = '#00D4AA' }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
        ไม่มีข้อมูลกราฟ
      </div>
    )
  }

  const first = data[0].close
  const last = data[data.length - 1].close
  const isUp = last >= first
  const chartColor = isUp ? '#10B981' : '#EF4444'

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={ts => format(new Date(ts), 'd MMM', { locale: th })}
          tick={{ fill: '#6B7280', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: '#6B7280', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v =>
            v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` :
            v >= 1000 ? `${(v / 1000).toFixed(0)}K` :
            v.toFixed(2)
          }
          width={55}
        />
        <Tooltip
          contentStyle={{
            background: '#111827',
            border: '1px solid #1F2937',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelFormatter={ts => format(new Date(ts), 'd MMM yyyy', { locale: th })}
          formatter={(v: number) => [`฿${v.toLocaleString('th-TH', { maximumFractionDigits: 4 })}`, 'ราคา']}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={chartColor}
          strokeWidth={2}
          fill="url(#priceGrad)"
          dot={false}
          activeDot={{ r: 4, fill: chartColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
