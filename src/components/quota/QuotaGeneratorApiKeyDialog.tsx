
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/apiService";
import { Key, ExternalLink } from "lucide-react";

interface QuotaGeneratorApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeySet: () => void;
}

const QuotaGeneratorApiKeyDialog = ({ open, onOpenChange, onApiKeySet }: QuotaGeneratorApiKeyDialogProps) => {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your Quota Generator API key",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2 text-blue-600" />
            Configure Quota Generator API
          </DialogTitle>
          <DialogDescription>
            Enter your Quota Generator API key to access saved quotas and generate detailed demographic targeting
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="qwa_your_api_key_here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <div className="text-sm text-slate-600 flex items-center">
              <ExternalLink className="h-3 w-3 mr-1" />
              Get your API key from the Quota Generator dashboard
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save API Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuotaGeneratorApiKeyDialog;
