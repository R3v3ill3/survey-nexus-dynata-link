
-- Create surveys table to store imported survey metadata
CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  external_survey_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_length INTEGER, -- in minutes
  survey_url TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  target_audience JSONB DEFAULT '{}'::jsonb,
  quota_requirements JSONB DEFAULT '{}'::jsonb,
  survey_questions JSONB DEFAULT '[]'::jsonb,
  redirect_urls JSONB DEFAULT '{}'::jsonb,
  external_platform TEXT NOT NULL DEFAULT 'external',
  import_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, external_survey_id)
);

-- Add RLS policies for surveys
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage surveys for their projects" 
  ON public.surveys 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = surveys.project_id 
    AND projects.user_id = auth.uid()
  ));

-- Create survey_line_items junction table to link surveys with line items
CREATE TABLE public.survey_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES public.line_items(id) ON DELETE CASCADE,
  survey_quota INTEGER NOT NULL DEFAULT 0,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(survey_id, line_item_id)
);

-- Add RLS for survey_line_items
ALTER TABLE public.survey_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage survey line items for their projects" 
  ON public.survey_line_items 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.surveys s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = survey_line_items.survey_id 
    AND p.user_id = auth.uid()
  ));

-- Add updated_at trigger for surveys
CREATE TRIGGER update_surveys_updated_at 
  BEFORE UPDATE ON public.surveys 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();
