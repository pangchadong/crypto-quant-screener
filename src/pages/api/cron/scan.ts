// src/pages/api/cron/scan.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { runMarketScan } from '@/services/scanner'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ตรวจสอบ Authorization (ยกเว้น development mode)
  const isDev = process.env.NODE_ENV === 'development'
  const cronSecret = process.env.CRON_SECRET

  if (!isDev && cronSecret) {
    const authHeader = req.headers.authorization
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('[SCAN] Starting market scan...')
    const result = await runMarketScan()
    return res.status(200).json({
      success: result.success,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[SCAN] Error:', error)
    return res.status(200).json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    })
  }
}
