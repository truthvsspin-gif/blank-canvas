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
      bookings: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string | null
          id: string
          price: number | null
          scheduled_at: string | null
          service_name: string
          source: string | null
          status: string
          vehicle_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          price?: number | null
          scheduled_at?: string | null
          service_name: string
          source?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          price?: number | null
          scheduled_at?: string | null
          service_name?: string
          source?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_integrations: {
        Row: {
          business_id: string
          created_at: string
          id: string
          instagram_access_token: string | null
          instagram_business_id: string | null
          updated_at: string
          whatsapp_access_token: string | null
          whatsapp_phone_number_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          instagram_access_token?: string | null
          instagram_business_id?: string | null
          updated_at?: string
          whatsapp_access_token?: string | null
          whatsapp_phone_number_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          instagram_access_token?: string | null
          instagram_business_id?: string | null
          updated_at?: string
          whatsapp_access_token?: string | null
          whatsapp_phone_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          ai_instructions: string | null
          ai_reply_enabled: boolean
          auto_reply_rules: Json | null
          booking_rules: Json | null
          business_description: string | null
          chatbot_enabled: boolean
          created_at: string
          domain: string | null
          flyer_cooldown_hours: number | null
          greeting_message: string | null
          id: string
          industry_type: string | null
          language_preference: string | null
          name: string
          office_hours: string | null
          owner_user_id: string | null
          updated_at: string
        }
        Insert: {
          ai_instructions?: string | null
          ai_reply_enabled?: boolean
          auto_reply_rules?: Json | null
          booking_rules?: Json | null
          business_description?: string | null
          chatbot_enabled?: boolean
          created_at?: string
          domain?: string | null
          flyer_cooldown_hours?: number | null
          greeting_message?: string | null
          id?: string
          industry_type?: string | null
          language_preference?: string | null
          name: string
          office_hours?: string | null
          owner_user_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_instructions?: string | null
          ai_reply_enabled?: boolean
          auto_reply_rules?: Json | null
          booking_rules?: Json | null
          business_description?: string | null
          chatbot_enabled?: boolean
          created_at?: string
          domain?: string | null
          flyer_cooldown_hours?: number | null
          greeting_message?: string | null
          id?: string
          industry_type?: string | null
          language_preference?: string | null
          name?: string
          office_hours?: string | null
          owner_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_model: string | null
          benefit_intent: string | null
          business_id: string
          channel: string | null
          conversation_id: string | null
          created_at: string
          current_state: string | null
          handoff_required: boolean | null
          id: string
          intent: string | null
          is_fallback: boolean | null
          lead_id: string | null
          lead_qualified: boolean | null
          message_direction: string | null
          message_text: string | null
          message_timestamp: string | null
          metadata: Json | null
          recommendation_summary: string | null
          recovery_attempt_count: number
          response_time_ms: number | null
          sender_name: string | null
          sender_phone_or_handle: string | null
          status: string
          subject: string | null
          updated_at: string
          usage_context: string | null
          user_id: string | null
          vehicle_info: Json | null
        }
        Insert: {
          ai_model?: string | null
          benefit_intent?: string | null
          business_id: string
          channel?: string | null
          conversation_id?: string | null
          created_at?: string
          current_state?: string | null
          handoff_required?: boolean | null
          id?: string
          intent?: string | null
          is_fallback?: boolean | null
          lead_id?: string | null
          lead_qualified?: boolean | null
          message_direction?: string | null
          message_text?: string | null
          message_timestamp?: string | null
          metadata?: Json | null
          recommendation_summary?: string | null
          recovery_attempt_count?: number
          response_time_ms?: number | null
          sender_name?: string | null
          sender_phone_or_handle?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          usage_context?: string | null
          user_id?: string | null
          vehicle_info?: Json | null
        }
        Update: {
          ai_model?: string | null
          benefit_intent?: string | null
          business_id?: string
          channel?: string | null
          conversation_id?: string | null
          created_at?: string
          current_state?: string | null
          handoff_required?: boolean | null
          id?: string
          intent?: string | null
          is_fallback?: boolean | null
          lead_id?: string | null
          lead_qualified?: boolean | null
          message_direction?: string | null
          message_text?: string | null
          message_timestamp?: string | null
          metadata?: Json | null
          recommendation_summary?: string | null
          recovery_attempt_count?: number
          response_time_ms?: number | null
          sender_name?: string | null
          sender_phone_or_handle?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          usage_context?: string | null
          user_id?: string | null
          vehicle_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_memory: {
        Row: {
          business_id: string
          channel: string | null
          conversation_count: number | null
          created_at: string
          customer_identifier: string
          customer_name: string | null
          id: string
          last_interaction_at: string | null
          last_state: string | null
          preferred_benefit: string | null
          updated_at: string
          usage_pattern: string | null
          vehicle_info: Json | null
        }
        Insert: {
          business_id: string
          channel?: string | null
          conversation_count?: number | null
          created_at?: string
          customer_identifier: string
          customer_name?: string | null
          id?: string
          last_interaction_at?: string | null
          last_state?: string | null
          preferred_benefit?: string | null
          updated_at?: string
          usage_pattern?: string | null
          vehicle_info?: Json | null
        }
        Update: {
          business_id?: string
          channel?: string | null
          conversation_count?: number | null
          created_at?: string
          customer_identifier?: string
          customer_name?: string | null
          id?: string
          last_interaction_at?: string | null
          last_state?: string | null
          preferred_benefit?: string | null
          updated_at?: string
          usage_pattern?: string | null
          vehicle_info?: Json | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          vehicle_info: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          vehicle_info?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          vehicle_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      flyer_send_log: {
        Row: {
          business_id: string
          conversation_id: string
          id: string
          media_asset_id: string | null
          sent_at: string
        }
        Insert: {
          business_id: string
          conversation_id: string
          id?: string
          media_asset_id?: string | null
          sent_at?: string
        }
        Update: {
          business_id?: string
          conversation_id?: string
          id?: string
          media_asset_id?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flyer_send_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flyer_send_log_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          business_id: string
          channel: string
          conversation_id: string
          direction: string
          file_url: string | null
          id: string
          media_asset_id: string | null
          message_text: string
          message_timestamp: string
          message_type: string | null
          metadata: Json | null
          sender_handle: string | null
          sender_name: string | null
          thread_id: string
        }
        Insert: {
          business_id: string
          channel: string
          conversation_id: string
          direction: string
          file_url?: string | null
          id?: string
          media_asset_id?: string | null
          message_text: string
          message_timestamp?: string
          message_type?: string | null
          metadata?: Json | null
          sender_handle?: string | null
          sender_name?: string | null
          thread_id: string
        }
        Update: {
          business_id?: string
          channel?: string
          conversation_id?: string
          direction?: string
          file_url?: string | null
          id?: string
          media_asset_id?: string | null
          message_text?: string
          message_timestamp?: string
          message_type?: string | null
          metadata?: Json | null
          sender_handle?: string | null
          sender_name?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "inbox_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_threads: {
        Row: {
          business_id: string
          channel: string
          contact_handle: string | null
          contact_name: string | null
          conversation_id: string
          created_at: string
          id: string
          last_message_at: string | null
          last_message_direction: string | null
          last_message_text: string | null
          last_usage_window_at: string | null
          metadata: Json | null
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          business_id: string
          channel: string
          contact_handle?: string | null
          contact_name?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_text?: string | null
          last_usage_window_at?: string | null
          metadata?: Json | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          channel?: string
          contact_handle?: string | null
          contact_name?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_text?: string | null
          last_usage_window_at?: string | null
          metadata?: Json | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_threads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          business_id: string
          chunk_index: number
          content: string
          content_tsv: unknown
          created_at: string
          embedding: Json | null
          id: string
          source_id: string
        }
        Insert: {
          business_id: string
          chunk_index: number
          content: string
          content_tsv?: unknown
          created_at?: string
          embedding?: Json | null
          id?: string
          source_id: string
        }
        Update: {
          business_id?: string
          chunk_index?: number
          content?: string
          content_tsv?: unknown
          created_at?: string
          embedding?: Json | null
          id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          business_id: string
          created_at: string
          id: string
          raw_text: string | null
          source_type: string
          source_uri: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          raw_text?: string | null
          source_type: string
          source_uri?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          raw_text?: string | null
          source_type?: string
          source_uri?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          business_id: string
          conversation_id: string | null
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          name: string | null
          notes: string | null
          phone: string | null
          qualification_reason: string | null
          source: string | null
          stage: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          qualification_reason?: string | null
          source?: string | null
          stage?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          qualification_reason?: string | null
          source?: string | null
          stage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          asset_type: string
          business_id: string
          created_at: string
          file_name: string | null
          file_url: string
          id: string
          is_active: boolean
          is_default: boolean
          mime_type: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          asset_type?: string
          business_id: string
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          mime_type?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: string
          business_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          mime_type?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          business_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          business_id: string
          channel: string
          conversation_id: string
          direction: string
          file_url: string | null
          id: string
          media_asset_id: string | null
          message_text: string
          message_type: string | null
          sender: string | null
          timestamp: string
        }
        Insert: {
          business_id: string
          channel: string
          conversation_id: string
          direction: string
          file_url?: string | null
          id?: string
          media_asset_id?: string | null
          message_text: string
          message_type?: string | null
          sender?: string | null
          timestamp?: string
        }
        Update: {
          business_id?: string
          channel?: string
          conversation_id?: string
          direction?: string
          file_url?: string | null
          id?: string
          media_asset_id?: string | null
          message_text?: string
          message_type?: string | null
          sender?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          message: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          message: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number | null
          business_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          base_price?: number | null
          business_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          base_price?: number | null
          business_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      usage: {
        Row: {
          business_id: string
          id: string
          metadata: Json | null
          metric: string
          occurred_at: string
          period: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          business_id: string
          id?: string
          metadata?: Json | null
          metric: string
          occurred_at?: string
          period?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          business_id?: string
          id?: string
          metadata?: Json | null
          metric?: string
          occurred_at?: string
          period?: string | null
          user_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_monthly: {
        Row: {
          business_id: string
          created_at: string
          id: string
          metric: string
          period: string
          updated_at: string
          value: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          metric: string
          period: string
          updated_at?: string
          value?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          metric?: string
          period?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string | null
          business_id: string
          color: string | null
          created_at: string
          customer_id: string
          id: string
          license_plate: string | null
          model: string | null
          size: string | null
        }
        Insert: {
          brand?: string | null
          business_id: string
          color?: string | null
          created_at?: string
          customer_id: string
          id?: string
          license_plate?: string | null
          model?: string | null
          size?: string | null
        }
        Update: {
          brand?: string | null
          business_id?: string
          color?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          license_plate?: string | null
          model?: string | null
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_member: { Args: { target_business: string }; Returns: boolean }
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
