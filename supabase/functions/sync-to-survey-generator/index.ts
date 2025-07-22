
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

    // Verify sync token for security
    const syncToken = req.headers.get('X-Sync-Token')
    const expectedToken = Deno.env.get('SURVEY_GENERATOR_SYNC_TOKEN')
    
    if (!syncToken || syncToken !== expectedToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid sync token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { action, user_data, survey_data, project_id } = body

    console.log('Sync request received:', { action, user_data, project_id })

    switch (action) {
      case 'user_sync':
        // Sync user data from Survey Generator
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .upsert({
            id: user_data.id,
            email: user_data.email,
            full_name: user_data.full_name,
            platform_permissions: {
              ...user_data.platform_permissions,
              survey_generator: true
            }
          })
          .select()
          .single()

        if (profileError) {
          console.error('Profile sync error:', profileError)
          return new Response(
            JSON.stringify({ error: 'Failed to sync user profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update platform access
        await supabaseClient
          .from('user_platform_access')
          .upsert({
            user_id: user_data.id,
            platform_name: 'survey_generator',
            access_token: user_data.access_token,
            expires_at: user_data.expires_at,
            is_active: true
          })

        return new Response(
          JSON.stringify({ success: true, profile }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'survey_created':
        // Handle survey creation from Survey Generator
        const { data: survey, error: surveyError } = await supabaseClient
          .from('surveys')
          .insert({
            project_id: project_id,
            external_survey_id: survey_data.id,
            title: survey_data.title,
            description: survey_data.description,
            estimated_length: survey_data.estimated_length,
            survey_url: survey_data.survey_url,
            external_platform: 'survey_generator',
            status: 'draft',
            target_audience: survey_data.target_audience || {},
            quota_requirements: survey_data.quota_requirements || {},
            survey_questions: survey_data.questions || [],
            import_metadata: {
              imported_from: 'survey_generator',
              imported_at: new Date().toISOString(),
              sync_token: syncToken
            }
          })
          .select()
          .single()

        if (surveyError) {
          console.error('Survey sync error:', surveyError)
          return new Response(
            JSON.stringify({ error: 'Failed to sync survey' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, survey }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'survey_updated':
        // Handle survey updates from Survey Generator
        const { data: updatedSurvey, error: updateError } = await supabaseClient
          .from('surveys')
          .update({
            title: survey_data.title,
            description: survey_data.description,
            estimated_length: survey_data.estimated_length,
            survey_url: survey_data.survey_url,
            status: survey_data.status,
            target_audience: survey_data.target_audience || {},
            quota_requirements: survey_data.quota_requirements || {},
            survey_questions: survey_data.questions || [],
            import_metadata: {
              ...survey_data.import_metadata,
              last_sync: new Date().toISOString()
            }
          })
          .eq('external_survey_id', survey_data.id)
          .eq('external_platform', 'survey_generator')
          .select()
          .single()

        if (updateError) {
          console.error('Survey update error:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to update survey' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, survey: updatedSurvey }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Sync endpoint error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
