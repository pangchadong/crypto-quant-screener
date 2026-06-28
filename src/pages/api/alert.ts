// src/pages/api/alert.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('alerts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return res.status(500).json({ error: String(error) })
    return res.status(200).json({ data, error: null, timestamp: new Date().toISOString() })
  }

  if (req.method === 'POST') {
    const { coin_id, symbol, alert_type, condition, target_value } = req.body

    if (!coin_id || !symbol || !alert_type || !condition || target_value === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data, error } = await supabaseAdmin.from('alerts').insert({
      coin_id,
      symbol,
      alert_type,
      condition,
      target_value,
      is_triggered: false,
      is_active: true,
    }).select().single()

    if (error) return res.status(500).json({ error: String(error) })
    return res.status(201).json({ data, error: null, timestamp: new Date().toISOString() })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    const { error } = await supabaseAdmin.from('alerts').update({ is_active: false }).eq('id', id)
    if (error) return res.status(500).json({ error: String(error) })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
