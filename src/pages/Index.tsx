
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, MessageSquare, Mic, Globe, Plus, Settings, Activity } from "lucide-react";
import ProjectManagement from "@/components/ProjectManagement";
import AuthenticationModule from "@/components/AuthenticationModule";
import ResponseCollection from "@/components/ResponseCollection";
import QuotaManagement from "@/components/QuotaManagement";

const Index = () => {
  const [activeProject, setActiveProject] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const channelStats = [
    { name: "Online (Dynata)", count: 1247, percentage: 45, icon: Globe, color: "bg-blue-500" },
    { name: "SMS", count: 983, percentage: 35, icon: MessageSquare, color: "bg-green-500" },
    { name: "Voice", count: 556, percentage: 20, icon: Mic, color: "bg-purple-500" },
  ];

  const projectMetrics = {
    totalProjects: 12,
    activeProjects: 3,
    completedResponses: 2786,
    quotaFulfillment: 78
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Multi-Modal Polling Platform</h1>
                <p className="text-slate-600">Dynata Integration Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant={isAuthenticated ? "default" : "destructive"}>
                {isAuthenticated ? "Connected" : "Disconnected"}
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{projectMetrics.totalProjects}</div>
              <div className="flex items-center mt-2">
                <Activity className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+2 this month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{projectMetrics.activeProjects}</div>
              <div className="text-sm text-slate-500 mt-2">Currently running</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{projectMetrics.completedResponses.toLocaleString()}</div>
              <div className="text-sm text-slate-500 mt-2">Across all channels</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Quota Fulfillment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{projectMetrics.quotaFulfillment}%</div>
              <Progress value={projectMetrics.quotaFulfillment} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Channel Distribution */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Response Distribution by Channel
            </CardTitle>
            <CardDescription>Real-time response collection across all polling channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {channelStats.map((channel) => (
                <div key={channel.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${channel.color}`}>
                      <channel.icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{channel.name}</div>
                      <div className="text-sm text-slate-500">{channel.count} responses</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Progress value={channel.percentage} className="w-24" />
                    <span className="text-sm font-medium text-slate-600">{channel.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Interface */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="projects">Project Management</TabsTrigger>
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
            <TabsTrigger value="quotas">Quota Management</TabsTrigger>
            <TabsTrigger value="responses">Response Collection</TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <ProjectManagement 
              isAuthenticated={isAuthenticated}
              activeProject={activeProject}
              setActiveProject={setActiveProject}
            />
          </TabsContent>

          <TabsContent value="authentication">
            <AuthenticationModule 
              isAuthenticated={isAuthenticated}
              setIsAuthenticated={setIsAuthenticated}
            />
          </TabsContent>

          <TabsContent value="quotas">
            <QuotaManagement activeProject={activeProject} />
          </TabsContent>

          <TabsContent value="responses">
            <ResponseCollection activeProject={activeProject} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
