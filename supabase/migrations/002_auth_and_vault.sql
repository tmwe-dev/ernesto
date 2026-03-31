-- ERNESTO Auth and API Key Vault System
-- Migration: Auth, Profiles, API Key Management, and Usage Tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- EMPLOYEE PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ernesto_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_profiles_email ON ernesto_profiles(email);
CREATE INDEX idx_ernesto_profiles_role ON ernesto_profiles(role);
CREATE INDEX idx_ernesto_profiles_is_active ON ernesto_profiles(is_active);

-- ============================================================================
-- API KEY VAULT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ernesto_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'gemini', 'openai', 'grok', 'qwen', 'elevenlabs', 'lovable')),
  display_name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_hint TEXT,
  is_active BOOLEAN DEFAULT true,
  model_default TEXT,
  rate_limit_rpm INTEGER DEFAULT 60,
  monthly_budget_usd NUMERIC(10,2),
  usage_this_month NUMERIC(10,2) DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES ernesto_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_api_keys_provider ON ernesto_api_keys(provider);
CREATE INDEX idx_ernesto_api_keys_is_active ON ernesto_api_keys(is_active);
CREATE INDEX idx_ernesto_api_keys_created_by ON ernesto_api_keys(created_by);
CREATE INDEX idx_ernesto_api_keys_created_at ON ernesto_api_keys(created_at);

-- ============================================================================
-- API USAGE TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ernesto_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  user_id UUID REFERENCES ernesto_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_usd NUMERIC(8,4) DEFAULT 0,
  model TEXT,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_api_usage_provider ON ernesto_api_usage(provider);
CREATE INDEX idx_ernesto_api_usage_user_id ON ernesto_api_usage(user_id);
CREATE INDEX idx_ernesto_api_usage_created_at ON ernesto_api_usage(created_at);
CREATE INDEX idx_ernesto_api_usage_provider_created ON ernesto_api_usage(provider, created_at);

-- ============================================================================
-- INVITE CODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ernesto_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_by UUID REFERENCES ernesto_profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_invites_email ON ernesto_invites(email);
CREATE INDEX idx_ernesto_invites_code ON ernesto_invites(invite_code);
CREATE INDEX idx_ernesto_invites_expires_at ON ernesto_invites(expires_at);

-- ============================================================================
-- ACTIVITY LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ernesto_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES ernesto_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_activity_log_user_id ON ernesto_activity_log(user_id);
CREATE INDEX idx_ernesto_activity_log_action ON ernesto_activity_log(action);
CREATE INDEX idx_ernesto_activity_log_created_at ON ernesto_activity_log(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE ernesto_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile" ON ernesto_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON ernesto_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ernesto_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- API Keys: Only admins can access
CREATE POLICY "Only admins can view API keys" ON ernesto_api_keys
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ernesto_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can create API keys" ON ernesto_api_keys
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM ernesto_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can update API keys" ON ernesto_api_keys
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM ernesto_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can delete API keys" ON ernesto_api_keys
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM ernesto_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- API Usage: Users can read their own usage, admins can read all
CREATE POLICY "Users can read own usage" ON ernesto_api_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all usage" ON ernesto_api_usage
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ernesto_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert usage" ON ernesto_api_usage
  FOR INSERT WITH CHECK (true);

-- Invites: Only admins can create/view
CREATE POLICY "Only admins can view invites" ON ernesto_invites
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ernesto_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can create invites" ON ernesto_invites
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM ernesto_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Activity Log: Users can read their own, admins can read all
CREATE POLICY "Users can read own activity" ON ernesto_activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all activity" ON ernesto_activity_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ernesto_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert activity" ON ernesto_activity_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ernesto_profiles_updated_at
  BEFORE UPDATE ON ernesto_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ernesto_api_keys_updated_at
  BEFORE UPDATE ON ernesto_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUTO-CREATE PROFILE ON USER REGISTRATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.ernesto_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operator')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FUNCTION: Get API Key (Decrypts)
-- ============================================================================

CREATE OR REPLACE FUNCTION ernesto_get_api_key(p_provider TEXT)
RETURNS TEXT AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ernesto_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can retrieve API keys';
  END IF;

  SELECT encrypted_key INTO v_key
  FROM ernesto_api_keys
  WHERE provider = p_provider AND is_active = true
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'No active API key found for provider: %', p_provider;
  END IF;

  RETURN v_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Log API Usage
-- ============================================================================

CREATE OR REPLACE FUNCTION ernesto_log_api_usage(
  p_provider TEXT,
  p_user_id UUID,
  p_action TEXT,
  p_tokens_in INTEGER DEFAULT 0,
  p_tokens_out INTEGER DEFAULT 0,
  p_cost_usd NUMERIC DEFAULT 0,
  p_model TEXT DEFAULT NULL,
  p_latency_ms INTEGER DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_usage_id UUID;
BEGIN
  INSERT INTO ernesto_api_usage (
    provider,
    user_id,
    action,
    tokens_in,
    tokens_out,
    cost_usd,
    model,
    latency_ms,
    success,
    error_message
  ) VALUES (
    p_provider,
    p_user_id,
    p_action,
    p_tokens_in,
    p_tokens_out,
    p_cost_usd,
    p_model,
    p_latency_ms,
    p_success,
    p_error_message
  )
  RETURNING id INTO v_usage_id;

  UPDATE ernesto_api_keys
  SET usage_this_month = usage_this_month + p_cost_usd,
      last_used_at = now()
  WHERE provider = p_provider AND is_active = true;

  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get Monthly Usage Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION ernesto_get_monthly_usage(p_provider TEXT DEFAULT NULL)
RETURNS TABLE(
  provider TEXT,
  total_calls BIGINT,
  total_tokens_in BIGINT,
  total_tokens_out BIGINT,
  total_cost_usd NUMERIC,
  success_count BIGINT,
  error_count BIGINT,
  avg_latency_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ernesto_api_usage.provider,
    COUNT(*)::BIGINT,
    COALESCE(SUM(tokens_in), 0)::BIGINT,
    COALESCE(SUM(tokens_out), 0)::BIGINT,
    COALESCE(SUM(cost_usd), 0)::NUMERIC,
    COUNT(*) FILTER (WHERE success = true)::BIGINT,
    COUNT(*) FILTER (WHERE success = false)::BIGINT,
    COALESCE(AVG(latency_ms), 0)::NUMERIC
  FROM ernesto_api_usage
  WHERE (p_provider IS NULL OR ernesto_api_usage.provider = p_provider)
    AND created_at >= date_trunc('month', now())
  GROUP BY ernesto_api_usage.provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get User Monthly Usage
-- ============================================================================

CREATE OR REPLACE FUNCTION ernesto_get_user_monthly_usage(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  provider TEXT,
  action TEXT,
  call_count BIGINT,
  total_cost_usd NUMERIC,
  success_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ernesto_api_usage.provider,
    ernesto_api_usage.action,
    COUNT(*)::BIGINT,
    COALESCE(SUM(cost_usd), 0)::NUMERIC,
    COUNT(*) FILTER (WHERE success = true)::BIGINT
  FROM ernesto_api_usage
  WHERE (p_user_id IS NULL OR ernesto_api_usage.user_id = p_user_id)
    AND created_at >= date_trunc('month', now())
  GROUP BY ernesto_api_usage.provider, ernesto_api_usage.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
