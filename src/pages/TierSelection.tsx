import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Crown, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMembershipTier } from "@/hooks/useMembershipTier";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TierSelection = () => {
  const { user } = useAuth();
  const { allTiers, refreshTierInfo } = useMembershipTier();
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "professional":
        return <Zap className="h-6 w-6 text-primary" />;
      case "enterprise":
        return <Crown className="h-6 w-6 text-primary" />;
      default:
        return <CheckCircle className="h-6 w-6 text-primary" />;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "enterprise":
        return <Badge className="bg-gradient-to-r from-primary to-primary/80">Most Popular</Badge>;
      case "professional":
        return <Badge variant="secondary">Best Value</Badge>;
      default:
        return null;
    }
  };

  const handleSelectTier = async (tier: string) => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          membership_tier: tier as "free" | "professional" | "enterprise" | "admin",
          subscription_status: "active"
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshTierInfo();
      
      toast({
        title: "Success!",
        description: `You've selected the ${allTiers.find(t => t.tier === tier)?.name} plan.`,
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error updating tier:", error);
      toast({
        title: "Error",
        description: "Failed to update your plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Choose Your Plan
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Select the plan that best fits your survey project needs. 
          All plans are currently free for testing.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {allTiers.map((tier) => (
          <Card 
            key={tier.id}
            className={`relative border-2 transition-all hover:shadow-lg ${
              selectedTier === tier.tier 
                ? "border-primary shadow-lg" 
                : "border-muted/50"
            }`}
          >
            {getTierBadge(tier.tier) && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                {getTierBadge(tier.tier)}
              </div>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4">
                {getTierIcon(tier.tier)}
              </div>
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <CardDescription className="text-sm">
                {tier.description}
              </CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
                <div className="text-xs text-muted-foreground mt-1">
                  Testing period
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Projects</span>
                  <span className="font-medium">
                    {tier.max_projects === -1 ? "Unlimited" : tier.max_projects}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Line Items per Project</span>
                  <span className="font-medium">
                    {tier.max_line_items_per_project === -1 ? "Unlimited" : tier.max_line_items_per_project}
                  </span>
                </div>
                {tier.quota_generator_access && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Quota Generator</span>
                  </div>
                )}
                {tier.survey_generator_access && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Survey Generator</span>
                  </div>
                )}
                {tier.dynata_api_access && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Dynata API</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                variant={selectedTier === tier.tier ? "default" : "outline"}
                onClick={() => handleSelectTier(tier.tier)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {selectedTier === tier.tier ? "Selected" : "Select Plan"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-sm text-muted-foreground">
          You can change your plan anytime in your account settings
        </p>
      </div>
    </div>
  );
};

export default TierSelection;
