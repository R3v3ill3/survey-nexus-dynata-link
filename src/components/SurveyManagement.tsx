import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, ExternalLink, Clock, Users, Target } from "lucide-react"
import { toast } from "sonner"
import type { Project } from "@/types/database"

interface Survey {
  id: string
  external_survey_id: string
  title: string
  description?: string
  estimated_length?: number
  survey_url: string
  status: string
  target_audience: Record<string, any>
  quota_requirements: Record<string, any>
  external_platform: string
  created_at: string
  survey_line_items?: Array<{
    id: string
    line_item_id: string
    survey_quota: number
    priority: number
  }>
}

interface SurveyManagementProps {
  project: Project
}

export function SurveyManagement({ project }: SurveyManagementProps) {
  const { user } = useAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSurveys = async () => {
    if (!user || !project.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('survey-import', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: new URLSearchParams({ project_id: project.id })
      })

      if (error) throw error

      setSurveys(data.surveys || [])
    } catch (error) {
      console.error('Error fetching surveys:', error)
      toast.error('Failed to load surveys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSurveys()
  }, [project.id, user])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success'
      case 'paused': return 'bg-warning'
      case 'completed': return 'bg-muted'
      case 'cancelled': return 'bg-destructive'
      default: return 'bg-muted'
    }
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Unknown'
    return `${minutes} min${minutes !== 1 ? 's' : ''}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Survey Management</h2>
          <p className="text-muted-foreground">
            Import and manage surveys from external platforms
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Import Survey
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Surveys</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {surveys.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No surveys imported</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Connect your survey platform to import surveys and manage quotas
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Import Your First Survey
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {surveys.map((survey) => (
                <Card key={survey.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{survey.title}</CardTitle>
                          <Badge 
                            variant="secondary" 
                            className={getStatusColor(survey.status)}
                          >
                            {survey.status}
                          </Badge>
                        </div>
                        {survey.description && (
                          <p className="text-muted-foreground text-sm">
                            {survey.description}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Survey
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(survey.estimated_length)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {survey.survey_line_items?.length || 0} line item
                          {(survey.survey_line_items?.length || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="h-4 w-4" />
                        <span>Platform: {survey.external_platform}</span>
                      </div>
                    </div>
                    
                    {survey.survey_line_items && survey.survey_line_items.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium mb-2">Connected Line Items</h4>
                        <div className="space-y-1">
                          {survey.survey_line_items.map((lineItem) => (
                            <div 
                              key={lineItem.id} 
                              className="flex justify-between text-sm"
                            >
                              <span>Line Item {lineItem.line_item_id.slice(0, 8)}...</span>
                              <span>{lineItem.survey_quota} quota</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          <div className="grid gap-4">
            {surveys
              .filter(survey => survey.status === 'active')
              .map((survey) => (
                <Card key={survey.id}>
                  <CardHeader>
                    <CardTitle>{survey.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Active survey content...</p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="draft">
          <div className="grid gap-4">
            {surveys
              .filter(survey => survey.status === 'draft')
              .map((survey) => (
                <Card key={survey.id}>
                  <CardHeader>
                    <CardTitle>{survey.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Draft survey content...</p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}