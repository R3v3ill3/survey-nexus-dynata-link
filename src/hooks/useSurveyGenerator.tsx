
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
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (user) {
      checkAccess()
    }
  }, [user])

  const checkAccess = async () => {
    if (!user) return

    try {
      // First check if user has Survey Generator access according to their tier
      const { data: tierAccess, error: tierError } = await supabase.rpc('has_platform_access', {
        user_id: user.id,
        platform: 'survey_generator'
      })

      if (tierError) {
        console.error('Error checking tier access:', tierError)
        setHasAccess(false)
        return
      }

      setHasAccess(tierAccess)
      
      if (tierAccess) {
        // Check if user has authenticated with Survey Generator
        const { data: authData, error: authError } = await supabase
          .from('user_platform_access')
          .select('access_token, expires_at')
          .eq('user_id', user.id)
          .eq('platform_name', 'survey_generator')
          .eq('is_active', true)
          .maybeSingle()

        if (authError) {
          console.error('Error checking authentication:', authError)
          setIsAuthenticated(false)
          return
        }

        setIsAuthenticated(!!authData?.access_token)
      }
    } catch (error) {
      console.error('Error checking Survey Generator access:', error)
      setHasAccess(false)
      setIsAuthenticated(false)
    }
  }

  const fetchSurveys = async () => {
    if (!user || !hasAccess || !isAuthenticated) {
      console.log('Cannot fetch surveys:', { user: !!user, hasAccess, isAuthenticated })
      return
    }

    setLoading(true)
    try {
      // Get platform access token
      const { data: platformAccess, error: accessError } = await supabase
        .from('user_platform_access')
        .select('access_token, expires_at')
        .eq('user_id', user.id)
        .eq('platform_name', 'survey_generator')
        .eq('is_active', true)
        .maybeSingle()

      if (accessError || !platformAccess) {
        throw new Error('No valid Survey Generator access token found. Please authenticate first.')
      }

      // Check if token is expired
      if (platformAccess.expires_at && new Date(platformAccess.expires_at) < new Date()) {
        throw new Error('Survey Generator access token has expired. Please authenticate again.')
      }

      // Call the Survey Generator API through our edge function
      const { data: surveysData, error: surveysError } = await supabase.functions.invoke('survey-generator-api', {
        body: {
          action: 'fetch_surveys',
          access_token: platformAccess.access_token
        }
      })

      if (surveysError) {
        console.error('Surveys error:', surveysError)
        throw new Error('Failed to fetch surveys from Survey Generator')
      }

      setSurveys(surveysData.surveys || [])
    } catch (error) {
      console.error('Error fetching Survey Generator surveys:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch surveys')
    } finally {
      setLoading(false)
    }
  }

  const importSurvey = async (surveyId: string, projectId: string) => {
    if (!user || !hasAccess || !isAuthenticated) return

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

    setLoading(true)
    try {
      // Generate auth URL with the Survey Generator platform
      const { data: authData, error: authError } = await supabase.functions.invoke('survey-generator-api', {
        body: {
          action: 'generate_auth_url',
          user_id: user.id,
          callback_url: `${window.location.origin}/auth`
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        throw new Error('Failed to generate authentication URL')
      }

      // Redirect to Survey Generator OAuth flow
      if (authData.auth_url) {
        window.location.href = authData.auth_url
      } else {
        throw new Error('No authentication URL received')
      }
    } catch (error) {
      console.error('Error authenticating with Survey Generator:', error)
      toast.error('Failed to authenticate with Survey Generator')
    } finally {
      setLoading(false)
    }
  }

  return {
    surveys,
    loading,
    hasAccess,
    isAuthenticated,
    fetchSurveys,
    importSurvey,
    authenticateWithSurveyGenerator
  }
}
