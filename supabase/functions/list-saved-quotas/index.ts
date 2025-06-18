
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-survey-id',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('List saved quotas function called')
    
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
    
    // Determine the endpoint based on whether survey ID is provided
    const quotaApiUrl = surveyId 
      ? `https://api.quotagenerator.com/v1/surveys/${surveyId}/quotas` // Replace with actual API endpoint
      : 'https://api.quotagenerator.com/v1/quotas' // Replace with actual API endpoint
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }
    
    console.log('Making API call to list saved quotas')
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
          JSON.stringify({ error: 'API key authentication failed' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else if (response.status === 404 && surveyId) {
        return new Response(
          JSON.stringify({ error: 'No saved quotas found for this survey' }),
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
    console.log('Successfully fetched saved quotas:', result)
    
    // Handle both single quota response and array response
    const quotasArray = Array.isArray(result) ? result : [result]
    
    return new Response(
      JSON.stringify(quotasArray),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in list-saved-quotas function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
