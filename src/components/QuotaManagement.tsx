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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Target, TrendingUp, AlertTriangle, CheckCircle, Settings, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/apiService";
import { QuotaGeneratorService } from "@/services/quotaGeneratorService";
import { 
  LineItem, 
  Project, 
  QuotaConfiguration, 
  QuotaAllocation, 
  SegmentTracking,
  GeographyScope,
  QuotaMode
} from "@/types/database";

interface QuotaManagementProps {
  activeProject: Project | null;
}

const QuotaManagement = ({ activeProject }: QuotaManagementProps) => {
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [quotaConfig, setQuotaConfig] = useState<QuotaConfiguration | null>(null);
  const [quotaAllocations, setQuotaAllocations] = useState<QuotaAllocation[]>([]);
  const [segmentTracking, setSegmentTracking] = useState<SegmentTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isQuotaConfigDialogOpen, setIsQuotaConfigDialogOpen] = useState(false);
  
  const [newLineItem, setNewLineItem] = useState({
    name: "",
    country: "AU", // Changed to Australia
    ageMin: "",
    ageMax: "",
    gender: "All",
    quota: "",
    income: ""
  });

  const [quotaConfigForm, setQuotaConfigForm] = useState({
    geography: "National" as GeographyScope,
    geographyDetail: "",
    quotaMode: "non-interlocking" as QuotaMode,
    targetSampleSize: "1000"
  });

  const { toast } = useToast();

  useEffect(() => {
    if (activeProject?.id) {
      loadProjectData();
      
      // Set up real-time subscription for quota updates
      const quotaSubscription = ApiService.subscribeToQuotaUpdates(
        activeProject.id,
        (payload) => {
          console.log('Quota update received:', payload);
          loadProjectData();
        }
      );

      return () => {
        quotaSubscription.unsubscribe();
      };
    }
  }, [activeProject?.id]);

  const loadProjectData = async () => {
    if (!activeProject?.id) return;
    
    try {
      setLoading(true);
      
      // Load line items
      const lineItemsData = await ApiService.getLineItems(activeProject.id);
      setLineItems(lineItemsData);

      // Load quota configuration
      const quotaConfigData = await ApiService.getQuotaConfiguration(activeProject.id);
      setQuotaConfig(quotaConfigData);

      // Load segment tracking
      const trackingData = await ApiService.getSegmentTracking(activeProject.id);
      setSegmentTracking(trackingData);

      // Load quota allocations for all line items
      const allAllocations: QuotaAllocation[] = [];
      for (const lineItem of lineItemsData) {
        const allocations = await ApiService.getQuotaAllocations(lineItem.id);
        allAllocations.push(...allocations);
      }
      setQuotaAllocations(allAllocations);

    } catch (error) {
      console.error('Error loading project data:', error);
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuotaConfiguration = async () => {
    if (!activeProject?.id) return;

    try {
      setLoading(true);
      
      // Generate quota configuration using the quota generator service
      const generatorConfig = QuotaGeneratorService.generateQuotaConfig(
        quotaConfigForm.geography,
        quotaConfigForm.geographyDetail,
        quotaConfigForm.quotaMode,
        parseInt(quotaConfigForm.targetSampleSize)
      );

      // Generate quota responses
      const quotaResponses = QuotaGeneratorService.generateQuotaResponses(
        generatorConfig,
        parseInt(quotaConfigForm.targetSampleSize)
      );

      // Process with API service
      const result = await ApiService.processQuotaGeneratorConfig(
        activeProject.id,
        generatorConfig,
        quotaResponses
      );

      setQuotaConfig(result.configuration);
      setIsQuotaConfigDialogOpen(false);

      toast({
        title: "Quota Configuration Created",
        description: `Successfully created ${generatorConfig.quotaStructure.totalQuotas} quota segments`,
      });

      loadProjectData();
    } catch (error) {
      console.error('Error creating quota configuration:', error);
      toast({
        title: "Error",
        description: "Failed to create quota configuration",
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
        country: "AU", // Reset to Australia
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

  const getComplexityBadge = (level: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-orange-100 text-orange-800",
      extreme: "bg-red-100 text-red-800"
    };
    return colors[level as keyof typeof colors] || colors.low;
  };

  // Calculate totals
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm font-medium text-slate-600">Total Cost (AUD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">A${totalCost.toFixed(2)}</div>
            <div className="text-sm text-slate-500 mt-1">Current spend</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Quota Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{quotaConfig?.total_quotas || 0}</div>
            <div className="text-sm text-slate-500 mt-1">Active segments</div>
          </CardContent>
        </Card>
      </div>

      {/* Quota Configuration Status */}
      {quotaConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Australian Quota Configuration
            </CardTitle>
            <CardDescription>
              Current quota setup for {quotaConfig.geography_scope} targeting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-600">Geography</Label>
                <div className="text-lg font-semibold">{quotaConfig.geography_scope}</div>
                {quotaConfig.geography_detail && (
                  <div className="text-sm text-slate-500">{quotaConfig.geography_detail}</div>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600">Quota Mode</Label>
                <div className="text-lg font-semibold capitalize">{quotaConfig.quota_mode.replace('-', ' ')}</div>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600">Complexity</Label>
                <Badge className={getComplexityBadge(quotaConfig.complexity_level)}>
                  {quotaConfig.complexity_level}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600">Sample Multiplier</Label>
                <div className="text-lg font-semibold">{quotaConfig.sample_size_multiplier}x</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Management Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="segments">Quota Segments</TabsTrigger>
          <TabsTrigger value="line-items">Line Items</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quota Management Overview</CardTitle>
                  <CardDescription>Australian demographic targeting and quota fulfillment</CardDescription>
                </div>
                {!quotaConfig && (
                  <Dialog open={isQuotaConfigDialogOpen} onOpenChange={setIsQuotaConfigDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Quotas
                      </Button>
                    </DialogTrigger>
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
                        <Button variant="outline" onClick={() => setIsQuotaConfigDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateQuotaConfiguration} disabled={loading}>
                          Generate Quota Structure
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {quotaConfig ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-semibold mb-2">Quota Configuration Active</h3>
                  <p className="text-slate-600">
                    {quotaConfig.total_quotas} quota segments configured for {quotaConfig.geography_scope} targeting
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold mb-2">No Quota Configuration</h3>
                  <p className="text-slate-600 mb-4">
                    Configure demographic quotas to start sophisticated Australian targeting
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle>Quota Segments Performance</CardTitle>
              <CardDescription>Real-time tracking of demographic segment performance</CardDescription>
            </CardHeader>
            <CardContent>
              {segmentTracking.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Target %</TableHead>
                      <TableHead>Current Count</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Cost (AUD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segmentTracking.map((tracking) => (
                      <TableRow key={tracking.id}>
                        <TableCell>
                          <div className="font-medium">
                            {tracking.segment?.segment_name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {tracking.segment?.segment_code}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {tracking.segment?.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tracking.segment?.population_percent?.toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          {tracking.current_count}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={tracking.completion_rate * 100} 
                              className="w-20 h-2" 
                            />
                            <span className="text-sm">
                              {(tracking.completion_rate * 100).toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          A${tracking.cost_tracking.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-600">No segment tracking data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="line-items">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2 text-blue-600" />
                    Australian Line Item Management
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
                      <TableHead>Cost per Complete (AUD)</TableHead>
                      <TableHead>Total Cost (AUD)</TableHead>
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
                            <div>{item.targeting.country || 'AU'} • {item.targeting.gender}</div>
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
                          <div className="font-medium">A${(item.cost_per_complete || 0).toFixed(2)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">A${(item.completed * (item.cost_per_complete || 0)).toFixed(2)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuotaManagement;
