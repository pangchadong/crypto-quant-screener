-- ============================================================
-- Safe Re-run Script — ใช้เมื่อ Schema มีอยู่แล้ว
-- รันนี้แทน 001_initial_schema.sql ถ้าเจอ "already exists"
-- ============================================================

-- เพิ่ม Index ที่หายไป (IF NOT EXISTS ป้องกัน error)
CREATE INDEX IF NOT EXISTS idx_coins_symbol ON public.coins(symbol);
CREATE INDEX IF NOT EXISTS idx_coins_is_active ON public.coins(is_active);
CREATE INDEX IF NOT EXISTS idx_market_data_coin_id ON public.market_data(coin_id);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON public.market_data(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON public.market_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON public.market_data(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_indicators_symbol ON public.indicators(symbol);
CREATE INDEX IF NOT EXISTS idx_indicators_calculated_at ON public.indicators(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_total_score ON public.scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_symbol ON public.scores(symbol);
CREATE INDEX IF NOT EXISTS idx_scores_breakout ON public.scores(breakout_score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_momentum ON public.scores(momentum_score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_relative_strength ON public.scores(relative_strength_score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_volume ON public.scores(volume_score DESC);
CREATE INDEX IF NOT EXISTS idx_signals_coin_id ON public.signals(coin_id);
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON public.signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_type ON public.signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_active ON public.signals(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_signals_triggered_at ON public.signals(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_coin_id ON public.alerts(coin_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON public.alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON public.system_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_symbol ON public.backtest_results(symbol);
CREATE INDEX IF NOT EXISTS idx_backtest_created_at ON public.backtest_results(created_at DESC);

-- Dashboard View (OR REPLACE ปลอดภัย)
CREATE OR REPLACE VIEW public.v_dashboard_summary AS
SELECT
    c.symbol,
    md.last_price,
    md.change_pct_24h,
    md.volume,
    md.high_24h,
    md.low_24h,
    i.ema20, i.ema50, i.rsi14, i.macd, i.macd_histogram, i.atr,
    s.total_score, s.trend_score, s.volume_score,
    s.momentum_score, s.breakout_score, s.relative_strength_score,
    sig.signal_type, sig.signal_strength,
    sig.entry_price, sig.stop_loss, sig.take_profit, sig.risk_reward_ratio
FROM public.coins c
LEFT JOIN public.market_data md ON md.coin_id = c.id
    AND md.timestamp = (SELECT MAX(timestamp) FROM public.market_data WHERE coin_id = c.id)
LEFT JOIN public.indicators i ON i.coin_id = c.id
LEFT JOIN public.scores s ON s.coin_id = c.id
LEFT JOIN public.signals sig ON sig.coin_id = c.id AND sig.is_active = true
WHERE c.is_active = true;

-- Cleanup Functions
CREATE OR REPLACE FUNCTION cleanup_old_market_data()
RETURNS void AS $$
BEGIN
    DELETE FROM public.market_data WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.system_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (DROP IF EXISTS ก่อน เพื่อหลีกเลี่ยง duplicate)
DO $$
BEGIN
    -- coins
    DROP POLICY IF EXISTS "Public read coins" ON public.coins;
    DROP POLICY IF EXISTS "Service role all coins" ON public.coins;
    CREATE POLICY "Public read coins" ON public.coins FOR SELECT USING (true);
    CREATE POLICY "Service role all coins" ON public.coins FOR ALL USING (true);

    -- market_data
    DROP POLICY IF EXISTS "Public read market_data" ON public.market_data;
    DROP POLICY IF EXISTS "Service role all market_data" ON public.market_data;
    CREATE POLICY "Public read market_data" ON public.market_data FOR SELECT USING (true);
    CREATE POLICY "Service role all market_data" ON public.market_data FOR ALL USING (true);

    -- indicators
    DROP POLICY IF EXISTS "Public read indicators" ON public.indicators;
    DROP POLICY IF EXISTS "Service role all indicators" ON public.indicators;
    CREATE POLICY "Public read indicators" ON public.indicators FOR SELECT USING (true);
    CREATE POLICY "Service role all indicators" ON public.indicators FOR ALL USING (true);

    -- scores
    DROP POLICY IF EXISTS "Public read scores" ON public.scores;
    DROP POLICY IF EXISTS "Service role all scores" ON public.scores;
    CREATE POLICY "Public read scores" ON public.scores FOR SELECT USING (true);
    CREATE POLICY "Service role all scores" ON public.scores FOR ALL USING (true);

    -- signals
    DROP POLICY IF EXISTS "Public read signals" ON public.signals;
    DROP POLICY IF EXISTS "Service role all signals" ON public.signals;
    CREATE POLICY "Public read signals" ON public.signals FOR SELECT USING (true);
    CREATE POLICY "Service role all signals" ON public.signals FOR ALL USING (true);

    -- backtest_results
    DROP POLICY IF EXISTS "Public read backtest" ON public.backtest_results;
    CREATE POLICY "Public read backtest" ON public.backtest_results FOR SELECT USING (true);

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Policy error (ignored): %', SQLERRM;
END $$;

SELECT 'Setup complete! All tables and indexes are ready.' AS status;
