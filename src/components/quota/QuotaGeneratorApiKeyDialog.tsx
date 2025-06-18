
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/apiService";
import { Key, ExternalLink, Check, AlertTriangle, Loader2 } from "lucide-react";

// Type for API credentials
interface ApiCredentials {
  api_key: string;
  [key: string]: any;
}

interface QuotaGeneratorApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeySet: () => void;
  existingApiKey?: string;
}

const QuotaGeneratorApiKeyDialog = ({ open, onOpenChange, onApiKeySet, existingApiKey }: QuotaGeneratorApiKeyDialogProps) => {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'valid' | 'invalid' | 'unknown'>('unknown');
  const { toast } = useToast();

  useEffect(() => {
    if (open && existingApiKey) {
      // Show masked version of existing key
      const maskedKey = `${existingApiKey.substring(0, 8)}****${existingApiKey.slice(-4)}`;
      setApiKey(maskedKey);
      setKeyStatus('valid'); // Assume existing key is valid
    } else if (open) {
      setApiKey("");
      setKeyStatus('unknown');
    }
  }, [open, existingApiKey]);

  const testApiKey = async (keyToTest: string) => {
    if (!keyToTest.trim() || keyToTest.includes('****')) {
      toast({
        title: "Invalid Key",
        description: "Please enter a valid API key to test",
        variant: "destructive"
      });
      return false;
    }

    try {
      setTesting(true);
      // Test the API key by making a simple request
      const response = await fetch('https://aomwplugkkqtxuhdzufc.supabase.co/functions/v1/list-saved-quotas', {
        method: 'GET',
        headers: {
          'x-api-key': keyToTest.trim()
        }
      });

      if (response.ok) {
        setKeyStatus('valid');
        toast({
          title: "API Key Valid",
          description: "Your API key is working correctly",
        });
        return true;
      } else if (response.status === 401 || response.status === 403) {
        setKeyStatus('invalid');
        toast({
          title: "API Key Invalid",
          description: "The API key is not valid or has been rejected",
          variant: "destructive"
        });
        return false;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setKeyStatus('invalid');
      toast({
        title: "API Key Test Failed",
        description: "Could not validate the API key. Please check your connection.",
        variant: "destructive"
      });
      return false;
    } finally {
      setTesting(false);
    }
  };

  const handleTest = () => {
    testApiKey(apiKey);
  };

  const handleSave = async () => {
    if (!apiKey.trim() || apiKey.includes('****')) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid Quota Generator API key",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Test the key first
      const isValid = await testApiKey(apiKey.trim());
      if (!isValid) {
        return;
      }

      await ApiService.saveQuotaGeneratorCredentials(apiKey.trim());
      
      toast({
        title: "API Key Saved",
        description: "Your Quota Generator API key has been saved successfully",
      });
      
      setApiKey("");
      onApiKeySet();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setKeyStatus('unknown');
  };

  const getStatusIcon = () => {
    switch (keyStatus) {
      case 'valid':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'invalid':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (keyStatus) {
      case 'valid':
        return <span className="text-sm text-green-600">API key is valid</span>;
      case 'invalid':
        return <span className="text-sm text-red-600">API key is invalid</span>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2 text-blue-600" />
            {existingApiKey ? "Edit Quota Generator API Key" : "Configure Quota Generator API"}
          </DialogTitle>
          <DialogDescription>
            {existingApiKey 
              ? "Update your Quota Generator API key to continue accessing saved quotas and demographic targeting"
              : "Enter your Quota Generator API key to access saved quotas and generate detailed demographic targeting"
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center justify-between">
              API Key
              {getStatusIcon()}
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="qwa_your_api_key_here"
              value={apiKey}
              onChange={handleInputChange}
            />
            {getStatusText()}
            <div className="text-sm text-slate-600 flex items-center">
              <ExternalLink className="h-3 w-3 mr-1" />
              Get your API key from the Quota Generator dashboard
            </div>
          </div>
          
          {existingApiKey && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                Current API key: {existingApiKey.substring(0, 8)}****{existingApiKey.slice(-4)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Enter a new key above to replace the current one
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleTest} 
            disabled={testing || !apiKey.trim() || apiKey.includes('****')}
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Key"
            )}
          </Button>
          <Button onClick={handleSave} disabled={loading || keyStatus === 'invalid'}>
            {loading ? "Saving..." : "Save API Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuotaGeneratorApiKeyDialog;
