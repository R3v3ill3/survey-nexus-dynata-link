
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Settings, Target, RefreshCw } from "lucide-react";
import { QuotaConfiguration } from "@/types/database";

interface QuotaConfigurationCardProps {
  quotaConfig: QuotaConfiguration | null;
  onConfigureClick: () => void;
}

const QuotaConfigurationCard = ({ quotaConfig, onConfigureClick }: QuotaConfigurationCardProps) => {
  const getComplexityBadge = (level: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-orange-100 text-orange-800",
      extreme: "bg-red-100 text-red-800"
    };
    return colors[level as keyof typeof colors] || colors.low;
  };

  if (quotaConfig) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Australian Quota Configuration
              </CardTitle>
              <CardDescription>
                Current quota setup for {quotaConfig.geography_scope} targeting
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onConfigureClick}
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Change Configuration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-600">Geography</Label>
              <div className="text-lg font-semibold">{quotaConfig.geography_scope}</div>
              {quotaConfig.geography_detail && (
                <div className="text-sm text-slate-500">{quotaConfig.geography_detail}</div>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-600">Quota Mode</Label>
              <div className="text-lg font-semibold capitalize">{quotaConfig.quota_mode.replace('-', ' ')}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-600">Complexity</Label>
              <Badge className={getComplexityBadge(quotaConfig.complexity_level)}>
                {quotaConfig.complexity_level}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-600">Sample Multiplier</Label>
              <div className="text-lg font-semibold">{quotaConfig.sample_size_multiplier}x</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Quota Management Overview</CardTitle>
            <CardDescription>Australian demographic targeting and quota fulfillment</CardDescription>
          </div>
          <Button onClick={onConfigureClick}>
            <Settings className="h-4 w-4 mr-2" />
            Configure Quotas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Settings className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold mb-2">No Quota Configuration</h3>
          <p className="text-slate-600 mb-4">
            Configure demographic quotas to start sophisticated Australian targeting
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuotaConfigurationCard;
