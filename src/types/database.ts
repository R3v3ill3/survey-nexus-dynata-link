
export type ChannelType = 'dynata' | 'sms' | 'voice';
export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type LineItemStatus = 'draft' | 'active' | 'paused' | 'completed' | 'overquota' | 'cancelled';
export type ResponseStatus = 'complete' | 'partial' | 'screened_out' | 'over_quota' | 'terminated';

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

export interface ApiCredentials {
  id: string;
  user_id: string;
  provider: string;
  credentials: Record<string, any>;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}
