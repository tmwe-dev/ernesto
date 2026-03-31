-- API Keys table for provider credentials
CREATE TABLE IF NOT EXISTS public.ernesto_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  model_default TEXT,
  rate_limit_rpm INTEGER DEFAULT 60,
  monthly_budget_usd NUMERIC(10,2),
  usage_this_month NUMERIC(10,2) DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.ernesto_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys"
  ON public.ernesto_api_keys
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_ernesto_api_keys_user ON public.ernesto_api_keys(user_id);
