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

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { 
        project_id, 
        external_survey_id, 
        title, 
        description, 
        estimated_length, 
        survey_url, 
        target_audience, 
        quota_requirements, 
        survey_questions, 
        external_platform,
        import_metadata 
      } = body

      // Validate required fields
      if (!project_id || !external_survey_id || !title || !survey_url) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: project_id, external_survey_id, title, survey_url' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify user owns the project
      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select('id')
        .eq('id', project_id)
        .eq('user_id', user.id)
        .single()

      if (projectError || !project) {
        return new Response(
          JSON.stringify({ error: 'Project not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create or update survey
      const { data: survey, error: surveyError } = await supabaseClient
        .from('surveys')
        .upsert({
          project_id,
          external_survey_id,
          title,
          description,
          estimated_length,
          survey_url,
          target_audience: target_audience || {},
          quota_requirements: quota_requirements || {},
          survey_questions: survey_questions || [],
          external_platform: external_platform || 'external',
          import_metadata: import_metadata || {},
          status: 'draft'
        }, {
          onConflict: 'project_id,external_survey_id'
        })
        .select()
        .single()

      if (surveyError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create survey', details: surveyError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, survey }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const project_id = url.searchParams.get('project_id')

      if (!project_id) {
        return new Response(
          JSON.stringify({ error: 'project_id parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get surveys for project
      const { data: surveys, error } = await supabaseClient
        .from('surveys')
        .select(`
          *,
          survey_line_items (
            id,
            line_item_id,
            survey_quota,
            priority
          )
        `)
        .eq('project_id', project_id)
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch surveys', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ surveys }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})