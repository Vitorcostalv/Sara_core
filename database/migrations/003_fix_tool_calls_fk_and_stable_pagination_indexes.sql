-- Fix broken FK introduced by table rename sequence in migration 002.
-- Also add composite indexes aligned with real filter + pagination queries.

ALTER TABLE tool_calls RENAME TO tool_calls_fk_broken;

CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY,
  conversation_turn_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_payload TEXT NOT NULL,
  output_payload TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'running')),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_turn_id) REFERENCES conversation_turns(id) ON DELETE CASCADE
);

INSERT INTO tool_calls (
  id,
  conversation_turn_id,
  tool_name,
  input_payload,
  output_payload,
  status,
  duration_ms,
  created_at
)
SELECT
  id,
  conversation_turn_id,
  tool_name,
  input_payload,
  output_payload,
  status,
  duration_ms,
  created_at
FROM tool_calls_fk_broken;

DROP TABLE tool_calls_fk_broken;

-- Keep existing single-column indexes for compatibility.
CREATE INDEX IF NOT EXISTS idx_tool_calls_conversation_turn_id ON tool_calls(conversation_turn_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_status ON tool_calls(status);
CREATE INDEX IF NOT EXISTS idx_tool_calls_created_at ON tool_calls(created_at);

-- Composite indexes for stable pagination + common filters.
CREATE INDEX IF NOT EXISTS idx_facts_user_updated_at_id ON facts(user_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_facts_user_category_updated_at_id ON facts(user_id, category, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_facts_user_important_updated_at_id ON facts(user_id, is_important, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_user_updated_at_id ON tasks(user_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_updated_at_id ON tasks(user_id, status, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority_updated_at_id ON tasks(user_id, priority, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_turns_user_created_at_id ON conversation_turns(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_user_role_created_at_id ON conversation_turns(user_id, role, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_user_source_created_at_id ON conversation_turns(user_id, source, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_tool_calls_turn_created_at_id ON tool_calls(conversation_turn_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_tool_calls_status_created_at_id ON tool_calls(status, created_at DESC, id DESC);
