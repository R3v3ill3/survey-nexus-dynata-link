
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CreateLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (lineItem: any) => void;
}

const CreateLineItemDialog = ({ open, onOpenChange, onSubmit }: CreateLineItemDialogProps) => {
  const [newLineItem, setNewLineItem] = useState({
    name: "",
    country: "AU",
    ageMin: "",
    ageMax: "",
    gender: "All",
    quota: "",
    income: ""
  });

  const handleSubmit = () => {
    onSubmit(newLineItem);
    setNewLineItem({
      name: "",
      country: "AU",
      ageMin: "",
      ageMax: "",
      gender: "All",
      quota: "",
      income: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Australian Line Item</DialogTitle>
          <DialogDescription>
            Define targeting criteria and quota for Australian respondent segment
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Line Item Name *</Label>
            <Input
              id="name"
              placeholder="e.g., AU Women 25-45"
              value={newLineItem.name}
              onChange={(e) => setNewLineItem(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={newLineItem.country} onValueChange={(value) => setNewLineItem(prev => ({ ...prev, country: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={newLineItem.gender} onValueChange={(value) => setNewLineItem(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ageMin">Min Age</Label>
              <Input
                id="ageMin"
                type="number"
                placeholder="18"
                value={newLineItem.ageMin}
                onChange={(e) => setNewLineItem(prev => ({ ...prev, ageMin: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ageMax">Max Age</Label>
              <Input
                id="ageMax"
                type="number"
                placeholder="65"
                value={newLineItem.ageMax}
                onChange={(e) => setNewLineItem(prev => ({ ...prev, ageMax: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quota">Quota *</Label>
              <Input
                id="quota"
                type="number"
                placeholder="300"
                value={newLineItem.quota}
                onChange={(e) => setNewLineItem(prev => ({ ...prev, quota: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income">Income (Optional)</Label>
              <Select value={newLineItem.income} onValueChange={(value) => setNewLineItem(prev => ({ ...prev, income: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select income" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  <SelectItem value="A$40k+">A$40k+</SelectItem>
                  <SelectItem value="A$60k+">A$60k+</SelectItem>
                  <SelectItem value="A$80k+">A$80k+</SelectItem>
                  <SelectItem value="A$100k+">A$100k+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Line Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLineItemDialog;
