-- ============================================================
-- Crypto Quant Screener - Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. COINS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coins (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol      VARCHAR(20) NOT NULL UNIQUE,
    base_currency VARCHAR(10) NOT NULL,
    quote_currency VARCHAR(10) NOT NULL DEFAULT 'THB',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coins_symbol ON public.coins(symbol);
CREATE INDEX idx_coins_is_active ON public.coins(is_active);

COMMENT ON TABLE public.coins IS 'Master list of cryptocurrency pairs on Bitkub';

-- ============================================================
-- 2. MARKET DATA TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.market_data (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coin_id         UUID NOT NULL REFERENCES public.coins(id) ON DELETE CASCADE,
    symbol          VARCHAR(20) NOT NULL,
    last_price      NUMERIC(24,8) NOT NULL DEFAULT 0,
    bid             NUMERIC(24,8) NOT NULL DEFAULT 0,
    ask             NUMERIC(24,8) NOT NULL DEFAULT 0,
    volume          NUMERIC(24,8) NOT NULL DEFAULT 0,
    volume_24h      NUMERIC(24,8) NOT NULL DEFAULT 0,
    change_24h      NUMERIC(24,8) NOT NULL DEFAULT 0,
    change_pct_24h  NUMERIC(10,4) NOT NULL DEFAULT 0,
    high_24h        NUMERIC(24,8) NOT NULL DEFAULT 0,
    low_24h         NUMERIC(24,8) NOT NULL DEFAULT 0,
    open_24h        NUMERIC(24,8) NOT NULL DEFAULT 0,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_data_coin_id ON public.market_data(coin_id);
CREATE INDEX idx_market_data_symbol ON public.market_data(symbol);
CREATE INDEX idx_market_data_timestamp ON public.market_data(timestamp DESC);
CREATE INDEX idx_market_data_symbol_timestamp ON public.market_data(symbol, timestamp DESC);

-- Partition by time for performance (optional for large datasets)
-- Keep only 7 days of raw market data to save storage
CREATE OR REPLACE FUNCTION cleanup_old_market_data()
RETURNS void AS $$
BEGIN
    DELETE FROM public.market_data
    WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.market_data IS 'Real-time market data snapshots from Bitkub, scanned every 5 minutes';

-- ============================================================
-- 3. INDICATORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.indicators (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coin_id         UUID NOT NULL UNIQUE REFERENCES public.coins(id) ON DELETE CASCADE,
    symbol          VARCHAR(20) NOT NULL,
    ema20           NUMERIC(24,8),
    ema50           NUMERIC(24,8),
    ema200          NUMERIC(24,8),
    rsi14           NUMERIC(8,4),
    macd            NUMERIC(24,8),
    macd_signal     NUMERIC(24,8),
    macd_histogram  NUMERIC(24,8),
    atr             NUMERIC(24,8),
    bb_upper        NUMERIC(24,8),
    bb_middle       NUMERIC(24,8),
    bb_lower        NUMERIC(24,8),
    volume_ma20     NUMERIC(24,8),
    high_20d        NUMERIC(24,8),
    low_20d         NUMERIC(24,8),
    calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_indicators_symbol ON public.indicators(symbol);
CREATE INDEX idx_indicators_rsi14 ON public.indicators(rsi14) WHERE rsi14 IS NOT NULL;
CREATE INDEX idx_indicators_calculated_at ON public.indicators(calculated_at DESC);

COMMENT ON TABLE public.indicators IS 'Latest technical indicators per coin: EMA, RSI, MACD, ATR, Bollinger Bands';

-- ============================================================
-- 4. SCORES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scores (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coin_id                 UUID NOT NULL UNIQUE REFERENCES public.coins(id) ON DELETE CASCADE,
    symbol                  VARCHAR(20) NOT NULL,
    trend_score             SMALLINT NOT NULL DEFAULT 0 CHECK (trend_score BETWEEN 0 AND 25),
    volume_score            SMALLINT NOT NULL DEFAULT 0 CHECK (volume_score BETWEEN 0 AND 25),
    momentum_score          SMALLINT NOT NULL DEFAULT 0 CHECK (momentum_score BETWEEN 0 AND 20),
    breakout_score          SMALLINT NOT NULL DEFAULT 0 CHECK (breakout_score BETWEEN 0 AND 15),
    relative_strength_score SMALLINT NOT NULL DEFAULT 0 CHECK (relative_strength_score BETWEEN 0 AND 15),
    total_score             SMALLINT NOT NULL DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),
    score_details           JSONB NOT NULL DEFAULT '{}',
    scored_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scores_total_score ON public.scores(total_score DESC);
CREATE INDEX idx_scores_symbol ON public.scores(symbol);
CREATE INDEX idx_scores_breakout ON public.scores(breakout_score DESC);
CREATE INDEX idx_scores_momentum ON public.scores(momentum_score DESC);
CREATE INDEX idx_scores_relative_strength ON public.scores(relative_strength_score DESC);
CREATE INDEX idx_scores_volume ON public.scores(volume_score DESC);

COMMENT ON TABLE public.scores IS 'Quant scores per coin: Trend(25) + Volume(25) + Momentum(20) + Breakout(15) + RS(15) = 100';

-- ============================================================
-- 5. SIGNALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.signals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coin_id             UUID NOT NULL REFERENCES public.coins(id) ON DELETE CASCADE,
    symbol              VARCHAR(20) NOT NULL,
    signal_type         VARCHAR(10) NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),
    signal_strength     VARCHAR(10) NOT NULL CHECK (signal_strength IN ('STRONG', 'MODERATE', 'WEAK')),
    score               NUMERIC(5,2) NOT NULL DEFAULT 0,
    entry_price         NUMERIC(24,8) NOT NULL,
    stop_loss           NUMERIC(24,8) NOT NULL,
    take_profit         NUMERIC(24,8) NOT NULL,
    risk_reward_ratio   NUMERIC(6,2) NOT NULL,
    reasons             TEXT[] NOT NULL DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    triggered_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expired_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signals_coin_id ON public.signals(coin_id);
CREATE INDEX idx_signals_symbol ON public.signals(symbol);
CREATE INDEX idx_signals_type ON public.signals(signal_type);
CREATE INDEX idx_signals_active ON public.signals(is_active) WHERE is_active = true;
CREATE INDEX idx_signals_triggered_at ON public.signals(triggered_at DESC);

COMMENT ON TABLE public.signals IS 'Trading signals: BUY/SELL with entry, stop loss, take profit, and risk:reward';

-- ============================================================
-- 6. ALERTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    coin_id         UUID NOT NULL REFERENCES public.coins(id) ON DELETE CASCADE,
    symbol          VARCHAR(20) NOT NULL,
    alert_type      VARCHAR(10) NOT NULL CHECK (alert_type IN ('PRICE', 'SIGNAL', 'SCORE')),
    condition       VARCHAR(10) NOT NULL CHECK (condition IN ('ABOVE', 'BELOW', 'EQUALS', 'CROSSES')),
    target_value    NUMERIC(24,8) NOT NULL,
    is_triggered    BOOLEAN NOT NULL DEFAULT false,
    triggered_at    TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_coin_id ON public.alerts(coin_id);
CREATE INDEX idx_alerts_active ON public.alerts(is_active) WHERE is_active = true;

-- ============================================================
-- 7. SYSTEM LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_type    VARCHAR(10) NOT NULL CHECK (log_type IN ('INFO', 'WARNING', 'ERROR', 'CRON')),
    message     TEXT NOT NULL,
    details     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_logs_type ON public.system_logs(log_type);
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);

-- Auto-cleanup logs older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.system_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. USERS TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    display_name TEXT,
    telegram_id TEXT,
    line_token  TEXT,
    notify_buy  BOOLEAN NOT NULL DEFAULT true,
    notify_sell BOOLEAN NOT NULL DEFAULT true,
    min_score   SMALLINT NOT NULL DEFAULT 85,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. WATCHLISTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.watchlists (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    coins       TEXT[] NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_watchlists_user_id ON public.watchlists(user_id);

-- ============================================================
-- 10. BACKTEST RESULTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.backtest_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_name   VARCHAR(100) NOT NULL,
    symbol          VARCHAR(20),
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    total_trades    INTEGER NOT NULL DEFAULT 0,
    winning_trades  INTEGER NOT NULL DEFAULT 0,
    losing_trades   INTEGER NOT NULL DEFAULT 0,
    win_rate        NUMERIC(6,2) NOT NULL DEFAULT 0,
    profit_factor   NUMERIC(8,2) NOT NULL DEFAULT 0,
    max_drawdown    NUMERIC(8,2) NOT NULL DEFAULT 0,
    sharpe_ratio    NUMERIC(8,2) NOT NULL DEFAULT 0,
    expectancy      NUMERIC(8,2) NOT NULL DEFAULT 0,
    total_return    NUMERIC(10,2) NOT NULL DEFAULT 0,
    parameters      JSONB NOT NULL DEFAULT '{}',
    trades          JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backtest_symbol ON public.backtest_results(symbol);
CREATE INDEX idx_backtest_created_at ON public.backtest_results(created_at DESC);

-- ============================================================
-- VIEWS
-- ============================================================

-- Dashboard summary view
CREATE OR REPLACE VIEW public.v_dashboard_summary AS
SELECT
    c.symbol,
    md.last_price,
    md.change_pct_24h,
    md.volume,
    md.high_24h,
    md.low_24h,
    i.ema20,
    i.ema50,
    i.rsi14,
    i.macd,
    i.macd_histogram,
    i.atr,
    s.total_score,
    s.trend_score,
    s.volume_score,
    s.momentum_score,
    s.breakout_score,
    s.relative_strength_score,
    sig.signal_type,
    sig.signal_strength,
    sig.entry_price,
    sig.stop_loss,
    sig.take_profit,
    sig.risk_reward_ratio
FROM public.coins c
LEFT JOIN public.market_data md ON md.coin_id = c.id
    AND md.timestamp = (SELECT MAX(timestamp) FROM public.market_data WHERE coin_id = c.id)
LEFT JOIN public.indicators i ON i.coin_id = c.id
LEFT JOIN public.scores s ON s.coin_id = c.id
LEFT JOIN public.signals sig ON sig.coin_id = c.id AND sig.is_active = true
WHERE c.is_active = true;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Public read for coins, market_data, indicators, scores, signals
ALTER TABLE public.coins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read coins" ON public.coins FOR SELECT USING (true);

ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read market_data" ON public.market_data FOR SELECT USING (true);

ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read indicators" ON public.indicators FOR SELECT USING (true);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read scores" ON public.scores FOR SELECT USING (true);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read signals" ON public.signals FOR SELECT USING (true);

ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read backtest" ON public.backtest_results FOR SELECT USING (true);

-- Service role can write everything
CREATE POLICY "Service role all coins" ON public.coins FOR ALL USING (true);
CREATE POLICY "Service role all market_data" ON public.market_data FOR ALL USING (true);
CREATE POLICY "Service role all indicators" ON public.indicators FOR ALL USING (true);
CREATE POLICY "Service role all scores" ON public.scores FOR ALL USING (true);
CREATE POLICY "Service role all signals" ON public.signals FOR ALL USING (true);

-- Users own their data
CREATE POLICY "Users read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own data" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users read own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own alerts" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users read own watchlists" ON public.watchlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users all own watchlists" ON public.watchlists FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coins_updated_at
    BEFORE UPDATE ON public.coins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at
    BEFORE UPDATE ON public.watchlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
