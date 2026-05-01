-- Normalize historical fact categories so existing seeded knowledge
-- follows the current ecosystem grounding convention.

UPDATE facts
SET category = 'ecosystem:environment'
WHERE category LIKE 'environment:%';
