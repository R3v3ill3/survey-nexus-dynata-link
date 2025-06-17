export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_credentials: {
        Row: {
          created_at: string | null
          credentials: Json
          expires_at: string | null
          id: string
          is_active: boolean | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credentials: Json
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credentials?: Json
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      line_items: {
        Row: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          completed: number | null
          cost_per_complete: number | null
          created_at: string | null
          external_id: string | null
          id: string
          name: string
          project_id: string
          quota: number
          status: Database["public"]["Enums"]["line_item_status"] | null
          targeting: Json
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          completed?: number | null
          cost_per_complete?: number | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          name: string
          project_id: string
          quota?: number
          status?: Database["public"]["Enums"]["line_item_status"] | null
          targeting?: Json
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["channel_type"]
          completed?: number | null
          cost_per_complete?: number | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          name?: string
          project_id?: string
          quota?: number
          status?: Database["public"]["Enums"]["line_item_status"] | null
          targeting?: Json
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          external_id: string | null
          id: string
          settings: Json | null
          status: Database["public"]["Enums"]["project_status"] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          settings?: Json | null
          status?: Database["public"]["Enums"]["project_status"] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          settings?: Json | null
          status?: Database["public"]["Enums"]["project_status"] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quota_tracking: {
        Row: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          completion_rate: number | null
          cost_tracking: number | null
          current_count: number | null
          id: string
          last_updated: string | null
          line_item_id: string
          project_id: string
          target_quota: number
        }
        Insert: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          completion_rate?: number | null
          cost_tracking?: number | null
          current_count?: number | null
          id?: string
          last_updated?: string | null
          line_item_id: string
          project_id: string
          target_quota: number
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["channel_type"]
          completion_rate?: number | null
          cost_tracking?: number | null
          current_count?: number | null
          id?: string
          last_updated?: string | null
          line_item_id?: string
          project_id?: string
          target_quota?: number
        }
        Relationships: [
          {
            foreignKeyName: "quota_tracking_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quota_tracking_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          completion_time: number | null
          created_at: string | null
          external_response_id: string | null
          id: string
          line_item_id: string
          project_id: string
          respondent_data: Json | null
          response_data: Json | null
          status: Database["public"]["Enums"]["response_status"]
          updated_at: string | null
        }
        Insert: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          completion_time?: number | null
          created_at?: string | null
          external_response_id?: string | null
          id?: string
          line_item_id: string
          project_id: string
          respondent_data?: Json | null
          response_data?: Json | null
          status: Database["public"]["Enums"]["response_status"]
          updated_at?: string | null
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["channel_type"]
          completion_time?: number | null
          created_at?: string | null
          external_response_id?: string | null
          id?: string
          line_item_id?: string
          project_id?: string
          respondent_data?: Json | null
          response_data?: Json | null
          status?: Database["public"]["Enums"]["response_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      channel_type: "dynata" | "sms" | "voice"
      line_item_status:
        | "draft"
        | "active"
        | "paused"
        | "completed"
        | "overquota"
        | "cancelled"
      project_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      response_status:
        | "complete"
        | "partial"
        | "screened_out"
        | "over_quota"
        | "terminated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      channel_type: ["dynata", "sms", "voice"],
      line_item_status: [
        "draft",
        "active",
        "paused",
        "completed",
        "overquota",
        "cancelled",
      ],
      project_status: ["draft", "active", "paused", "completed", "cancelled"],
      response_status: [
        "complete",
        "partial",
        "screened_out",
        "over_quota",
        "terminated",
      ],
    },
  },
} as const
