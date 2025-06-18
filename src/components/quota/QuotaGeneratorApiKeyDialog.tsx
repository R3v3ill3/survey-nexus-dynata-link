
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/apiService";
import { Key, ExternalLink, Check, AlertTriangle, Loader2 } from "lucide-react";

// Type for enhanced API credentials with survey ID
interface EnhancedApiCredentials {
  api_key: string;
  survey_id: string;
  [key: string]: any;
}

interface QuotaGeneratorApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeySet: () => void;
  existingApiKey?: string;
  existingSurveyId?: string;
}

const QuotaGeneratorApiKeyDialog = ({ 
  open, 
  onOpenChange, 
  onApiKeySet, 
  existingApiKey,
  existingSurveyId 
}: QuotaGeneratorApiKeyDialogProps) => {
  const [apiKey, setApiKey] = useState("");
  const [surveyId, setSurveyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'valid' | 'invalid' | 'unknown'>('unknown');
  const { toast } = useToast();

  useEffect(() => {
    console.log('Dialog opened, existing credentials:', { apiKey: existingApiKey ? 'present' : 'none', surveyId: existingSurveyId });
    if (open && existingApiKey) {
      // Show masked version of existing key
      const maskedKey = `${existingApiKey.substring(0, 8)}****${existingApiKey.slice(-4)}`;
      setApiKey(maskedKey);
      setSurveyId(existingSurveyId || "");
      setKeyStatus('valid'); // Assume existing credentials are valid
    } else if (open) {
      setApiKey("");
      setSurveyId("");
      setKeyStatus('unknown');
    }
  }, [open, existingApiKey, existingSurveyId]);

  const validateApiKeyFormat = (key: string): boolean => {
    const trimmedKey = key.trim();
    // Check if it's a valid API key format (should start with "qwa_" and be of reasonable length)
    if (!trimmedKey.startsWith('qwa_') || trimmedKey.length < 20) {
      return false;
    }
    // Check if it contains any curl command text or other non-API key content
    if (trimmedKey.includes('curl') || trimmedKey.includes('http') || trimmedKey.includes('-H') || trimmedKey.includes('--header')) {
      return false;
    }
    return true;
  };

  const validateSurveyIdFormat = (id: string): boolean => {
    const trimmedId = id.trim();
    // Check if it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmedId);
  };

  const testApiCredentials = async (keyToTest: string, surveyIdToTest: string) => {
    if (!keyToTest.trim() || keyToTest.includes('****') || !surveyIdToTest.trim()) {
      toast({
        title: "Invalid Credentials",
        description: "Please enter both a valid API key and Survey ID to test",
        variant: "destructive"
      });
      return false;
    }

    // Validate API key format
    if (!validateApiKeyFormat(keyToTest)) {
      toast({
        title: "Invalid API Key Format",
        description: "API key should start with 'qwa_' and contain only the key value (no curl commands or examples)",
        variant: "destructive"
      });
      return false;
    }

    // Validate Survey ID format
    if (!validateSurveyIdFormat(surveyIdToTest)) {
      toast({
        title: "Invalid Survey ID Format",
        description: "Survey ID should be a valid UUID format (e.g., 9b1c6ac8-7a09-4432-b91c-52f49efc46b4)",
        variant: "destructive"
      });
      return false;
    }

    try {
      setTesting(true);
      console.log('Testing API credentials:', {
        apiKey: keyToTest.substring(0, 8) + '****' + keyToTest.slice(-4),
        surveyId: surveyIdToTest
      });
      
      // Test the API credentials by making a request to the specific survey endpoint
      const response = await fetch(`https://aomwplugkkqtxuhdzufc.supabase.co/functions/v1/get-saved-quota/${surveyIdToTest.trim()}`, {
        method: 'GET',
        headers: {
          'x-api-key': keyToTest.trim(),
          'Content-Type': 'application/json'
        }
      });

      console.log('API test response status:', response.status);

      if (response.ok) {
        setKeyStatus('valid');
        toast({
          title: "API Credentials Valid",
          description: "Your API key and Survey ID are working correctly",
        });
        return true;
      } else if (response.status === 401 || response.status === 403) {
        setKeyStatus('invalid');
        toast({
          title: "API Credentials Invalid",
          description: "The API key or Survey ID is not valid or has been rejected",
          variant: "destructive"
        });
        return false;
      } else if (response.status === 404) {
        setKeyStatus('invalid');
        toast({
          title: "Survey Not Found",
          description: "The Survey ID was not found. Please check that the Survey ID is correct.",
          variant: "destructive"
        });
        return false;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('API credentials test error:', error);
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        setKeyStatus('invalid');
        toast({
          title: "Connection Error",
          description: "Cannot connect to the Quota Generator API. This may be a CORS issue or network problem. Please contact the API provider for support.",
          variant: "destructive"
        });
      } else {
        setKeyStatus('invalid');
        toast({
          title: "API Credentials Test Failed",
          description: "Could not validate the API credentials. Please check your connection and try again.",
          variant: "destructive"
        });
      }
      return false;
    } finally {
      setTesting(false);
    }
  };

  const handleTest = () => {
    testApiCredentials(apiKey, surveyId);
  };

  const handleSave = async () => {
    if (!apiKey.trim() || apiKey.includes('****') || !surveyId.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter both a valid Quota Generator API key and Survey ID",
        variant: "destructive"
      });
      return;
    }

    // Validate formats before saving
    if (!validateApiKeyFormat(apiKey)) {
      toast({
        title: "Invalid API Key Format",
        description: "API key should start with 'qwa_' and contain only the key value (no curl commands or examples)",
        variant: "destructive"
      });
      return;
    }

    if (!validateSurveyIdFormat(surveyId)) {
      toast({
        title: "Invalid Survey ID Format",
        description: "Survey ID should be a valid UUID format",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const cleanApiKey = apiKey.trim();
      const cleanSurveyId = surveyId.trim();
      
      console.log('Saving API credentials:', {
        apiKey: cleanApiKey.substring(0, 8) + '****' + cleanApiKey.slice(-4),
        surveyId: cleanSurveyId
      });
      
      // Test the credentials first
      const isValid = await testApiCredentials(cleanApiKey, cleanSurveyId);
      if (!isValid) {
        return;
      }

      // Save the enhanced API credentials with both API key and Survey ID
      const savedCredentials = await ApiService.saveQuotaGeneratorCredentials(cleanApiKey, cleanSurveyId);
      console.log('API credentials saved successfully:', savedCredentials);
      
      toast({
        title: "API Credentials Saved",
        description: "Your Quota Generator API key and Survey ID have been saved successfully",
      });
      
      // Clear the inputs and trigger parent refresh
      setApiKey("");
      setSurveyId("");
      setKeyStatus('valid');
      
      // Close dialog and notify parent
      onOpenChange(false);
      
      // Trigger parent component refresh with a small delay to ensure the save is complete
      setTimeout(() => {
        console.log('Triggering parent refresh...');
        onApiKeySet();
      }, 100);
      
    } catch (error) {
      console.error('Error saving API credentials:', error);
      toast({
        title: "Save Error",
        description: error instanceof Error ? error.message : "Failed to save API credentials",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setApiKey(newValue);
    setKeyStatus('unknown');
    
    // Clear any previous validation state when user starts typing
    if (newValue.trim() && !newValue.includes('****')) {
      console.log('API key input changed, clearing validation state');
    }
  };

  const handleSurveyIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSurveyId(newValue);
    setKeyStatus('unknown');
    
    console.log('Survey ID input changed, clearing validation state');
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
        return <span className="text-sm text-green-600">API credentials are valid</span>;
      case 'invalid':
        return <span className="text-sm text-red-600">API credentials are invalid</span>;
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
            {existingApiKey ? "Edit Quota Generator API Credentials" : "Configure Quota Generator API"}
          </DialogTitle>
          <DialogDescription>
            {existingApiKey 
              ? "Update your Quota Generator API credentials to continue accessing saved quotas and demographic targeting"
              : "Enter your Quota Generator API key and Survey ID to access saved quotas and generate detailed demographic targeting"
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
              onChange={handleApiKeyChange}
            />
            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
              <strong>API Key:</strong> Paste only the API key (starting with "qwa_"), not curl commands or examples
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="surveyId">Survey ID</Label>
            <Input
              id="surveyId"
              type="text"
              placeholder="9b1c6ac8-7a09-4432-b91c-52f49efc46b4"
              value={surveyId}
              onChange={handleSurveyIdChange}
            />
            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
              <strong>Survey ID:</strong> The UUID identifier for your specific survey/quota project
            </div>
          </div>

          {getStatusText()}
          
          <div className="text-sm text-slate-600 flex items-center">
            <ExternalLink className="h-3 w-3 mr-1" />
            Get your API key and Survey ID from the Quota Generator dashboard
          </div>
          
          {(existingApiKey || existingSurveyId) && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                Current API key: {existingApiKey ? `${existingApiKey.substring(0, 8)}****${existingApiKey.slice(-4)}` : 'Not set'}
              </p>
              <p className="text-sm text-blue-800">
                Current Survey ID: {existingSurveyId || 'Not set'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Enter new credentials above to replace the current ones
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
            disabled={testing || !apiKey.trim() || apiKey.includes('****') || !surveyId.trim()}
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Credentials"
            )}
          </Button>
          <Button onClick={handleSave} disabled={loading || keyStatus === 'invalid'}>
            {loading ? "Saving..." : "Save Credentials"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuotaGeneratorApiKeyDialog;
