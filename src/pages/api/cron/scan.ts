// src/pages/api/cron/scan.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { runMarketScan } from '@/services/scanner'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  // ส่ง response กลับทันที ไม่รอ scan เสร็จ
  res.status(200).json({
    success: true,
    message: 'Scan started in background',
    timestamp: new Date().toISOString(),
  })

  // รัน scan หลัง response ส่งไปแล้ว
  try {
    await runMarketScan()
  } catch (error) {
    console.error('[SCAN] Background scan failed:', error)
  }
}