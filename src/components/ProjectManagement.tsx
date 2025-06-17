
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FolderOpen, Play, Pause, Square, MoreHorizontal, Calendar, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  title: string;
  description: string;
  status: "draft" | "active" | "paused" | "completed";
  createdAt: string;
  updatedAt: string;
  responses: number;
  targetResponses: number;
}

interface ProjectManagementProps {
  isAuthenticated: boolean;
  activeProject: any;
  setActiveProject: (project: any) => void;
}

const ProjectManagement = ({ isAuthenticated, activeProject, setActiveProject }: ProjectManagementProps) => {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "proj_001",
      title: "Consumer Behavior Study Q4 2024",
      description: "Understanding shopping preferences and brand loyalty patterns",
      status: "active",
      createdAt: "2024-01-15",
      updatedAt: "2024-01-20",
      responses: 847,
      targetResponses: 1200
    },
    {
      id: "proj_002", 
      title: "Healthcare Access Survey",
      description: "Analyzing healthcare accessibility and patient satisfaction",
      status: "active",
      createdAt: "2024-01-10",
      updatedAt: "2024-01-18",
      responses: 623,
      targetResponses: 800
    },
    {
      id: "proj_003",
      title: "Technology Adoption Research",
      description: "Studying AI and automation acceptance in various industries", 
      status: "draft",
      createdAt: "2024-01-12",
      updatedAt: "2024-01-12",
      responses: 0,
      targetResponses: 1500
    }
  ]);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    targetResponses: ""
  });
  
  const { toast } = useToast();

  const handleCreateProject = async () => {
    if (!newProject.title || !newProject.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    console.log("Creating new project:", newProject);

    const project: Project = {
      id: `proj_${Date.now()}`,
      title: newProject.title,
      description: newProject.description,
      status: "draft",
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      responses: 0,
      targetResponses: parseInt(newProject.targetResponses) || 1000
    };

    setProjects(prev => [...prev, project]);
    setNewProject({ title: "", description: "", targetResponses: "" });
    setIsCreateDialogOpen(false);

    toast({
      title: "Project Created",
      description: `Successfully created project: ${project.title}`,
    });
  };

  const handleStatusChange = (projectId: string, newStatus: Project["status"]) => {
    setProjects(prev => 
      prev.map(project => 
        project.id === projectId 
          ? { ...project, status: newStatus, updatedAt: new Date().toISOString().split('T')[0] }
          : project
      )
    );

    toast({
      title: "Status Updated",
      description: `Project status changed to ${newStatus}`,
    });
  };

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getProgressPercentage = (responses: number, target: number) => {
    return Math.min((responses / target) * 100, 100);
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
                Survey Project Management
              </CardTitle>
              <CardDescription>
                Create, manage, and monitor survey projects through the Dynata Demand API
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Create New Survey Project</DialogTitle>
                  <DialogDescription>
                    Set up a new survey project that will be created via the Dynata API
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
                  <Button onClick={handleCreateProject}>Create Project</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
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
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{project.responses} / {project.targetResponses}</span>
                        <span>{getProgressPercentage(project.responses, project.targetResponses).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${getProgressPercentage(project.responses, project.targetResponses)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      {project.createdAt}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-600">{project.updatedAt}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {project.status === "draft" && (
                        <Button size="sm" onClick={() => handleStatusChange(project.id, "active")}>
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {project.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(project.id, "paused")}>
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {(project.status === "active" || project.status === "paused") && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(project.id, "completed")}>
                          <Square className="h-4 w-4" />
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectManagement;
