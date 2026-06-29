// src/components/charts/ScoreRadar.tsx
import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar, ResponsiveContainer, Tooltip,
} from 'recharts'

interface ScoreRadarProps {
  trend: number
  volume: number
  momentum: number
  breakout: number
  relative_strength: number
}

interface RadarPayload {
  subject: string
  value: number
  max: number
  pct: number
}

export default function ScoreRadar({
  trend, volume, momentum, breakout, relative_strength,
}: ScoreRadarProps) {
  const data: RadarPayload[] = [
    { subject: 'Trend', value: trend, max: 25, pct: (trend / 25) * 100 },
    { subject: 'Volume', value: volume, max: 25, pct: (volume / 25) * 100 },
    { subject: 'Momentum', value: momentum, max: 20, pct: (momentum / 20) * 100 },
    { subject: 'Breakout', value: breakout, max: 15, pct: (breakout / 15) * 100 },
    { subject: 'Rel.Strength', value: relative_strength, max: 15, pct: (relative_strength / 15) * 100 },
  ]

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: RadarPayload }> }) => {
    if (!active || !payload || !payload.length) return null
    const d = payload[0].payload
    return (
      <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
        <p style={{ color: '#F9FAFB' }}>{d.subject}: {d.value}/{d.max}</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data}>
        <PolarGrid stroke="#1F2937" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11 }} />
        <Radar name="Score" dataKey="pct" stroke="#00D4AA" fill="#00D4AA" fillOpacity={0.15} strokeWidth={2} />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
