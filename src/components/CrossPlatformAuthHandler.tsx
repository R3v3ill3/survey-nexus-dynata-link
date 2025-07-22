
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
      
      if (!token || !platform) return

      try {
        // Validate token with cross-platform auth function
        const { data: validationData, error: validationError } = await supabase.functions.invoke('cross-platform-auth', {
          body: {
            action: 'validate_token',
            token,
            platform
          }
        })

        if (validationError || !validationData.valid) {
          throw new Error('Invalid authentication token')
        }

        // If user is already logged in, sync permissions
        if (user) {
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

        if (sessionError) throw sessionError

        // Redirect to session URL for automatic login
        if (sessionData.session_url) {
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

  return null
}
