-- Evolve foundation schema to MVP-ready backend modules without recreating project structure.

ALTER TABLE tool_calls RENAME TO tool_calls_legacy;

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
  turn_id,
  tool_name,
  input_json,
  output_json,
  status,
  CASE
    WHEN ended_at IS NOT NULL THEN CAST((julianday(ended_at) - julianday(started_at)) * 86400000 AS INTEGER)
    ELSE NULL
  END,
  started_at
FROM tool_calls_legacy;

DROP TABLE tool_calls_legacy;

ALTER TABLE conversation_turns RENAME TO conversation_turns_legacy;

CREATE TABLE conversation_turns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE
);

INSERT INTO conversation_turns (
  id,
  user_id,
  role,
  content,
  source,
  created_at
)
SELECT
  id,
  'local-user',
  role,
  content,
  'legacy',
  created_at
FROM conversation_turns_legacy;

DROP TABLE conversation_turns_legacy;

ALTER TABLE facts RENAME TO facts_legacy;

CREATE TABLE facts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL,
  is_important INTEGER NOT NULL DEFAULT 0 CHECK (is_important IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE
);

INSERT INTO facts (
  id,
  user_id,
  key,
  value,
  category,
  is_important,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  printf('legacy-%s', id),
  content,
  category,
  0,
  created_at,
  updated_at
FROM facts_legacy;

DROP TABLE facts_legacy;

ALTER TABLE tasks RENAME TO tasks_legacy;

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'done', 'archived')),
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE
);

INSERT INTO tasks (
  id,
  user_id,
  title,
  description,
  status,
  priority,
  due_date,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  title,
  description,
  status,
  priority,
  due_at,
  created_at,
  updated_at
FROM tasks_legacy;

DROP TABLE tasks_legacy;

CREATE INDEX IF NOT EXISTS idx_facts_user_id ON facts(user_id);
CREATE INDEX IF NOT EXISTS idx_facts_category ON facts(category);
CREATE INDEX IF NOT EXISTS idx_facts_important ON facts(is_important);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_conversation_turns_user_id ON conversation_turns(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_role ON conversation_turns(role);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_source ON conversation_turns(source);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_created_at ON conversation_turns(created_at);

CREATE INDEX IF NOT EXISTS idx_tool_calls_conversation_turn_id ON tool_calls(conversation_turn_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_status ON tool_calls(status);
CREATE INDEX IF NOT EXISTS idx_tool_calls_created_at ON tool_calls(created_at);
