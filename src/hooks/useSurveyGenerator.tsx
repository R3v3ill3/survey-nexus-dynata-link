
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface SurveyGeneratorSurvey {
  id: string
  title: string
  description?: string
  estimated_length?: number
  survey_url: string
  status: string
  created_at: string
  questions: any[]
  target_audience: Record<string, any>
  quota_requirements: Record<string, any>
}

export const useSurveyGenerator = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [surveys, setSurveys] = useState<SurveyGeneratorSurvey[]>([])
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    if (user) {
      checkAccess()
    }
  }, [user])

  const checkAccess = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.rpc('has_platform_access', {
        user_id: user.id,
        platform: 'survey_generator'
      })

      if (error) throw error
      setHasAccess(data)
    } catch (error) {
      console.error('Error checking Survey Generator access:', error)
      setHasAccess(false)
    }
  }

  const fetchSurveys = async () => {
    if (!user || !hasAccess) return

    setLoading(true)
    try {
      // Check for platform access token
      const { data: platformAccess, error: accessError } = await supabase
        .from('user_platform_access')
        .select('access_token, expires_at')
        .eq('user_id', user.id)
        .eq('platform_name', 'survey_generator')
        .eq('is_active', true)
        .single()

      if (accessError) {
        throw new Error('No Survey Generator access found. Please authenticate first.')
      }

      // In a real implementation, this would call the Survey Generator API
      // For now, we'll simulate the API call
      const mockSurveys: SurveyGeneratorSurvey[] = [
        {
          id: 'sg_001',
          title: 'Customer Satisfaction Survey',
          description: 'Monthly customer satisfaction tracking',
          estimated_length: 10,
          survey_url: 'https://survey-generator.com/survey/sg_001',
          status: 'draft',
          created_at: new Date().toISOString(),
          questions: [
            { id: 1, type: 'rating', question: 'How satisfied are you with our service?' },
            { id: 2, type: 'text', question: 'What improvements would you suggest?' }
          ],
          target_audience: { age_range: '18-65', location: 'US' },
          quota_requirements: { total_responses: 500 }
        },
        {
          id: 'sg_002',
          title: 'Product Feedback Survey',
          description: 'Gather feedback on new product features',
          estimated_length: 15,
          survey_url: 'https://survey-generator.com/survey/sg_002',
          status: 'active',
          created_at: new Date().toISOString(),
          questions: [
            { id: 1, type: 'multiple_choice', question: 'Which feature do you use most?' },
            { id: 2, type: 'rating', question: 'Rate the new dashboard design' }
          ],
          target_audience: { age_range: '25-54', location: 'US,CA' },
          quota_requirements: { total_responses: 1000 }
        }
      ]

      setSurveys(mockSurveys)
    } catch (error) {
      console.error('Error fetching Survey Generator surveys:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch surveys')
    } finally {
      setLoading(false)
    }
  }

  const importSurvey = async (surveyId: string, projectId: string) => {
    if (!user || !hasAccess) return

    setLoading(true)
    try {
      const survey = surveys.find(s => s.id === surveyId)
      if (!survey) throw new Error('Survey not found')

      // Import survey using existing survey-import function
      const { data, error } = await supabase.functions.invoke('survey-import', {
        body: {
          project_id: projectId,
          external_survey_id: survey.id,
          title: survey.title,
          description: survey.description,
          estimated_length: survey.estimated_length,
          survey_url: survey.survey_url,
          external_platform: 'survey_generator',
          target_audience: survey.target_audience,
          quota_requirements: survey.quota_requirements,
          survey_questions: survey.questions,
          import_metadata: {
            imported_from: 'survey_generator',
            imported_at: new Date().toISOString(),
            original_status: survey.status
          }
        }
      })

      if (error) throw error

      toast.success('Survey imported successfully from Survey Generator!')
      return data.survey
    } catch (error) {
      console.error('Error importing survey:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import survey')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const authenticateWithSurveyGenerator = async () => {
    if (!user) return

    try {
      // In a real implementation, this would redirect to Survey Generator OAuth flow
      // For now, we'll simulate the authentication
      const mockAuthData = {
        access_token: 'sg_token_' + Date.now(),
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        user_data: {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
          platform_permissions: {
            survey_generator: true
          }
        }
      }

      // Store platform access
      const { error } = await supabase
        .from('user_platform_access')
        .upsert({
          user_id: user.id,
          platform_name: 'survey_generator',
          access_token: mockAuthData.access_token,
          expires_at: mockAuthData.expires_at,
          is_active: true
        })

      if (error) throw error

      setHasAccess(true)
      toast.success('Successfully authenticated with Survey Generator!')
    } catch (error) {
      console.error('Error authenticating with Survey Generator:', error)
      toast.error('Failed to authenticate with Survey Generator')
    }
  }

  return {
    surveys,
    loading,
    hasAccess,
    fetchSurveys,
    importSurvey,
    authenticateWithSurveyGenerator
  }
}
