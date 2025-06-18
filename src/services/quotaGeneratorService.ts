
import { 
  AgeGenderSegment, 
  LocationSegment, 
  StateSegment, 
  QuotaGeneratorConfig,
  QuotaGeneratorResponse,
  GeographyScope,
  QuotaMode
} from "@/types/database";

export class QuotaGeneratorService {
  // Australian demographic segments (from your quota generator)
  static readonly AGE_GENDER_SEGMENTS: AgeGenderSegment[] = [
    { "name": "18-24 Male", "code": "AGE_18_24_MALE" },
    { "name": "18-24 Female", "code": "AGE_18_24_FEMALE" },
    { "name": "25-34 Male", "code": "AGE_25_34_MALE" },
    { "name": "25-34 Female", "code": "AGE_25_34_FEMALE" },
    { "name": "35-44 Male", "code": "AGE_35_44_MALE" },
    { "name": "35-44 Female", "code": "AGE_35_44_FEMALE" },
    { "name": "45-54 Male", "code": "AGE_45_54_MALE" },
    { "name": "45-54 Female", "code": "AGE_45_54_FEMALE" },
    { "name": "55-64 Male", "code": "AGE_55_64_MALE" },
    { "name": "55-64 Female", "code": "AGE_55_64_FEMALE" },
    { "name": "65+ Male", "code": "AGE_65_PLUS_MALE" },
    { "name": "65+ Female", "code": "AGE_65_PLUS_FEMALE" }
  ];

  static readonly LOCATION_SEGMENTS: LocationSegment[] = [
    { "name": "Major Cities", "percentage": 72.0, "code": "LOCATION_METRO" },
    { "name": "Inner Regional", "percentage": 18.0, "code": "LOCATION_REGIONAL" },
    { "name": "Outer Regional/Remote", "percentage": 10.0, "code": "LOCATION_REMOTE" }
  ];

  static readonly STATE_SEGMENTS: StateSegment[] = [
    { "name": "New South Wales", "code": "STATE_NSW" },
    { "name": "Victoria", "code": "STATE_VIC" },
    { "name": "Queensland", "code": "STATE_QLD" },
    { "name": "Western Australia", "code": "STATE_WA" },
    { "name": "South Australia", "code": "STATE_SA" },
    { "name": "Tasmania", "code": "STATE_TAS" },
    { "name": "Northern Territory", "code": "STATE_NT" },
    { "name": "Australian Capital Territory", "code": "STATE_ACT" }
  ];

  // Sample size recommendations
  static readonly SAMPLE_SIZE_RECOMMENDATIONS = {
    "low_complexity": "Standard sample size (non-interlocking)",
    "medium_complexity": "20-30% larger sample recommended (2-way interlocking)", 
    "high_complexity": "30-50% larger sample required (Tasmania interlocking)",
    "extreme_complexity": "50-100% larger sample required (full interlocking)"
  };

  // Generate quota configuration based on mode and geography
  static generateQuotaConfig(
    geography: GeographyScope,
    geographyDetail: string | undefined,
    quotaMode: QuotaMode,
    targetSampleSize: number = 1000
  ): QuotaGeneratorConfig {
    const config: QuotaGeneratorConfig = {
      geography: {
        scope: geography,
        ...(geography === 'State' && { state: geographyDetail }),
        ...(geography.includes('Electorate') && { electorate: geographyDetail })
      },
      quotaMode,
      quotaStructure: this.calculateQuotaStructure(geography, quotaMode, geographyDetail),
      sampleSizeRecommendations: this.SAMPLE_SIZE_RECOMMENDATIONS
    };

    return config;
  }

