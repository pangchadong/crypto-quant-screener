// src/pages/api/signals.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { type, active_only = 'true', limit = '20' } = req.query

  try {
    let query = supabaseAdmin
      .from('signals')
      .select('*, coins(symbol, base_currency)')
      .order('triggered_at', { ascending: false })
      .limit(parseInt(limit as string))

    if (active_only === 'true') {
      query = query.eq('is_active', true)
    }

    if (type) {
      query = query.eq('signal_type', (type as string).toUpperCase())
    }

    const { data, error } = await query
    if (error) throw error

    return res.status(200).json({
      data,
      error: null,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return res.status(200).json({ data: [], error: null, warning: String(error), timestamp: new Date().toISOString() })
  }
}
