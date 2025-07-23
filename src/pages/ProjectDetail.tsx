
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  FileText, 
  Target, 
  Settings, 
  Activity,
  Calendar,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SurveyManagement } from "@/components/SurveyManagement";
import QuotaManagement from "@/components/QuotaManagement";
import { Project } from "@/types/database";

interface Survey {
  id: string;
  title: string;
  status: string;
  external_platform: string;
}

interface LineItem {
  id: string;
  name: string;
  channel_type: string;
  quota: number;
  completed: number;
  status: string;
}

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (id) {
      fetchProjectData();
    }
  }, [user, id, navigate]);

  const fetchProjectData = async () => {
    if (!user || !id) return;

    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (projectError) throw projectError;
      setProject({
        ...projectData,
        settings: projectData.settings as Record<string, any>
      });

      // Fetch surveys
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("*")
        .eq("project_id", id);

      if (surveyError) throw surveyError;
      setSurveys(surveyData || []);

      // Fetch line items
      const { data: lineItemData, error: lineItemError } = await supabase
        .from("line_items")
        .select("*")
        .eq("project_id", id);

      if (lineItemError) throw lineItemError;
      setLineItems(lineItemData || []);

    } catch (error) {
      console.error("Error fetching project data:", error);
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Project not found</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </div>

        {/* Project Overview */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {project.title}
              </h1>
              <p className="text-muted-foreground text-lg">
                {project.description || "No description"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDate(project.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              <span>Updated {formatDate(project.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Surveys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{surveys.length}</div>
              <p className="text-sm text-muted-foreground">Active surveys</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lineItems.length}</div>
              <p className="text-sm text-muted-foreground">Quota segments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lineItems.reduce((acc, item) => acc + item.completed, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total responses</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="surveys" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Surveys
            </TabsTrigger>
            <TabsTrigger value="quotas" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Quotas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Survey Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Survey Summary
                  </CardTitle>
                  <CardDescription>
                    Quick overview of imported surveys
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {surveys.length > 0 ? (
                    <div className="space-y-2">
                      {surveys.slice(0, 3).map((survey) => (
                        <div 
                          key={survey.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{survey.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {survey.external_platform}
                            </div>
                          </div>
                          <Badge variant="outline" className={getStatusColor(survey.status)}>
                            {survey.status}
                          </Badge>
                        </div>
                      ))}
                      {surveys.length > 3 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          +{surveys.length - 3} more surveys
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No surveys imported yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Quota Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Quota Summary
                  </CardTitle>
                  <CardDescription>
                    Line items and quota progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lineItems.length > 0 ? (
                    <div className="space-y-2">
                      {lineItems.slice(0, 3).map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.completed} / {item.quota} completed
                            </div>
                          </div>
                          <Badge variant="outline">
                            {item.channel_type}
                          </Badge>
                        </div>
                      ))}
                      {lineItems.length > 3 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          +{lineItems.length - 3} more line items
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No line items created yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="surveys" className="space-y-6">
            <SurveyManagement project={project} />
          </TabsContent>

          <TabsContent value="quotas" className="space-y-6">
            <QuotaManagement activeProject={project} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDetail;