  // Calculate quota structure based on mode and geography
  private static calculateQuotaStructure(
    geography: GeographyScope,
    quotaMode: QuotaMode,
    geographyDetail?: string
  ) {
    switch (quotaMode) {
      case 'non-interlocking':
        if (geography === 'National') {
          return {
            totalQuotas: 23,
            categories: [
              { category: "Age/Gender", quotaCount: 12, segments: "12 age/gender combinations" },
              { category: "State", quotaCount: 8, segments: "8 Australian states/territories" },
              { category: "Location", quotaCount: 3, segments: "Metro/Regional/Remote" }
            ]
          };
        } else if (geography === 'State' && geographyDetail !== 'TAS') {
          return {
            totalQuotas: 15,
            categories: [
              { category: "Age/Gender", quotaCount: 12, segments: "12 age/gender combinations" },
              { category: "Location", quotaCount: 3, segments: "Metro/Regional/Remote within state" }
            ]
          };
        }
        break;

      case 'full-interlocking':
        return {
          totalQuotas: 288,
          categories: [
            {
              category: "Age/Gender/State/Location",
              quotaCount: 288,
              segments: "12 age/gender × 8 states × 3 locations = 288 combinations",
              warning: "Extremely complex fieldwork, 50-100% larger sample required"
            }
          ]
        };

      case 'age-gender-location':
        if (geography === 'National') {
          return {
            totalQuotas: 44,
            categories: [
              { category: "Age/Gender/Location", quotaCount: 36, segments: "12 age/gender × 3 locations = 36 combinations" },
              { category: "State", quotaCount: 8, segments: "Separate state quotas" }
            ]
          };
        } else if (geography === 'State') {
          return {
            totalQuotas: 36,
            categories: [
              { category: "Age/Gender/Location", quotaCount: 36, segments: "12 age/gender × 3 locations = 36 combinations" }
            ]
          };
        }
        break;

      case 'age-gender-state':
        return {
          totalQuotas: 99,
          categories: [
            {
              category: "Age/Gender/State",
              quotaCount: 96,
              segments: "12 age/gender × 8 states = 96 combinations",
              dynataCodeFormat: "AGE_XX_XX_GENDER_STATE_XXX"
            },
            { category: "Location", quotaCount: 3, segments: "Separate location quotas" }
          ]
        };

      case 'state-location':
        return {
          totalQuotas: 36,
          categories: [
            { category: "State/Location", quotaCount: 24, segments: "8 states × 3 locations = 24 combinations" },
            { category: "Age/Gender", quotaCount: 12, segments: "Separate age/gender quotas" }
          ]
        };

      case 'tas-age-gender-only':
        return {
          totalQuotas: 12,
          categories: [
            { category: "Age/Gender", quotaCount: 12, segments: "Electorate-wide age/gender quotas" }
          ]
        };

      case 'age-gender-only':
        return {
          totalQuotas: 12,
          categories: [
            { category: "Age/Gender", quotaCount: 12, segments: "Electorate-specific age/gender percentages" }
          ]
        };
    }

    // Default fallback
    return {
      totalQuotas: 12,
      categories: [
        { category: "Age/Gender", quotaCount: 12, segments: "12 age/gender combinations" }
      ]
    };
  }

  // Generate quota responses for a given configuration
  static generateQuotaResponses(
    config: QuotaGeneratorConfig,
    targetSampleSize: number = 1000
  ): QuotaGeneratorResponse[] {
    const responses: QuotaGeneratorResponse[] = [];

    config.quotaStructure.categories.forEach(category => {
      if (category.category === 'Age/Gender') {
        this.AGE_GENDER_SEGMENTS.forEach(segment => {
          responses.push({
            category: 'Age/Gender',
            subCategory: segment.name,
            population_percent: 8.33, // Roughly equal distribution
            quota_count: Math.round(targetSampleSize / 12),
            dynata_code: segment.code
          });
        });
      } else if (category.category === 'State') {
        this.STATE_SEGMENTS.forEach(segment => {
          responses.push({
            category: 'State',
            subCategory: segment.name,
            population_percent: this.getStatePopulationPercent(segment.code),
            quota_count: Math.round(targetSampleSize * this.getStatePopulationPercent(segment.code) / 100),
            dynata_code: segment.code
          });
        });
      } else if (category.category === 'Location') {
        this.LOCATION_SEGMENTS.forEach(segment => {
          responses.push({
            category: 'Location',
            subCategory: segment.name,
            population_percent: segment.percentage,
            quota_count: Math.round(targetSampleSize * segment.percentage / 100),
            dynata_code: segment.code
          });
        });
      }
      // Add more complex interlocking combinations as needed
    });

    return responses;
  }

  // Get Australian state population percentages
  private static getStatePopulationPercent(stateCode: string): number {
    const statePopulations: Record<string, number> = {
      'STATE_NSW': 32.0,
      'STATE_VIC': 26.0,
      'STATE_QLD': 20.0,
      'STATE_WA': 11.0,
      'STATE_SA': 7.0,
      'STATE_TAS': 2.0,
      'STATE_ACT': 1.7,
      'STATE_NT': 1.0
    };
    return statePopulations[stateCode] || 0;
  }

  // Get complexity level for UI display
  static getComplexityInfo(quotaMode: QuotaMode) {
    const complexityMap: Record<QuotaMode, { level: string; multiplier: number; description: string }> = {
      'non-interlocking': { level: 'low', multiplier: 1.0, description: 'Standard sample size' },
      'age-gender-only': { level: 'low', multiplier: 1.0, description: 'Standard sample size' },
      'age-gender-location': { level: 'medium', multiplier: 1.2, description: '20% larger sample recommended' },
      'age-gender-state': { level: 'medium', multiplier: 1.3, description: '30% larger sample recommended' },
      'state-location': { level: 'medium', multiplier: 1.3, description: '30% larger sample recommended' },
      'tas-age-gender-only': { level: 'low', multiplier: 1.0, description: 'Standard sample size' },
      'tas-non-interlocking': { level: 'medium', multiplier: 1.3, description: '30% larger sample recommended' },
      'tas-interlocking': { level: 'high', multiplier: 1.5, description: '50% larger sample required' },
      'full-interlocking': { level: 'extreme', multiplier: 2.0, description: '100% larger sample required' }
    };

    return complexityMap[quotaMode] || { level: 'low', multiplier: 1.0, description: 'Standard sample size' };
  }
}
