-- Reserve ecosystem:<slug> exclusively for real ecological ecosystems.
-- Project-context facts and environmental practice facts are preserved,
-- but moved out of the main grounding path.

UPDATE facts
SET category = 'internal:project-context',
    updated_at = NOW()::text
WHERE user_id = 'local-user'
  AND (
    category IN (
      'ecosystem:sara-core',
      'ecosystem:backend',
      'ecosystem:frontend',
      'ecosystem:voice-stt',
      'ecosystem:llm-grounding',
      'ecosystem:security',
      'ecosystem:performance',
      'context',
      'preferences'
    )
    OR id IN (
      'fact-context-current-phase',
      'fact-context-grounding-domain',
      'fact-preferences-architecture-evolution',
      'fact-preferences-refactor-policy',
      'fact-preferences-design-later'
    )
  );

UPDATE facts
SET category = 'reference:environmental-practices',
    updated_at = NOW()::text
WHERE user_id = 'local-user'
  AND category = 'ecosystem:environment';
