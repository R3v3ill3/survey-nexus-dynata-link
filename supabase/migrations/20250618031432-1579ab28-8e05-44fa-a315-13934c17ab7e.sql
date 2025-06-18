
-- Create quota configurations table to store overall quota setup
CREATE TABLE public.quota_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  geography_scope TEXT NOT NULL, -- 'National', 'State', 'Federal Electorate', 'State Electorate'
  geography_detail TEXT, -- State code, electorate name, etc.
  quota_mode TEXT NOT NULL, -- 'non-interlocking', 'full-interlocking', 'age-gender-location', etc.
  total_quotas INTEGER NOT NULL,
  sample_size_multiplier DECIMAL(3,2) DEFAULT 1.0, -- 1.0 = standard, 1.5 = 50% larger, etc.
  complexity_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'extreme'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quota segments table for demographic segment definitions
CREATE TABLE public.quota_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quota_config_id UUID REFERENCES public.quota_configurations(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL, -- 'Age/Gender', 'State', 'Location', 'Age/Gender/State', etc.
  segment_name TEXT NOT NULL, -- '18-24 Male', 'NSW', 'Major Cities', etc.
  segment_code TEXT NOT NULL, -- 'AGE_18_24_MALE', 'STATE_NSW', 'LOCATION_METRO', etc.
  population_percent DECIMAL(5,2), -- Population percentage
  dynata_code TEXT, -- Dynata targeting code
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quota allocations table for actual quota numbers per segment
CREATE TABLE public.quota_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id UUID REFERENCES public.line_items(id) ON DELETE CASCADE NOT NULL,
  segment_id UUID REFERENCES public.quota_segments(id) ON DELETE CASCADE NOT NULL,
  quota_count INTEGER NOT NULL,
  completed_count INTEGER DEFAULT 0,
  cost_per_complete DECIMAL(10,2),
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed', 'overquota'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create segment tracking table for real-time performance monitoring
CREATE TABLE public.segment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  segment_id UUID REFERENCES public.quota_segments(id) ON DELETE CASCADE NOT NULL,
  allocation_id UUID REFERENCES public.quota_allocations(id) ON DELETE CASCADE NOT NULL,
  current_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,4) DEFAULT 0,
  performance_score DECIMAL(3,2) DEFAULT 1.0, -- 1.0 = on track, < 1.0 = underperforming
  cost_tracking DECIMAL(10,2) DEFAULT 0,
  last_response_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_quota_configs_project ON public.quota_configurations(project_id);
CREATE INDEX idx_quota_segments_config ON public.quota_segments(quota_config_id);
CREATE INDEX idx_quota_allocations_line_item ON public.quota_allocations(line_item_id);
CREATE INDEX idx_quota_allocations_segment ON public.quota_allocations(segment_id);
CREATE INDEX idx_segment_tracking_project ON public.segment_tracking(project_id);
CREATE INDEX idx_segment_tracking_segment ON public.segment_tracking(segment_id);

-- Enable RLS on all new tables
ALTER TABLE public.quota_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quota_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quota_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quota_configurations
CREATE POLICY "Users can manage quota configs for their projects" ON public.quota_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = quota_configurations.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for quota_segments
CREATE POLICY "Users can view quota segments for their projects" ON public.quota_segments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quota_configurations qc
      JOIN public.projects p ON p.id = qc.project_id
      WHERE qc.id = quota_segments.quota_config_id 
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for quota_allocations
CREATE POLICY "Users can manage quota allocations for their line items" ON public.quota_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.line_items li
      JOIN public.projects p ON p.id = li.project_id
      WHERE li.id = quota_allocations.line_item_id 
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for segment_tracking
CREATE POLICY "Users can view segment tracking for their projects" ON public.segment_tracking
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = segment_tracking.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Function to update segment tracking when responses are added
CREATE OR REPLACE FUNCTION update_segment_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Update segment tracking for quota allocations
  UPDATE public.segment_tracking st
  SET 
    current_count = (
      SELECT COUNT(*) 
      FROM public.responses r
      JOIN public.quota_allocations qa ON qa.line_item_id = r.line_item_id
      WHERE qa.segment_id = st.segment_id 
      AND r.status = 'complete'
    ),
    completion_rate = CASE 
      WHEN qa.quota_count > 0 THEN 
        (SELECT COUNT(*) FROM public.responses r2 
         WHERE r2.line_item_id = NEW.line_item_id AND r2.status = 'complete')::DECIMAL / qa.quota_count
      ELSE 0
    END,
    performance_score = CASE
      WHEN qa.quota_count > 0 THEN
        LEAST(2.0, GREATEST(0.1, 
          (SELECT COUNT(*) FROM public.responses r3 
           WHERE r3.line_item_id = NEW.line_item_id AND r3.status = 'complete')::DECIMAL / qa.quota_count
        ))
      ELSE 1.0
    END,
    cost_tracking = (
      SELECT COUNT(*) 
      FROM public.responses r4
      WHERE r4.line_item_id = NEW.line_item_id 
      AND r4.status = 'complete'
    ) * COALESCE(qa.cost_per_complete, 0),
    last_response_at = NEW.created_at,
    updated_at = NOW()
  FROM public.quota_allocations qa
  WHERE st.allocation_id = qa.id
  AND qa.line_item_id = NEW.line_item_id;

  -- Update quota allocation completed counts
  UPDATE public.quota_allocations
  SET 
    completed_count = (
      SELECT COUNT(*) 
      FROM public.responses 
      WHERE line_item_id = NEW.line_item_id 
      AND status = 'complete'
    ),
    updated_at = NOW()
  WHERE line_item_id = NEW.line_item_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update segment tracking
CREATE TRIGGER update_segment_tracking_trigger
  AFTER INSERT OR UPDATE ON public.responses
  FOR EACH ROW
  EXECUTE FUNCTION update_segment_tracking();

-- Add update timestamp triggers for new tables
CREATE TRIGGER update_quota_configurations_updated_at 
  BEFORE UPDATE ON public.quota_configurations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quota_allocations_updated_at 
  BEFORE UPDATE ON public.quota_allocations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_segment_tracking_updated_at 
  BEFORE UPDATE ON public.segment_tracking 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for quota tracking
ALTER TABLE public.quota_configurations REPLICA IDENTITY FULL;
ALTER TABLE public.quota_segments REPLICA IDENTITY FULL;
ALTER TABLE public.quota_allocations REPLICA IDENTITY FULL;
ALTER TABLE public.segment_tracking REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.quota_configurations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quota_segments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quota_allocations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.segment_tracking;
