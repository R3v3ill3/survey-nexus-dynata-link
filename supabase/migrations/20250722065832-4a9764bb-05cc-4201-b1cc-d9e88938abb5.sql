
-- Backup current free tier settings (for rollback reference)
-- Current: max_projects=1, max_line_items_per_project=3, all platform access=false, api_rate_limit=50

-- Update free tier to have full access temporarily for testing
UPDATE public.membership_tiers 
SET 
  max_projects = -1,
  max_line_items_per_project = -1,
  quota_generator_access = true,
  survey_generator_access = true,
  dynata_api_access = true,
  api_rate_limit = 2000,
  description = 'Basic access to core features (TEMPORARY: Full access for testing)',
  features = '["basic_polling", "manual_quota_management", "quota_generator", "survey_generator", "advanced_analytics", "export_data", "dynata_integration", "api_access", "unlimited_projects", "unlimited_line_items"]'::jsonb,
  updated_at = NOW()
WHERE tier = 'free';
