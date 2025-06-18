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
  QuotaCategory,
  ProjectStatus,
  LineItemStatus
} from "@/types/database";

// Type for API credentials
interface ApiCredentials {
  api_key: string;
  [key: string]: any;
}

export class ApiService {
  // Local Project Management (Phase 1)
  static async createLocalProject(title: string, description: string, settings: Record<string, any> = {}) {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        title,
        description,
        settings,
        status: 'draft',
        user_id: user.id, // Use authenticated user ID
        external_id: null // No external ID for local projects
      })
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  }

  static async getLocalProjects() {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        line_items(*)
      `)
      .eq('user_id', user.id) // Filter by authenticated user
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Project[];
  }

  static async updateLocalProjectStatus(projectId: string, status: string) {
    const { data, error } = await supabase
      .from('projects')
      .update({ 
        status: status as ProjectStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async syncProjectToDynata(projectId: string) {
    // Get local project
    const { data: localProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError) throw fetchError;

    try {
      // Create project via Dynata API
      const dynataProject = await this.createProject(
        localProject.title,
        localProject.description,
        typeof localProject.settings === 'object' && localProject.settings !== null 
          ? localProject.settings as Record<string, any>
          : {}
      );

      // Update local project with external ID
      const { data, error } = await supabase
        .from('projects')
        .update({ 
          external_id: dynataProject.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    } catch (error) {
      console.error('Failed to sync project to Dynata:', error);
      throw new Error('Failed to sync to Dynata. Please check your API credentials.');
    }
  }

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

  // Line Item Management - Updated to use direct database queries
  static async createLineItem(
    projectId: string, 
    name: string, 
    targeting: Record<string, any>, 
    quota: number, 
    costPerComplete?: number
  ) {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // Create line item in local database
    const { data, error } = await supabase
      .from('line_items')
      .insert({
        project_id: projectId,
        name,
        channel_type: 'dynata',
        targeting,
        quota,
        cost_per_complete: costPerComplete || 4.25 + Math.random() * 2,
        status: 'draft' as LineItemStatus
      })
      .select()
      .single();

    if (error) throw error;
    return data as LineItem;
  }

  static async getLineItems(projectId: string) {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { data, error } = await supabase
      .from('line_items')
      .select(`
        *,
        quota_tracking (*)
      `)
      .eq('project_id', projectId);

    if (error) throw error;
    return data as LineItem[];
  }

  static async updateLineItemStatus(lineItemId: string, status: LineItemStatus) {
    const { data, error } = await supabase
      .from('line_items')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', lineItemId)
      .select()
      .single();

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

    // Transform the data to match our interfaces
    const transformedData: QuotaConfiguration = {
      id: data.id,
      project_id: data.project_id,
      geography_scope: data.geography_scope as GeographyScope,
      geography_detail: data.geography_detail,
      quota_mode: data.quota_mode as QuotaMode,
      total_quotas: data.total_quotas,
      sample_size_multiplier: data.sample_size_multiplier,
      complexity_level: data.complexity_level as ComplexityLevel,
      created_at: data.created_at,
      updated_at: data.updated_at,
      segments: data.segments?.map((segment: any) => ({
        id: segment.id,
        quota_config_id: segment.quota_config_id,
        category: segment.category as QuotaCategory,
        segment_name: segment.segment_name,
        segment_code: segment.segment_code,
        population_percent: segment.population_percent,
        dynata_code: segment.dynata_code,
        created_at: segment.created_at,
        allocations: segment.allocations?.map((allocation: any) => ({
          id: allocation.id,
          line_item_id: allocation.line_item_id,
          segment_id: allocation.segment_id,
          quota_count: allocation.quota_count,
          completed_count: allocation.completed_count,
          cost_per_complete: allocation.cost_per_complete,
          status: allocation.status,
          created_at: allocation.created_at,
          updated_at: allocation.updated_at,
          tracking: allocation.tracking?.[0] ? {
            id: allocation.tracking[0].id,
            project_id: allocation.tracking[0].project_id,
            segment_id: allocation.tracking[0].segment_id,
            allocation_id: allocation.tracking[0].allocation_id,
            current_count: allocation.tracking[0].current_count,
            completion_rate: allocation.tracking[0].completion_rate,
            performance_score: allocation.tracking[0].performance_score,
            cost_tracking: allocation.tracking[0].cost_tracking,
            last_response_at: allocation.tracking[0].last_response_at,
            created_at: allocation.tracking[0].created_at,
            updated_at: allocation.tracking[0].updated_at
          } : undefined
        }))
      }))
    };

    return transformedData;
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
    
    // Transform the data to match our interfaces
    return data.map((allocation: any) => ({
      id: allocation.id,
      line_item_id: allocation.line_item_id,
      segment_id: allocation.segment_id,
      quota_count: allocation.quota_count,
      completed_count: allocation.completed_count,
      cost_per_complete: allocation.cost_per_complete,
      status: allocation.status,
      created_at: allocation.created_at,
      updated_at: allocation.updated_at,
      segment: allocation.segment ? {
        ...allocation.segment,
        category: allocation.segment.category as QuotaCategory
      } : undefined,
      tracking: allocation.tracking?.[0] ? {
        id: allocation.tracking[0].id,
        project_id: allocation.tracking[0].project_id,
        segment_id: allocation.tracking[0].segment_id,
        allocation_id: allocation.tracking[0].allocation_id,
        current_count: allocation.tracking[0].current_count,
        completion_rate: allocation.tracking[0].completion_rate,
        performance_score: allocation.tracking[0].performance_score,
        cost_tracking: allocation.tracking[0].cost_tracking,
        last_response_at: allocation.tracking[0].last_response_at,
        created_at: allocation.tracking[0].created_at,
        updated_at: allocation.tracking[0].updated_at
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

  // Quota Generator API Integration
  static async checkQuotaGeneratorCredentials(): Promise<any> {
    console.log('Checking quota generator credentials...');
    
    const { data, error } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('provider', 'quota_generator')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error checking credentials:', error);
      throw error;
    }
    
    console.log('Credentials check result:', data ? 'Found' : 'Not found');
    return data;
  }

  static async saveQuotaGeneratorCredentials(apiKey: string, surveyId?: string): Promise<any> {
    console.log('Saving Quota Generator credentials with survey context');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create enhanced credentials object
    const credentials = surveyId ? 
      { api_key: apiKey, survey_id: surveyId } : 
      { api_key: apiKey };

    console.log('Saving credentials:', { 
      ...credentials, 
      api_key: apiKey.substring(0, 8) + '****' + apiKey.slice(-4) 
    });

    // Use UPSERT to handle existing records
    const { data, error } = await supabase
      .from('api_credentials')
      .upsert({
        user_id: user.id,
        provider: 'quota_generator',
        credentials,
        is_active: true
      }, {
        onConflict: 'user_id,provider'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving credentials:', error);
      throw new Error(`Failed to save credentials: ${error.message}`);
    }

    return data;
  }

  static async generateQuotasFromAPI(config: any): Promise<any> {
    console.log('Generating quotas from Quota Generator API with config:', config);

    if (!config) {
        throw new Error('Configuration object is missing.');
    }
    
    const credentials = await this.checkQuotaGeneratorCredentials();
    if (!credentials?.credentials?.api_key) {
      throw new Error('Quota Generator API key not configured');
    }

    const { api_key, survey_id } = credentials.credentials;
    
    try {
      console.log('Making API request to generate quotas via edge function');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': api_key,
      };
      
      if (survey_id) {
        headers['x-survey-id'] = survey_id;
      }
      
      const { data, error } = await supabase.functions.invoke('generate-quotas', {
        body: JSON.stringify(config),
        headers
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate quotas');
      }

      console.log('Generated quotas successfully:', data);
      return data;
      
    } catch (error) {
      console.error('Error generating quotas from API:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate quotas from API');
    }
  }

  static async listSavedQuotas(): Promise<any[]> {
    console.log('Fetching saved quotas from Quota Generator API via edge function');
    
    const credentials = await this.checkQuotaGeneratorCredentials();
    if (!credentials?.credentials?.api_key) {
      throw new Error('Quota Generator API key not configured');
    }

    const { api_key, survey_id } = credentials.credentials;
    
    try {
      const headers: Record<string, string> = {
        'x-api-key': api_key,
        'Content-Type': 'application/json'
      };
      
      if (survey_id) {
        headers['x-survey-id'] = survey_id;
      }
      
      console.log('Making API request via edge function');
      const { data, error } = await supabase.functions.invoke('list-saved-quotas', {
        headers
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to fetch saved quotas');
      }

      console.log('Fetched saved quotas successfully:', data);
      
      // Handle both single quota response and array response
      return Array.isArray(data) ? data : [data];
      
    } catch (error) {
      console.error('Error fetching saved quotas:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch saved quotas');
    }
  }

  static async getSavedQuota(quotaId: string) {
    const credentials = await this.checkQuotaGeneratorCredentials();
    if (!credentials?.credentials) {
      throw new Error('Quota Generator API key not configured');
    }

    const creds = credentials.credentials as ApiCredentials;
    if (!creds.api_key) {
      throw new Error('Quota Generator API key not found in credentials');
    }

    try {
      const { data, error } = await supabase.functions.invoke(`get-saved-quota`, {
        body: { quotaId },
        headers: {
          'x-api-key': creds.api_key
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        if (error.message?.includes('401') || error.message?.includes('403')) {
          throw new Error('API authentication failed. Please check your API key.');
        }
        throw new Error(error.message || 'Failed to fetch saved quota');
      }

      return data;
    } catch (error) {
      console.error('Error fetching saved quota:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch saved quota');
    }
  }

  // Enhanced quota processing from API with better error handling
  static async processQuotaGeneratorAPIResponse(
    projectId: string,
    apiResponse: any
  ) {
    // Create quota configuration from API response
    const quotaConfig = await this.createQuotaConfiguration({
      project_id: projectId,
      geography_scope: apiResponse.geography?.scope || 'National',
      geography_detail: apiResponse.geography?.detail,
      quota_mode: apiResponse.quotaMode || 'non-interlocking',
      total_quotas: apiResponse.totalQuotas || 0,
      sample_size_multiplier: apiResponse.sampleMultiplier || 1.0,
      complexity_level: apiResponse.complexityLevel || 'low'
    });

    // Process quota segments from API response
    if (apiResponse.quotaSegments && Array.isArray(apiResponse.quotaSegments)) {
      const segments = apiResponse.quotaSegments.map((segment: any) => ({
        quota_config_id: quotaConfig.id,
        category: segment.category as QuotaCategory,
        segment_name: segment.name || segment.segment_name,
        segment_code: segment.code || segment.segment_code,
        population_percent: segment.population_percent || segment.percentage,
        dynata_code: segment.dynata_code
      }));

      const createdSegments = await this.createQuotaSegments(segments);
      
      return {
        configuration: quotaConfig,
        segments: createdSegments,
        apiResponse
      };
    }

    return {
      configuration: quotaConfig,
      segments: [],
      apiResponse
    };
  }

  // New method to test API key validity - Updated to use edge function
  static async testQuotaGeneratorApiKey(apiKey: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('list-saved-quotas', {
        headers: {
          'x-api-key': apiKey
        }
      });

      return !error;
    } catch (error) {
      console.error('Error testing API key:', error);
      return false;
    }
  }
}
