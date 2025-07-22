
import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Plus, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { SurveyGeneratorDialog } from "./SurveyGeneratorDialog"
import type { Project } from "@/types/database"

interface ImportSurveyDialogProps {
  project: Project
  onSurveyImported: () => void
}

export function ImportSurveyDialog({ project, onSurveyImported }: ImportSurveyDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    external_survey_id: '',
    title: '',
    description: '',
    estimated_length: '',
    survey_url: '',
    external_platform: 'external',
    target_audience: '',
    quota_requirements: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !project.id) return

    // Validate required fields
    if (!formData.external_survey_id || !formData.title || !formData.survey_url) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      console.log('Importing survey with data:', formData)

      const { data, error } = await supabase.functions.invoke('survey-import', {
        body: {
          project_id: project.id,
          external_survey_id: formData.external_survey_id,
          title: formData.title,
          description: formData.description || null,
          estimated_length: formData.estimated_length ? parseInt(formData.estimated_length) : null,
          survey_url: formData.survey_url,
          external_platform: formData.external_platform,
          target_audience: formData.target_audience ? JSON.parse(formData.target_audience) : {},
          quota_requirements: formData.quota_requirements ? JSON.parse(formData.quota_requirements) : {},
          survey_questions: [],
          import_metadata: {
            imported_at: new Date().toISOString(),
            imported_by: user.id
          }
        }
      })

      if (error) throw error

      console.log('Survey imported successfully:', data)
      toast.success('Survey imported successfully!')
      
      // Reset form and close dialog
      setFormData({
        external_survey_id: '',
        title: '',
        description: '',
        estimated_length: '',
        survey_url: '',
        external_platform: 'external',
        target_audience: '',
        quota_requirements: ''
      })
      setOpen(false)
      onSurveyImported()

    } catch (error) {
      console.error('Error importing survey:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import survey')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Import Survey
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Survey</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Survey Generator Integration */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Import from Survey Generator</h3>
              <p className="text-sm text-muted-foreground">
                Connect to Survey Generator to import surveys directly
              </p>
            </div>
            <SurveyGeneratorDialog project={project} onSurveyImported={onSurveyImported} />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or import manually
              </span>
            </div>
          </div>

          {/* Manual Import Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="external_survey_id">External Survey ID *</Label>
                <Input
                  id="external_survey_id"
                  value={formData.external_survey_id}
                  onChange={(e) => handleInputChange('external_survey_id', e.target.value)}
                  placeholder="e.g., SURV_123456"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="external_platform">Platform</Label>
                <Select
                  value={formData.external_platform}
                  onValueChange={(value) => handleInputChange('external_platform', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External Platform</SelectItem>
                    <SelectItem value="qualtrics">Qualtrics</SelectItem>
                    <SelectItem value="surveymonkey">SurveyMonkey</SelectItem>
                    <SelectItem value="typeform">Typeform</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Survey Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter survey title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the survey"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_length">Estimated Length (minutes)</Label>
                <Input
                  id="estimated_length"
                  type="number"
                  value={formData.estimated_length}
                  onChange={(e) => handleInputChange('estimated_length', e.target.value)}
                  placeholder="e.g., 15"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="survey_url">Survey URL *</Label>
                <Input
                  id="survey_url"
                  type="url"
                  value={formData.survey_url}
                  onChange={(e) => handleInputChange('survey_url', e.target.value)}
                  placeholder="https://example.com/survey"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience (JSON)</Label>
              <Textarea
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) => handleInputChange('target_audience', e.target.value)}
                placeholder='{"age_range": "18-65", "location": "US"}'
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quota_requirements">Quota Requirements (JSON)</Label>
              <Textarea
                id="quota_requirements"
                value={formData.quota_requirements}
                onChange={(e) => handleInputChange('quota_requirements', e.target.value)}
                placeholder='{"total_responses": 1000, "demographics": {...}}'
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import Survey
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
