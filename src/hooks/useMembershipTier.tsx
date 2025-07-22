import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface TierInfo {
  tier: string;
  tier_name: string;
  max_projects: number;
  max_line_items_per_project: number;
  quota_generator_access: boolean;
  survey_generator_access: boolean;
  dynata_api_access: boolean;
  features: any;
}

export interface MembershipTier {
  id: string;
  tier: string;
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  max_projects: number;
  max_line_items_per_project: number;
  quota_generator_access: boolean;
  survey_generator_access: boolean;
  dynata_api_access: boolean;
  features: any;
}

export const useMembershipTier = () => {
  const { user } = useAuth();
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [allTiers, setAllTiers] = useState<MembershipTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserTierInfo = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("get_user_tier_info", {
        user_id: user.id,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setTierInfo({
          ...data[0],
          features: Array.isArray(data[0].features) ? data[0].features : []
        });
      }
    } catch (error) {
      console.error("Error fetching user tier info:", error);
    }
  };

  const fetchAllTiers = async () => {
    try {
      const { data, error } = await supabase
        .from("membership_tiers")
        .select("*")
        .order("monthly_price", { ascending: true });

      if (error) throw error;
      setAllTiers((data || []).map(tier => ({
        ...tier,
        features: Array.isArray(tier.features) ? tier.features : []
      })));
    } catch (error) {
      console.error("Error fetching membership tiers:", error);
    }
  };

  const checkPlatformAccess = async (platform: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc("has_platform_access", {
        user_id: user.id,
        platform,
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error("Error checking platform access:", error);
      return false;
    }
  };

  const canCreateProject = async (): Promise<boolean> => {
    if (!user || !tierInfo) return false;

    if (tierInfo.max_projects === -1) return true;

    try {
      const { count, error } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;
      return (count || 0) < tierInfo.max_projects;
    } catch (error) {
      console.error("Error checking project limit:", error);
      return false;
    }
  };

  const canCreateLineItem = async (projectId: string): Promise<boolean> => {
    if (!user || !tierInfo) return false;

    if (tierInfo.max_line_items_per_project === -1) return true;

    try {
      const { count, error } = await supabase
        .from("line_items")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);

      if (error) throw error;
      return (count || 0) < tierInfo.max_line_items_per_project;
    } catch (error) {
      console.error("Error checking line item limit:", error);
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchUserTierInfo(), fetchAllTiers()]);
      setIsLoading(false);
    };

    if (user) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  return {
    tierInfo,
    allTiers,
    isLoading,
    checkPlatformAccess,
    canCreateProject,
    canCreateLineItem,
    refreshTierInfo: fetchUserTierInfo,
  };
};