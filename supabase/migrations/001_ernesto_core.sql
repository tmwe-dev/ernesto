-- ERNESTO Core Migration: AI Pricelist Import Engine with Hydra Memory
-- Created: 2026-03-31
-- Migration: 001_ernesto_core

-- =====================================================================
-- TABLE: ernesto_import_jobs
-- =====================================================================
CREATE TABLE IF NOT EXISTS ernesto_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  carrier_hint TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','analyzing','analyzed','mapped','previewed','committed','failed')),
  ai_mapping JSONB DEFAULT '{}',
  stats JSONB,
  warnings JSONB DEFAULT '[]',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_import_jobs_user_id ON ernesto_import_jobs(user_id);
CREATE INDEX idx_ernesto_import_jobs_status ON ernesto_import_jobs(status);
CREATE INDEX idx_ernesto_import_jobs_created_at ON ernesto_import_jobs(created_at DESC);

-- =====================================================================
-- TABLE: ernesto_documents
-- =====================================================================
CREATE TABLE IF NOT EXISTS ernesto_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES ernesto_import_jobs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  carrier TEXT,
  document_type TEXT DEFAULT 'price_list_analysis',
  report_text TEXT,
  structured_data JSONB DEFAULT '{}',
  summary JSONB DEFAULT '{}',
  sheet_images JSONB DEFAULT '[]',
  confidence NUMERIC(3,2) DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  status TEXT DEFAULT 'draft',
  conversation_summary TEXT,
  total_messages INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_documents_job_id ON ernesto_documents(job_id);
CREATE INDEX idx_ernesto_documents_carrier ON ernesto_documents(carrier);
CREATE INDEX idx_ernesto_documents_status ON ernesto_documents(status);

-- =====================================================================
-- TABLE: ernesto_chat_messages
-- =====================================================================
CREATE TABLE IF NOT EXISTS ernesto_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES ernesto_documents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system_summary')),
  content TEXT NOT NULL,
  actions JSONB DEFAULT '[]',
  message_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_chat_messages_document_id ON ernesto_chat_messages(document_id);
CREATE INDEX idx_ernesto_chat_messages_message_index ON ernesto_chat_messages(document_id, message_index);

-- =====================================================================
-- TABLE: ernesto_attachments
-- =====================================================================
CREATE TABLE IF NOT EXISTS ernesto_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES ernesto_documents(id) ON DELETE CASCADE,
  job_id UUID REFERENCES ernesto_import_jobs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  phase TEXT DEFAULT 'general',
  ai_summary TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_attachments_document_id ON ernesto_attachments(document_id);
CREATE INDEX idx_ernesto_attachments_job_id ON ernesto_attachments(job_id);
CREATE INDEX idx_ernesto_attachments_phase ON ernesto_attachments(phase);

-- =====================================================================
-- TABLE: ernesto_knowledge_rules
-- =====================================================================
CREATE TABLE IF NOT EXISTS ernesto_knowledge_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_code TEXT,
  operation_type TEXT NOT NULL DEFAULT 'general',
  rule_type TEXT NOT NULL DEFAULT 'instruction',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'user',
  source_document_id UUID REFERENCES ernesto_documents(id) ON DELETE SET NULL,
  memory_item_id UUID,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_knowledge_rules_carrier_code ON ernesto_knowledge_rules(carrier_code);
CREATE INDEX idx_ernesto_knowledge_rules_operation_type ON ernesto_knowledge_rules(operation_type);
CREATE INDEX idx_ernesto_knowledge_rules_is_active ON ernesto_knowledge_rules(is_active);
CREATE INDEX idx_ernesto_knowledge_rules_tags ON ernesto_knowledge_rules USING GIN(tags);

