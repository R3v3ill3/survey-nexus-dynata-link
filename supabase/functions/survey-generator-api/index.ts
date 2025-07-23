
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

    const { action, user_id } = await req.json()
    
    console.log('Survey Generator API request:', { action, user_id })

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

          // For now, return mock surveys since we don't have a real external API to call
          // In a real implementation, this would call the Survey Generator API
          const mockSurveys = [
            {
              id: 'survey_1',
              title: 'Customer Satisfaction Survey',
              description: 'A comprehensive survey about customer satisfaction',
              estimated_length: 10,
              survey_url: 'https://poll-assistant.reveille.net.au/surveys/survey_1',
              status: 'active',
              questions: [
                { id: 'q1', type: 'rating', text: 'How satisfied are you with our service?' },
                { id: 'q2', type: 'text', text: 'What can we improve?' }
              ],
              target_audience: { age_range: '18-65', location: 'Australia' },
              quota_requirements: { min_responses: 100, max_responses: 500 }
            },
            {
              id: 'survey_2',
              title: 'Product Feedback Survey',
              description: 'Survey about our latest product features',
              estimated_length: 15,
              survey_url: 'https://poll-assistant.reveille.net.au/surveys/survey_2',
              status: 'draft',
              questions: [
                { id: 'q1', type: 'multiple_choice', text: 'Which feature do you use most?' },
                { id: 'q2', type: 'rating', text: 'Rate the user interface' }
              ],
              target_audience: { age_range: '25-55', location: 'Global' },
              quota_requirements: { min_responses: 50, max_responses: 200 }
            }
          ]
          
          return new Response(
            JSON.stringify({ surveys: mockSurveys }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } catch (error) {
          console.error('Error fetching surveys:', error)
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
