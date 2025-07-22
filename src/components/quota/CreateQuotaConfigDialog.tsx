import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/apiService";
import { GeographyScope, QuotaMode } from "@/types/database";
import { Settings, Database, Zap, Check, AlertTriangle, Edit, Key } from "lucide-react";
import QuotaGeneratorApiKeyDialog from "./QuotaGeneratorApiKeyDialog";
import SavedQuotasDialog from "./SavedQuotasDialog";

// Type for API credentials
interface ApiCredentials {
  api_key: string;
  survey_id?: string;
  [key: string]: any;
}

interface CreateQuotaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: any) => void;
  loading: boolean;
}

const CreateQuotaConfigDialog = ({ open, onOpenChange, onSubmit, loading }: CreateQuotaConfigDialogProps) => {
  const [activeTab, setActiveTab] = useState("saved");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'valid' | 'invalid' | 'not_set'>('not_set');
  const [currentApiKey, setCurrentApiKey] = useState<string>("");
  const [currentSurveyId, setCurrentSurveyId] = useState<string>("");
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showSavedQuotasDialog, setShowSavedQuotasDialog] = useState(false);
  const [credentialsRefreshKey, setCredentialsRefreshKey] = useState(0);
  const { toast } = useToast();

  const [quotaConfigForm, setQuotaConfigForm] = useState({
    geography: "National" as GeographyScope,
    geographyDetail: "",
    quotaMode: "non-interlocking" as QuotaMode,
    targetSampleSize: "1000",
    useApi: false
  });

  useEffect(() => {
    if (open) {
      console.log('Dialog opened, checking API credentials status...');
      checkApiKeyStatus();
    }
  }, [open, credentialsRefreshKey]);

  const checkApiKeyStatus = async () => {
    try {
      console.log('Fetching API credentials...');
      const credentials = await ApiService.checkQuotaGeneratorCredentials();
      
      if (credentials?.credentials) {
        const creds = credentials.credentials as any;
        console.log('Found credentials:', { 
          hasApiKey: creds.api_key ? 'Yes' : 'No',
          hasSurveyId: creds.survey_id ? 'Yes' : 'No'
        });
        
        if (creds.api_key && creds.api_key.startsWith('qwa_')) {
          setHasApiKey(true);
          setCurrentApiKey(creds.api_key);
          setCurrentSurveyId(creds.survey_id || "");
          setApiKeyStatus('valid');
          console.log('API credentials status: valid');
        } else {
          console.log('Invalid API key format found, clearing...');
          setHasApiKey(false);
          setCurrentApiKey("");
          setCurrentSurveyId("");
          setApiKeyStatus('not_set');
        }
      } else {
        console.log('No credentials found');
        setHasApiKey(false);
        setCurrentApiKey("");
        setCurrentSurveyId("");
        setApiKeyStatus('not_set');
      }
    } catch (error) {
      console.error('Error checking API credentials status:', error);
      setHasApiKey(false);
      setCurrentApiKey("");
      setCurrentSurveyId("");
      setApiKeyStatus('not_set');
    }
  };

  const handleApiError = (error: any) => {
    console.error('API Error:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('401') || error.message?.includes('403') || 
        error.message?.includes('API key') || error.message?.includes('authentication')) {
      setApiKeyStatus('invalid');
      toast({
        title: "API Key Invalid",
        description: "Your API key has been rejected. Please update your credentials.",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => setShowApiKeyDialog(true)}>
            Update Key
          </Button>
        )
      });
    } else if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the Quota Generator API. This may be a CORS issue - please contact the API provider.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "API Error",
        description: error.message || "Failed to generate quotas from API. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGenerateWithAPI = async () => {
    if (!hasApiKey || apiKeyStatus !== 'valid') {
      setShowApiKeyDialog(true);
      return;
    }

    try {
      const apiResponse = await ApiService.generateQuotasFromAPI({
        geography: quotaConfigForm.geography,
        geographyDetail: quotaConfigForm.geographyDetail || undefined,
        quotaMode: quotaConfigForm.quotaMode,
        sampleSize: parseInt(quotaConfigForm.targetSampleSize)
      });

      onSubmit({
        ...quotaConfigForm,
        useApi: true,
        apiResponse
      });
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleSubmitLocal = () => {
    onSubmit({
      ...quotaConfigForm,
      useApi: false
    });
  };

  const handleSavedQuotaSelect = (fullQuotaData: any) => {
    console.log('Processing full quota data:', fullQuotaData);
    
    // Extract quota configuration details from the full data
    const quotaConfig = {
      geography: fullQuotaData.geography?.scope || "National",
      geographyDetail: fullQuotaData.geography?.detail || fullQuotaData.geography?.state || "",
      quotaMode: fullQuotaData.quotaMode || "non-interlocking",
      targetSampleSize: fullQuotaData.sampleSize?.toString() || fullQuotaData.targetSampleSize?.toString() || "1000",
      useApi: true,
      savedQuota: fullQuotaData
    };
    
    console.log('Processed quota config:', quotaConfig);
    onSubmit(quotaConfig);
  };

  const handleApiKeySet = () => {
    console.log('API credentials set callback triggered, refreshing credentials...');
    setCredentialsRefreshKey(prev => prev + 1);
    
    // Force a refresh after a short delay to ensure the save is complete
    setTimeout(() => {
      checkApiKeyStatus();
    }, 200);
  };

  const getApiKeyStatusDisplay = () => {
    switch (apiKeyStatus) {
      case 'valid':
        return (
          <div className="flex items-center text-green-600 text-sm">
            <Check className="h-4 w-4 mr-1" />
            API credentials configured and valid
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2 h-6 px-2" 
              onClick={() => setShowApiKeyDialog(true)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        );
      case 'invalid':
        return (
          <div className="flex items-center text-red-600 text-sm">
            <AlertTriangle className="h-4 w-4 mr-1" />
            API credentials invalid or rejected
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2 h-6 px-2" 
              onClick={() => setShowApiKeyDialog(true)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Fix
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-slate-600 text-sm">
            <Key className="h-4 w-4 mr-1" />
            No API credentials configured
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2 h-6 px-2" 
              onClick={() => setShowApiKeyDialog(true)}
            >
              Configure
            </Button>
          </div>
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Configure Australian Quota Structure</DialogTitle>
            <DialogDescription>
              Generate detailed demographic quotas using Australian census data
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="saved" className="flex items-center">
                <Database className="h-4 w-4 mr-1" />
                Saved Quotas
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center">
                <Zap className="h-4 w-4 mr-1" />
                Import XML
              </TabsTrigger>
              <TabsTrigger value="local" className="flex items-center">
                <Settings className="h-4 w-4 mr-1" />
                Basic Setup
              </TabsTrigger>
            </TabsList>

            <TabsContent value="import" className="space-y-4">
              <div className="text-center py-8">
                <Zap className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold mb-2">Import XML Configuration</h3>
                <p className="text-slate-600 mb-4">
                  Upload an XML file containing quota configuration data
                </p>
                <input
                  type="file"
                  accept=".xml"
                  className="hidden"
                  id="xml-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const xmlContent = event.target?.result as string;
                          // Here you would parse the XML and extract quota data
                          toast({
                            title: "XML Import",
                            description: "XML import functionality coming soon",
                          });
                        } catch (error) {
                          toast({
                            title: "Import Error",
                            description: "Failed to parse XML file",
                            variant: "destructive"
                          });
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
                <Button 
                  onClick={() => document.getElementById('xml-upload')?.click()}
                  variant="outline"
                >
                  Select XML File
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  Supports standard quota XML formats
                </p>
              </div>
            </TabsContent>

            <TabsContent value="saved" className="space-y-4">
              {apiKeyStatus === 'valid' ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                  <h3 className="text-lg font-semibold mb-2">Load Saved Quota Configuration</h3>
                  <p className="text-slate-600 mb-4">
                    Select from your previously saved quota configurations with detailed demographic breakdowns
                  </p>
                  <Button onClick={() => setShowSavedQuotasDialog(true)}>
                    Browse Saved Quotas
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <Database className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold mb-2">API Setup Required</h3>
                  <p className="text-slate-600 mb-4">
                    Configure your Quota Generator API credentials to access saved quota configurations
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center text-amber-800">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      <span className="font-medium">API credentials not configured</span>
                    </div>
                    <p className="text-amber-700 text-sm mt-1">
                      You need to set up your API key to access saved quota configurations
                    </p>
                  </div>
                  <Button onClick={() => setShowApiKeyDialog(true)}>
                    <Key className="h-4 w-4 mr-2" />
                    Configure API Key
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="local" className="space-y-4">
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                Basic quota setup using simplified demographic targeting (fallback mode)
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Geography Scope</Label>
                  <Select 
                    value={quotaConfigForm.geography} 
                    onValueChange={(value: GeographyScope) => setQuotaConfigForm(prev => ({ ...prev, geography: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="National">National</SelectItem>
                      <SelectItem value="State">State</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Target Sample Size</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={quotaConfigForm.targetSampleSize}
                    onChange={(e) => setQuotaConfigForm(prev => ({ ...prev, targetSampleSize: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {activeTab === "local" && (
              <Button onClick={handleSubmitLocal} disabled={loading}>
                {loading ? "Creating..." : "Create Basic Structure"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuotaGeneratorApiKeyDialog
        open={showApiKeyDialog}
        onOpenChange={setShowApiKeyDialog}
        onApiKeySet={handleApiKeySet}
        existingApiKey={currentApiKey}
        existingSurveyId={currentSurveyId}
      />

      <SavedQuotasDialog
        open={showSavedQuotasDialog}
        onOpenChange={setShowSavedQuotasDialog}
        onQuotaSelected={handleSavedQuotaSelect}
      />
    </>
  );
};

export default CreateQuotaConfigDialog;
