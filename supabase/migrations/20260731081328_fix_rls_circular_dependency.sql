/*
# Fix RLS Circular Dependency on profiles

## Problem
The `is_staff()` and `is_admin()` helper functions query the `profiles` table.
The `profiles` SELECT policy calls `is_staff()`/`is_admin()`, creating a
circular dependency that causes "Database error querying schema" on auth.

## Fix
1. Rewrite `is_staff()` and `is_admin()` as SECURITY DEFINER with SET search_path
   so they run with elevated privileges and bypass RLS on profiles internally.
2. Change `profiles` SELECT policy to allow all authenticated users to read
   profiles (role info is needed for the app and is not sensitive).
3. Keep admin-only INSERT/UPDATE/DELETE on profiles.
*/

CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin','driver','hub')
  );
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  );
$$;

-- profiles SELECT: all authenticated users can read
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
CREATE POLICY "profiles_select_all_authenticated" ON profiles FOR SELECT
  TO authenticated USING (true);

-- profiles INSERT: admin only
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT
  TO authenticated WITH CHECK (is_admin());

-- profiles UPDATE: admin only
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- profiles DELETE: admin only
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  TO authenticated USING (is_admin());
