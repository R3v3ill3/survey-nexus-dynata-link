
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

    const { username, password } = await req.json()

    // Authenticate with Dynata API
    const authResponse = await fetch('https://api.researchnow.com/auth/v1/default/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    })

    if (!authResponse.ok) {
      const error = await authResponse.text()
      throw new Error(`Dynata authentication failed: ${error}`)
    }

    const authData = await authResponse.json()
    
    // Store credentials securely in database
    const { error: dbError } = await supabaseClient
      .from('api_credentials')
      .upsert({
        user_id: user.id,
        provider: 'dynata',
        credentials: {
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
          token_type: authData.token_type,
          username: username
        },
        expires_at: new Date(Date.now() + (authData.expires_in * 1000)).toISOString(),
        is_active: true
      })

    if (dbError) throw dbError

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Successfully authenticated with Dynata API',
        expires_at: new Date(Date.now() + (authData.expires_in * 1000)).toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Authentication error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
