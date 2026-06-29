import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!isSupabaseConfigured()) return res.status(200).json({ data: [], error: null, warning: 'Supabase ยังไม่ได้ตั้งค่า', timestamp: new Date().toISOString() })

  try {
    const limit = parseInt(req.query.limit as string || '10')
    const [scoresRes, mdRes] = await Promise.all([
      supabaseAdmin.from('scores').select('symbol, total_score, trend_score, volume_score, momentum_score, breakout_score, relative_strength_score, scored_at').order('total_score', { ascending: false }).limit(limit),
      supabaseAdmin.from('market_data').select('symbol, last_price, change_pct_24h, volume').order('timestamp', { ascending: false }).limit(limit * 3),
    ])

    const mdMap = new Map<string, { symbol: string; last_price: number; change_pct_24h: number; volume: number }>()
    for (const md of (mdRes.data || [])) { if (!mdMap.has(md.symbol)) mdMap.set(md.symbol, md) }

    const data = (scoresRes.data || []).map(s => ({ ...s, market_data: mdMap.get(s.symbol) || null }))
    return res.status(200).json({ data, error: null, timestamp: new Date().toISOString() })
  } catch (error) {
    return res.status(200).json({ data: [], error: null, warning: String(error), timestamp: new Date().toISOString() })
  }
}
