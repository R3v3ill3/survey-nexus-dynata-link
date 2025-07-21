
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/apiService";
import { QuotaGeneratorService } from "@/services/quotaGeneratorService";
import { 
  LineItem, 
  Project, 
  QuotaConfiguration, 
  QuotaAllocation, 
  SegmentTracking
} from "@/types/database";

// Import new components
import QuotaSummaryCards from "./quota/QuotaSummaryCards";
import QuotaConfigurationCard from "./quota/QuotaConfigurationCard";
import QuotaSegmentsTable from "./quota/QuotaSegmentsTable";
import LineItemsTable from "./quota/LineItemsTable";
import CreateLineItemDialog from "./quota/CreateLineItemDialog";
import CreateQuotaConfigDialog from "./quota/CreateQuotaConfigDialog";

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
      if (quotaConfigData) {
        setQuotaConfig(quotaConfigData);
      }

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

  const handleCreateQuotaConfiguration = async (quotaConfigForm: any) => {
    if (!activeProject?.id) return;

    try {
      setLoading(true);
      
      if (quotaConfigForm.useApi && quotaConfigForm.apiResponse) {
        // Process API-generated quota configuration
        const result = await ApiService.processQuotaGeneratorAPIResponse(
          activeProject.id,
          quotaConfigForm.apiResponse
        );

        setQuotaConfig(result.configuration);
        setIsQuotaConfigDialogOpen(false);

        toast({
          title: "Quota Configuration Created",
          description: `Successfully created ${result.configuration.total_quotas} quota segments from API`,
        });

        // Reload all project data to ensure consistency
        await loadProjectData();
      } else if (quotaConfigForm.savedQuota) {
        // Process saved quota configuration
        const result = await ApiService.processQuotaGeneratorAPIResponse(
          activeProject.id,
          quotaConfigForm.savedQuota
        );

        setQuotaConfig(result.configuration);
        setIsQuotaConfigDialogOpen(false);

        toast({
          title: "Quota Configuration Loaded",
          description: `Successfully loaded saved quota configuration`,
        });

        // Reload all project data to ensure consistency
        await loadProjectData();
      } else {
        // Generate quota configuration using the quota generator service
        const generatorConfig = QuotaGeneratorService.generateQuotaConfig(
          quotaConfigForm.geography,
          quotaConfigForm.geography === 'State' || quotaConfigForm.geography.includes('Electorate') 
            ? quotaConfigForm.geographyDetail 
            : undefined,
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

        // Reload all project data to ensure consistency
        await loadProjectData();
      }
    } catch (error) {
      console.error('Error creating quota configuration:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create quota configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLineItem = async (newLineItem: any) => {
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
      <QuotaSummaryCards 
        lineItems={lineItems} 
        quotaSegmentsCount={quotaConfig?.total_quotas || 0}
      />

      {/* Quota Configuration Status */}
      <QuotaConfigurationCard 
        quotaConfig={quotaConfig} 
        onConfigureClick={() => setIsQuotaConfigDialogOpen(true)}
      />

      {/* Main Management Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="segments">Quota Segments</TabsTrigger>
          <TabsTrigger value="line-items">Line Items</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <QuotaConfigurationCard 
            quotaConfig={quotaConfig} 
            onConfigureClick={() => setIsQuotaConfigDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="segments">
          <QuotaSegmentsTable segmentTracking={segmentTracking} />
        </TabsContent>

        <TabsContent value="line-items">
          <LineItemsTable 
            lineItems={lineItems}
            loading={loading}
            onCreateClick={() => setIsCreateDialogOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateLineItemDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateLineItem}
      />

      <CreateQuotaConfigDialog
        open={isQuotaConfigDialogOpen}
        onOpenChange={setIsQuotaConfigDialogOpen}
        onSubmit={handleCreateQuotaConfiguration}
        loading={loading}
      />
    </div>
  );
};

export default QuotaManagement;
