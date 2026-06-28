# 🚀 Crypto Quant Screener — Bitkub

ระบบคัดกรองเหรียญคริปโตจาก Bitkub แบบอัตโนมัติ ใช้ Quant Strategy สแกนทุก 5 นาที

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/crypto-quant-screener)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Edge Network)                     │
│  ┌─────────────────┐    ┌───────────────────────────────┐  │
│  │   Next.js App   │    │      Vercel Cron Jobs         │  │
│  │  (React + TS)   │    │   /api/cron/scan — every 5m   │  │
│  └────────┬────────┘    └──────────────┬────────────────┘  │
│           │                            │                     │
│  ┌────────▼────────────────────────────▼────────────────┐  │
│  │              Next.js API Routes                       │  │
│  │  GET /api/coins  GET /api/signals  GET /api/top-score │  │
│  │  GET /api/breakout  GET /api/momentum  GET /api/dash  │  │
│  │  POST /api/backtest  POST /api/alert                  │  │
│  └────────────────────┬───────────────────────────────┘  │
└───────────────────────┼────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
  ┌────────────┐ ┌──────────────┐ ┌──────────┐
  │ Supabase   │ │ Bitkub API   │ │Indicators│
  │ PostgreSQL │ │ (Market Data)│ │  Engine  │
  │            │ │              │ │          │
  │ coins      │ │ /market/     │ │ EMA20/50 │
  │ market_data│ │ ticker       │ │ EMA200   │
  │ indicators │ │              │ │ RSI14    │
  │ scores     │ │ /tradingview │ │ MACD     │
  │ signals    │ │ /history     │ │ ATR      │
  │ alerts     │ │              │ │ BB Bands │
  │ backtest   │ └──────────────┘ └──────────┘
  └────────────┘
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📡 Market Scanner | ดึง Ticker ทุก Symbol จาก Bitkub ทุก 5 นาที |
| 📊 Technical Indicators | EMA20/50/200, RSI14, MACD, ATR, Bollinger Bands |
| 🧮 Quant Score | คะแนน 0-100 จาก 5 มิติ |
| 🔔 Trading Signals | BUY/SELL พร้อม Entry/SL/TP |
| ⚖️ Risk Management | R:R >= 1:3, SL <= 3% |
| 📈 Dashboard | Real-time Web UI |
| 🔁 Backtest | ทดสอบย้อนหลัง 1M/3M/6M/1Y |

---

## 📐 Quant Score Formula

```
Total Score = Trend(25) + Volume(25) + Momentum(20) + Breakout(15) + Relative Strength(15)

Trend Score (max 25):
  +10 ราคา > EMA20
  +10 EMA20 > EMA50
  +5  EMA50 > EMA200

Volume Score (max 25):
  +5  Volume ≥ 1.0x MA20
  +5  Volume ≥ 1.5x MA20
  +10 Volume ≥ 2.0x MA20 (Spike)
  +5  Volume ≥ 3.0x MA20

Momentum Score (max 20):
  +10 RSI 55-70
  +7  MACD > Signal (Bullish)
  +3  MACD Histogram > 0

Breakout Score (max 15):
  +8  ราคา ≥ 98% ของ High 20 วัน
  +7  ราคา > High 20 วัน (New High)

Relative Strength Score (max 15):
  +8  Change 24H > BTC Change 24H
  +4  Outperform Margin > 2%
  +3  Outperform Margin > 5%
```

---

## 🛒 BUY Signal Conditions

```
✅ Score > 85
✅ RSI 55-70
✅ MACD Bullish (MACD > Signal)
✅ Volume Spike > 200% ของ MA20
✅ ราคา > EMA20 > EMA50
✅ Risk:Reward >= 1:3
✅ Stop Loss <= 3%
```

---

## 🗄️ Database Schema

```
coins ──────────────────────────────────┐
  id (PK)                               │
  symbol (UNIQUE)                       │
  base_currency / quote_currency        │
  is_active                             │
                                        │
market_data ←── coin_id (FK) ──────────┤
  id, symbol, last_price               │
  bid, ask, volume, volume_24h         │
  change_24h, change_pct_24h           │
  high_24h, low_24h, open_24h          │
  timestamp                            │
                                        │
indicators ←── coin_id (FK, UNIQUE) ───┤
  ema20, ema50, ema200                 │
  rsi14, macd, macd_signal            │
  macd_histogram, atr                  │
  bb_upper, bb_middle, bb_lower        │
  volume_ma20, high_20d, low_20d       │
                                        │
scores ←── coin_id (FK, UNIQUE) ───────┤
  trend_score (0-25)                   │
  volume_score (0-25)                  │
  momentum_score (0-20)                │
  breakout_score (0-15)               │
  relative_strength_score (0-15)       │
  total_score (0-100)                  │
  score_details (JSONB)                │
                                        │
signals ←── coin_id (FK) ──────────────┤
  signal_type (BUY/SELL/HOLD)         │
  signal_strength (STRONG/MODERATE/...)│
  entry_price, stop_loss, take_profit  │
  risk_reward_ratio, reasons[]         │
  is_active, triggered_at              │
                                        │
alerts ←── coin_id (FK) ───────────────┤
  user_id (FK → auth.users)           │
  alert_type, condition, target_value  │
  is_triggered, is_active              │
                                        │
users ←── id (FK → auth.users) ────────┤
  telegram_id, line_token              │
  notify_buy, notify_sell             │
  min_score                            │
                                        │
watchlists ←── user_id (FK) ───────────┤
  name, coins[]                        │
                                        │
backtest_results ──────────────────────┤
  strategy_name, symbol               │
  win_rate, profit_factor             │
  max_drawdown, sharpe_ratio          │
  expectancy, total_return            │
  trades (JSONB)                       │
                                        │
system_logs ───────────────────────────┘
  log_type (INFO/WARNING/ERROR/CRON)
  message, details (JSONB)
```

---

## 📁 Folder Structure

```
crypto-quant-screener/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   └── index.tsx          # Card, Badge, ScoreBar, Spinner
│   │   └── dashboard/
│   │       ├── Heatmap.tsx        # Market heatmap
│   │       ├── SignalBoard.tsx    # BUY/SELL signal cards
│   │       └── TopCoinsTable.tsx  # Ranked coins table
│   ├── hooks/
│   │   └── useDashboard.ts        # Data fetching hooks
│   ├── lib/
│   │   └── supabase.ts            # Supabase client
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── index.tsx              # Dashboard
│   │   ├── backtest.tsx           # Backtest UI
│   │   └── api/
│   │       ├── coins.ts           # GET /api/coins
│   │       ├── signals.ts         # GET /api/signals
│   │       ├── top-score.ts       # GET /api/top-score
│   │       ├── breakout.ts        # GET /api/breakout
│   │       ├── momentum.ts        # GET /api/momentum
│   │       ├── backtest.ts        # POST /api/backtest
│   │       ├── alert.ts           # POST /api/alert
│   │       ├── dashboard.ts       # GET /api/dashboard
│   │       └── cron/
│   │           └── scan.ts        # Cron job endpoint
│   ├── services/
│   │   ├── bitkub.ts              # Bitkub API wrapper
│   │   ├── indicators.ts          # Technical analysis
│   │   ├── scoring.ts             # Quant scoring engine
│   │   ├── signals.ts             # Signal generation
│   │   ├── scanner.ts             # Main orchestrator
│   │   └── backtest.ts            # Backtest engine
│   ├── styles/
│   │   └── globals.css
│   └── types/
│       └── index.ts               # All TypeScript types
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql # Full DB schema
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── .env.local.example
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vercel.json
```

---

