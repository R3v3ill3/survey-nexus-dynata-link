
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
      const platform = searchParams.get('platform')
      
      // Only process if we have both token and platform parameters
      if (!token || !platform) {
        return
      }

      setIsProcessing(true)

      try {
        console.log('Processing cross-platform auth:', { platform, tokenPresent: !!token })

        // Validate token with cross-platform auth function
        const { data: validationData, error: validationError } = await supabase.functions.invoke('cross-platform-auth', {
          body: {
            action: 'validate_token',
            token,
            platform
          }
        })

        if (validationError || !validationData.valid) {
          console.error('Token validation failed:', validationError)
          throw new Error('Invalid authentication token')
        }

        console.log('Token validation successful:', validationData)

        // Store platform access in user_platform_access table
        if (user) {
          const { error: accessError } = await supabase
            .from('user_platform_access')
            .upsert({
              user_id: user.id,
              platform_name: platform,
              access_token: token,
              is_active: true,
              expires_at: validationData.expires_at || null,
              last_accessed: new Date().toISOString()
            })

          if (accessError) {
            console.error('Error storing platform access:', accessError)
            throw new Error('Failed to store authentication')
          }

          toast.success(`Successfully connected to ${platform}`)
          navigate(`/project/${searchParams.get('project_id') || ''}`, { replace: true })
        } else {
          // If no user is logged in, create a new session
          const { data: sessionData, error: sessionError } = await supabase.functions.invoke('cross-platform-auth', {
            body: {
              action: 'create_session',
              user_data: {
                id: validationData.user_id,
                email: validationData.email,
                full_name: validationData.full_name || validationData.email
              },
              platform
            }
          })

          if (sessionError) {
            console.error('Session creation failed:', sessionError)
            throw sessionError
          }

          // Redirect to session URL for automatic login
          if (sessionData.session_url) {
            console.log('Redirecting to session URL')
            window.location.href = sessionData.session_url
          } else {
            toast.success(`Welcome from ${platform}!`)
            navigate('/', { replace: true })
          }
        }

      } catch (error) {
        console.error('Cross-platform auth error:', error)
        toast.error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        navigate('/', { replace: true })
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
