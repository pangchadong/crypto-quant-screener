import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!isSupabaseConfigured()) return res.status(200).json({ data: [], error: null, warning: 'Supabase ยังไม่ได้ตั้งค่า', timestamp: new Date().toISOString() })

  try {
    const [scoresRes, mdRes, indRes] = await Promise.all([
      supabaseAdmin.from('scores').select('symbol, breakout_score, total_score, score_details, scored_at').gt('breakout_score', 5).order('breakout_score', { ascending: false }).limit(10),
      supabaseAdmin.from('market_data').select('symbol, last_price, change_pct_24h, volume').order('timestamp', { ascending: false }).limit(100),
      supabaseAdmin.from('indicators').select('symbol, high_20d, atr').limit(100),
    ])

    const mdMap = new Map<string, { symbol: string; last_price: number; change_pct_24h: number; volume: number }>()
    for (const md of (mdRes.data || [])) { if (!mdMap.has(md.symbol)) mdMap.set(md.symbol, md) }

    const indMap = new Map<string, { symbol: string; high_20d: number | null; atr: number | null }>()
    for (const ind of (indRes.data || [])) { indMap.set(ind.symbol, ind) }

    const data = (scoresRes.data || []).map(s => ({
      ...s,
      market_data: mdMap.get(s.symbol) || null,
      indicators: indMap.get(s.symbol) || null,
    }))

    return res.status(200).json({ data, error: null, timestamp: new Date().toISOString() })
  } catch (error) {
    return res.status(200).json({ data: [], error: null, warning: String(error), timestamp: new Date().toISOString() })
  }
}
