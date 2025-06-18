import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Edit, Copy, Trash, Plus, ArrowRight, CheckCircle, AlertCircle, RotateCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/apiService";
import { Project, ProjectStatus } from "@/types/database";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ProjectManagementProps {
  isAuthenticated: boolean;
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  onProjectChange?: () => void;
}

const ProjectManagement = ({ 
  isAuthenticated, 
  activeProject, 
  setActiveProject,
  onProjectChange 
}: ProjectManagementProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingProjectId, setSyncingProjectId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const projects = await ApiService.getLocalProjects();
      setProjects(projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (data: { title: string; description: string }) => {
    setIsCreating(true);
    try {
      const newProject = await ApiService.createLocalProject(
        data.title,
        data.description,
        {}
      );
      
      setProjects(prev => [newProject, ...prev]);
      setActiveProject(newProject);
      setIsCreateDialogOpen(false);
      
      // Call the callback to refresh dashboard data
      if (onProjectChange) {
        onProjectChange();
      }
      
      toast({
        title: "Project Created",
        description: `Project "${data.title}" has been created successfully in local mode.`,
      });
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSyncToDynata = async (project: Project) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please connect to Dynata first before syncing projects.",
        variant: "destructive",
      });
      return;
    }

    setSyncingProjectId(project.id);
    try {
      const syncedProject = await ApiService.syncProjectToDynata(project.id);
      
      setProjects(prev => 
        prev.map(p => p.id === project.id ? syncedProject : p)
      );
      
      if (activeProject?.id === project.id) {
        setActiveProject(syncedProject);
      }
      
      // Call the callback to refresh dashboard data
      if (onProjectChange) {
        onProjectChange();
      }
      
      toast({
        title: "Project Synced",
        description: `Project "${project.title}" has been synced to Dynata successfully.`,
      });
    } catch (error) {
      console.error('Failed to sync project:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync project to Dynata.",
        variant: "destructive",
      });
    } finally {
      setSyncingProjectId(null);
    }
  };

  const handleStatusChange = async (project: Project, newStatus: ProjectStatus) => {
    try {
      await ApiService.updateLocalProjectStatus(project.id, newStatus);
      
      setProjects(prev => 
        prev.map(p => p.id === project.id ? { ...p, status: newStatus } : p)
      );
      
      if (activeProject?.id === project.id) {
        setActiveProject({ ...activeProject, status: newStatus });
      }
      
      // Call the callback to refresh dashboard data
      if (onProjectChange) {
        onProjectChange();
      }
      
      toast({
        title: "Status Updated",
        description: `Project status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Failed to update project status:', error);
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      // const deletedProject = await ApiService.deleteProject(projectToDelete.id);
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      
      if (activeProject?.id === projectToDelete.id) {
        setActiveProject(null);
      }
      
      // Call the callback to refresh dashboard data
      if (onProjectChange) {
        onProjectChange();
      }
      
      toast({
        title: "Project Deleted",
        description: `Project "${projectToDelete.title}" has been deleted successfully.`,
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleSetActiveProject = (project: Project) => {
    setActiveProject(project);
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "draft": return "bg-slate-100 text-slate-800";
      case "active": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "archived": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Management</CardTitle>
            <CardDescription>Create and manage your polling projects</CardDescription>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              No projects created yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="font-medium">{project.title}</div>
                      <div className="text-sm text-slate-500">{project.description}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(project.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleSetActiveProject(project)}>
                            <Edit className="h-4 w-4 mr-2" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(JSON.stringify(project))}>
                            <Copy className="h-4 w-4 mr-2" />
                            <span>Copy</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setProjectToDelete(project);
                            setIsDeleteDialogOpen(true);
                          }}>
                            <Trash className="h-4 w-4 mr-2" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {activeProject && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Manage the details of your active project</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input type="text" value={activeProject.title} readOnly />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={activeProject.status} onValueChange={(value: ProjectStatus) => handleStatusChange(activeProject, value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={activeProject.description} readOnly />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              {activeProject.external_id ? (
                <Badge variant="outline">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Synced to Dynata
                </Badge>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => handleSyncToDynata(activeProject)}
                  disabled={syncingProjectId === activeProject.id}
                >
                  {syncingProjectId === activeProject.id ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Sync to Dynata
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to start collecting responses.
            </DialogDescription>
          </DialogHeader>
          <CreateProjectForm onSubmit={handleCreateProject} isCreating={isCreating} />
        </DialogContent>
      </Dialog>

      {/* Delete Project Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              and remove all of its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface CreateProjectFormProps {
  onSubmit: (data: { title: string; description: string }) => void;
  isCreating: boolean;
}

const CreateProjectForm: React.FC<CreateProjectFormProps> = ({ onSubmit, isCreating }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({ title, description });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Project Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter project title"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Project Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter project description"
          required
        />
      </div>
      <Button type="submit" disabled={isCreating}>
        {isCreating ? (
          <>
            Creating...
            <RotateCw className="ml-2 h-4 w-4 animate-spin" />
          </>
        ) : (
          "Create Project"
        )}
      </Button>
    </form>
  );
};

export default ProjectManagement;
