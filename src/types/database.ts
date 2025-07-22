export type ChannelType = 'dynata' | 'sms' | 'voice';
export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type LineItemStatus = 'draft' | 'active' | 'paused' | 'completed' | 'overquota' | 'cancelled';
export type ResponseStatus = 'complete' | 'partial' | 'screened_out' | 'over_quota' | 'terminated';

// New quota-related types
export type GeographyScope = 'National' | 'State' | 'Federal Electorate' | 'State Electorate';
export type QuotaMode = 
  | 'non-interlocking' 
  | 'full-interlocking' 
  | 'age-gender-location' 
  | 'age-gender-state'
  | 'state-location'
  | 'tas-age-gender-only'
  | 'tas-non-interlocking'
  | 'tas-interlocking'
  | 'age-gender-only';

export type ComplexityLevel = 'low' | 'medium' | 'high' | 'extreme';
export type QuotaCategory = 
  | 'Age/Gender' 
  | 'State' 
  | 'Location' 
  | 'Age/Gender/State' 
  | 'Age/Gender/Location' 
  | 'State/Location'
  | 'Age/Gender/State/Location'
  | 'Sub-Electorate'
  | 'Age/Gender/Sub-Electorate';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  external_id?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  line_items?: LineItem[];
  quota_configuration?: QuotaConfiguration;
}

export interface LineItem {
  id: string;
  project_id: string;
  name: string;
  channel_type: ChannelType;
  status: LineItemStatus;
  external_id?: string;
  targeting: Record<string, any>;
  quota: number;
  completed: number;
  cost_per_complete?: number;
  total_cost?: number;
  created_at: string;
  updated_at: string;
  quota_tracking?: QuotaTracking[];
  quota_allocations?: QuotaAllocation[];
}

export interface Response {
  id: string;
  project_id: string;
  line_item_id: string;
  channel_type: ChannelType;
  external_response_id?: string;
  status: ResponseStatus;
  respondent_data: Record<string, any>;
  response_data: Record<string, any>;
  completion_time?: number;
  created_at: string;
  updated_at: string;
}

export interface QuotaTracking {
  id: string;
  project_id: string;
  line_item_id: string;
  channel_type: ChannelType;
  target_quota: number;
  current_count: number;
  completion_rate: number;
  cost_tracking: number;
  last_updated: string;
}

// New quota management interfaces
export interface QuotaConfiguration {
  id: string;
  project_id: string;
  geography_scope: GeographyScope;
  geography_detail?: string;
  quota_mode: QuotaMode;
  total_quotas: number;
  sample_size_multiplier: number;
  complexity_level: ComplexityLevel;
  created_at: string;
  updated_at: string;
  segments?: QuotaSegment[];
}

export interface QuotaSegment {
  id: string;
  quota_config_id: string;
  category: QuotaCategory;
  segment_name: string;
  segment_code: string;
  population_percent?: number;
  dynata_code?: string;
  created_at: string;
  allocations?: QuotaAllocation[];
}

export interface QuotaAllocation {
  id: string;
  line_item_id: string;
  segment_id: string;
  quota_count: number;
  completed_count: number;
  cost_per_complete?: number;
  status: string;
  created_at: string;
  updated_at: string;
  segment?: QuotaSegment;
  tracking?: SegmentTracking;
}

export interface SegmentTracking {
  id: string;
  project_id: string;
  segment_id: string;
  allocation_id: string;
  current_count: number;
  completion_rate: number;
  performance_score: number;
  cost_tracking: number;
  last_response_at?: string;
  created_at: string;
  updated_at: string;
  segment?: QuotaSegment;
  allocation?: QuotaAllocation;
}

// Australian demographic segments from quota generator
export interface AgeGenderSegment {
  name: string;
  code: string;
}

export interface LocationSegment {
  name: string;
  percentage: number;
  code: string;
}

export interface StateSegment {
  name: string;
  code: string;
}

// Quota generator API response format
export interface QuotaGeneratorResponse {
  category: string;
  subCategory: string;
  population_percent: number;
  quota_count: number;
  dynata_code: string;
}

export interface QuotaStructure {
  totalQuotas: number;
  categories: Array<{
    category: string;
    quotaCount: number;
    segments: string;
    warning?: string;
    dynataCodeFormat?: string;
  }>;
}

export interface QuotaGeneratorConfig {
  geography: {
    scope: GeographyScope;
    state?: string;
    electorate?: string;
  };
  quotaMode: QuotaMode;
  quotaStructure: QuotaStructure;
  sampleSizeRecommendations?: {
    low_complexity: string;
    medium_complexity: string;
    high_complexity: string;
    extreme_complexity: string;
  };
}

export interface ApiCredentials {
  id: string;
  user_id: string;
  provider: string;
  credentials: {
    api_key: string;
    survey_id?: string;
    [key: string]: any;
  };
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Survey {
  id: string;
  project_id: string;
  external_survey_id: string;
  title: string;
  description?: string;
  estimated_length?: number;
  survey_url: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  target_audience: Record<string, any>;
  quota_requirements: Record<string, any>;
  survey_questions: Array<any>;
  redirect_urls: Record<string, any>;
  external_platform: string;
  import_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SurveyLineItem {
  id: string;
  survey_id: string;
  line_item_id: string;
  survey_quota: number;
  priority: number;
  created_at: string;
}
