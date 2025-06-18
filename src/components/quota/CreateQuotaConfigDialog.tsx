
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuotaGeneratorService } from "@/services/quotaGeneratorService";
import { GeographyScope, QuotaMode } from "@/types/database";

interface CreateQuotaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: any) => void;
  loading: boolean;
}

const CreateQuotaConfigDialog = ({ open, onOpenChange, onSubmit, loading }: CreateQuotaConfigDialogProps) => {
  const [quotaConfigForm, setQuotaConfigForm] = useState({
    geography: "National" as GeographyScope,
    geographyDetail: "",
    quotaMode: "non-interlocking" as QuotaMode,
    targetSampleSize: "1000"
  });

  const handleSubmit = () => {
    onSubmit(quotaConfigForm);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configure Australian Quota Structure</DialogTitle>
          <DialogDescription>
            Set up demographic quotas using Australian census data and targeting options
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
            <div className="text-sm text-slate-600">
              {QuotaGeneratorService.getComplexityInfo(quotaConfigForm.quotaMode).description}
            </div>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            Generate Quota Structure
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuotaConfigDialog;
