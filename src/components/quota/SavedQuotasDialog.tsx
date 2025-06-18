
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/apiService";
import { Download, Calendar, MapPin, Users, Loader2, RefreshCw } from "lucide-react";

interface SavedQuotasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuotaSelected: (quota: any) => void;
}

const SavedQuotasDialog = ({ open, onOpenChange, onQuotaSelected }: SavedQuotasDialogProps) => {
  const [savedQuotas, setSavedQuotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSavedQuotas();
    }
  }, [open]);

  const loadSavedQuotas = async () => {
    try {
      setLoading(true);
      console.log('Loading saved quotas from API...');
      
      const quotasData = await ApiService.listSavedQuotas();
      console.log('Loaded saved quotas:', quotasData);
      
      // Handle both array and single quota responses
      const quotasArray = Array.isArray(quotasData) ? quotasData : [quotasData];
      setSavedQuotas(quotasArray);
      
    } catch (error) {
      console.error('Error loading saved quotas:', error);
      toast({
        title: "Error Loading Saved Quotas",
        description: error instanceof Error ? error.message : "Failed to load saved quotas",
        variant: "destructive"
      });
      setSavedQuotas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadSavedQuotas();
      toast({
        title: "Refreshed",
        description: "Saved quotas list has been updated",
      });
    } catch (error) {
      console.error('Error refreshing saved quotas:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectQuota = (quota: any) => {
    console.log('Selected quota:', quota);
    onQuotaSelected(quota);
    onOpenChange(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  const getGeographyDisplay = (quota: any) => {
    if (quota.geography?.scope) {
      return quota.geography.scope;
    }
    return quota.geography || 'Unknown geography';
  };

  const getQuotaModeDisplay = (quota: any) => {
    return quota.quotaMode || quota.quota_mode || 'Unknown mode';
  };

  const getTotalQuotasDisplay = (quota: any) => {
    return quota.totalQuotas || quota.total_quotas || quota.quotaSegments?.length || 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Download className="h-5 w-5 mr-2 text-blue-600" />
              Saved Quotas
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </DialogTitle>
          <DialogDescription>
            Select from your previously saved quota configurations to import into this project
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-slate-600">Loading saved quotas...</span>
            </div>
          ) : savedQuotas.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Download className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">No Saved Quotas Found</p>
              <p className="text-sm">You haven't saved any quota configurations yet</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {savedQuotas.map((quota, index) => (
                <Card key={quota.id || index} className="cursor-pointer hover:border-blue-300 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {quota.name || quota.title || `Quota Configuration ${index + 1}`}
                        </CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          Created: {formatDate(quota.created_at || quota.createdAt)}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {getTotalQuotasDisplay(quota)} segments
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="text-slate-600">Geography:</span>
                        <span className="ml-1 font-medium">{getGeographyDisplay(quota)}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="text-slate-600">Mode:</span>
                        <span className="ml-1 font-medium">{getQuotaModeDisplay(quota)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button 
                        onClick={() => handleSelectQuota(quota)}
                        size="sm"
                      >
                        Import This Configuration
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

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
