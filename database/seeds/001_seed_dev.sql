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
  (
    'fact-context-current-phase',
    'local-user',
    'phase.current-delivery',
    'This internal record documents the current delivery phase and should not participate in ecological grounding.',
    'internal:project-context',
    TRUE,
    '2026-04-03T00:00:00.000Z',
    '2026-04-03T00:00:00.000Z'
  ),
  (
    'fact-context-grounding-domain',
    'local-user',
    'grounding.primary-domain',
    'This internal record documents that ecological ecosystem knowledge is the current grounding target for the product.',
    'internal:project-context',
    TRUE,
    '2026-04-03T00:00:00.000Z',
    '2026-04-03T00:00:00.000Z'
  ),
  (
    'fact-preferences-architecture-evolution',
    'local-user',
    'engineering.architecture-evolution',
    'Preserve the current architecture and evolve incrementally without recreating modules or refactoring without a concrete need.',
    'internal:project-context',
    TRUE,
    '2026-04-03T00:00:00.000Z',
    '2026-04-03T00:00:00.000Z'
  ),
  (
    'fact-preferences-refactor-policy',
    'local-user',
    'engineering.refactor-policy',
    'Avoid broad refactors. Prefer targeted changes that improve correctness, grounding, security or performance for the current phase.',
    'internal:project-context',
    TRUE,
    '2026-04-03T00:00:00.000Z',
    '2026-04-03T00:00:00.000Z'
  ),
  (
    'fact-preferences-design-later',
    'local-user',
    'roadmap.design-phase-order',
    'Design and richer frontend UX should happen only after ecological grounding quality is validated with real database content.',
    'internal:project-context',
    TRUE,
    '2026-04-03T00:00:00.000Z',
    '2026-04-03T00:00:00.000Z'
  )
ON CONFLICT(id) DO UPDATE SET
  key = excluded.key,
  value = excluded.value,
  category = excluded.category,
  is_important = excluded.is_important,
  updated_at = excluded.updated_at;
