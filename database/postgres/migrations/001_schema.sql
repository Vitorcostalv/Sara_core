-- Sara Core – PostgreSQL schema (current state, combining all SQLite migrations)

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  preferred_name TEXT,
  full_name TEXT,
  email TEXT,
  birth_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL,
  is_important BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'done', 'archived')),
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  conversation_turn_id TEXT NOT NULL REFERENCES conversation_turns(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input_payload TEXT NOT NULL,
  output_payload TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'running')),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  created_at TEXT NOT NULL
);

-- Single-column indexes
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

-- Composite pagination indexes
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
