-- Plan 004 (context-memory phase 1): user_profiles table.
-- Holds an auto-extracted user profile + a cached cross-session summary.
-- Run once in Supabase SQL Editor or psql against your project database.

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY,
  display_name TEXT,
  role_context TEXT,
  aspirations TEXT,
  strengths TEXT,
  weaknesses TEXT,
  values_list JSONB DEFAULT '[]'::jsonb,
  active_focus TEXT,
  notes TEXT,
  long_term_summary TEXT,
  long_term_summary_at TIMESTAMPTZ,
  long_term_summary_msg_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_profiles IS 'Per-user persistent profile and cached long-term summary. One row per tenant.';
COMMENT ON COLUMN user_profiles.values_list IS 'JSON array of strings (core values mentioned by the user).';
COMMENT ON COLUMN user_profiles.long_term_summary IS 'Cached factual summary of cross-session messages, regenerated lazily.';
COMMENT ON COLUMN user_profiles.long_term_summary_msg_count IS 'Total cross-session messages used the last time the summary was rebuilt.';
