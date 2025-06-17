
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
    if (!user) throw new Error('No user found')

    // Get Dynata credentials
    const { data: credentials } = await supabaseClient
      .from('api_credentials')
      .select('credentials')
      .eq('user_id', user.id)
      .eq('provider', 'dynata')
      .eq('is_active', true)
      .single()

    if (!credentials) throw new Error('No active Dynata credentials found')

    const { method } = req
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    switch (method) {
      case 'POST':
        if (action === 'create') {
          return await createProject(req, supabaseClient, credentials.credentials, user.id)
        } else if (action === 'launch') {
          return await launchProject(req, supabaseClient, credentials.credentials, user.id)
        }
        break
      case 'PUT':
        return await updateProject(req, supabaseClient, credentials.credentials, user.id)
      case 'GET':
        return await getProjects(supabaseClient, credentials.credentials, user.id)
    }

    throw new Error('Invalid request method or action')

  } catch (error) {
    console.error('Project management error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function createProject(req: Request, supabaseClient: any, credentials: any, userId: string) {
  const { title, description, settings } = await req.json()

  // Create project in Dynata
  const dynataResponse = await fetch('https://api.researchnow.com/demand/v1/projects', {
    method: 'POST',
    headers: {
      'Authorization': `${credentials.token_type} ${credentials.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      description,
      ...settings
    })
  })

  if (!dynataResponse.ok) {
    throw new Error('Failed to create project in Dynata')
  }

  const dynataProject = await dynataResponse.json()

  // Store project in our database
  const { data: project, error } = await supabaseClient
    .from('projects')
    .insert({
      user_id: userId,
      title,
      description,
      external_id: dynataProject.id,
      settings,
      status: 'draft'
    })
    .select()
    .single()

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, project }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function launchProject(req: Request, supabaseClient: any, credentials: any, userId: string) {
  const { projectId } = await req.json()

  // Get project from database
  const { data: project } = await supabaseClient
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (!project) throw new Error('Project not found')

  // Launch project in Dynata
  const dynataResponse = await fetch(`https://api.researchnow.com/demand/v1/projects/${project.external_id}/launch`, {
    method: 'POST',
    headers: {
      'Authorization': `${credentials.token_type} ${credentials.access_token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!dynataResponse.ok) {
    throw new Error('Failed to launch project in Dynata')
  }

  // Update project status
  const { error } = await supabaseClient
    .from('projects')
    .update({ status: 'active' })
    .eq('id', projectId)

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, message: 'Project launched successfully' }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function updateProject(req: Request, supabaseClient: any, credentials: any, userId: string) {
  const { projectId, ...updates } = await req.json()

  // Update in database
  const { error } = await supabaseClient
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', userId)

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, message: 'Project updated successfully' }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function getProjects(supabaseClient: any, credentials: any, userId: string) {
  const { data: projects, error } = await supabaseClient
    .from('projects')
    .select(`
      *,
      line_items (
        id,
        name,
        status,
        quota,
        completed,
        cost_per_complete,
        channel_type
      )
    `)
    .eq('user_id', userId)

  if (error) throw error

  return new Response(
    JSON.stringify({ projects }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}
