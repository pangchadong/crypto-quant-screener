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

export default function ScoreRadar({
  trend, volume, momentum, breakout, relative_strength,
}: ScoreRadarProps) {
  const data = [
    { subject: 'Trend', value: trend, max: 25, pct: (trend / 25) * 100 },
    { subject: 'Volume', value: volume, max: 25, pct: (volume / 25) * 100 },
    { subject: 'Momentum', value: momentum, max: 20, pct: (momentum / 20) * 100 },
    { subject: 'Breakout', value: breakout, max: 15, pct: (breakout / 15) * 100 },
    { subject: 'Rel.Strength', value: relative_strength, max: 15, pct: (relative_strength / 15) * 100 },
  ]

  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data}>
        <PolarGrid stroke="#1F2937" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#6B7280', fontSize: 11 }}
        />
        <Radar
          name="Score"
          dataKey="pct"
          stroke="#00D4AA"
          fill="#00D4AA"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            background: '#111827',
            border: '1px solid #1F2937',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string, props: { payload: { subject: string; value: number; max: number } }) => [
            `${props.payload.value}/${props.payload.max}`,
            props.payload.subject,
          ]}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
