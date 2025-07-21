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

// Quota Generator API base URL
const QUOTA_GENERATOR_API_BASE = 'https://aomwplugkkqtxuhdzufc.supabase.co/functions/v1';

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

  // Enhanced Quota Segments Management with tracking creation
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
    
    const createdSegments = data.map(segment => ({
      ...segment,
      category: segment.category as QuotaCategory
    })) as QuotaSegment[];

    // After creating segments, create initial segment tracking records
    await this.createInitialSegmentTracking(createdSegments);

    return createdSegments;
  }

  // New method to create initial segment tracking records
  private static async createInitialSegmentTracking(segments: QuotaSegment[]) {
    if (segments.length === 0) return;

    // Get the project ID from the first segment's quota configuration
    const firstSegment = segments[0];
    const { data: quotaConfig } = await supabase
      .from('quota_configurations')
      .select('project_id')
      .eq('id', firstSegment.quota_config_id)
      .single();

    if (!quotaConfig) return;

    // Create initial segment tracking records
    const trackingRecords = segments.map(segment => ({
      project_id: quotaConfig.project_id,
      segment_id: segment.id,
      allocation_id: null, // Will be updated when allocations are created
      current_count: 0,
      completion_rate: 0,
      performance_score: 1.0,
      cost_tracking: 0,
      last_response_at: null
    }));

    const { error: trackingError } = await supabase
      .from('segment_tracking')
      .insert(trackingRecords);

    if (trackingError) {
      console.error('Failed to create initial segment tracking:', trackingError);
    }
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
      console.log('Making direct API request to Quota Generator');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`,
      };
      
      if (survey_id) {
        headers['X-Survey-ID'] = survey_id;
      }
      
      const response = await fetch(`${QUOTA_GENERATOR_API_BASE}/generate-quotas`, {
        method: 'POST',
        headers,
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Quota Generator API error:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
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
    console.log('Fetching saved quotas from Quota Generator API');
    
    const credentials = await this.checkQuotaGeneratorCredentials();
    if (!credentials?.credentials?.api_key) {
      throw new Error('Quota Generator API key not configured');
    }

    const { api_key, survey_id } = credentials.credentials;
    
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      };
      
      if (survey_id) {
        headers['X-Survey-ID'] = survey_id;
      }
      
      console.log('Making direct API request to Quota Generator');
      const response = await fetch(`${QUOTA_GENERATOR_API_BASE}/list-saved-quotas`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Quota Generator API error:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Fetched saved quotas successfully:', data);
      
      // Extract quotas from the response structure
      const quotas = data.quotas || data;
      
      // Handle both single quota response and array response
      return Array.isArray(quotas) ? quotas : [quotas];
      
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
    if (!credentials?.credentials?.api_key) {
      throw new Error('Quota Generator API key not configured');
    }

    const { api_key } = credentials.credentials;

    try {
      const response = await fetch(`${QUOTA_GENERATOR_API_BASE}/get-saved-quota/${quotaId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Quota Generator API error:', errorText);
        
        if (response.status === 401 || response.status === 403) {
          throw new Error('API authentication failed. Please check your API key.');
        } else if (response.status === 404) {
          throw new Error('Quota not found');
        } else {
          throw new Error(`Quota Generator API error: ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log('Successfully fetched saved quota:', data);
      return data;
      
    } catch (error) {
      console.error('Error fetching saved quota:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch saved quota');
    }
  }

  // Enhanced quota processing from API with better error handling and tracking creation
  static async processQuotaGeneratorAPIResponse(
    projectId: string,
    apiResponse: any
  ) {
    console.log('Processing API response for project:', projectId, apiResponse);
    
    // Handle different response structures
    const quotaData = apiResponse.quota || apiResponse;
    
    // Create quota configuration from API response
    const quotaConfig = await this.createQuotaConfiguration({
      project_id: projectId,
      geography_scope: quotaData.geography?.scope || apiResponse.geography?.scope || 'National',
      geography_detail: quotaData.geography?.detail || quotaData.geography?.state || apiResponse.geography?.detail,
      quota_mode: quotaData.quotaMode || apiResponse.quotaMode || 'non-interlocking',
      total_quotas: quotaData.totalQuotas || apiResponse.totalQuotas || quotaData.quotaSegments?.length || apiResponse.quotas?.length || 0,
      sample_size_multiplier: quotaData.sampleMultiplier || apiResponse.sampleMultiplier || 1.0,
      complexity_level: quotaData.complexityLevel || apiResponse.complexityLevel || 'low'
    });

    console.log('Created quota configuration:', quotaConfig);

    // Process quota segments from API response - Check multiple possible locations
    let quotaSegments = null;
    
    // First priority: Check for quotas array (the actual data location)
    if (apiResponse.quotas && Array.isArray(apiResponse.quotas)) {
      console.log('Found quotas array in API response:', apiResponse.quotas);
      quotaSegments = apiResponse.quotas;
    }
    // Fallback: Check for quotaSegments
    else if (quotaData.quotaSegments && Array.isArray(quotaData.quotaSegments)) {
      console.log('Found quotaSegments in quotaData:', quotaData.quotaSegments);
      quotaSegments = quotaData.quotaSegments;
    }
    // Fallback: Check for segments
    else if (quotaData.segments && Array.isArray(quotaData.segments)) {
      console.log('Found segments in quotaData:', quotaData.segments);
      quotaSegments = quotaData.segments;
    }
    // Fallback: Check for quotaSegments at root level
    else if (apiResponse.quotaSegments && Array.isArray(apiResponse.quotaSegments)) {
      console.log('Found quotaSegments at root level:', apiResponse.quotaSegments);
      quotaSegments = apiResponse.quotaSegments;
    }

    if (quotaSegments && quotaSegments.length > 0) {
      console.log('Processing quota segments:', quotaSegments);
      
      const segments = quotaSegments.map((segment: any) => {
        // Handle different segment structures
        const category = segment.category || segment.demographic || 'Demographics';
        const segmentName = segment.name || segment.segment_name || segment.subCategory || segment.sub_category || 'Unknown';
        const segmentCode = segment.code || segment.segment_code || this.generateSegmentCode(category, segmentName);
        const populationPercent = segment.population_percent || segment.percentage || segment.populationPercent || segment.quota_percent || 0;
        const dynataCode = segment.dynata_code || segment.dynataCode || segment.code;

        console.log('Processing segment:', {
          category,
          segmentName,
          segmentCode,
          populationPercent,
          dynataCode
        });

        return {
          quota_config_id: quotaConfig.id,
          category: category as QuotaCategory,
          segment_name: segmentName,
          segment_code: segmentCode,
          population_percent: populationPercent,
          dynata_code: dynataCode
        };
      });

      const createdSegments = await this.createQuotaSegments(segments);
      console.log('Created segments:', createdSegments);
      
      return {
        configuration: quotaConfig,
        segments: createdSegments,
        apiResponse
      };
    }

    console.log('No segments found in API response - checked quotas, quotaSegments, and segments arrays');
    return {
      configuration: quotaConfig,
      segments: [],
      apiResponse
    };
  }

  // New method to test API key validity - Updated to use direct HTTP calls
  static async testQuotaGeneratorApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${QUOTA_GENERATOR_API_BASE}/list-saved-quotas`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing API key:', error);
      return false;
    }
  }
}
