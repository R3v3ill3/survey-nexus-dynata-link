
-- Create membership tiers enum
CREATE TYPE public.membership_tier AS ENUM ('free', 'professional', 'enterprise', 'admin');

-- Create membership_tiers configuration table
CREATE TABLE public.membership_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier public.membership_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10,2) DEFAULT 0,
  yearly_price DECIMAL(10,2) DEFAULT 0,
  max_projects INTEGER DEFAULT 1,
  max_line_items_per_project INTEGER DEFAULT 5,
  quota_generator_access BOOLEAN DEFAULT false,
  survey_generator_access BOOLEAN DEFAULT false,
  dynata_api_access BOOLEAN DEFAULT false,
  api_rate_limit INTEGER DEFAULT 100,
  support_level TEXT DEFAULT 'basic',
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default membership tiers
INSERT INTO public.membership_tiers (tier, name, description, monthly_price, yearly_price, max_projects, max_line_items_per_project, quota_generator_access, survey_generator_access, dynata_api_access, api_rate_limit, support_level, features) VALUES
('free', 'Free', 'Basic access to core features', 0, 0, 1, 3, false, false, false, 50, 'community', '["basic_polling", "manual_quota_management"]'::jsonb),
('professional', 'Professional', 'Advanced features for professionals', 29.99, 299.99, 10, 25, true, true, false, 500, 'email', '["quota_generator", "survey_generator", "advanced_analytics", "export_data"]'::jsonb),
('enterprise', 'Enterprise', 'Full platform access with premium support', 99.99, 999.99, 100, 100, true, true, true, 2000, 'priority', '["dynata_integration", "white_label", "custom_branding", "dedicated_support", "api_access"]'::jsonb),
('admin', 'Admin', 'Full administrative access', 0, 0, -1, -1, true, true, true, -1, 'direct', '["full_access", "user_management", "system_administration"]'::jsonb);

-- Add membership fields to profiles table
ALTER TABLE public.profiles ADD COLUMN membership_tier public.membership_tier DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN platform_permissions JSONB DEFAULT '{"quota_generator": false, "survey_generator": false, "dynata_api": false}'::jsonb;

-- Create user_platform_access table for tracking cross-platform authentication
CREATE TABLE public.user_platform_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  platform_name TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform_name)
);

-- Enable RLS on new tables
ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_platform_access ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for membership_tiers (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view membership tiers" ON public.membership_tiers
  FOR SELECT TO authenticated USING (true);

-- Create RLS policies for user_platform_access
CREATE POLICY "Users can manage their own platform access" ON public.user_platform_access
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create function to check if user has access to a platform
CREATE OR REPLACE FUNCTION public.has_platform_access(user_id UUID, platform TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.membership_tiers mt ON mt.tier = p.membership_tier
    WHERE p.id = user_id
    AND p.subscription_status = 'active'
    AND (
      (platform = 'quota_generator' AND mt.quota_generator_access = true) OR
      (platform = 'survey_generator' AND mt.survey_generator_access = true) OR
      (platform = 'dynata_api' AND mt.dynata_api_access = true)
    )
  );
$$;

-- Create function to get user's tier information
CREATE OR REPLACE FUNCTION public.get_user_tier_info(user_id UUID)
RETURNS TABLE (
  tier public.membership_tier,
  tier_name TEXT,
  max_projects INTEGER,
  max_line_items_per_project INTEGER,
  quota_generator_access BOOLEAN,
  survey_generator_access BOOLEAN,
  dynata_api_access BOOLEAN,
  features JSONB
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    p.membership_tier,
    mt.name,
    mt.max_projects,
    mt.max_line_items_per_project,
    mt.quota_generator_access,
    mt.survey_generator_access,
    mt.dynata_api_access,
    mt.features
  FROM public.profiles p
  JOIN public.membership_tiers mt ON mt.tier = p.membership_tier
  WHERE p.id = user_id;
$$;

-- Update existing projects RLS to include tier-based limits
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
CREATE POLICY "Users can manage their own projects with tier limits" ON public.projects
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Check if user hasn't exceeded project limit
      (SELECT max_projects FROM public.get_user_tier_info(auth.uid())) = -1 OR
      (SELECT COUNT(*) FROM public.projects WHERE user_id = auth.uid()) < (SELECT max_projects FROM public.get_user_tier_info(auth.uid()))
    )
  );

-- Update line_items RLS to include tier-based limits  
DROP POLICY IF EXISTS "Users can manage line items for their projects" ON public.line_items;
CREATE POLICY "Users can manage line items with tier limits" ON public.line_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = line_items.project_id 
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = line_items.project_id 
      AND p.user_id = auth.uid()
    ) AND (
      -- Check if user hasn't exceeded line items limit for this project
      (SELECT max_line_items_per_project FROM public.get_user_tier_info(auth.uid())) = -1 OR
      (SELECT COUNT(*) FROM public.line_items WHERE project_id = line_items.project_id) < (SELECT max_line_items_per_project FROM public.get_user_tier_info(auth.uid()))
    )
  );

-- Add triggers for updated_at timestamps
CREATE OR REPLACE TRIGGER update_membership_tiers_updated_at
  BEFORE UPDATE ON public.membership_tiers
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_platform_access_updated_at
  BEFORE UPDATE ON public.user_platform_access
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
