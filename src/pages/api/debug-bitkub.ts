// src/pages/api/debug-bitkub.ts
// ใช้ debug เท่านั้น — ลบออกก่อน deploy production
import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' })
  }

  try {
    const response = await axios.get('https://api.bitkub.com/api/market/ticker', {
      timeout: 10000,
    })

    const raw = response.data
    const keys = Object.keys(raw)
    const firstKey = keys[0]
    const firstValue = firstKey ? raw[firstKey] : null

    // แสดง structure โดยไม่ต้องส่ง data ทั้งหมด
    return res.status(200).json({
      status: response.status,
      top_level_keys: keys.slice(0, 5),
      total_keys: keys.length,
      has_error_field: 'error' in raw,
      has_result_field: 'result' in raw,
      error_value: raw.error,
      first_pair_key: firstKey,
      first_pair_fields: firstValue ? Object.keys(firstValue) : [],
      first_pair_sample: firstValue,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return res.status(200).json({
      error: String(error),
      message: 'ไม่สามารถเชื่อมต่อ Bitkub API ได้',
    })
  }
}
