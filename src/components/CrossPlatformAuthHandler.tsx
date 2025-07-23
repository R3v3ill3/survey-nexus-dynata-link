
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
      const projectId = searchParams.get('project_id')
      
      console.log('Cross-platform auth params:', { token: !!token, platform, projectId })

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
        console.log('Processing cross-platform auth:', { platform, tokenPresent: !!token })

        // For Survey Generator, we already have the token stored during initiation
        // We just need to verify it's still valid and update the authentication status
        const { data: platformAccess, error: accessError } = await supabase
          .from('user_platform_access')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform_name', platform)
          .eq('access_token', token)
          .maybeSingle()

        if (accessError || !platformAccess) {
          console.error('Platform access validation failed:', accessError)
          throw new Error('Invalid authentication token')
        }

        // Update last accessed time
        const { error: updateError } = await supabase
          .from('user_platform_access')
          .update({
            last_accessed: new Date().toISOString(),
            is_active: true
          })
          .eq('user_id', user.id)
          .eq('platform_name', platform)

        if (updateError) {
          console.error('Error updating platform access:', updateError)
          throw new Error('Failed to update authentication status')
        }

        console.log('Platform access updated successfully')
        toast.success(`Successfully connected to ${platform}`)
        
        // Redirect back to the project page
        const redirectPath = projectId ? `/project/${projectId}` : '/dashboard'
        navigate(redirectPath, { replace: true })

      } catch (error) {
        console.error('Cross-platform auth error:', error)
        toast.error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        navigate('/dashboard', { replace: true })
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
