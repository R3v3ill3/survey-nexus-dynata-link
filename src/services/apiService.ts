
import { supabase } from "@/integrations/supabase/client";
import { 
  Project, 
  LineItem, 
  Response, 
  ChannelType, 
  QuotaConfiguration, 
  QuotaSegment, 
  QuotaAllocation,
  SegmentTracking,
  QuotaGeneratorConfig,
  QuotaGeneratorResponse
} from "@/types/database";

export class ApiService {
  // Dynata Authentication
  static async authenticateWithDynata(username: string, password: string) {
    const { data, error } = await supabase.functions.invoke('dynata-auth', {
      body: { username, password }
    });

    if (error) throw error;
    return data;
  }

  // Project Management
  static async createProject(title: string, description: string, settings: Record<string, any> = {}) {
    const { data, error } = await supabase.functions.invoke('dynata-projects', {
      body: { title, description, settings },
      method: 'POST'
    });

    if (error) throw error;
    return data.project;
  }

  static async getProjects() {
    const { data, error } = await supabase.functions.invoke('dynata-projects', {
      method: 'GET'
    });

    if (error) throw error;
    return data.projects;
  }

  static async updateProjectStatus(projectId: string, status: string) {
    const { data, error } = await supabase.functions.invoke('dynata-projects', {
      body: { projectId, status },
      method: 'PUT'
    });

    if (error) throw error;
    return data;
  }

  static async launchProject(projectId: string) {
    const { data, error } = await supabase.functions.invoke('dynata-projects', {
      body: { projectId },
      method: 'POST'
    });

    if (error) throw error;
    return data;
  }

  // Line Item Management
  static async createLineItem(
    projectId: string, 
    name: string, 
    targeting: Record<string, any>, 
    quota: number, 
    costPerComplete?: number
  ) {
    const { data, error } = await supabase.functions.invoke('dynata-line-items', {
      body: { projectId, name, targeting, quota, costPerComplete },
      method: 'POST'
    });

    if (error) throw error;
    return data.lineItem;
  }

  static async getLineItems(projectId: string) {
    const { data, error } = await supabase.functions.invoke('dynata-line-items', {
      method: 'GET',
      body: { projectId }
    });

    if (error) throw error;
    return data.lineItems;
  }

  static async updateLineItemStatus(lineItemId: string, status: string) {
    const { data, error } = await supabase.functions.invoke('dynata-line-items', {
      body: { lineItemId, status },
      method: 'PUT'
    });

    if (error) throw error;
    return data;
  }

  // Quota Configuration Management
  static async createQuotaConfiguration(config: Partial<QuotaConfiguration>) {
    const { data, error } = await supabase
      .from('quota_configurations')
      .insert(config)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getQuotaConfiguration(projectId: string) {
    const { data, error } = await supabase
      .from('quota_configurations')
      .select(`
        *,
        segments:quota_segments(
          *,
          allocations:quota_allocations(
            *,
            tracking:segment_tracking(*)
          )
        )
      `)
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // Quota Segments Management
  static async createQuotaSegments(segments: Partial<QuotaSegment>[]) {
    const { data, error } = await supabase
      .from('quota_segments')
      .insert(segments)
      .select();

    if (error) throw error;
    return data;
  }

  static async getQuotaSegments(quotaConfigId: string) {
    const { data, error } = await supabase
      .from('quota_segments')
      .select('*')
      .eq('quota_config_id', quotaConfigId);

    if (error) throw error;
    return data;
  }

  // Quota Allocations Management
  static async createQuotaAllocations(allocations: Partial<QuotaAllocation>[]) {
    const { data, error } = await supabase
      .from('quota_allocations')
      .insert(allocations)
      .select();

    if (error) throw error;
    return data;
  }

  static async getQuotaAllocations(lineItemId: string) {
    const { data, error } = await supabase
      .from('quota_allocations')
      .select(`
        *,
        segment:quota_segments(*),
        tracking:segment_tracking(*)
      `)
      .eq('line_item_id', lineItemId);

    if (error) throw error;
    return data;
  }

  // Segment Tracking
  static async getSegmentTracking(projectId: string) {
    const { data, error } = await supabase
      .from('segment_tracking')
      .select(`
        *,
        segment:quota_segments(*),
        allocation:quota_allocations(*)
      `)
      .eq('project_id', projectId);

    if (error) throw error;
    return data;
  }

  // Integration with Quota Generator
  static async processQuotaGeneratorConfig(
    projectId: string,
    generatorConfig: QuotaGeneratorConfig,
    quotaResponses: QuotaGeneratorResponse[]
  ) {
    // Create quota configuration
    const quotaConfig = await this.createQuotaConfiguration({
      project_id: projectId,
      geography_scope: generatorConfig.geography.scope,
      geography_detail: generatorConfig.geography.state || generatorConfig.geography.electorate,
      quota_mode: generatorConfig.quotaMode,
      total_quotas: generatorConfig.quotaStructure.totalQuotas,
      sample_size_multiplier: this.getSampleSizeMultiplier(generatorConfig.quotaMode),
      complexity_level: this.getComplexityLevel(generatorConfig.quotaMode)
    });

    // Create quota segments from generator responses
    const segments = quotaResponses.map(response => ({
      quota_config_id: quotaConfig.id,
      category: response.category,
      segment_name: response.subCategory,
      segment_code: this.generateSegmentCode(response.category, response.subCategory),
      population_percent: response.population_percent,
      dynata_code: response.dynata_code
    }));

    const createdSegments = await this.createQuotaSegments(segments);
    
    return {
      configuration: quotaConfig,
      segments: createdSegments
    };
  }

  // Helper methods
  private static getSampleSizeMultiplier(quotaMode: string): number {
    const multipliers: Record<string, number> = {
      'non-interlocking': 1.0,
      'age-gender-location': 1.2,
      'age-gender-state': 1.3,
      'state-location': 1.3,
      'tas-interlocking': 1.5,
      'full-interlocking': 2.0
    };
    return multipliers[quotaMode] || 1.0;
  }

  private static getComplexityLevel(quotaMode: string): string {
    const complexityMap: Record<string, string> = {
      'non-interlocking': 'low',
      'age-gender-only': 'low',
      'age-gender-location': 'medium',
      'age-gender-state': 'medium',
      'state-location': 'medium',
      'tas-interlocking': 'high',
      'full-interlocking': 'extreme'
    };
    return complexityMap[quotaMode] || 'low';
  }

  private static generateSegmentCode(category: string, subCategory: string): string {
    const categoryMap: Record<string, string> = {
      'Age/Gender': 'AGE_GENDER',
      'State': 'STATE',
      'Location': 'LOCATION'
    };
    
    const categoryPrefix = categoryMap[category] || category.toUpperCase().replace(/[^A-Z]/g, '_');
    const segmentSuffix = subCategory.toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    return `${categoryPrefix}_${segmentSuffix}`;
  }

  // Real-time subscriptions
  static subscribeToQuotaUpdates(projectId: string, callback: (payload: any) => void) {
    return supabase
      .channel('quota-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'segment_tracking',
          filter: `project_id=eq.${projectId}`
        },
        callback
      )
      .subscribe();
  }

  static subscribeToResponses(projectId: string, callback: (payload: any) => void) {
    return supabase
      .channel('response-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
          filter: `project_id=eq.${projectId}`
        },
        callback
      )
      .subscribe();
  }

  // Credential Management
  static async checkDynataCredentials() {
    const { data, error } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('provider', 'dynata')
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
