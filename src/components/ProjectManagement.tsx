import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FolderOpen, Play, Pause, Square, MoreHorizontal, Calendar, Users, Cloud, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/apiService";
import { Project } from "@/types/database";

interface ProjectManagementProps {
  isAuthenticated: boolean;
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
}

const ProjectManagement = ({ isAuthenticated, activeProject, setActiveProject }: ProjectManagementProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [localMode, setLocalMode] = useState(true);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    targetResponses: ""
  });
  
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      if (localMode || !isAuthenticated) {
        // Load projects from local database
        const projectsData = await ApiService.getLocalProjects();
        setProjects(projectsData);
      } else {
        // Load projects from Dynata API
        const projectsData = await ApiService.getProjects();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Info",
        description: localMode ? "Loading local projects" : "Failed to load projects",
        variant: localMode ? "default" : "destructive"
      });
      
      // Fallback to local projects if Dynata fails
      if (!localMode) {
        try {
          const localProjectsData = await ApiService.getLocalProjects();
          setProjects(localProjectsData);
          setLocalMode(true);
        } catch (localError) {
          console.error('Error loading local projects:', localError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.title || !newProject.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      let project;

      if (localMode || !isAuthenticated) {
        // Create local project
        project = await ApiService.createLocalProject(
          newProject.title,
          newProject.description,
          { targetResponses: parseInt(newProject.targetResponses) || 1000 }
        );
      } else {
        // Create project via Dynata API
        project = await ApiService.createProject(
          newProject.title,
          newProject.description,
          { targetResponses: parseInt(newProject.targetResponses) || 1000 }
        );
      }

      setProjects(prev => [...prev, project]);
      setNewProject({ title: "", description: "", targetResponses: "" });
      setIsCreateDialogOpen(false);

      toast({
        title: "Project Created",
        description: `Successfully created ${localMode ? 'local' : 'Dynata'} project: ${project.title}`,
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      if (localMode || !isAuthenticated) {
        // Update local project status
        await ApiService.updateLocalProjectStatus(projectId, newStatus);
      } else {
        // Update via Dynata API
        if (newStatus === 'active') {
          await ApiService.launchProject(projectId);
        } else {
          await ApiService.updateProjectStatus(projectId, newStatus);
        }
      }

      setProjects(prev => 
        prev.map(project => 
          project.id === projectId 
            ? { ...project, status: newStatus as any, updated_at: new Date().toISOString() }
            : project
        )
      );

      toast({
        title: "Status Updated",
        description: `Project status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating project status:', error);
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive"
      });
    }
  };

  const handleSyncToDynata = async (projectId: string) => {
    try {
      setLoading(true);
      const syncedProject = await ApiService.syncProjectToDynata(projectId);
      
      setProjects(prev => 
        prev.map(project => 
          project.id === projectId ? syncedProject : project
        )
      );

      toast({
        title: "Project Synced",
        description: "Project successfully synced to Dynata",
      });
    } catch (error) {
      console.error('Error syncing project to Dynata:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync project to Dynata. Check API credentials.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getProgressPercentage = (lineItems: any[] = []) => {
    const totalQuota = lineItems.reduce((sum, item) => sum + item.quota, 0);
    const totalCompleted = lineItems.reduce((sum, item) => sum + item.completed, 0);
    return totalQuota > 0 ? Math.min((totalCompleted / totalQuota) * 100, 100) : 0;
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-slate-500">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>Please authenticate with Dynata API to manage projects</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <FolderOpen className="h-5 w-5 mr-2 text-blue-600" />
                Multi-Modal Project Management
              </CardTitle>
              <CardDescription>
                Create and manage survey projects across Dynata, SMS, and Voice channels
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-slate-500" />
                <Label htmlFor="local-mode" className="text-sm">Local Mode</Label>
                <Switch
                  id="local-mode"
                  checked={localMode}
                  onCheckedChange={setLocalMode}
                />
                <Cloud className="h-4 w-4 text-slate-500" />
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>
                      Create New {localMode ? 'Local' : 'Dynata'} Project
                    </DialogTitle>
                    <DialogDescription>
                      Set up a new survey project that can be deployed across multiple channels
                      {localMode && " (Local mode - will be stored locally until synced to Dynata)"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Project Title *</Label>
                      <Input
                        id="title"
                        placeholder="Enter project title"
                        value={newProject.title}
                        onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the survey objectives and methodology"
                        value={newProject.description}
                        onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target">Target Responses</Label>
                      <Input
                        id="target"
                        type="number"
                        placeholder="1000"
                        value={newProject.targetResponses}
                        onChange={(e) => setNewProject(prev => ({ ...prev, targetResponses: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateProject} disabled={loading}>
                      Create {localMode ? 'Local' : 'Dynata'} Project
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && projects.length === 0 ? (
            <div className="text-center py-8">Loading projects...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id} className="cursor-pointer hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{project.title}</div>
                        <div className="text-sm text-slate-500">{project.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {project.external_id ? (
                          <Cloud className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Database className="h-4 w-4 text-slate-500" />
                        )}
                        <span className="text-sm">
                          {project.external_id ? 'Dynata' : 'Local'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>
                            {project.line_items?.reduce((sum, item) => sum + item.completed, 0) || 0} / 
                            {project.line_items?.reduce((sum, item) => sum + item.quota, 0) || 0}
                          </span>
                          <span>{getProgressPercentage(project.line_items).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${getProgressPercentage(project.line_items)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(project.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {!project.external_id && isAuthenticated && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSyncToDynata(project.id)}
                            disabled={loading}
                          >
                            <Cloud className="h-4 w-4" />
                          </Button>
                        )}
                        {project.status === "draft" && (
                          <Button size="sm" onClick={() => handleStatusChange(project.id, "active")} disabled={loading}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {project.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(project.id, "paused")} disabled={loading}>
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setActiveProject(project)}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      </div>
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

export default ProjectManagement;
