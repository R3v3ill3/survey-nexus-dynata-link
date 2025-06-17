
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Shield, Key, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthenticationModuleProps {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
}

const AuthenticationModule = ({ isAuthenticated, setIsAuthenticated }: AuthenticationModuleProps) => {
  const [credentials, setCredentials] = useState({
    clientId: "",
    clientSecret: "",
    apiUrl: "https://api.dynata.com/v1"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState({
    token: "",
    expiresAt: "",
    refreshToken: ""
  });
  
  const { toast } = useToast();

  const handleAuthenticate = async () => {
    setIsLoading(true);
    console.log("Attempting authentication with Dynata API...", credentials);

    try {
      // Simulate API authentication
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockToken = "dynata_access_token_" + Math.random().toString(36).substr(2, 9);
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

      setTokenInfo({
        token: mockToken,
        expiresAt,
        refreshToken: "refresh_" + Math.random().toString(36).substr(2, 9)
      });

      setIsAuthenticated(true);
      
      toast({
        title: "Authentication Successful",
        description: "Successfully connected to Dynata Demand API",
      });
    } catch (error) {
      console.error("Authentication failed:", error);
      toast({
        title: "Authentication Failed",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsAuthenticated(false);
    setTokenInfo({ token: "", expiresAt: "", refreshToken: "" });
    toast({
      title: "Disconnected",
      description: "Successfully disconnected from Dynata API",
    });
  };

  const handleRefreshToken = async () => {
    setIsLoading(true);
    console.log("Refreshing access token...");

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newToken = "dynata_access_token_" + Math.random().toString(36).substr(2, 9);
      const expiresAt = new Date(Date.now() + 3600000).toISOString();

      setTokenInfo(prev => ({
        ...prev,
        token: newToken,
        expiresAt
      }));

      toast({
        title: "Token Refreshed",
        description: "Access token has been successfully refreshed",
      });
    } catch (error) {
      console.error("Token refresh failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            Dynata API Authentication
          </CardTitle>
          <CardDescription>
            Manage your connection to the Dynata Demand API for accessing panel respondents and survey management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isAuthenticated ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    type="text"
                    placeholder="Enter your Dynata Client ID"
                    value={credentials.clientId}
                    onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="Enter your Client Secret"
                    value={credentials.clientSecret}
                    onChange={(e) => setCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL</Label>
                <Input
                  id="apiUrl"
                  type="url"
                  value={credentials.apiUrl}
                  onChange={(e) => setCredentials(prev => ({ ...prev, apiUrl: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleAuthenticate} 
                disabled={!credentials.clientId || !credentials.clientSecret || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Connect to Dynata API
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully authenticated with Dynata Demand API
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Connection Status</Label>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Connected
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>Token Expires</Label>
                  <div className="text-sm text-slate-600">
                    {new Date(tokenInfo.expiresAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={handleRefreshToken}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Token
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDisconnect}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-slate-900">API Capabilities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-slate-600">Project Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-slate-600">Line Item Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-slate-600">Feasibility & Pricing</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-slate-600">Response Collection</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthenticationModule;
