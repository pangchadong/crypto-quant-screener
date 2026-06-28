// src/pages/api/backtest.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { runBacktest } from '@/services/backtest'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { symbol, period } = req.body

  if (!symbol || !period) {
    return res.status(400).json({ error: 'symbol and period are required' })
  }

  if (!['1M', '3M', '6M', '1Y'].includes(period)) {
    return res.status(400).json({ error: 'period must be 1M, 3M, 6M, or 1Y' })
  }

  try {
    const result = await runBacktest({ symbol, period })

    // Save to database
    await supabaseAdmin.from('backtest_results').insert({
      strategy_name: result.strategy_name,
      symbol: result.symbol,
      period_start: result.period_start,
      period_end: result.period_end,
      total_trades: result.total_trades,
      winning_trades: result.winning_trades,
      losing_trades: result.losing_trades,
      win_rate: result.win_rate,
      profit_factor: result.profit_factor,
      max_drawdown: result.max_drawdown,
      sharpe_ratio: result.sharpe_ratio,
      expectancy: result.expectancy,
      total_return: result.total_return,
      parameters: result.parameters,
      trades: result.trades,
    })

    return res.status(200).json({ data: result, error: null, timestamp: new Date().toISOString() })
  } catch (error) {
    return res.status(200).json({ data: null, warning: String(error), error: null, timestamp: new Date().toISOString() })
  }
}
