
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { action, token, platform, user_data, user_id, project_id } = await req.json()
    
    console.log('Cross-platform auth request:', { action, platform, user_id })

    switch (action) {
      case 'initiate_auth':
        // Handle authentication initiation for Survey Generator
        if (platform === 'survey_generator') {
          try {
            // Generate a session token for the user
            const authToken = btoa(JSON.stringify({
              user_id,
              project_id,
              platform: 'survey_generator',
              timestamp: Date.now(),
              expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            }))

            // Store the pending authentication
            const { error: insertError } = await supabaseClient
              .from('user_platform_access')
              .upsert({
                user_id,
                platform_name: 'survey_generator',
                access_token: authToken,
                is_active: true,
                expires_at: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
                last_accessed: new Date().toISOString()
              }, {
                onConflict: 'user_id,platform_name'
              })

            if (insertError) {
              console.error('Error storing platform access:', insertError)
              throw new Error('Failed to store authentication')
            }

            // Return success with the redirect URL
            const redirectUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cross-platform-auth`
            const surveyGeneratorUrl = Deno.env.get('SURVEY_GENERATOR_URL') || 'https://poll-assistant.reveille.net.au'
            
            return new Response(
              JSON.stringify({ 
                success: true,
                auth_url: `${surveyGeneratorUrl}?token=${authToken}&redirect_url=${encodeURIComponent(redirectUrl)}&project_id=${project_id}`
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

          } catch (error) {
            console.error('Error initiating auth:', error)
            return new Response(
              JSON.stringify({ error: 'Failed to initiate authentication' }),
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
