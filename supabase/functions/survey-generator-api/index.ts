
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
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { action, access_token, user_id, callback_url } = await req.json()
    const surveyGeneratorUrl = Deno.env.get('SURVEY_GENERATOR_URL')
    
    if (!surveyGeneratorUrl) {
      return new Response(
        JSON.stringify({ error: 'Survey Generator URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Survey Generator API request:', { action, surveyGeneratorUrl })

    switch (action) {
      case 'fetch_surveys':
        if (!access_token) {
          return new Response(
            JSON.stringify({ error: 'Access token required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          const response = await fetch(`${surveyGeneratorUrl}/api/surveys`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            }
          })

          if (!response.ok) {
            throw new Error(`Survey Generator API responded with ${response.status}`)
          }

          const surveysData = await response.json()
          
          return new Response(
            JSON.stringify({ surveys: surveysData.surveys || [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } catch (error) {
          console.error('Error fetching surveys:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch surveys from Survey Generator' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'generate_auth_url':
        if (!user_id || !callback_url) {
          return new Response(
            JSON.stringify({ error: 'User ID and callback URL required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          const authUrl = `${surveyGeneratorUrl}/oauth/authorize?` +
            `response_type=code&` +
            `client_id=${encodeURIComponent(Deno.env.get('MAIN_PLATFORM_URL') || '')}&` +
            `redirect_uri=${encodeURIComponent(callback_url)}&` +
            `state=${encodeURIComponent(user_id)}&` +
            `scope=surveys:read surveys:write`

          return new Response(
            JSON.stringify({ auth_url: authUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } catch (error) {
          console.error('Error generating auth URL:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to generate authentication URL' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'exchange_code':
        const { code, state } = await req.json()
        
        if (!code || !state) {
          return new Response(
            JSON.stringify({ error: 'Authorization code and state required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          const tokenResponse = await fetch(`${surveyGeneratorUrl}/oauth/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              grant_type: 'authorization_code',
              code,
              client_id: Deno.env.get('MAIN_PLATFORM_URL'),
              client_secret: Deno.env.get('SURVEY_GENERATOR_SYNC_TOKEN'),
              redirect_uri: callback_url
            })
          })

          if (!tokenResponse.ok) {
            throw new Error(`Token exchange failed with ${tokenResponse.status}`)
          }

          const tokenData = await tokenResponse.json()
          
          // Store platform access
          const { error: storeError } = await supabaseClient
            .from('user_platform_access')
            .upsert({
              user_id: state,
              platform_name: 'survey_generator',
              access_token: tokenData.access_token,
              expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
              is_active: true
            })

          if (storeError) {
            console.error('Error storing platform access:', storeError)
            throw new Error('Failed to store platform access')
          }

          return new Response(
            JSON.stringify({ success: true, access_token: tokenData.access_token }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } catch (error) {
          console.error('Error exchanging code for token:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to exchange authorization code' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Survey Generator API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
