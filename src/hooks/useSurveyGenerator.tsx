
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useParams } from 'react-router-dom'

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
  const { id: projectId } = useParams()
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
      // Check if user has Survey Generator access according to their tier
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
        await checkAuthentication()
      }
    } catch (error) {
      console.error('Error checking Survey Generator access:', error)
      setHasAccess(false)
      setIsAuthenticated(false)
    }
  }

  const checkAuthentication = async () => {
    if (!user) return

    try {
      // Check if user has platform access record
      const { data: platformAccess, error: platformError } = await supabase
        .from('user_platform_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform_name', 'survey_generator')
        .eq('is_active', true)
        .maybeSingle()

      if (platformError) {
        console.error('Error checking platform access:', platformError)
        setIsAuthenticated(false)
        return
      }

      // If we have a record, check if it's still valid
      if (platformAccess) {
        const isExpired = platformAccess.expires_at && new Date(platformAccess.expires_at) < new Date()
        setIsAuthenticated(!isExpired)
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Error checking authentication:', error)
      setIsAuthenticated(false)
    }
  }

  const initiateAuthentication = async () => {
    if (!user) return

    setLoading(true)
    try {
      console.log('Initiating authentication via Supabase function')
      
      // Use the cross-platform-auth function to initiate authentication
      const { data, error } = await supabase.functions.invoke('cross-platform-auth', {
        body: {
          action: 'initiate_auth',
          platform: 'survey_generator',
          user_id: user.id,
          project_id: projectId || ''
        }
      })

      if (error) {
        console.error('Authentication initiation error:', error)
        throw new Error('Failed to initiate authentication')
      }

      console.log('Authentication initiated successfully:', data)
      
      // Use regular redirect instead of popup to avoid popup blockers
      if (data.auth_url) {
        // Store the current location so we can return here after auth
        sessionStorage.setItem('survey_generator_return_url', window.location.href)
        
        // Redirect to the Survey Generator authentication page
        window.location.href = data.auth_url
        
        toast.info('Redirecting to Survey Generator for authentication...')
      } else {
        throw new Error('No authentication URL received')
      }
    } catch (error) {
      console.error('Error initiating authentication:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to initiate authentication')
    } finally {
      setLoading(false)
    }
  }

  const fetchSurveys = async () => {
    if (!user || !hasAccess || !isAuthenticated) {
      console.log('Cannot fetch surveys:', { user: !!user, hasAccess, isAuthenticated })
      return
    }

    setLoading(true)
    try {
      // Fetch surveys using the Survey Generator API
      const { data: surveysData, error: surveysError } = await supabase.functions.invoke('survey-generator-api', {
        body: {
          action: 'fetch_surveys',
          user_id: user.id
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

  const createSurvey = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Use Supabase function to create survey
      const { data, error } = await supabase.functions.invoke('survey-generator-api', {
        body: {
          action: 'create_survey',
          user_id: user.id,
          project_id: projectId || ''
        }
      })

      if (error) {
        console.error('Create survey error:', error)
        throw new Error('Failed to create survey')
      }

      if (data.survey_url) {
        // Store the current location so we can return here after creating survey
        sessionStorage.setItem('survey_generator_return_url', window.location.href)
        
        // Redirect to Survey Generator to create survey
        window.location.href = data.survey_url
        
        toast.info('Redirecting to Survey Generator to create survey...')
      } else {
        toast.info('Survey creation initiated. Please check Survey Generator.')
      }
    } catch (error) {
      console.error('Error creating survey:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create survey')
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

  const refreshAuthentication = async () => {
    if (!user) return

    setLoading(true)
    try {
      await checkAuthentication()
      if (isAuthenticated) {
        toast.success('Authentication status refreshed')
      } else {
        toast.info('Not authenticated - please connect to Survey Generator')
      }
    } catch (error) {
      console.error('Error refreshing authentication:', error)
      toast.error('Failed to refresh authentication status')
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
    refreshAuthentication,
    initiateAuthentication,
    createSurvey
  }
}
