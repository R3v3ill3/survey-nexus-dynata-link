import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Zap } from "lucide-react";
import { MembershipTier } from "@/hooks/useMembershipTier";

interface TierUpgradePromptProps {
  currentTier?: string;
  requiredFeature: string;
  availableTiers: MembershipTier[];
  onUpgrade?: (tier: string) => void;
}

export const TierUpgradePrompt = ({
  currentTier,
  requiredFeature,
  availableTiers,
  onUpgrade,
}: TierUpgradePromptProps) => {
  const getFeatureDescription = (feature: string) => {
    const descriptions: Record<string, string> = {
      quota_generator: "Quota Generator access",
      survey_generator: "Survey Generator access", 
      dynata_api: "Dynata API integration",
      more_projects: "Additional project slots",
      more_line_items: "More line items per project",
    };
    return descriptions[feature] || feature;
  };

  const eligibleTiers = availableTiers.filter((tier) => {
    switch (requiredFeature) {
      case "quota_generator":
        return tier.quota_generator_access;
      case "survey_generator":
        return tier.survey_generator_access;
      case "dynata_api":
        return tier.dynata_api_access;
      case "more_projects":
        return tier.max_projects > 1 || tier.max_projects === -1;
      case "more_line_items":
        return tier.max_line_items_per_project > 3 || tier.max_line_items_per_project === -1;
      default:
        return false;
    }
  });

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "professional":
        return <Zap className="h-4 w-4" />;
      case "enterprise":
        return <Crown className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-dashed border-muted-foreground/50">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">Upgrade Required</CardTitle>
        <CardDescription>
          You need access to <strong>{getFeatureDescription(requiredFeature)}</strong> to use this feature.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground text-center">
          Your current plan: <Badge variant="outline">{currentTier}</Badge>
        </div>
        
        {eligibleTiers.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Available upgrades:</p>
            {eligibleTiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getTierIcon(tier.tier)}
                  <div>
                    <div className="font-medium">{tier.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${tier.monthly_price}/month
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onUpgrade?.(tier.tier)}
                  className="shrink-0"
                >
                  Upgrade
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};