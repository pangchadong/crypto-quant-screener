import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!isSupabaseConfigured()) return res.status(200).json({ data: { data: [], total: 0, page: 1, limit: 50, has_more: false }, error: null, warning: 'Supabase ยังไม่ได้ตั้งค่า', timestamp: new Date().toISOString() })

  const { page = '1', limit = '50', search = '' } = req.query
  const pageNum = parseInt(page as string)
  const limitNum = Math.min(parseInt(limit as string), 100)
  const from = (pageNum - 1) * limitNum

  try {
    let coinsQuery = supabaseAdmin.from('coins').select('*', { count: 'exact' }).eq('is_active', true).order('symbol').range(from, from + limitNum - 1)
    if (search) coinsQuery = coinsQuery.ilike('symbol', `%${search}%`)
    const { data: coins, error: coinsError, count } = await coinsQuery
    if (coinsError) throw coinsError

    const symbols = (coins || []).map(c => c.symbol)
    if (symbols.length === 0) return res.status(200).json({ data: { data: [], total: 0, page: pageNum, limit: limitNum, has_more: false }, error: null, timestamp: new Date().toISOString() })

    const [mdRes, scoresRes, indRes, sigRes] = await Promise.all([
      supabaseAdmin.from('market_data').select('symbol, last_price, change_pct_24h, volume, high_24h, low_24h').in('symbol', symbols).order('timestamp', { ascending: false }).limit(symbols.length * 2),
      supabaseAdmin.from('scores').select('symbol, total_score, trend_score, volume_score, momentum_score').in('symbol', symbols),
      supabaseAdmin.from('indicators').select('symbol, rsi14, macd_histogram, ema20').in('symbol', symbols),
      supabaseAdmin.from('signals').select('symbol, signal_type, signal_strength, is_active').eq('is_active', true).in('symbol', symbols),
    ])

    const mdMap = new Map<string, typeof mdRes.data[0]>()
    for (const md of (mdRes.data || [])) { if (!mdMap.has(md.symbol)) mdMap.set(md.symbol, md) }
    const scMap = new Map<string, typeof scoresRes.data[0]>()
    for (const sc of (scoresRes.data || [])) { scMap.set(sc.symbol, sc) }
    const indMap = new Map<string, typeof indRes.data[0]>()
    for (const ind of (indRes.data || [])) { indMap.set(ind.symbol, ind) }
    const sigMap = new Map<string, typeof sigRes.data[0]>()
    for (const sig of (sigRes.data || [])) { sigMap.set(sig.symbol, sig) }

    const data = (coins || []).map(c => ({
      ...c,
      market_data: mdMap.get(c.symbol) || null,
      scores: scMap.get(c.symbol) || null,
      indicators: indMap.get(c.symbol) || null,
      signals: sigMap.get(c.symbol) || null,
    }))

    return res.status(200).json({ data: { data, total: count || 0, page: pageNum, limit: limitNum, has_more: (count || 0) > from + limitNum }, error: null, timestamp: new Date().toISOString() })
  } catch (error) {
    return res.status(200).json({ data: { data: [], total: 0, page: pageNum, limit: limitNum, has_more: false }, error: null, warning: String(error), timestamp: new Date().toISOString() })
  }
}
