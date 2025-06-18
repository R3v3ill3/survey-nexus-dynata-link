
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-survey-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Generate quotas function called')
    
    // Get API key and survey ID from headers
    const apiKey = req.headers.get('x-api-key')
    const surveyId = req.headers.get('x-survey-id')
    
    if (!apiKey) {
      console.error('No API key provided')
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const requestBody = await req.json()
    console.log('Request body:', requestBody)
    
    // Make the actual API call to the quota generator service
    const quotaApiUrl = 'https://api.quotagenerator.com/v1/generate-quotas' // Replace with actual API endpoint
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }
    
    if (surveyId) {
      headers['X-Survey-ID'] = surveyId
    }
    
    console.log('Making API call to quota generator service')
    const response = await fetch(quotaApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    console.log('API response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API error response:', errorText)
      
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'API key authentication failed' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else if (response.status === 404 && surveyId) {
        return new Response(
          JSON.stringify({ error: 'Survey not found with the provided Survey ID' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ error: `API Error: ${response.status} - ${errorText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const result = await response.json()
    console.log('Successfully generated quotas:', result)
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in generate-quotas function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
