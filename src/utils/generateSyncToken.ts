
// Utility to generate a secure sync token for Survey Generator integration
// This token will be used to authenticate sync requests between platforms

export const generateSecureSyncToken = (): string => {
  // Generate a cryptographically secure random token
  const array = new Uint8Array(32) // 256 bits
  crypto.getRandomValues(array)
  
  // Convert to base64url format (URL-safe)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Generate the token - run this once to get your sync token
const SYNC_TOKEN = generateSecureSyncToken()
console.log('Generated Sync Token:', SYNC_TOKEN)
console.log('Token Length:', SYNC_TOKEN.length)

// Configuration details for Survey Generator platform
export const getIntegrationConfig = (syncToken: string) => ({
  webhook_endpoints: {
    sync_endpoint: 'https://dmyajxekgerixzojzlej.supabase.co/functions/v1/sync-to-survey-generator',
    auth_endpoint: 'https://dmyajxekgerixzojzlej.supabase.co/functions/v1/cross-platform-auth'
  },
  authentication: {
    sync_token: syncToken,
    platform_id: 'pop-poll.reveille.net.au',
    supported_actions: ['user_sync', 'survey_created', 'survey_updated']
  },
  callback_urls: {
    auth_callback: 'https://pop-poll.reveille.net.au/auth/callback',
    survey_import: 'https://pop-poll.reveille.net.au/surveys/import'
  }
})
