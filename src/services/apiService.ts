
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
  QuotaGeneratorResponse,
  GeographyScope,
  QuotaMode,
  ComplexityLevel,
  QuotaCategory
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
  static async createQuotaConfiguration(config: Omit<QuotaConfiguration, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('quota_configurations')
      .insert({
        project_id: config.project_id,
        geography_scope: config.geography_scope,
        geography_detail: config.geography_detail,
        quota_mode: config.quota_mode,
        total_quotas: config.total_quotas,
        sample_size_multiplier: config.sample_size_multiplier,
        complexity_level: config.complexity_level
      })
      .select()
      .single();

    if (error) throw error;
    return data as QuotaConfiguration;
  }

  static async getQuotaConfiguration(projectId: string): Promise<QuotaConfiguration | null> {
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
    if (!data) return null;

    // Type cast the data to match our interfaces
    return {
      ...data,
      geography_scope: data.geography_scope as GeographyScope,
      quota_mode: data.quota_mode as QuotaMode,
      complexity_level: data.complexity_level as ComplexityLevel,
      segments: data.segments?.map(segment => ({
        ...segment,
        category: segment.category as QuotaCategory
      }))
    } as QuotaConfiguration;
  }

  // Quota Segments Management
  static async createQuotaSegments(segments: Omit<QuotaSegment, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('quota_segments')
      .insert(segments.map(segment => ({
        quota_config_id: segment.quota_config_id,
        category: segment.category,
        segment_name: segment.segment_name,
        segment_code: segment.segment_code,
        population_percent: segment.population_percent,
        dynata_code: segment.dynata_code
      })))
      .select();

    if (error) throw error;
    return data.map(segment => ({
      ...segment,
      category: segment.category as QuotaCategory
    })) as QuotaSegment[];
  }

  static async getQuotaSegments(quotaConfigId: string) {
    const { data, error } = await supabase
      .from('quota_segments')
      .select('*')
      .eq('quota_config_id', quotaConfigId);

    if (error) throw error;
    return data.map(segment => ({
      ...segment,
      category: segment.category as QuotaCategory
    })) as QuotaSegment[];
  }

  // Quota Allocations Management
  static async createQuotaAllocations(allocations: Omit<QuotaAllocation, 'id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await supabase
      .from('quota_allocations')
      .insert(allocations.map(allocation => ({
        line_item_id: allocation.line_item_id,
        segment_id: allocation.segment_id,
        quota_count: allocation.quota_count,
        completed_count: allocation.completed_count || 0,
        cost_per_complete: allocation.cost_per_complete,
        status: allocation.status || 'active'
      })))
      .select();

    if (error) throw error;
    return data as QuotaAllocation[];
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
    return data.map(allocation => ({
      ...allocation,
      segment: allocation.segment ? {
        ...allocation.segment,
        category: allocation.segment.category as QuotaCategory
      } : undefined
    })) as QuotaAllocation[];
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
    return data.map(tracking => ({
      ...tracking,
      segment: tracking.segment ? {
        ...tracking.segment,
        category: tracking.segment.category as QuotaCategory
      } : undefined
    })) as SegmentTracking[];
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
      category: response.category as QuotaCategory,
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
  private static getSampleSizeMultiplier(quotaMode: QuotaMode): number {
    const multipliers: Record<QuotaMode, number> = {
      'non-interlocking': 1.0,
      'age-gender-location': 1.2,
      'age-gender-state': 1.3,
      'state-location': 1.3,
      'tas-interlocking': 1.5,
      'full-interlocking': 2.0,
      'age-gender-only': 1.0,
      'tas-age-gender-only': 1.0,
      'tas-non-interlocking': 1.3
    };
    return multipliers[quotaMode] || 1.0;
  }

  private static getComplexityLevel(quotaMode: QuotaMode): ComplexityLevel {
    const complexityMap: Record<QuotaMode, ComplexityLevel> = {
      'non-interlocking': 'low',
      'age-gender-only': 'low',
      'age-gender-location': 'medium',
      'age-gender-state': 'medium',
      'state-location': 'medium',
      'tas-age-gender-only': 'low',
      'tas-non-interlocking': 'medium',
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
