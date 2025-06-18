
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/apiService";
import { Database, Loader2 } from "lucide-react";

interface SavedQuotasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuotaSelect: (quota: any) => void;
}

const SavedQuotasDialog = ({ open, onOpenChange, onQuotaSelect }: SavedQuotasDialogProps) => {
  const [savedQuotas, setSavedQuotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuota, setSelectedQuota] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSavedQuotas();
    }
  }, [open]);

  const loadSavedQuotas = async () => {
    try {
      setLoading(true);
      const quotas = await ApiService.listSavedQuotas();
      setSavedQuotas(quotas.quotas || []);
    } catch (error) {
      console.error('Error loading saved quotas:', error);
      toast({
        title: "Error",
        description: "Failed to load saved quotas. Please check your API key configuration.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuota = async (quota: any) => {
    try {
      setLoading(true);
      const fullQuota = await ApiService.getSavedQuota(quota.id);
      onQuotaSelect(fullQuota);
      onOpenChange(false);
    } catch (error) {
      console.error('Error loading quota details:', error);
      toast({
        title: "Error",
        description: "Failed to load quota details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-600" />
            Saved Quota Configurations
          </DialogTitle>
          <DialogDescription>
            Select from your previously saved quota configurations
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] w-full">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading saved quotas...
            </div>
          ) : savedQuotas.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No saved quotas found</p>
              <p className="text-sm">Generate and save quotas to see them here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedQuotas.map((quota) => (
                <Card 
                  key={quota.id} 
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleSelectQuota(quota)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {quota.name || `${quota.geography?.scope || 'National'} - ${quota.quotaMode || 'Standard'}`}
                        </CardTitle>
                        <CardDescription>
                          {quota.description || `Created ${new Date(quota.created_at || Date.now()).toLocaleDateString()}`}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {quota.totalQuotas || 0} segments
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Geography:</span>
                        <div className="text-slate-600">
                          {quota.geography?.scope || 'National'}
                          {quota.geography?.detail && ` - ${quota.geography.detail}`}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Mode:</span>
                        <div className="text-slate-600 capitalize">
                          {(quota.quotaMode || 'standard').replace('-', ' ')}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Sample Size:</span>
                        <div className="text-slate-600">
                          {quota.sampleSize?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SavedQuotasDialog;
