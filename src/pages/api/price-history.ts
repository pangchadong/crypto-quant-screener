// src/pages/api/price-history.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getOHLCV } from '@/services/bitkub'

const PERIOD_CANDLES: Record<string, { resolution: string; limit: number }> = {
  '7D':  { resolution: '60',   limit: 168  }, // 1h candles × 168
  '30D': { resolution: '240',  limit: 180  }, // 4h candles × 180
  '90D': { resolution: '1440', limit: 90   }, // 1d candles × 90
  '1Y':  { resolution: '1440', limit: 365  }, // 1d candles × 365
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { symbol, period = '30D' } = req.query

  if (!symbol) return res.status(400).json({ error: 'symbol is required' })

  const config = PERIOD_CANDLES[period as string] || PERIOD_CANDLES['30D']

  try {
    const candles = await getOHLCV(symbol as string, config.resolution, config.limit)

    const data = candles.map(c => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }))

    return res.status(200).json({
      data,
      symbol,
      period,
      count: data.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return res.status(500).json({ data: [], error: String(error), timestamp: new Date().toISOString() })
  }
}
