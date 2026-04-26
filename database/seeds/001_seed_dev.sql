INSERT INTO user_profile (
  id,
  display_name,
  preferred_name,
  full_name,
  email,
  locale,
  timezone,
  birth_date,
  created_at,
  updated_at
)
VALUES (
  'local-user',
  'Local User',
  'Local User',
  'Local User',
  NULL,
  'pt-BR',
  'America/Sao_Paulo',
  NULL,
  '2026-04-03T00:00:00.000Z',
  '2026-04-03T00:00:00.000Z'
)
ON CONFLICT(id) DO UPDATE SET
  preferred_name = excluded.preferred_name,
  full_name = excluded.full_name,
  locale = excluded.locale,
  timezone = excluded.timezone,
  updated_at = excluded.updated_at;

INSERT INTO facts (id, user_id, key, value, category, is_important, created_at, updated_at)
VALUES
  ('fact-context-current-phase', 'local-user', 'phase.current-delivery', 'Current delivery phase prioritizes database population, strict grounding, security review and performance review before any design pass.', 'context', TRUE, '2026-04-03T00:00:00.000Z', '2026-04-03T00:00:00.000Z'),
  ('fact-context-grounding-domain', 'local-user', 'grounding.primary-domain', 'In this phase the assistant should answer from user_profile and facts, with emphasis on ecosystem facts stored as category ecosystem:<slug>.', 'context', TRUE, '2026-04-03T00:00:00.000Z', '2026-04-03T00:00:00.000Z'),
  ('fact-preferences-architecture-evolution', 'local-user', 'engineering.architecture-evolution', 'Preserve the current architecture and evolve incrementally without recreating modules or refactoring without a concrete need.', 'preferences', TRUE, '2026-04-03T00:00:00.000Z', '2026-04-03T00:00:00.000Z'),
  ('fact-preferences-refactor-policy', 'local-user', 'engineering.refactor-policy', 'Avoid broad refactors. Prefer targeted changes that improve correctness, grounding, security or performance for the current phase.', 'preferences', TRUE, '2026-04-03T00:00:00.000Z', '2026-04-03T00:00:00.000Z'),
  ('fact-preferences-design-later', 'local-user', 'roadmap.design-phase-order', 'Design and richer frontend UX should happen only after the LLM is grounded on real database context and critical backend risks are handled.', 'preferences', TRUE, '2026-04-03T00:00:00.000Z', '2026-04-03T00:00:00.000Z')
ON CONFLICT(id) DO UPDATE SET
  key = excluded.key,
  value = excluded.value,
  category = excluded.category,
  is_important = excluded.is_important,
  updated_at = excluded.updated_at;