-- =====================================================================
-- TABLE: ernesto_memory_items (Hydra Memory for ERNESTO)
-- =====================================================================
CREATE TABLE IF NOT EXISTS ernesto_memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'L1' CHECK (level IN ('L1','L2','L3')),
  type TEXT NOT NULL CHECK (type IN ('rule','pattern','correction','preference','format','procedure','fact','schema')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  carrier TEXT,
  confidence NUMERIC(5,2) DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  usefulness NUMERIC(5,2) DEFAULT 50 CHECK (usefulness BETWEEN 0 AND 100),
  relevance NUMERIC(5,4) DEFAULT 1.0 CHECK (relevance BETWEEN 0 AND 1),
  access_count INTEGER DEFAULT 0 CHECK (access_count >= 0),
  source TEXT DEFAULT 'system',
  approved BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1 CHECK (version >= 1),
  promoted_from TEXT,
  promoted_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_memory_items_user_id ON ernesto_memory_items(user_id);
CREATE INDEX idx_ernesto_memory_items_level ON ernesto_memory_items(level);
CREATE INDEX idx_ernesto_memory_items_carrier ON ernesto_memory_items(carrier);
CREATE INDEX idx_ernesto_memory_items_archived ON ernesto_memory_items(archived);
CREATE INDEX idx_ernesto_memory_items_tags ON ernesto_memory_items USING GIN(tags);
CREATE INDEX idx_ernesto_memory_items_retrieval ON ernesto_memory_items(user_id, archived, confidence DESC, relevance DESC);
CREATE INDEX idx_ernesto_memory_items_access ON ernesto_memory_items(last_accessed_at DESC);

-- =====================================================================
-- TABLE: ernesto_memory_promotions
-- =====================================================================
CREATE TABLE IF NOT EXISTS ernesto_memory_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES ernesto_memory_items(id) ON DELETE CASCADE,
  from_level TEXT NOT NULL,
  to_level TEXT NOT NULL,
  reason TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_memory_promotions_item_id ON ernesto_memory_promotions(item_id);
CREATE INDEX idx_ernesto_memory_promotions_created_at ON ernesto_memory_promotions(created_at DESC);

-- =====================================================================
-- TABLE: ernesto_memory_feedback
-- =====================================================================
CREATE TABLE IF NOT EXISTS ernesto_memory_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES ernesto_memory_items(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive','negative')),
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_memory_feedback_item_id ON ernesto_memory_feedback(item_id);
CREATE INDEX idx_ernesto_memory_feedback_type ON ernesto_memory_feedback(feedback_type);

-- =====================================================================
-- TABLE: ernesto_import_job_rows (Staging table for dry run)
-- =====================================================================
CREATE TABLE IF NOT EXISTS ernesto_import_job_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES ernesto_import_jobs(id) ON DELETE CASCADE,
  target_table TEXT NOT NULL,
  row_data JSONB NOT NULL,
  row_index INTEGER NOT NULL,
  status TEXT DEFAULT 'preview',
  error_message TEXT
);

CREATE INDEX idx_ernesto_import_job_rows_job_id ON ernesto_import_job_rows(job_id);
CREATE INDEX idx_ernesto_import_job_rows_status ON ernesto_import_job_rows(status);

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Function: ernesto_find_promotable_items
-- Returns items eligible for promotion based on confidence and usefulness
CREATE OR REPLACE FUNCTION ernesto_find_promotable_items(p_user_id UUID)
RETURNS TABLE (
  item_id UUID,
  current_level TEXT,
  confidence NUMERIC,
  usefulness NUMERIC,
  access_count INTEGER,
  promote_to TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.level,
    i.confidence,
    i.usefulness,
    i.access_count,
    CASE
      WHEN i.level = 'L1' AND i.confidence >= 75 AND i.usefulness >= 70 AND i.access_count >= 5 THEN 'L2'
      WHEN i.level = 'L2' AND i.confidence >= 90 AND i.usefulness >= 85 AND i.access_count >= 15 THEN 'L3'
      ELSE NULL::TEXT
    END as promote_to
  FROM ernesto_memory_items i
  WHERE i.user_id = p_user_id
    AND i.archived = false
    AND i.approved = true
    AND (
      (i.level = 'L1' AND i.confidence >= 75 AND i.usefulness >= 70 AND i.access_count >= 5)
      OR (i.level = 'L2' AND i.confidence >= 90 AND i.usefulness >= 85 AND i.access_count >= 15)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: ernesto_apply_decay
-- Applies daily confidence decay (L1: 2%/day, L2: 0.5%/day, L3: no decay)
CREATE OR REPLACE FUNCTION ernesto_apply_decay(p_user_id UUID)
RETURNS TABLE (
  item_id UUID,
  old_confidence NUMERIC,
  new_confidence NUMERIC,
  decay_applied NUMERIC
) AS $$
DECLARE
  v_days_since_access NUMERIC;
  v_decay_rate NUMERIC;
BEGIN
  RETURN QUERY
  WITH decayed_items AS (
    SELECT
      i.id,
      i.confidence,
      EXTRACT(DAY FROM now() - i.last_accessed_at) as days_since,
      CASE
        WHEN i.level = 'L1' THEN 0.02
        WHEN i.level = 'L2' THEN 0.005
        ELSE 0
      END as decay_rate,
      GREATEST(
        0,
        i.confidence - (
          EXTRACT(DAY FROM now() - i.last_accessed_at) *
          CASE
            WHEN i.level = 'L1' THEN 0.02
            WHEN i.level = 'L2' THEN 0.005
            ELSE 0
          END * 100
        )
      ) as new_confidence
    FROM ernesto_memory_items i
    WHERE i.user_id = p_user_id
      AND i.archived = false
      AND (i.level IN ('L1', 'L2'))
      AND (now() - i.last_accessed_at) > interval '1 day'
  )
  UPDATE ernesto_memory_items
  SET confidence = decayed_items.new_confidence,
      updated_at = now()
  FROM decayed_items
  WHERE ernesto_memory_items.id = decayed_items.id
  RETURNING
    ernesto_memory_items.id,
    decayed_items.confidence,
    decayed_items.new_confidence,
    (decayed_items.confidence - decayed_items.new_confidence);
END;
$$ LANGUAGE plpgsql;

-- Function: ernesto_memory_stats
-- Returns aggregate memory statistics for a user
CREATE OR REPLACE FUNCTION ernesto_memory_stats(p_user_id UUID)
RETURNS TABLE (
  total_items BIGINT,
  l1_count BIGINT,
  l2_count BIGINT,
  l3_count BIGINT,
  avg_confidence NUMERIC,
  avg_usefulness NUMERIC,
  approved_count BIGINT,
  pinned_count BIGINT,
  archived_count BIGINT,
  health_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE level = 'L1') as l1,
      COUNT(*) FILTER (WHERE level = 'L2') as l2,
      COUNT(*) FILTER (WHERE level = 'L3') as l3,
      AVG(confidence) as avg_conf,
      AVG(usefulness) as avg_useful,
      COUNT(*) FILTER (WHERE approved = true) as approved,
      COUNT(*) FILTER (WHERE pinned = true) as pinned,
      COUNT(*) FILTER (WHERE archived = true) as archived
    FROM ernesto_memory_items
    WHERE user_id = p_user_id
  )
  SELECT
    stats.total,
    stats.l1,
    stats.l2,
    stats.l3,
    stats.avg_conf,
    stats.avg_useful,
    stats.approved,
    stats.pinned,
    stats.archived,
    ROUND(
      COALESCE((stats.avg_conf + stats.avg_useful) / 2 * (stats.approved::numeric / NULLIF(stats.total, 0)), 0)::numeric,
      2
    )
  FROM stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: ernesto_increment_access
-- Bumps access_count and updates last_accessed_at
CREATE OR REPLACE FUNCTION ernesto_increment_access(p_item_id UUID)
RETURNS ernesto_memory_items AS $$
DECLARE
  v_item ernesto_memory_items;
BEGIN
  UPDATE ernesto_memory_items
  SET
    access_count = access_count + 1,
    last_accessed_at = now(),
    updated_at = now()
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  RETURN v_item;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Trigger function: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: ernesto_import_jobs updated_at
DROP TRIGGER IF EXISTS trigger_ernesto_import_jobs_updated_at ON ernesto_import_jobs;
CREATE TRIGGER trigger_ernesto_import_jobs_updated_at
BEFORE UPDATE ON ernesto_import_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: ernesto_documents updated_at
DROP TRIGGER IF EXISTS trigger_ernesto_documents_updated_at ON ernesto_documents;
CREATE TRIGGER trigger_ernesto_documents_updated_at
BEFORE UPDATE ON ernesto_documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: ernesto_knowledge_rules updated_at
DROP TRIGGER IF EXISTS trigger_ernesto_knowledge_rules_updated_at ON ernesto_knowledge_rules;
CREATE TRIGGER trigger_ernesto_knowledge_rules_updated_at
BEFORE UPDATE ON ernesto_knowledge_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: ernesto_memory_items updated_at
DROP TRIGGER IF EXISTS trigger_ernesto_memory_items_updated_at ON ernesto_memory_items;
CREATE TRIGGER trigger_ernesto_memory_items_updated_at
BEFORE UPDATE ON ernesto_memory_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE ernesto_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_knowledge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_memory_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_memory_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ernesto_import_job_rows ENABLE ROW LEVEL SECURITY;

-- RLS Policy: ernesto_import_jobs
DROP POLICY IF EXISTS "Users can only access their own import jobs" ON ernesto_import_jobs;
CREATE POLICY "Users can only access their own import jobs"
ON ernesto_import_jobs
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policy: ernesto_documents
DROP POLICY IF EXISTS "Users can access documents from their jobs" ON ernesto_documents;
CREATE POLICY "Users can access documents from their jobs"
ON ernesto_documents
FOR ALL
USING (
  job_id IN (
    SELECT id FROM ernesto_import_jobs WHERE user_id = auth.uid()
  )
);

-- RLS Policy: ernesto_chat_messages
DROP POLICY IF EXISTS "Users can access messages from their documents" ON ernesto_chat_messages;
CREATE POLICY "Users can access messages from their documents"
ON ernesto_chat_messages
FOR ALL
USING (
  document_id IN (
    SELECT ed.id FROM ernesto_documents ed
    INNER JOIN ernesto_import_jobs eij ON ed.job_id = eij.id
    WHERE eij.user_id = auth.uid()
  )
);

-- RLS Policy: ernesto_attachments
DROP POLICY IF EXISTS "Users can access attachments from their jobs" ON ernesto_attachments;
CREATE POLICY "Users can access attachments from their jobs"
ON ernesto_attachments
FOR ALL
USING (
  job_id IN (SELECT id FROM ernesto_import_jobs WHERE user_id = auth.uid())
  OR document_id IN (
    SELECT ed.id FROM ernesto_documents ed
    INNER JOIN ernesto_import_jobs eij ON ed.job_id = eij.id
    WHERE eij.user_id = auth.uid()
  )
);

-- RLS Policy: ernesto_knowledge_rules
-- Rules are global or scoped by carrier - allow read access to all
DROP POLICY IF EXISTS "Anyone can read knowledge rules" ON ernesto_knowledge_rules;
CREATE POLICY "Anyone can read knowledge rules"
ON ernesto_knowledge_rules
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create knowledge rules" ON ernesto_knowledge_rules;
CREATE POLICY "Authenticated users can create knowledge rules"
ON ernesto_knowledge_rules
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: ernesto_memory_items
DROP POLICY IF EXISTS "Users can only access their own memory items" ON ernesto_memory_items;
CREATE POLICY "Users can only access their own memory items"
ON ernesto_memory_items
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policy: ernesto_memory_promotions
DROP POLICY IF EXISTS "Users can access promotions for their items" ON ernesto_memory_promotions;
CREATE POLICY "Users can access promotions for their items"
ON ernesto_memory_promotions
FOR ALL
USING (
  item_id IN (
    SELECT id FROM ernesto_memory_items WHERE user_id = auth.uid()
  )
);

-- RLS Policy: ernesto_memory_feedback
DROP POLICY IF EXISTS "Users can access feedback for their items" ON ernesto_memory_feedback;
CREATE POLICY "Users can access feedback for their items"
ON ernesto_memory_feedback
FOR ALL
USING (
  item_id IN (
    SELECT id FROM ernesto_memory_items WHERE user_id = auth.uid()
  )
);

-- RLS Policy: ernesto_import_job_rows
DROP POLICY IF EXISTS "Users can access rows from their jobs" ON ernesto_import_job_rows;
CREATE POLICY "Users can access rows from their jobs"
ON ernesto_import_job_rows
FOR ALL
USING (
  job_id IN (
    SELECT id FROM ernesto_import_jobs WHERE user_id = auth.uid()
  )
);

-- =====================================================================
-- COMMENTS (for documentation)
-- =====================================================================

COMMENT ON TABLE ernesto_import_jobs IS 'Core table tracking pricelist import jobs for ERNESTO';
COMMENT ON TABLE ernesto_documents IS 'Documents created from analyzed import jobs, containing structured data and summaries';
COMMENT ON TABLE ernesto_chat_messages IS 'Chat conversation history during document analysis';
COMMENT ON TABLE ernesto_attachments IS 'Supporting files attached to documents or jobs';
COMMENT ON TABLE ernesto_knowledge_rules IS 'Learned rules and instructions for carriers and operations';
COMMENT ON TABLE ernesto_memory_items IS 'Hydra memory system for persistent learning across sessions';
COMMENT ON TABLE ernesto_memory_promotions IS 'Audit trail for memory item promotions between levels';
COMMENT ON TABLE ernesto_memory_feedback IS 'User feedback on memory items for continuous improvement';
COMMENT ON TABLE ernesto_import_job_rows IS 'Staging table for previewing rows before committing to final tables';

COMMENT ON FUNCTION ernesto_find_promotable_items IS 'Identifies memory items eligible for promotion (L1->L2, L2->L3)';
COMMENT ON FUNCTION ernesto_apply_decay IS 'Applies time-based confidence decay to memory items (L1: 2%/day, L2: 0.5%/day)';
COMMENT ON FUNCTION ernesto_memory_stats IS 'Returns aggregate statistics and health score for user memory';
COMMENT ON FUNCTION ernesto_increment_access IS 'Increments access counter and updates last_accessed_at timestamp';
