-- Extend local user profile without breaking existing contracts.

ALTER TABLE user_profile ADD COLUMN preferred_name TEXT;
ALTER TABLE user_profile ADD COLUMN full_name TEXT;
ALTER TABLE user_profile ADD COLUMN email TEXT;
ALTER TABLE user_profile ADD COLUMN birth_date TEXT;

-- Keep local profile coherent for immediate frontend consumption.
UPDATE user_profile
SET preferred_name = COALESCE(preferred_name, display_name),
    full_name = COALESCE(full_name, display_name)
WHERE id = 'local-user';
