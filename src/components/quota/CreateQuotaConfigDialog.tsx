
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
import { Settings, Database, Zap } from "lucide-react";
import QuotaGeneratorApiKeyDialog from "./QuotaGeneratorApiKeyDialog";
import SavedQuotasDialog from "./SavedQuotasDialog";

interface CreateQuotaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: any) => void;
  loading: boolean;
}

const CreateQuotaConfigDialog = ({ open, onOpenChange, onSubmit, loading }: CreateQuotaConfigDialogProps) => {
  const [activeTab, setActiveTab] = useState("generate");
  const [hasApiKey, setHasApiKey] = useState(false);
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
      setHasApiKey(!!credentials?.credentials?.api_key);
    } catch (error) {
      setHasApiKey(false);
    }
  };

  const handleGenerateWithAPI = async () => {
    if (!hasApiKey) {
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
      console.error('Error generating quotas from API:', error);
      toast({
        title: "API Error",
        description: "Failed to generate quotas from API. Please check your configuration.",
        variant: "destructive"
      });
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

              {!hasApiKey && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    API key required for advanced quota generation. 
                    <Button variant="link" className="p-0 h-auto text-yellow-800" onClick={() => setShowApiKeyDialog(true)}>
                      Configure API key
                    </Button>
                  </p>
                </div>
              )}
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
                  disabled={!hasApiKey}
                >
                  {hasApiKey ? "Browse Saved Quotas" : "API Key Required"}
                </Button>
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
              <Button onClick={handleGenerateWithAPI} disabled={loading || !hasApiKey}>
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
          checkApiKeyStatus();
        }}
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
