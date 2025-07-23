
import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const CrossPlatformAuthHandler = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    const handleCrossPlatformAuth = async () => {
      const token = searchParams.get('token')
      const platform = searchParams.get('platform')
      
      // Handle incoming authentication token from external platforms
      if (!token || !platform) {
        console.log('No token or platform in URL parameters')
        return
      }

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

        // If user is already logged in, sync permissions
        if (user) {
          console.log('User already logged in, syncing permissions')
          await supabase.functions.invoke('cross-platform-auth', {
            body: {
              action: 'sync_permissions',
              user_data: {
                id: user.id,
                platform_permissions: {
                  [platform]: true
                }
              }
            }
          })
          
          toast.success(`Successfully connected to ${platform}`)
          navigate('/', { replace: true })
          return
        }

        // Create session for new user
        console.log('Creating new user session')
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

      } catch (error) {
        console.error('Cross-platform auth error:', error)
        toast.error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        navigate('/', { replace: true })
      }
    }

    handleCrossPlatformAuth()
  }, [searchParams, navigate, user])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  )
}
