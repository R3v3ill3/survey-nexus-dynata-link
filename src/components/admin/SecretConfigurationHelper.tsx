
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Copy, CheckCircle, ExternalLink, Key, Globe } from 'lucide-react'
import { generateSecureSyncToken, getIntegrationConfig } from '@/utils/generateSyncToken'
import { toast } from 'sonner'

export const SecretConfigurationHelper = () => {
  const [syncToken, setSyncToken] = useState('')
  const [isTokenGenerated, setIsTokenGenerated] = useState(false)

  const handleGenerateToken = () => {
    const token = generateSecureSyncToken()
    setSyncToken(token)
    setIsTokenGenerated(true)
    toast.success('Secure sync token generated!')
  }

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const integrationConfig = syncToken ? getIntegrationConfig(syncToken) : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Survey Generator Integration Setup
          </CardTitle>
          <CardDescription>
            Configure the secure sync token and platform settings for Survey Generator integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Generate Sync Token */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Step 1: Generate Secure Sync Token</h3>
              <Button onClick={handleGenerateToken} variant="outline">
                <Key className="h-4 w-4 mr-2" />
                Generate Token
              </Button>
            </div>
            
            {isTokenGenerated && (
              <div className="space-y-2">
                <Label htmlFor="sync-token">Generated Sync Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="sync-token"
                    value={syncToken}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyToClipboard(syncToken, 'Sync Token')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This token will be used to authenticate sync requests between platforms
                </p>
              </div>
            )}
          </div>

          {/* Step 2: Supabase Secret Configuration */}
          <div className="space-y-4">
            <h3 className="font-medium">Step 2: Configure Supabase Secrets</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Secret Name: SURVEY_GENERATOR_SYNC_TOKEN</Label>
                <div className="flex gap-2">
                  <Input
                    value={syncToken || 'Generate token first'}
                    readOnly
                    className="font-mono text-sm"
                    disabled={!isTokenGenerated}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyToClipboard(syncToken, 'Sync Token')}
                    disabled={!isTokenGenerated}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Secret Name: MAIN_PLATFORM_URL</Label>
                <div className="flex gap-2">
                  <Input
                    value="https://pop-poll.reveille.net.au"
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyToClipboard('https://pop-poll.reveille.net.au', 'Main Platform URL')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Survey Generator Platform Configuration */}
          {integrationConfig && (
            <div className="space-y-4">
              <h3 className="font-medium">Step 3: Survey Generator Platform Configuration</h3>
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Webhook Sync Endpoint</Label>
                    <div className="flex gap-2">
                      <Input
                        value={integrationConfig.webhook_endpoints.sync_endpoint}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyToClipboard(integrationConfig.webhook_endpoints.sync_endpoint, 'Sync Endpoint')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Authentication Endpoint</Label>
                    <div className="flex gap-2">
                      <Input
                        value={integrationConfig.webhook_endpoints.auth_endpoint}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyToClipboard(integrationConfig.webhook_endpoints.auth_endpoint, 'Auth Endpoint')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Authentication Callback URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={integrationConfig.callback_urls.auth_callback}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyToClipboard(integrationConfig.callback_urls.auth_callback, 'Auth Callback URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Supported Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {integrationConfig.authentication.supported_actions.map((action) => (
                      <Badge key={action} variant="secondary">{action}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Quick Actions */}
          <div className="space-y-4">
            <h3 className="font-medium">Step 4: Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => window.open('https://supabase.com/dashboard/project/dmyajxekgerixzojzlej/settings/functions', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Supabase Secrets
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://supabase.com/dashboard/project/dmyajxekgerixzojzlej/functions', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Edge Functions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
