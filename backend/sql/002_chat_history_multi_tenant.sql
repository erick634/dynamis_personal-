-- Plan 002: Multi-tenant chat_history (user_id + session_id)
-- Run once in Supabase SQL Editor or psql against your project database.

-- Add tenant columns and ordering metadata (idempotent).
ALTER TABLE chat_history
  ADD COLUMN IF NOT EXISTS id BIGSERIAL,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Legacy rows (pre-migration): assign placeholder tenants so NOT NULL can apply.
-- Replace or DELETE these rows in production if you require real ownership.
UPDATE chat_history SET user_id = '00000000-0000-0000-0000-000000000000'::uuid
  WHERE user_id IS NULL;
UPDATE chat_history SET session_id = '00000000-0000-0000-0000-000000000001'::uuid
  WHERE session_id IS NULL;
UPDATE chat_history SET created_at = NOW() WHERE created_at IS NULL;

ALTER TABLE chat_history ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE chat_history ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE chat_history ALTER COLUMN created_at SET NOT NULL;

-- Primary key on id (only if none exists).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'chat_history'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE chat_history ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Tenant-scoped reads (short-term memory queries).
CREATE INDEX IF NOT EXISTS idx_chat_history_user_session_created
  ON chat_history (user_id, session_id, created_at);

COMMENT ON COLUMN chat_history.user_id IS 'Authenticated user (tenant); always filter by this.';
COMMENT ON COLUMN chat_history.session_id IS 'Conversation thread within a user (e.g. LiveKit room / client session).';
