/*
# Allow customer self-signup profile creation

## Problem
The profiles INSERT policy only allows admin. But customers signing up need
to create their own profile row. Fix: allow INSERT if the user_id matches
auth.uid() (self-service) OR is_admin().
*/

DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_self_or_admin" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());
