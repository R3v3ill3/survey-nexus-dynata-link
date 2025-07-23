
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const CrossPlatformAuthHandler = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const handleCrossPlatformAuth = async () => {
      const token = searchParams.get('token')
      const platform = searchParams.get('platform') || 'survey_generator'
      const status = searchParams.get('status') || 'success'
      const projectId = searchParams.get('project_id')
      
      console.log('Cross-platform auth params:', { token: !!token, platform, status, projectId })

      // Only process if we have a token parameter
      if (!token) {
        console.log('No token provided, skipping auth processing')
        return
      }

      if (!user) {
        console.log('No user logged in, cannot process cross-platform auth')
        toast.error('Please log in to connect to Survey Generator')
        navigate('/auth')
        return
      }

      setIsProcessing(true)

      try {
        console.log('Processing cross-platform auth callback:', { platform, status, tokenPresent: !!token })

        // Use the enhanced callback processing endpoint
        const { data, error } = await supabase.functions.invoke('cross-platform-auth', {
          body: {
            action: 'process_callback',
            token,
            platform,
            status,
            user_id: user.id
          }
        })

        if (error) {
          console.error('Callback processing error:', error)
          throw new Error(error.message || 'Failed to process authentication callback')
        }

        if (data.success) {
          if (data.authenticated) {
            console.log('Authentication successful')
            toast.success(`Successfully connected to ${platform === 'survey_generator' ? 'Survey Generator' : platform}`)
          } else {
            console.log('Authentication failed on Survey Generator side')
            toast.error('Authentication was cancelled or failed on Survey Generator')
          }
        } else {
          throw new Error('Callback processing failed')
        }
        
        // Check if we have a stored return URL from sessionStorage
        const returnUrl = sessionStorage.getItem('survey_generator_return_url')
        if (returnUrl) {
          sessionStorage.removeItem('survey_generator_return_url')
          // Use window.location.href to ensure we navigate to the full URL
          window.location.href = returnUrl
        } else {
          // Fallback to project page or dashboard
          const redirectPath = projectId ? `/project/${projectId}` : '/dashboard'
          navigate(redirectPath, { replace: true })
        }

      } catch (error) {
        console.error('Cross-platform auth error:', error)
        toast.error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        
        // Still try to return to the original location on error
        const returnUrl = sessionStorage.getItem('survey_generator_return_url')
        if (returnUrl) {
          sessionStorage.removeItem('survey_generator_return_url')
          window.location.href = returnUrl
        } else {
          navigate('/dashboard', { replace: true })
        }
      } finally {
        setIsProcessing(false)
      }
    }

    handleCrossPlatformAuth()
  }, [searchParams, navigate, user])

  // Only render loading screen if we're actually processing authentication
  if (!isProcessing) {
    return null
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  )
}
