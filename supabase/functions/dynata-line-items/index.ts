
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

    switch (method) {
      case 'POST':
        return await createLineItem(req, supabaseClient, credentials.credentials, user.id)
      case 'PUT':
        return await updateLineItem(req, supabaseClient, credentials.credentials, user.id)
      case 'GET':
        return await getLineItems(req, supabaseClient, user.id)
    }

    throw new Error('Invalid request method')

  } catch (error) {
    console.error('Line item management error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function createLineItem(req: Request, supabaseClient: any, credentials: any, userId: string) {
  const { projectId, name, targeting, quota, costPerComplete } = await req.json()

  // Verify project ownership
  const { data: project } = await supabaseClient
    .from('projects')
    .select('external_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (!project) throw new Error('Project not found')

  // Create line item in Dynata
  const dynataResponse = await fetch(`https://api.researchnow.com/demand/v1/projects/${project.external_id}/lineItems`, {
    method: 'POST',
    headers: {
      'Authorization': `${credentials.token_type} ${credentials.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      targeting,
      quota,
      costPerComplete
    })
  })

  if (!dynataResponse.ok) {
    throw new Error('Failed to create line item in Dynata')
  }

  const dynataLineItem = await dynataResponse.json()

  // Store line item in database
  const { data: lineItem, error } = await supabaseClient
    .from('line_items')
    .insert({
      project_id: projectId,
      name,
      channel_type: 'dynata',
      external_id: dynataLineItem.id,
      targeting,
      quota,
      cost_per_complete: costPerComplete,
      status: 'draft'
    })
    .select()
    .single()

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, lineItem }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function updateLineItem(req: Request, supabaseClient: any, credentials: any, userId: string) {
  const { lineItemId, ...updates } = await req.json()

  // Update in database
  const { error } = await supabaseClient
    .from('line_items')
    .update(updates)
    .eq('id', lineItemId)

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, message: 'Line item updated successfully' }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function getLineItems(req: Request, supabaseClient: any, userId: string) {
  const url = new URL(req.url)
  const projectId = url.searchParams.get('projectId')

  const { data: lineItems, error } = await supabaseClient
    .from('line_items')
    .select(`
      *,
      quota_tracking (*)
    `)
    .eq('project_id', projectId)

  if (error) throw error

  return new Response(
    JSON.stringify({ lineItems }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}
