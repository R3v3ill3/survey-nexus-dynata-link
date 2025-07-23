
-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can manage their own projects with tier limits" ON public.projects;

-- Create a corrected policy with proper syntax
CREATE POLICY "Users can manage their own projects with tier limits" ON public.projects
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Check if user has unlimited projects or hasn't exceeded limit
      (SELECT max_projects FROM public.get_user_tier_info(auth.uid())) = -1 OR
      (SELECT COUNT(*) FROM public.projects WHERE user_id = auth.uid()) < (SELECT max_projects FROM public.get_user_tier_info(auth.uid()))
    )
  );
