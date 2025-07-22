
import { SecretConfigurationHelper } from '@/components/admin/SecretConfigurationHelper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Settings, Database } from 'lucide-react'

export const AdminConfiguration = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Admin Configuration</h1>
          <p className="text-muted-foreground">
            Configure integrations and platform settings for Survey Generator
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Integration Setup
              </CardTitle>
              <CardDescription>
                Set up secure tokens and configure platform integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SecretConfigurationHelper />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Monitor integration health and connectivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Survey Generator Sync</h4>
                    <p className="text-sm text-muted-foreground">Webhook endpoint status</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ready for configuration
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Cross-Platform Auth</h4>
                    <p className="text-sm text-muted-foreground">Authentication endpoint status</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ready for configuration
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Database Connection</h4>
                    <p className="text-sm text-muted-foreground">Supabase database status</p>
                  </div>
                  <div className="text-sm text-success">
                    Connected
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
