
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Get saved quota function called')
    
    // Get API key from headers
    const apiKey = req.headers.get('x-api-key')
    
    if (!apiKey) {
      console.error('No API key provided')
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract quota ID from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const quotaId = pathParts[pathParts.length - 1]
    
    if (!quotaId) {
      return new Response(
        JSON.stringify({ error: 'Quota ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Fetching quota with ID:', quotaId)
    
    // Make the actual API call to get the specific quota
    const quotaApiUrl = `https://api.quotagenerator.com/v1/quotas/${quotaId}` // Replace with actual API endpoint
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }
    
    console.log('Making API call to get saved quota')
    const response = await fetch(quotaApiUrl, {
      method: 'GET',
      headers
    })

    console.log('API response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API error response:', errorText)
      
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'API authentication failed. Please check your API key.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else if (response.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Quota not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ error: `Quota Generator API error: ${response.statusText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const result = await response.json()
    console.log('Successfully fetched saved quota:', result)
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-saved-quota function:', error)
    
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return new Response(
        JSON.stringify({ error: 'Network error: Unable to connect to the Quota Generator API.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
