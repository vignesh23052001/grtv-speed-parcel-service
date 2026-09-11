-- Add unique index on profiles.user_id to prevent duplicate profile rows per user
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON profiles (user_id);
