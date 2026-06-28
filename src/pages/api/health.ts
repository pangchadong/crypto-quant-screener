// src/pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  // ตรวจสอบรูปแบบ key
  const anonIsJWT = anonKey.startsWith('eyJ')
  const serviceIsJWT = serviceKey.startsWith('eyJ')
  const anonIsSbFormat = anonKey.startsWith('sb_publishable_') || anonKey.startsWith('sb_anon_')
  const serviceIsSbFormat = serviceKey.startsWith('sb_secret_')

  let dbConnected = false
  let dbError = ''
  let testResult = null

  // ลองเชื่อมต่อด้วย anon key ถ้า service key ผิดรูปแบบ
  const keyToUse = serviceIsJWT ? serviceKey : (anonIsJWT ? anonKey : null)

  if (supabaseUrl && keyToUse) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const client = createClient(supabaseUrl, keyToUse, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      const { data, error } = await client.from('coins').select('id').limit(1)
      dbConnected = !error
      dbError = error?.message || ''
      testResult = data
    } catch (e) {
      dbError = String(e)
    }
  }

  return res.status(200).json({
    status: dbConnected ? 'ok' : 'setup_required',
    env: {
      supabase_url: supabaseUrl ? `${supabaseUrl.slice(0, 40)}...` : '❌ ไม่ได้ตั้งค่า',
      anon_key_format: anonIsJWT ? '✅ JWT format (ถูกต้อง)' : anonIsSbFormat ? '⚠️ sb_publishable format (ต้องใช้ JWT)' : '❌ ไม่ได้ตั้งค่า',
      service_key_format: serviceIsJWT ? '✅ JWT format (ถูกต้อง)' : serviceIsSbFormat ? '⚠️ sb_secret format (ต้องใช้ JWT)' : '❌ ไม่ได้ตั้งค่า',
    },
    database: {
      configured: !!(supabaseUrl && (anonIsJWT || serviceIsJWT)),
      connected: dbConnected,
      error: dbError || null,
    },
    fix: (!serviceIsJWT || !anonIsJWT) ? {
      problem: 'API Keys ผิดรูปแบบ — ต้องใช้ JWT token (ขึ้นต้นด้วย eyJ...)',
      steps: [
        '1. ไปที่ Supabase Dashboard → Settings → API',
        '2. หัวข้อ "Project API keys"',
        '3. คัดลอก "anon public" → ต้องขึ้นต้นด้วย eyJ...',
        '4. คัดลอก "service_role" → ต้องขึ้นต้นด้วย eyJ...',
        '5. อัปเดตใน .env.local แล้วรีสตาร์ท npm run dev',
      ]
    } : null,
    timestamp: new Date().toISOString(),
  })
}
