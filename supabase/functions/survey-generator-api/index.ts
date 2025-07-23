
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

    const { action, user_id, project_id } = await req.json()
    
    console.log('Survey Generator API request:', { action, user_id, project_id })

    switch (action) {
      case 'check_authentication':
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          // Check if user has platform access from the main platform
          const { data: platformAccess, error: accessError } = await supabaseClient
            .from('user_platform_access')
            .select('access_token, expires_at, is_active')
            .eq('user_id', user_id)
            .eq('platform_name', 'survey_generator')
            .eq('is_active', true)
            .maybeSingle()

          if (accessError) {
            console.error('Error checking platform access:', accessError)
            return new Response(
              JSON.stringify({ error: 'Failed to check authentication status' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const isAuthenticated = !!platformAccess?.access_token
          const isExpired = platformAccess?.expires_at && new Date(platformAccess.expires_at) < new Date()
          
          return new Response(
            JSON.stringify({ 
              authenticated: isAuthenticated && !isExpired,
              expires_at: platformAccess?.expires_at
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } catch (error) {
          console.error('Error checking authentication:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to check authentication' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'create_survey':
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          // Get platform access token
          const { data: platformAccess, error: accessError } = await supabaseClient
            .from('user_platform_access')
            .select('access_token, expires_at')
            .eq('user_id', user_id)
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

          // FIXED: Use Survey Generator's Supabase Edge Function URL instead of direct API call
          const surveyGeneratorUrl = Deno.env.get('SURVEY_GENERATOR_URL') || 'https://poll-assistant.reveille.net.au'
          const createUrl = `${surveyGeneratorUrl}/dashboard?user_id=${user_id}&project_id=${project_id || ''}`
          
          return new Response(
            JSON.stringify({ 
              success: true,
              survey_url: createUrl
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } catch (error) {
          console.error('Error creating survey:', error)
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create survey' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'fetch_surveys':
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          // Get platform access token
          const { data: platformAccess, error: accessError } = await supabaseClient
            .from('user_platform_access')
            .select('access_token, expires_at')
            .eq('user_id', user_id)
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

          // FIXED: Call Survey Generator's Supabase Edge Function instead of direct API call
          const surveyGeneratorApiUrl = 'https://wxbmorjrasmvzielzznn.supabase.co/functions/v1/survey-api/surveys'
          
          console.log('Fetching surveys from Survey Generator Edge Function:', surveyGeneratorApiUrl)
          
          const response = await fetch(surveyGeneratorApiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${platformAccess.access_token}`,
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            const responseText = await response.text()
            console.error('Survey Generator Edge Function error:', response.status, responseText)
            throw new Error(`Survey Generator Edge Function returned ${response.status}: ${response.statusText}`)
          }

          const surveysData = await response.json()
          
          return new Response(
            JSON.stringify({ surveys: surveysData.surveys || [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } catch (error) {
          console.error('Error fetching surveys from Survey Generator Edge Function:', error)
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch surveys' }),
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
