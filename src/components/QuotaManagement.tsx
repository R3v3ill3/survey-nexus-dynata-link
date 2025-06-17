import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/apiService";
import { LineItem, Project } from "@/types/database";

interface LineItem {
  id: string;
  projectId: string;
  name: string;
  targeting: {
    country: string;
    ageRange: [number, number];
    gender: string;
    income?: string;
  };
  quota: number;
  completed: number;
  status: "active" | "paused" | "completed" | "overquota";
  costPerComplete: number;
}

interface QuotaManagementProps {
  activeProject: Project | null;
}

const QuotaManagement = ({ activeProject }: QuotaManagementProps) => {
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newLineItem, setNewLineItem] = useState({
    name: "",
    country: "US",
    ageMin: "",
    ageMax: "",
    gender: "All",
    quota: "",
    income: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    if (activeProject?.id) {
      loadLineItems();
      
      // Set up real-time subscription for quota updates
      const quotaSubscription = ApiService.subscribeToQuotaUpdates(
        activeProject.id,
        (payload) => {
          console.log('Quota update received:', payload);
          loadLineItems(); // Refresh line items when quota updates
        }
      );

      return () => {
        quotaSubscription.unsubscribe();
      };
    }
  }, [activeProject?.id]);

  const loadLineItems = async () => {
    if (!activeProject?.id) return;
    
    try {
      setLoading(true);
      const lineItemsData = await ApiService.getLineItems(activeProject.id);
      setLineItems(lineItemsData);
    } catch (error) {
      console.error('Error loading line items:', error);
      toast({
        title: "Error",
        description: "Failed to load line items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLineItem = async () => {
    if (!newLineItem.name || !newLineItem.quota || !activeProject?.id) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const targeting = {
        country: newLineItem.country,
        ageRange: [parseInt(newLineItem.ageMin) || 18, parseInt(newLineItem.ageMax) || 65],
        gender: newLineItem.gender,
        ...(newLineItem.income && { income: newLineItem.income })
      };

      const lineItem = await ApiService.createLineItem(
        activeProject.id,
        newLineItem.name,
        targeting,
        parseInt(newLineItem.quota),
        4.25 + Math.random() * 2 // Random pricing for demo
      );

      setLineItems(prev => [...prev, lineItem]);
      setNewLineItem({
        name: "",
        country: "US", 
        ageMin: "",
        ageMax: "",
        gender: "All",
        quota: "",
        income: ""
      });
      setIsCreateDialogOpen(false);

      toast({
        title: "Line Item Created",
        description: `Successfully created line item: ${lineItem.name}`,
      });
    } catch (error) {
      console.error('Error creating line item:', error);
      toast({
        title: "Error",
        description: "Failed to create line item",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: LineItem["status"]) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "overquota": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: LineItem["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "overquota": return <AlertTriangle className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const calculateProgress = (completed: number, quota: number) => {
    return Math.min((completed / quota) * 100, 100);
  };

  const totalQuota = lineItems.reduce((sum, item) => sum + item.quota, 0);
  const totalCompleted = lineItems.reduce((sum, item) => sum + item.completed, 0);
  const totalCost = lineItems.reduce((sum, item) => sum + (item.completed * (item.cost_per_complete || 0)), 0);

  if (!activeProject) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-slate-500">
            <Target className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>Please select a project to manage line items and quotas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Quota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalQuota.toLocaleString()}</div>
            <div className="text-sm text-slate-500 mt-1">Target responses</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{totalCompleted.toLocaleString()}</div>
            <Progress value={(totalCompleted / totalQuota) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">${totalCost.toFixed(2)}</div>
            <div className="text-sm text-slate-500 mt-1">Current spend</div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-600" />
                Multi-Channel Line Item & Quota Management
              </CardTitle>
              <CardDescription>
                Define targeting criteria and monitor quota fulfillment across all channels
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Line Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Create New Line Item</DialogTitle>
                  <DialogDescription>
                    Define targeting criteria and quota for a new respondent segment
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Line Item Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., US Women 25-45"
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
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
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
                          <SelectItem value="$25k+">$25k+</SelectItem>
                          <SelectItem value="$50k+">$50k+</SelectItem>
                          <SelectItem value="$75k+">$75k+</SelectItem>
                          <SelectItem value="$100k+">$100k+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLineItem}>Create Line Item</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading && lineItems.length === 0 ? (
            <div className="text-center py-8">Loading line items...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line Item</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Targeting</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Cost per Complete</TableHead>
                  <TableHead>Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{item.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.channel_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600">
                        <div>{item.targeting.country} • {item.targeting.gender}</div>
                        <div>Age: {item.targeting.ageRange?.[0] || 18}-{item.targeting.ageRange?.[1] || 65}</div>
                        {item.targeting.income && <div>Income: {item.targeting.income}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1">{item.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{item.completed} / {item.quota}</span>
                          <span>{calculateProgress(item.completed, item.quota).toFixed(0)}%</span>
                        </div>
                        <Progress value={calculateProgress(item.completed, item.quota)} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${(item.cost_per_complete || 0).toFixed(2)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${(item.completed * (item.cost_per_complete || 0)).toFixed(2)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotaManagement;
