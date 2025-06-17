
-- Create enum types for the polling platform
CREATE TYPE public.channel_type AS ENUM ('dynata', 'sms', 'voice');
CREATE TYPE public.project_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE public.line_item_status AS ENUM ('draft', 'active', 'paused', 'completed', 'overquota', 'cancelled');
CREATE TYPE public.response_status AS ENUM ('complete', 'partial', 'screened_out', 'over_quota', 'terminated');

-- Projects table - unified for all channels
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'draft',
  external_id TEXT, -- Dynata project ID or other external references
  settings JSONB DEFAULT '{}', -- Channel-specific settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Line items table - targeting and quota management
CREATE TABLE public.line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  channel_type channel_type NOT NULL,
  status line_item_status DEFAULT 'draft',
  external_id TEXT, -- Dynata line item ID
  targeting JSONB NOT NULL DEFAULT '{}', -- Demographic targeting criteria
  quota INTEGER NOT NULL DEFAULT 0,
  completed INTEGER DEFAULT 0,
  cost_per_complete DECIMAL(10,2),
  total_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Responses table - unified response collection
CREATE TABLE public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  line_item_id UUID REFERENCES public.line_items(id) ON DELETE CASCADE NOT NULL,
  channel_type channel_type NOT NULL,
  external_response_id TEXT, -- External system response ID
  status response_status NOT NULL,
  respondent_data JSONB DEFAULT '{}', -- Demographics and profile data
  response_data JSONB DEFAULT '{}', -- Actual survey responses
  completion_time INTEGER, -- Time to complete in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quota tracking table - real-time quota monitoring
CREATE TABLE public.quota_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  line_item_id UUID REFERENCES public.line_items(id) ON DELETE CASCADE NOT NULL,
  channel_type channel_type NOT NULL,
  target_quota INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,4) DEFAULT 0, -- Percentage as decimal
  cost_tracking DECIMAL(10,2) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API credentials table - secure storage for external API tokens
CREATE TABLE public.api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL, -- 'dynata', 'sms_gateway', etc.
  credentials JSONB NOT NULL, -- Encrypted credential storage
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quota_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can manage their own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for line_items
CREATE POLICY "Users can manage line items for their projects" ON public.line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = line_items.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for responses
CREATE POLICY "Users can view responses for their projects" ON public.responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = responses.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for quota_tracking
CREATE POLICY "Users can view quota tracking for their projects" ON public.quota_tracking
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = quota_tracking.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for api_credentials
CREATE POLICY "Users can manage their own API credentials" ON public.api_credentials
  FOR ALL USING (auth.uid() = user_id);

-- Function to update quota tracking when responses are added
CREATE OR REPLACE FUNCTION update_quota_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Update quota tracking for the line item
  INSERT INTO public.quota_tracking (
    project_id,
    line_item_id,
    channel_type,
    target_quota,
    current_count,
    completion_rate,
    cost_tracking
  )
  SELECT 
    li.project_id,
    li.id,
    li.channel_type,
    li.quota,
    (SELECT COUNT(*) FROM public.responses WHERE line_item_id = li.id AND status = 'complete'),
    CASE 
      WHEN li.quota > 0 THEN 
        (SELECT COUNT(*) FROM public.responses WHERE line_item_id = li.id AND status = 'complete')::DECIMAL / li.quota
      ELSE 0
    END,
    (SELECT COUNT(*) FROM public.responses WHERE line_item_id = li.id AND status = 'complete') * COALESCE(li.cost_per_complete, 0)
  FROM public.line_items li
  WHERE li.id = NEW.line_item_id
  ON CONFLICT (line_item_id) 
  DO UPDATE SET
    current_count = EXCLUDED.current_count,
    completion_rate = EXCLUDED.completion_rate,
    cost_tracking = EXCLUDED.cost_tracking,
    last_updated = NOW();

  -- Update line item completed count
  UPDATE public.line_items 
  SET 
    completed = (SELECT COUNT(*) FROM public.responses WHERE line_item_id = NEW.line_item_id AND status = 'complete'),
    updated_at = NOW()
  WHERE id = NEW.line_item_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update quota tracking
CREATE TRIGGER update_quota_tracking_trigger
  AFTER INSERT OR UPDATE ON public.responses
  FOR EACH ROW
  EXECUTE FUNCTION update_quota_tracking();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update timestamp triggers
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON public.projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_items_updated_at 
  BEFORE UPDATE ON public.line_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_responses_updated_at 
  BEFORE UPDATE ON public.responses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_credentials_updated_at 
  BEFORE UPDATE ON public.api_credentials 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for real-time quota updates
ALTER TABLE public.quota_tracking REPLICA IDENTITY FULL;
ALTER TABLE public.responses REPLICA IDENTITY FULL;
ALTER TABLE public.line_items REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.quota_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.line_items;