## 🚀 Installation Guide

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- Supabase account
- Bitkub account (API key)
- Vercel account
- GitHub account

### Step 1: Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/crypto-quant-screener.git
cd crypto-quant-screener
npm install
```

### Step 2: Setup Supabase

1. ไปที่ [supabase.com](https://supabase.com) → สร้าง Project ใหม่
2. ไปที่ **SQL Editor** → รัน `database/migrations/001_initial_schema.sql`
3. ไปที่ **Settings → API** → คัดลอก:
   - `Project URL`
   - `anon public` key
   - `service_role` key (secret)

### Step 3: Configure Environment

```bash
cp .env.local.example .env.local
```

แก้ไขไฟล์ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

BITKUB_API_KEY=your-bitkub-api-key
BITKUB_API_SECRET=your-bitkub-api-secret

CRON_SECRET=random-secret-string-min-32-chars
```

### Step 4: Run Development Server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

### Step 5: Test Market Scan (Manual)

```bash
curl -X GET http://localhost:3000/api/cron/scan \
  -H "Authorization: Bearer your-cron-secret"
```

---

## ☁️ Deployment Guide (Vercel)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Crypto Quant Screener"
git remote add origin https://github.com/YOUR_USERNAME/crypto-quant-screener.git
git push -u origin main
```

### Step 2: Import to Vercel

1. ไปที่ [vercel.com](https://vercel.com) → **New Project**
2. Import จาก GitHub repository
3. Framework Preset: **Next.js**

### Step 3: Set Environment Variables

ใน Vercel Dashboard → Settings → Environment Variables ใส่ทุก key จาก `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL     ← Public
NEXT_PUBLIC_SUPABASE_ANON_KEY ← Public
SUPABASE_SERVICE_ROLE_KEY    ← Secret
BITKUB_API_KEY               ← Secret
BITKUB_API_SECRET            ← Secret
CRON_SECRET                  ← Secret
```

### Step 4: Deploy

Click **Deploy** — Vercel จะ build และ deploy อัตโนมัติ

### Step 5: Verify Cron Job

ใน Vercel Dashboard → **Cron Jobs** ตรวจสอบว่ามี:
- `/api/cron/scan` ทำงานทุก `*/5 * * * *`

---

## 🔌 API Reference

### GET /api/dashboard
ดึงข้อมูลสรุปสำหรับ Dashboard ทั้งหมด

```json
{
  "data": {
    "stats": { "active_signals": 5, "buy_signals": 3, "sell_signals": 2 },
    "signals": [...],
    "top_quant_score": [...],
    "heatmap": [...]
  }
}
```

### GET /api/coins?page=1&limit=50&search=BTC
ดึงรายการเหรียญทั้งหมดพร้อมข้อมูลล่าสุด

### GET /api/signals?type=BUY&active_only=true&limit=20
ดึงสัญญาณซื้อ/ขาย

### GET /api/top-score?limit=10
Top 10 เหรียญที่มี Quant Score สูงสุด

### GET /api/breakout?limit=10
เหรียญที่กำลัง Breakout

### GET /api/momentum?limit=10
เหรียญที่มี Momentum แรง

### POST /api/backtest
```json
{ "symbol": "THB_BTC", "period": "3M" }
```

### POST /api/alert
```json
{
  "coin_id": "uuid",
  "symbol": "THB_BTC",
  "alert_type": "PRICE",
  "condition": "ABOVE",
  "target_value": 2000000
}
```

---

## ⚠️ Disclaimer

ระบบนี้สร้างขึ้นเพื่อการศึกษาและวิจัยเท่านั้น ไม่ใช่คำแนะนำทางการเงิน การลงทุนในคริปโตมีความเสี่ยงสูง ผู้ใช้ต้องตัดสินใจด้วยตนเอง

---

## 📜 License

MIT License — ใช้งานฟรีสำหรับโปรเจกต์ส่วนตัวและเชิงพาณิชย์
