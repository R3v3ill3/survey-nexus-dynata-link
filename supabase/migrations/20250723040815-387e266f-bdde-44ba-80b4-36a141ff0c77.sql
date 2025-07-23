
-- Fix RLS policy for user_platform_access to allow service role access from Supabase functions
-- This will resolve the "failed to initiate authentication" error

-- Drop the existing policy that's too restrictive
DROP POLICY IF EXISTS "Users can manage their own platform access" ON public.user_platform_access;

-- Create a new policy that allows both authenticated users and service role access
CREATE POLICY "Users and service can manage platform access" ON public.user_platform_access
  FOR ALL TO authenticated, service_role
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Also ensure the profiles table can be read by service role for user data
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users and service can view profiles" ON public.profiles
  FOR SELECT TO authenticated, service_role
  USING (auth.uid() = id OR auth.role() = 'service_role');
