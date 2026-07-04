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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcement_email_logs: {
        Row: {
          announcement_id: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          user_email: string
        }
        Insert: {
          announcement_id: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_email: string
        }
        Update: {
          announcement_id?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_email_logs_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string | null
          created_by: string | null
          email_subject: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          message: string
          recipient_emails: string | null
          recipient_type: string | null
          send_email: boolean | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email_subject?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          recipient_emails?: string | null
          recipient_type?: string | null
          send_email?: boolean | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email_subject?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          recipient_emails?: string | null
          recipient_type?: string | null
          send_email?: boolean | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          organization_id: string
          phone: string | null
          session_name: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          organization_id: string
          phone?: string | null
          session_name?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          organization_id?: string
          phone?: string | null
          session_name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_company_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          agent_limit: number | null
          api_message_limit: number | null
          api_message_usage: number | null
          created_at: string
          id: string
          name: string
          product_mode: string | null
          routing_mode: Database["public"]["Enums"]["routing_mode"]
          session_limit: number | null
          updated_at: string
        }
        Insert: {
          agent_limit?: number | null
          api_message_limit?: number | null
          api_message_usage?: number | null
          created_at?: string
          id?: string
          name: string
          product_mode?: string | null
          routing_mode?: Database["public"]["Enums"]["routing_mode"]
          session_limit?: number | null
          updated_at?: string
        }
        Update: {
          agent_limit?: number | null
          api_message_limit?: number | null
          api_message_usage?: number | null
          created_at?: string
          id?: string
          name?: string
          product_mode?: string | null
          routing_mode?: Database["public"]["Enums"]["routing_mode"]
          session_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          name: string | null
          organization_id: string | null
          phone: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          organization_id?: string | null
          phone?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          organization_id?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          organization_id: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          sender: string | null
          text: string | null
          ticket_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          sender?: string | null
          text?: string | null
          ticket_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          sender?: string | null
          text?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_reminders: {
        Row: {
          email_sent_to: string
          id: string
          reminder_type: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          email_sent_to: string
          id?: string
          reminder_type: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          email_sent_to?: string
          id?: string
          reminder_type?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          agent_limit: number | null
          api_message_limit: number | null
          api_message_usage: number | null
          api_session: string | null
          api_token: string | null
          api_token_full: string | null
          created_at: string | null
          id: string
          is_legacy: boolean | null
          name: string
          plan: string | null
          routing_mode: Database["public"]["Enums"]["routing_mode"] | null
          session_limit: number | null
          settings: Json | null
          subscription_expires_at: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_limit?: number | null
          api_message_limit?: number | null
          api_message_usage?: number | null
          api_session?: string | null
          api_token?: string | null
          api_token_full?: string | null
          created_at?: string | null
          id?: string
          is_legacy?: boolean | null
          name: string
          plan?: string | null
          routing_mode?: Database["public"]["Enums"]["routing_mode"] | null
          session_limit?: number | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_limit?: number | null
          api_message_limit?: number | null
          api_message_usage?: number | null
          api_session?: string | null
          api_token?: string | null
          api_token_full?: string | null
          created_at?: string | null
          id?: string
          is_legacy?: boolean | null
          name?: string
          plan?: string | null
          routing_mode?: Database["public"]["Enums"]["routing_mode"] | null
          session_limit?: number | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          api_message_limit: number | null
          api_message_usage: number | null
          api_session: string | null
          api_token: string | null
          api_token_full: string | null
          created_at: string | null
          id: string
          name: string | null
          notification_phone: string | null
          organization_id: string | null
          qr: string | null
          requires_subscription: boolean | null
          status: string | null
          updated_at: string | null
          webhook_enabled: boolean | null
          webhook_events: string[] | null
          webhook_url: string | null
          message_limit: number | null
          messages_sent_this_month: number | null
          trial_started_at: string | null
          trial_blocked_at: string | null
        }
        Insert: {
          api_message_limit?: number | null
          api_message_usage?: number | null
          api_session?: string | null
          api_token?: string | null
          api_token_full?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          notification_phone?: string | null
          organization_id?: string | null
          qr?: string | null
          requires_subscription?: boolean | null
          status?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_events?: string[] | null
          webhook_url?: string | null
          message_limit?: number | null
          messages_sent_this_month?: number | null
          trial_started_at?: string | null
          trial_blocked_at?: string | null
        }
        Update: {
          api_message_limit?: number | null
          api_message_usage?: number | null
          api_session?: string | null
          api_token?: string | null
          api_token_full?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          notification_phone?: string | null
          organization_id?: string | null
          qr?: string | null
          requires_subscription?: boolean | null
          status?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_events?: string[] | null
          webhook_url?: string | null
          message_limit?: number | null
          messages_sent_this_month?: number | null
          trial_started_at?: string | null
          trial_blocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          external_reference: string | null
          id: string
          next_payment_date: string | null
          organization_id: string
          payer_email: string | null
          payer_id: string | null
          payment_method_id: string | null
          payment_provider: string | null
          plan_name: string
          preapproval_id: string | null
          session_id: string | null
          start_date: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          external_reference?: string | null
          id?: string
          next_payment_date?: string | null
          organization_id: string
          payer_email?: string | null
          payer_id?: string | null
          payment_method_id?: string | null
          payment_provider?: string | null
          plan_name?: string
          preapproval_id?: string | null
          session_id?: string | null
          start_date?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          external_reference?: string | null
          id?: string
          next_payment_date?: string | null
          organization_id?: string
          payer_email?: string | null
          payer_id?: string | null
          payment_method_id?: string | null
          payment_provider?: string | null
          plan_name?: string
          preapproval_id?: string | null
          session_id?: string | null
          start_date?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmin_users: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          media: Json | null
          sender: string
          text: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media?: Json | null
          sender: string
          text?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media?: Json | null
          sender?: string
          text?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_number: string
          id: string
          last_message: string | null
          organization_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_number: string
          id?: string
          last_message?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_number?: string
          id?: string
          last_message?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          availability: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          organization_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          unsubscribed_from_reminders: boolean | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          availability?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          unsubscribed_from_reminders?: boolean | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          availability?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          unsubscribed_from_reminders?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          response_code: number | null
          session_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          response_code?: number | null
          session_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_code?: number | null
          session_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      organizations_safe: {
        Row: {
          agent_limit: number | null
          api_message_limit: number | null
          api_message_usage: number | null
          created_at: string | null
          id: string | null
          is_legacy: boolean | null
          name: string | null
          plan: string | null
          routing_mode: Database["public"]["Enums"]["routing_mode"] | null
          session_limit: number | null
          subscription_expires_at: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_limit?: number | null
          api_message_limit?: number | null
          api_message_usage?: number | null
          created_at?: string | null
          id?: string | null
          is_legacy?: boolean | null
          name?: string | null
          plan?: string | null
          routing_mode?: Database["public"]["Enums"]["routing_mode"] | null
          session_limit?: number | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_limit?: number | null
          api_message_limit?: number | null
          api_message_usage?: number | null
          created_at?: string | null
          id?: string | null
          is_legacy?: boolean | null
          name?: string | null
          plan?: string | null
          routing_mode?: Database["public"]["Enums"]["routing_mode"] | null
          session_limit?: number | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions_safe: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          organization_id: string | null
          requires_subscription: boolean | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          organization_id?: string | null
          requires_subscription?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          organization_id?: string | null
          requires_subscription?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_org_and_user: {
        Args: { p_email: string; p_org_name: string; p_user_id: string }
        Returns: string
      }
      current_user_org: { Args: never; Returns: string }
      get_user_company: { Args: { user_id: string }; Returns: string }
      get_user_organization: { Args: { user_id: string }; Returns: string }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      increment_api_usage: { Args: { org: string }; Returns: undefined }
      increment_session_api_usage: {
        Args: { session_uuid: string }
        Returns: undefined
      }
      is_superadmin: { Args: never; Returns: boolean }
      rotate_org_api_token: { Args: { org_id: string }; Returns: string }
    }
    Enums: {
      routing_mode: "manual" | "auto" | "hybrid"
      ticket_status: "waiting" | "in_progress" | "closed"
      user_role: "admin" | "agent" | "superadmin"
      user_status: "active" | "inactive"
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
    Enums: {
      routing_mode: ["manual", "auto", "hybrid"],
      ticket_status: ["waiting", "in_progress", "closed"],
      user_role: ["admin", "agent", "superadmin"],
      user_status: ["active", "inactive"],
    },
  },
} as const
