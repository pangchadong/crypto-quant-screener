// src/services/bitkub.ts
import axios from 'axios'

const BASE_URL = process.env.BITKUB_BASE_URL || 'https://api.bitkub.com'

const bitkubClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

export interface NormalizedTicker {
  symbol: string
  last_price: number
  bid: number
  ask: number
  volume: number
  volume_24h: number
  change_24h: number
  change_pct_24h: number
  high_24h: number
  low_24h: number
  open_24h: number
}

export async function getAllTickers(): Promise<NormalizedTicker[]> {
  try {
    const response = await bitkubClient.get('/api/market/ticker')
    const raw = response.data

    // Bitkub API v1: { error: 0, result: { THB_BTC: {...} } }
    // Bitkub API v2/v3: ส่งตรงเป็น object หรือ array
    let tickerData: Record<string, unknown> = {}

    if (raw && typeof raw === 'object') {
      if (raw.result && typeof raw.result === 'object') {
        // Format v1: { error: 0, result: {...} }
        if (raw.error !== undefined && raw.error !== 0) {
          throw new Error(`Bitkub API error code: ${raw.error}`)
        }
        tickerData = raw.result
      } else if (!raw.error && !raw.result) {
        // Format ใหม่: ส่ง object โดยตรง
        tickerData = raw
      } else {
        tickerData = raw
      }
    }

    const tickers: NormalizedTicker[] = []

    for (const [pair, data] of Object.entries(tickerData)) {
      if (!pair.startsWith('THB_')) continue
      if (!data || typeof data !== 'object') continue

      const d = data as Record<string, unknown>

      // รองรับหลาย field name
      const lastPrice = parseFloat(String(d.last || d.lastPrice || d.close || 0))
      const bid = parseFloat(String(d.highestBid || d.bid || d.bestBid || 0))
      const ask = parseFloat(String(d.lowestAsk || d.ask || d.bestAsk || 0))
      const baseVolume = parseFloat(String(d.baseVolume || d.volume || d.vol || 0))
      const quoteVolume = parseFloat(String(d.quoteVolume || d.volValue || 0))
      const high24h = parseFloat(String(d.high24hr || d.high || d.highPrice || 0))
      const low24h = parseFloat(String(d.low24hr || d.low || d.lowPrice || 0))
      const prevOpen = parseFloat(String(d.prevOpen || d.open || d.openPrice || 0))
      const percentChange = parseFloat(String(d.percentChange || d.changePercent || 0))

      if (lastPrice <= 0) continue

      const change24h = prevOpen > 0 ? lastPrice - prevOpen : 0
      const changePct24h = percentChange !== 0
        ? percentChange
        : (prevOpen > 0 ? ((lastPrice - prevOpen) / prevOpen) * 100 : 0)

      tickers.push({
        symbol: pair,
        last_price: lastPrice,
        bid,
        ask,
        volume: baseVolume,
        volume_24h: quoteVolume,
        change_24h: change24h,
        change_pct_24h: changePct24h,
        high_24h: high24h,
        low_24h: low24h,
        open_24h: prevOpen,
      })
    }

    console.log(`[Bitkub] Fetched ${tickers.length} THB pairs`)
    return tickers

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[Bitkub] HTTP Error:', error.response?.status, error.response?.data)
      throw new Error(`Bitkub HTTP error: ${error.response?.status} ${error.message}`)
    }
    throw error
  }
}

export interface OHLCVData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function getOHLCV(
  symbol: string,
  resolution: string = '1440',
  limit: number = 300
): Promise<OHLCVData[]> {
  try {
    const to = Math.floor(Date.now() / 1000)
    const from = to - parseInt(resolution) * 60 * limit

    // แปลง THB_BTC → THBBTC สำหรับ tradingview endpoint
    const cleanSymbol = symbol.replace('_', '')

    const response = await bitkubClient.get('/tradingview/history', {
      params: { symbol: cleanSymbol, resolution, from, to },
    })

    const raw = response.data

    // ตรวจสอบ response format
    if (!raw || raw.s === 'no_data' || raw.s === 'error') {
      return []
    }

    const { t, o, h, l, c, v } = raw

    if (!t || !Array.isArray(t) || t.length === 0) return []

    return t.map((timestamp: number, i: number) => ({
      timestamp: timestamp * 1000,
      open: parseFloat(o[i]) || 0,
      high: parseFloat(h[i]) || 0,
      low: parseFloat(l[i]) || 0,
      close: parseFloat(c[i]) || 0,
      volume: parseFloat(v[i]) || 0,
    })).filter(c => c.close > 0)

  } catch (error) {
    // OHLCV error ไม่ fatal — แค่ return empty
    console.warn(`[Bitkub] OHLCV error for ${symbol}:`, error instanceof Error ? error.message : error)
    return []
  }
}

export async function getTicker(symbol: string): Promise<NormalizedTicker | null> {
  const tickers = await getAllTickers()
  return tickers.find(t => t.symbol === symbol) || null
}
