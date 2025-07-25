
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ExternalLink, Import, Shield, Clock, Users, AlertCircle, RefreshCw, Plus, LogIn } from 'lucide-react'
import { useSurveyGenerator } from '@/hooks/useSurveyGenerator'
import { TierUpgradePrompt } from '@/components/TierUpgradePrompt'
import { useMembershipTier } from '@/hooks/useMembershipTier'
import type { Project } from '@/types/database'

interface SurveyGeneratorDialogProps {
  project: Project
  onSurveyImported: () => void
}

export function SurveyGeneratorDialog({ project, onSurveyImported }: SurveyGeneratorDialogProps) {
  const [open, setOpen] = useState(false)
  const { 
    surveys, 
    loading, 
    hasAccess, 
    isAuthenticated, 
    fetchSurveys, 
    importSurvey, 
    refreshAuthentication,
    initiateAuthentication,
    createSurvey
  } = useSurveyGenerator()
  const { tierInfo, allTiers } = useMembershipTier()

  useEffect(() => {
    if (open && hasAccess && isAuthenticated) {
      fetchSurveys()
    }
  }, [open, hasAccess, isAuthenticated])

  const handleImport = async (surveyId: string) => {
    try {
      await importSurvey(surveyId, project.id)
      onSurveyImported()
      setOpen(false)
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Unknown'
    return `${minutes} min${minutes !== 1 ? 's' : ''}`
  }

  // Check if user has access to Survey Generator
  const hasSurveyGeneratorAccess = tierInfo?.survey_generator_access

  if (!hasSurveyGeneratorAccess) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Import from Survey Generator
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Survey Generator Access Required</DialogTitle>
          </DialogHeader>
          <TierUpgradePrompt
            currentTier={tierInfo?.tier}
            requiredFeature="survey_generator"
            availableTiers={allTiers}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <ExternalLink className="h-4 w-4 mr-2" />
          Import from Survey Generator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Survey Generator</DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Connect to Survey Generator
              </CardTitle>
              <CardDescription>
                You need to authenticate with Survey Generator to import surveys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Connect Your Account</p>
                  <p>Click the button below to securely connect your Survey Generator account. This will open a new window for authentication.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={initiateAuthentication} 
                  disabled={loading}
                  className="flex-1"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {loading ? 'Connecting...' : 'Connect to Survey Generator'}
                </Button>
                <Button 
                  onClick={refreshAuthentication} 
                  variant="outline"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {loading ? 'Checking...' : 'Refresh Status'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Available Surveys</h3>
                <p className="text-sm text-muted-foreground">
                  Select a survey to import into your project
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={createSurvey} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Survey
                </Button>
                <Button onClick={fetchSurveys} variant="outline" size="sm" disabled={loading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            <Separator />

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : surveys.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No surveys found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    You haven't created any surveys yet. Create your first survey to get started.
                  </p>
                  <Button onClick={createSurvey} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Survey
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {surveys.map((survey) => (
                  <Card key={survey.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{survey.title}</CardTitle>
                            <Badge variant="secondary" className={getStatusColor(survey.status)}>
                              {survey.status}
                            </Badge>
                          </div>
                          {survey.description && (
                            <p className="text-muted-foreground text-sm">
                              {survey.description}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => handleImport(survey.id)}
                          disabled={loading}
                          size="sm"
                        >
                          <Import className="h-4 w-4 mr-2" />
                          Import
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
                          <span>{survey.questions.length} questions</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ExternalLink className="h-4 w-4" />
                          <span>Survey Generator</span>
                        </div>
                      </div>

                      {survey.target_audience && Object.keys(survey.target_audience).length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium mb-2">Target Audience</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(survey.target_audience).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {String(value)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
