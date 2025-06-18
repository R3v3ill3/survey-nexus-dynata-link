
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
  [key: string]: any;
}

interface CreateQuotaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: any) => void;
  loading: boolean;
}

const CreateQuotaConfigDialog = ({ open, onOpenChange, onSubmit, loading }: CreateQuotaConfigDialogProps) => {
  const [activeTab, setActiveTab] = useState("generate");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'valid' | 'invalid' | 'not_set'>('not_set');
  const [currentApiKey, setCurrentApiKey] = useState<string>("");
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showSavedQuotasDialog, setShowSavedQuotasDialog] = useState(false);
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
      checkApiKeyStatus();
    }
  }, [open]);

  const checkApiKeyStatus = async () => {
    try {
      const credentials = await ApiService.checkQuotaGeneratorCredentials();
      if (credentials?.credentials) {
        const creds = credentials.credentials as ApiCredentials;
        if (creds.api_key) {
          setHasApiKey(true);
          setCurrentApiKey(creds.api_key);
          setApiKeyStatus('valid');
        } else {
          setHasApiKey(false);
          setApiKeyStatus('not_set');
        }
      } else {
        setHasApiKey(false);
        setApiKeyStatus('not_set');
      }
    } catch (error) {
      setHasApiKey(false);
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
        description: "Unable to connect to the Quota Generator API. This may be a temporary issue.",
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

  const handleSavedQuotaSelect = (savedQuota: any) => {
    onSubmit({
      geography: savedQuota.geography?.scope || "National",
      geographyDetail: savedQuota.geography?.detail || "",
      quotaMode: savedQuota.quotaMode || "non-interlocking",
      targetSampleSize: savedQuota.sampleSize?.toString() || "1000",
      useApi: true,
      savedQuota: savedQuota
    });
  };

  const getApiKeyStatusDisplay = () => {
    switch (apiKeyStatus) {
      case 'valid':
        return (
          <div className="flex items-center text-green-600 text-sm">
            <Check className="h-4 w-4 mr-1" />
            API key configured and valid
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
            API key invalid or rejected
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
            No API key configured
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
              <TabsTrigger value="generate" className="flex items-center">
                <Zap className="h-4 w-4 mr-1" />
                Generate New
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center">
                <Database className="h-4 w-4 mr-1" />
                Saved Quotas
              </TabsTrigger>
              <TabsTrigger value="local" className="flex items-center">
                <Settings className="h-4 w-4 mr-1" />
                Basic Setup
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                Generate sophisticated quota structures using the Quota Generator API with real Australian demographic data
              </div>

              {/* API Key Status Display */}
              <div className="bg-slate-50 p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">API Configuration</span>
                  {getApiKeyStatusDisplay()}
                </div>
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
                      <SelectItem value="Federal Electorate">Federal Electorate</SelectItem>
                      <SelectItem value="State Electorate">State Electorate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {(quotaConfigForm.geography === 'State' || quotaConfigForm.geography.includes('Electorate')) && (
                  <div className="space-y-2">
                    <Label>
                      {quotaConfigForm.geography === 'State' ? 'State' : 'Electorate Name'}
                    </Label>
                    <Input
                      placeholder={quotaConfigForm.geography === 'State' ? 'NSW, VIC, QLD, etc.' : 'Enter electorate name'}
                      value={quotaConfigForm.geographyDetail}
                      onChange={(e) => setQuotaConfigForm(prev => ({ ...prev, geographyDetail: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quota Mode</Label>
                  <Select 
                    value={quotaConfigForm.quotaMode}
                    onValueChange={(value: QuotaMode) => setQuotaConfigForm(prev => ({ ...prev, quotaMode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non-interlocking">Non-Interlocking (Simple)</SelectItem>
                      <SelectItem value="age-gender-location">Age/Gender + Location</SelectItem>
                      <SelectItem value="age-gender-state">Age/Gender + State</SelectItem>
                      <SelectItem value="state-location">State + Location</SelectItem>
                      <SelectItem value="full-interlocking">Full Interlocking (Complex)</SelectItem>
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

            <TabsContent value="saved" className="space-y-4">
              <div className="text-center py-8">
                <Database className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold mb-2">Load Saved Quota Configuration</h3>
                <p className="text-slate-600 mb-4">
                  Select from your previously saved quota configurations with detailed demographic breakdowns
                </p>
                <Button 
                  onClick={() => setShowSavedQuotasDialog(true)}
                  disabled={apiKeyStatus !== 'valid'}
                >
                  {apiKeyStatus === 'valid' ? "Browse Saved Quotas" : "API Key Required"}
                </Button>
                {apiKeyStatus !== 'valid' && (
                  <div className="mt-3">
                    {getApiKeyStatusDisplay()}
                  </div>
                )}
              </div>
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
            {activeTab === "generate" ? (
              <Button onClick={handleGenerateWithAPI} disabled={loading || apiKeyStatus !== 'valid'}>
                {loading ? "Generating..." : "Generate with API"}
              </Button>
            ) : activeTab === "local" ? (
              <Button onClick={handleSubmitLocal} disabled={loading}>
                {loading ? "Creating..." : "Create Basic Structure"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuotaGeneratorApiKeyDialog
        open={showApiKeyDialog}
        onOpenChange={setShowApiKeyDialog}
        onApiKeySet={() => {
          setHasApiKey(true);
          setApiKeyStatus('valid');
          checkApiKeyStatus();
        }}
        existingApiKey={currentApiKey}
      />

      <SavedQuotasDialog
        open={showSavedQuotasDialog}
        onOpenChange={setShowSavedQuotasDialog}
        onQuotaSelect={handleSavedQuotaSelect}
      />
    </>
  );
};

export default CreateQuotaConfigDialog;
