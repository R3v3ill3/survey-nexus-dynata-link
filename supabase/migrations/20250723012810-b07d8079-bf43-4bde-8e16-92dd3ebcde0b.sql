
-- Drop all existing project policies to start fresh
DROP POLICY IF EXISTS "Users can manage their own projects with tier limits" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Create separate policies to avoid recursion
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects with tier limits" ON public.projects
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Check if user has unlimited projects or hasn't exceeded limit
      (SELECT max_projects FROM public.get_user_tier_info(auth.uid())) = -1 OR
      (SELECT COUNT(*) FROM public.projects WHERE user_id = auth.uid()) < (SELECT max_projects FROM public.get_user_tier_info(auth.uid()))
    )
  );

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);
