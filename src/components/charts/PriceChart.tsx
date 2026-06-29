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

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: number
}) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
      <p style={{ color: '#6B7280' }}>{label ? format(new Date(label), 'd MMM yyyy', { locale: th }) : ''}</p>
      <p style={{ color: '#F9FAFB' }}>฿{payload[0].value.toLocaleString('th-TH', { maximumFractionDigits: 4 })}</p>
    </div>
  )
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
          tickFormatter={(ts: number) => format(new Date(ts), 'd MMM', { locale: th })}
          tick={{ fill: '#6B7280', fontSize: 10 }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: '#6B7280', fontSize: 10 }}
          axisLine={false} tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` :
            v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(2)
          }
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone" dataKey="close"
          stroke={chartColor} strokeWidth={2}
          fill="url(#priceGrad)" dot={false}
          activeDot={{ r: 4, fill: chartColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
