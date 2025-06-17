
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Download, Database, BarChart3, Eye, RefreshCw, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Response {
  id: string;
  respondentId: string;
  lineItemId: string;
  projectId: string;
  channel: "Dynata" | "SMS" | "Voice";
  completedAt: string;
  duration: number;
  status: "complete" | "partial" | "terminated";
  qualityScore: number;
}

interface ResponseCollectionProps {
  activeProject: any;
}

const ResponseCollection = ({ activeProject }: ResponseCollectionProps) => {
  const [responses, setResponses] = useState<Response[]>([
    {
      id: "resp_001",
      respondentId: "dyn_847291",
      lineItemId: "li_001", 
      projectId: "proj_001",
      channel: "Dynata",
      completedAt: "2024-01-20T14:32:00Z",
      duration: 847,
      status: "complete",
      qualityScore: 95
    },
    {
      id: "resp_002",
      respondentId: "dyn_384756",
      lineItemId: "li_002",
      projectId: "proj_001", 
      channel: "Dynata",
      completedAt: "2024-01-20T15:18:00Z",
      duration: 623,
      status: "complete",
      qualityScore: 88
    },
    {
      id: "resp_003",
      respondentId: "sms_192847",
      lineItemId: "li_001",
      projectId: "proj_001",
      channel: "SMS",
      completedAt: "2024-01-20T16:05:00Z", 
      duration: 1205,
      status: "partial",
      qualityScore: 72
    },
    {
      id: "resp_004",
      respondentId: "voice_573829",
      lineItemId: "li_003",
      projectId: "proj_001",
      channel: "Voice",
      completedAt: "2024-01-20T17:22:00Z",
      duration: 456,
      status: "complete",
      qualityScore: 91
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<Response | null>(null);

  const { toast } = useToast();

  const handleRefreshData = async () => {
    setIsLoading(true);
    console.log("Refreshing response data from Dynata API...");

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Data Refreshed",
        description: "Successfully retrieved latest response data from Dynata",
      });
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    console.log("Exporting response data...");
    
    // Create CSV data
    const csvData = responses.map(response => ({
      ID: response.id,
      RespondentID: response.respondentId,
      Channel: response.channel,
      Status: response.status,
      Duration: response.duration,
      QualityScore: response.qualityScore,
      CompletedAt: response.completedAt
    }));

    // Convert to CSV string
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `responses_${activeProject?.id || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: "Export Complete",
      description: "Response data has been exported to CSV",
    });
  };

  const getStatusColor = (status: Response["status"]) => {
    switch (status) {
      case "complete": return "bg-green-100 text-green-800";
      case "partial": return "bg-yellow-100 text-yellow-800";
      case "terminated": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getChannelColor = (channel: Response["channel"]) => {
    switch (channel) {
      case "Dynata": return "bg-blue-100 text-blue-800";
      case "SMS": return "bg-green-100 text-green-800";
      case "Voice": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const calculateAverageQuality = () => {
    const completeResponses = responses.filter(r => r.status === "complete");
    return completeResponses.length > 0 
      ? (completeResponses.reduce((sum, r) => sum + r.qualityScore, 0) / completeResponses.length).toFixed(1)
      : "0";
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const channelStats = {
    Dynata: responses.filter(r => r.channel === "Dynata").length,
    SMS: responses.filter(r => r.channel === "SMS").length,
    Voice: responses.filter(r => r.channel === "Voice").length
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{responses.length}</div>
            <div className="text-sm text-slate-500 mt-1">All channels</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Complete Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {((responses.filter(r => r.status === "complete").length / responses.length) * 100).toFixed(0)}%
            </div>
            <Progress 
              value={(responses.filter(r => r.status === "complete").length / responses.length) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{calculateAverageQuality()}</div>
            <div className="text-sm text-slate-500 mt-1">Out of 100</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Dynata Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{channelStats.Dynata}</div>
            <div className="text-sm text-slate-500 mt-1">
              {((channelStats.Dynata / responses.length) * 100).toFixed(0)}% of total
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Collection Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2 text-blue-600" />
                Response Collection & Analysis
              </CardTitle>
              <CardDescription>
                Monitor and analyze survey responses from Dynata panel and other channels
              </CardDescription>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleRefreshData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="responses" className="space-y-4">
            <TabsList>
              <TabsTrigger value="responses">Response Data</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="responses">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Response ID</TableHead>
                    <TableHead>Respondent</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response.id}>
                      <TableCell>
                        <div className="font-mono text-sm">{response.id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{response.respondentId}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getChannelColor(response.channel)}>
                          {response.channel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(response.status)}>
                          {response.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDuration(response.duration)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="font-medium">{response.qualityScore}</span>
                          <span className="text-slate-500 ml-1">/100</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(response.completedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedResponse(response)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[525px]">
                            <DialogHeader>
                              <DialogTitle>Response Details</DialogTitle>
                              <DialogDescription>
                                Detailed information for response {response.id}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedResponse && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Respondent ID</Label>
                                    <div className="mt-1 font-mono text-sm">{selectedResponse.respondentId}</div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Channel</Label>
                                    <div className="mt-1">
                                      <Badge className={getChannelColor(selectedResponse.channel)}>
                                        {selectedResponse.channel}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Duration</Label>
                                    <div className="mt-1 text-sm">{formatDuration(selectedResponse.duration)}</div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Quality Score</Label>
                                    <div className="mt-1 text-sm font-medium">{selectedResponse.qualityScore}/100</div>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Completed At</Label>
                                  <div className="mt-1 text-sm">{new Date(selectedResponse.completedAt).toLocaleString()}</div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Channel Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(channelStats).map(([channel, count]) => (
                        <div key={channel} className="flex items-center justify-between">
                          <span className="font-medium">{channel}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-600">{count} responses</span>
                            <Progress 
                              value={(count / responses.length) * 100} 
                              className="w-20" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quality Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Average Quality</span>
                        <span className="text-lg font-bold text-blue-600">{calculateAverageQuality()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">High Quality (90+)</span>
                        <span className="text-sm text-green-600">
                          {responses.filter(r => r.qualityScore >= 90).length} responses
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Low Quality (<70)</span>
                        <span className="text-sm text-red-600">
                          {responses.filter(r => r.qualityScore < 70).length} responses
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResponseCollection;
