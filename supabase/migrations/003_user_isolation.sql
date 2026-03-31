-- ERNESTO Migration 003: Complete User Isolation (Multi-Tenant)
-- Every table gets user_id for exclusive data ownership per user

-- ============================================================================
-- 1. ADD user_id TO ernesto_knowledge_rules
-- ============================================================================
ALTER TABLE ernesto_knowledge_rules
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing rules: assign to first admin
UPDATE ernesto_knowledge_rules
SET user_id = (SELECT id FROM ernesto_profiles WHERE role = 'admin' LIMIT 1)
WHERE user_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE ernesto_knowledge_rules
  ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ernesto_knowledge_rules_user_id
  ON ernesto_knowledge_rules(user_id);

-- Drop old global policy and create user-scoped policies
DROP POLICY IF EXISTS "Anyone can read knowledge rules" ON ernesto_knowledge_rules;
DROP POLICY IF EXISTS "Authenticated users can create knowledge rules" ON ernesto_knowledge_rules;

CREATE POLICY "Users can only access their own rules"
  ON ernesto_knowledge_rules FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. ADD user_id TO ernesto_documents (direct, not just via job_id)
-- ============================================================================
ALTER TABLE ernesto_documents
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill from job.user_id
UPDATE ernesto_documents d
SET user_id = j.user_id
FROM ernesto_import_jobs j
WHERE d.job_id = j.id AND d.user_id IS NULL;

ALTER TABLE ernesto_documents
  ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ernesto_documents_user_id
  ON ernesto_documents(user_id);

-- Replace indirect policy with direct user_id check
DROP POLICY IF EXISTS "Users can access documents from their jobs" ON ernesto_documents;
CREATE POLICY "Users can only access their own documents"
  ON ernesto_documents FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. ADD user_id TO ernesto_chat_messages
-- ============================================================================
ALTER TABLE ernesto_chat_messages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill from document → job chain
UPDATE ernesto_chat_messages cm
SET user_id = d.user_id
FROM ernesto_documents d
WHERE cm.document_id = d.id AND cm.user_id IS NULL;

-- Allow NULL temporarily for migration, then enforce
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM ernesto_chat_messages WHERE user_id IS NOT NULL LIMIT 1) THEN
    ALTER TABLE ernesto_chat_messages ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ernesto_chat_messages_user_id
  ON ernesto_chat_messages(user_id);

DROP POLICY IF EXISTS "Users can access messages from their documents" ON ernesto_chat_messages;
CREATE POLICY "Users can only access their own messages"
  ON ernesto_chat_messages FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. ADD user_id TO ernesto_attachments
-- ============================================================================
ALTER TABLE ernesto_attachments
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill from job or document
UPDATE ernesto_attachments a
SET user_id = COALESCE(
  (SELECT j.user_id FROM ernesto_import_jobs j WHERE j.id = a.job_id),
  (SELECT d.user_id FROM ernesto_documents d WHERE d.id = a.document_id)
)
WHERE a.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ernesto_attachments_user_id
  ON ernesto_attachments(user_id);

DROP POLICY IF EXISTS "Users can access attachments from their jobs" ON ernesto_attachments;
CREATE POLICY "Users can only access their own attachments"
  ON ernesto_attachments FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. ADD user_id TO ernesto_import_job_rows
-- ============================================================================
ALTER TABLE ernesto_import_job_rows
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE ernesto_import_job_rows r
SET user_id = j.user_id
FROM ernesto_import_jobs j
WHERE r.job_id = j.id AND r.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ernesto_import_job_rows_user_id
  ON ernesto_import_job_rows(user_id);

DROP POLICY IF EXISTS "Users can access rows from their jobs" ON ernesto_import_job_rows;
CREATE POLICY "Users can only access their own job rows"
  ON ernesto_import_job_rows FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. ADD user_id TO ernesto_memory_promotions
-- ============================================================================
ALTER TABLE ernesto_memory_promotions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE ernesto_memory_promotions mp
SET user_id = mi.user_id
FROM ernesto_memory_items mi
WHERE mp.item_id = mi.id AND mp.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ernesto_memory_promotions_user_id
  ON ernesto_memory_promotions(user_id);

DROP POLICY IF EXISTS "Users can access promotions for their items" ON ernesto_memory_promotions;
CREATE POLICY "Users can only access their own promotions"
  ON ernesto_memory_promotions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. ADD user_id TO ernesto_memory_feedback
-- ============================================================================
ALTER TABLE ernesto_memory_feedback
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE ernesto_memory_feedback mf
SET user_id = mi.user_id
FROM ernesto_memory_items mi
WHERE mf.item_id = mi.id AND mf.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ernesto_memory_feedback_user_id
  ON ernesto_memory_feedback(user_id);

DROP POLICY IF EXISTS "Users can access feedback for their items" ON ernesto_memory_feedback;
CREATE POLICY "Users can only access their own feedback"
  ON ernesto_memory_feedback FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. COMPOSITE INDEXES for user-scoped queries (performance)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ernesto_knowledge_rules_user_carrier
  ON ernesto_knowledge_rules(user_id, carrier_code, is_active);

CREATE INDEX IF NOT EXISTS idx_ernesto_documents_user_status
  ON ernesto_documents(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ernesto_chat_messages_user_doc
  ON ernesto_chat_messages(user_id, document_id, message_index);

CREATE INDEX IF NOT EXISTS idx_ernesto_memory_items_user_level_carrier
  ON ernesto_memory_items(user_id, level, carrier, archived);

-- ============================================================================
-- 9. SYNC TRACKING TABLE (for local-first architecture)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ernesto_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  data JSONB,
  synced BOOLEAN DEFAULT false,
  client_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ernesto_sync_log_user_pending
  ON ernesto_sync_log(user_id, synced, server_timestamp DESC);

ALTER TABLE ernesto_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own sync log"
  ON ernesto_sync_log FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 10. FUNCTION: Get user's pending sync changes
-- ============================================================================
CREATE OR REPLACE FUNCTION ernesto_get_pending_sync(
  p_user_id UUID,
  p_since TIMESTAMPTZ DEFAULT '1970-01-01'
)
RETURNS TABLE (
  id UUID,
  table_name TEXT,
  record_id TEXT,
  action TEXT,
  data JSONB,
  server_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.table_name, s.record_id, s.action, s.data, s.server_timestamp
  FROM ernesto_sync_log s
  WHERE s.user_id = p_user_id
    AND s.server_timestamp > p_since
  ORDER BY s.server_timestamp ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 11. TRIGGER: Auto-populate user_id on insert for convenience
-- ============================================================================
CREATE OR REPLACE FUNCTION ernesto_set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all user-owned tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ernesto_knowledge_rules',
    'ernesto_documents',
    'ernesto_chat_messages',
    'ernesto_attachments',
    'ernesto_import_job_rows',
    'ernesto_memory_promotions',
    'ernesto_memory_feedback'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_%s_set_user_id ON %s;
      CREATE TRIGGER trigger_%s_set_user_id
        BEFORE INSERT ON %s
        FOR EACH ROW
        EXECUTE FUNCTION ernesto_set_user_id();
    ', replace(t, '.', '_'), t, replace(t, '.', '_'), t);
  END LOOP;
END $$;

COMMENT ON TABLE ernesto_sync_log IS 'Tracks changes for local-first sync between IndexedDB and Supabase';
COMMENT ON FUNCTION ernesto_get_pending_sync IS 'Returns server changes since a given timestamp for client sync';
COMMENT ON FUNCTION ernesto_set_user_id IS 'Auto-populates user_id from auth.uid() on insert';
