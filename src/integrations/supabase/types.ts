export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      budget_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sub_category_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sub_category_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sub_category_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          spend_target: number
          start_date: string
          time_period_months: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          spend_target?: number
          start_date?: string
          time_period_months?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          spend_target?: number
          start_date?: string
          time_period_months?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          id: string
          notes: string | null
          original_amount: number
          original_currency: string
          source: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          notes?: string | null
          original_amount?: number
          original_currency?: string
          source?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          notes?: string | null
          original_amount?: number
          original_currency?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_modes: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          label: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          label: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          label?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          amount: number
          auto_generate: boolean
          category: string
          created_at: string
          credit_card_id: string | null
          day_of_month: number | null
          day_of_week: number | null
          description: string | null
          frequency: string
          id: string
          is_active: boolean
          last_generated_at: string | null
          next_due_date: string
          notes: string | null
          payment_mode: string
          personal_amount: number
          sub_category: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          auto_generate?: boolean
          category: string
          created_at?: string
          credit_card_id?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          next_due_date?: string
          notes?: string | null
          payment_mode?: string
          personal_amount?: number
          sub_category?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_generate?: boolean
          category?: string
          created_at?: string
          credit_card_id?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          next_due_date?: string
          notes?: string | null
          payment_mode?: string
          personal_amount?: number
          sub_category?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          credit_card_id: string | null
          date: string
          description: string | null
          id: string
          notes: string | null
          original_amount: number
          original_currency: string
          payment_mode: string
          personal_amount: number
          sub_category: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          credit_card_id?: string | null
          date?: string
          description?: string | null
          id?: string
          notes?: string | null
          original_amount?: number
          original_currency?: string
          payment_mode?: string
          personal_amount?: number
          sub_category?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          credit_card_id?: string | null
          date?: string
          description?: string | null
          id?: string
          notes?: string | null
          original_amount?: number
          original_currency?: string
          payment_mode?: string
          personal_amount?: number
          sub_category?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
