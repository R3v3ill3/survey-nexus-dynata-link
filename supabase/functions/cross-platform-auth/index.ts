
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { action, token, platform, user_data, user_id, project_id, status, platform_id, sync_token } = await req.json()
    
    console.log('Cross-platform auth request:', { action, platform, user_id, platform_id })

    switch (action) {
      case 'initiate_auth':
        // Handle authentication initiation for Survey Generator
        if (platform === 'survey_generator') {
          try {
            // Fetch user profile data to include in token
            const { data: profile, error: profileError } = await supabaseClient
              .from('profiles')
              .select('email, full_name, membership_tier')
              .eq('id', user_id)
              .single()

            if (profileError) {
              console.error('Error fetching user profile:', profileError)
              throw new Error('Failed to fetch user data')
            }

            // Call Survey Generator's authentication endpoint with proper parameters
            const surveyGeneratorSyncToken = Deno.env.get('SURVEY_GENERATOR_SYNC_TOKEN')
            if (!surveyGeneratorSyncToken) {
              throw new Error('Survey Generator sync token not configured')
            }

            const authPayload = {
              platform_id: 'pop-poll.reveille.net.au',
              sync_token: surveyGeneratorSyncToken,
              user_data: {
                user_id: user_id,
                email: profile.email,
                full_name: profile.full_name,
                membership_tier: profile.membership_tier,
                project_id: project_id || ''
              }
            }

            console.log('Calling Survey Generator auth endpoint with:', authPayload)

            // Call Survey Generator's cross-platform auth endpoint
            const surveyGeneratorAuthUrl = 'https://wxbmorjrasmvzielzznn.supabase.co/functions/v1/cross-platform-auth'
            const authResponse = await fetch(surveyGeneratorAuthUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(authPayload)
            })

            if (!authResponse.ok) {
              const errorText = await authResponse.text()
              console.error('Survey Generator auth error:', authResponse.status, errorText)
              throw new Error(`Survey Generator authentication failed: ${authResponse.status}`)
            }

            const authData = await authResponse.json()
            console.log('Survey Generator auth response:', authData)

            if (!authData.access_token) {
              throw new Error('No access token received from Survey Generator')
            }

            // Store the access token in our database
            const { error: insertError } = await supabaseClient
              .from('user_platform_access')
              .upsert({
                user_id,
                platform_name: 'survey_generator',
                access_token: authData.access_token,
                is_active: true,
                expires_at: authData.expires_at ? new Date(authData.expires_at).toISOString() : null,
                last_accessed: new Date().toISOString()
              }, {
                onConflict: 'user_id,platform_name'
              })

            if (insertError) {
              console.error('Error storing platform access:', insertError)
              throw new Error('Failed to store authentication')
            }

            // Return success - no redirect needed, just token stored
            return new Response(
              JSON.stringify({ 
                success: true,
                message: 'Authentication successful',
                access_token: authData.access_token
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

          } catch (error) {
            console.error('Error initiating auth:', error)
            return new Response(
              JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to initiate authentication' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
        break

      case 'validate_token':
        // Validate JWT token from Survey Generator
        try {
          // In a real implementation, you'd verify the JWT signature
          // For now, we'll decode and validate basic structure
          const tokenParts = token.split('.')
          if (tokenParts.length !== 3) {
            throw new Error('Invalid JWT format')
          }

          const payload = JSON.parse(atob(tokenParts[1]))
          
          // Check expiration
          if (payload.exp && payload.exp < Date.now() / 1000) {
            throw new Error('Token expired')
          }

          // Validate required fields
          if (!payload.sub || !payload.email) {
            throw new Error('Missing required token fields')
          }

          return new Response(
            JSON.stringify({ 
              valid: true, 
              user_id: payload.sub,
              email: payload.email,
              platform: payload.platform || platform
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } catch (error) {
          return new Response(
            JSON.stringify({ valid: false, error: error.message }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'create_session':
        // Create authenticated session for cross-platform user
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email: user_data.email,
          email_confirm: true,
          user_metadata: {
            full_name: user_data.full_name,
            platform_origin: platform,
            cross_platform_id: user_data.id
          }
        })

        if (authError && authError.message !== 'User already registered') {
          console.error('Auth error:', authError)
          return new Response(
            JSON.stringify({ error: 'Failed to create user session' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Generate session token
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email: user_data.email,
          options: {
            redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/callback`
          }
        })

        if (sessionError) {
          console.error('Session error:', sessionError)
          return new Response(
            JSON.stringify({ error: 'Failed to generate session' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            session_url: sessionData.properties?.action_link,
            user: authData.user
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'process_callback':
        // Handle callback from Survey Generator
        try {
          if (!token) {
            throw new Error('No token provided in callback')
          }

          // Decode and validate the token
          const tokenData = JSON.parse(atob(token))
          
          // Verify token hasn't expired
          if (tokenData.expires_at && tokenData.expires_at < Date.now()) {
            throw new Error('Token has expired')
          }

          // Verify the token matches what we have stored
          const { data: platformAccess, error: accessError } = await supabaseClient
            .from('user_platform_access')
            .select('*')
            .eq('user_id', tokenData.user_id)
            .eq('platform_name', platform)
            .eq('access_token', token)
            .maybeSingle()

          if (accessError || !platformAccess) {
            throw new Error('Invalid or expired authentication token')
          }

          // Update authentication status based on callback status
          const updateData = status === 'success' 
            ? {
                last_accessed: new Date().toISOString(),
                is_active: true
              }
            : {
                is_active: false
              }

          const { error: updateError } = await supabaseClient
            .from('user_platform_access')
            .update(updateData)
            .eq('user_id', tokenData.user_id)
            .eq('platform_name', platform)

          if (updateError) {
            console.error('Error updating platform access:', updateError)
            throw new Error('Failed to update authentication status')
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              authenticated: status === 'success',
              user_id: tokenData.user_id,
              project_id: tokenData.project_id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } catch (error) {
          console.error('Callback processing error:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'sync_permissions':
        // Sync platform permissions
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .upsert({
            id: user_data.id,
            platform_permissions: {
              ...user_data.platform_permissions,
              [platform]: true
            }
          })
          .select()
          .single()

        if (profileError) {
          console.error('Profile sync error:', profileError)
          return new Response(
            JSON.stringify({ error: 'Failed to sync permissions' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, profile }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Cross-platform auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
