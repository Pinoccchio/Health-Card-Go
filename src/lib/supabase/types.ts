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
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          target_audience?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_status_history: {
        Row: {
          appointment_id: string
          change_type: Database["public"]["Enums"]["change_type"]
          changed_at: string
          changed_by: string
          created_at: string | null
          from_status: string | null
          id: string
          is_reversion: boolean | null
          metadata: Json | null
          new_doctor_id: string | null
          old_doctor_id: string | null
          reason: string | null
          reverted_from_history_id: string | null
          to_status: string
        }
        Insert: {
          appointment_id: string
          change_type?: Database["public"]["Enums"]["change_type"]
          changed_at?: string
          changed_by: string
          created_at?: string | null
          from_status?: string | null
          id?: string
          is_reversion?: boolean | null
          metadata?: Json | null
          new_doctor_id?: string | null
          old_doctor_id?: string | null
          reason?: string | null
          reverted_from_history_id?: string | null
          to_status: string
        }
        Update: {
          appointment_id?: string
          change_type?: Database["public"]["Enums"]["change_type"]
          changed_at?: string
          changed_by?: string
          created_at?: string | null
          from_status?: string | null
          id?: string
          is_reversion?: boolean | null
          metadata?: Json | null
          new_doctor_id?: string | null
          old_doctor_id?: string | null
          reason?: string | null
          reverted_from_history_id?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_new_doctor_id_fkey"
            columns: ["new_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_old_doctor_id_fkey"
            columns: ["old_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_reverted_from_history_id_fkey"
            columns: ["reverted_from_history_id"]
            isOneToOne: false
            referencedRelation: "appointment_status_history"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_number: number
          appointment_time: string
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          completed_at: string | null
          completed_by_id: string | null
          created_at: string
          id: string
          patient_id: string
          reason: string | null
          reminder_sent: boolean | null
          service_id: number
          started_at: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_number: number
          appointment_time: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          completed_by_id?: string | null
          created_at?: string
          id?: string
          patient_id: string
          reason?: string | null
          reminder_sent?: boolean | null
          service_id: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_number?: number
          appointment_time?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          completed_by_id?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          reason?: string | null
          reminder_sent?: boolean | null
          service_id?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_completed_by_id_fkey"
            columns: ["completed_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      barangays: {
        Row: {
          code: string
          coordinates: Json | null
          created_at: string
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          coordinates?: Json | null
          created_at?: string
          id?: number
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          coordinates?: Json | null
          created_at?: string
          id?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      disease_predictions: {
        Row: {
          barangay_id: number
          confidence_level: number | null
          created_at: string
          disease_type: Database["public"]["Enums"]["disease_type"]
          id: string
          model_version: string | null
          predicted_cases: number
          prediction_data: Json | null
          prediction_date: string
        }
        Insert: {
          barangay_id: number
          confidence_level?: number | null
          created_at?: string
          disease_type: Database["public"]["Enums"]["disease_type"]
          id?: string
          model_version?: string | null
          predicted_cases: number
          prediction_data?: Json | null
          prediction_date: string
        }
        Update: {
          barangay_id?: number
          confidence_level?: number | null
          created_at?: string
          disease_type?: Database["public"]["Enums"]["disease_type"]
          id?: string
          model_version?: number | null
          predicted_cases?: number
          prediction_data?: Json | null
          prediction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "disease_predictions_barangay_id_fkey"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      diseases: {
        Row: {
          barangay_id: number
          created_at: string
          diagnosis_date: string
          disease_type: Database["public"]["Enums"]["disease_type"]
          id: string
          medical_record_id: string | null
          notes: string | null
          patient_id: string
          severity: Database["public"]["Enums"]["disease_severity"]
          status: Database["public"]["Enums"]["disease_status"]
          updated_at: string
        }
        Insert: {
          barangay_id: number
          created_at?: string
          diagnosis_date: string
          disease_type: Database["public"]["Enums"]["disease_type"]
          id?: string
          medical_record_id?: string | null
          notes?: string | null
          patient_id: string
          severity: Database["public"]["Enums"]["disease_severity"]
          status?: Database["public"]["Enums"]["disease_status"]
          updated_at?: string
        }
        Update: {
          barangay_id?: number
          created_at?: string
          diagnosis_date?: string
          disease_type?: Database["public"]["Enums"]["disease_type"]
          id?: string
          medical_record_id?: string | null
          notes?: string | null
          patient_id?: string
          severity?: Database["public"]["Enums"]["disease_severity"]
          status?: Database["public"]["Enums"]["disease_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diseases_barangay_id_fkey"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diseases_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diseases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string
          id: string
          max_patients_per_day: number | null
          schedule: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_patients_per_day?: number | null
          schedule?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_patients_per_day?: number | null
          schedule?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_response: string | null
          appointment_id: string
          comments: string | null
          created_at: string
          doctor_rating: number
          facility_rating: number
          id: string
          patient_id: string
          rating: number
          responded_at: string | null
          responded_by: string | null
          updated_at: string
          wait_time_rating: number
          would_recommend: boolean
        }
        Insert: {
          admin_response?: string | null
          appointment_id: string
          comments?: string | null
          created_at?: string
          doctor_rating: number
          facility_rating: number
          id?: string
          patient_id: string
          rating: number
          responded_at?: string | null
          responded_by?: string | null
          updated_at?: string
          wait_time_rating: number
          would_recommend?: boolean
        }
        Update: {
          admin_response?: string | null
          appointment_id?: string
          comments?: string | null
          created_at?: string
          doctor_rating?: number
          facility_rating?: number
          id?: string
          patient_id?: string
          rating?: number
          responded_at?: string | null
          responded_by?: string | null
          updated_at?: string
          wait_time_rating?: number
          would_recommend?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feedback_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_cards: {
        Row: {
          card_number: string
          created_at: string
          expiry_date: string | null
          id: string
          is_active: boolean | null
          issue_date: string
          patient_id: string
          qr_code_data: string
          updated_at: string
        }
        Insert: {
          card_number: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string
          patient_id: string
          qr_code_data: string
          updated_at?: string
        }
        Update: {
          card_number?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string
          patient_id?: string
          qr_code_data?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_cards_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          appointment_id: string | null
          category: Database["public"]["Enums"]["medical_record_category"]
          created_at: string
          created_by_id: string
          diagnosis: string | null
          id: string
          is_encrypted: boolean | null
          notes: string | null
          patient_id: string
          prescription: string | null
          record_data: Json
          template_type: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          category: Database["public"]["Enums"]["medical_record_category"]
          created_at?: string
          created_by_id: string
          diagnosis?: string | null
          id?: string
          is_encrypted?: boolean | null
          notes?: string | null
          patient_id: string
          prescription?: string | null
          record_data: Json
          template_type?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          category?: Database["public"]["Enums"]["medical_record_category"]
          created_at?: string
          created_by_id?: string
          diagnosis?: string | null
          id?: string
          is_encrypted?: boolean | null
          notes?: string | null
          patient_id?: string
          prescription?: string | null
          record_data?: Json
          template_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_doctor_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: string | null
          id: string
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: string | null
          id?: string
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string | null
          id?: string
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          accessibility_requirements: string | null
          allergies: Json | null
          booking_count: number | null
          booking_number: string | null
          created_at: string
          current_medications: Json | null
          id: string
          medical_history: Json | null
          patient_number: string
          philhealth_number: string | null
          registration_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accessibility_requirements?: string | null
          allergies?: Json | null
          booking_count?: number | null
          booking_number?: string | null
          created_at?: string
          current_medications?: Json | null
          id?: string
          medical_history?: Json | null
          patient_number: string
          philhealth_number?: string | null
          registration_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accessibility_requirements?: string | null
          allergies?: Json | null
          booking_count?: number | null
          booking_number?: string | null
          created_at?: string
          current_medications?: Json | null
          id?: string
          medical_history?: Json | null
          patient_number?: string
          philhealth_number?: string | null
          registration_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_category: Database["public"]["Enums"]["admin_category"] | null
          approved_at: string | null
          approved_by: string | null
          assigned_service_id: number | null
          barangay_id: number | null
          contact_number: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          emergency_contact: Json | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          last_name: string
          license_number: string | null
          locale: string | null
          rejection_reason: string | null
          role: Database["public"]["Enums"]["user_role"]
          specialization: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          admin_category?: Database["public"]["Enums"]["admin_category"] | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_service_id?: number | null
          barangay_id?: number | null
          contact_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          emergency_contact?: Json | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id: string
          last_name: string
          license_number?: string | null
          locale?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialization?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          admin_category?: Database["public"]["Enums"]["admin_category"] | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_service_id?: number | null
          barangay_id?: number | null
          contact_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          emergency_contact?: Json | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          last_name?: string
          license_number?: string | null
          locale?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialization?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_barangay"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_assigned_service_id_fkey"
            columns: ["assigned_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: number
          is_active: boolean | null
          name: string
          requires_appointment: boolean | null
          requires_medical_record: boolean
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: number
          is_active?: boolean | null
          name: string
          requires_appointment?: boolean | null
          requires_medical_record?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: number
          is_active?: boolean | null
          name?: string
          requires_appointment?: boolean | null
          requires_medical_record?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_booking_number: { Args: never; Returns: string }
      generate_health_card_number: { Args: never; Returns: string }
      generate_patient_number: { Args: never; Returns: string }
      get_admin_category: {
        Args: never
        Returns: Database["public"]["Enums"]["admin_category"]
      }
      get_available_slots: {
        Args: { p_date: string }
        Returns: {
          available_slots: number
          time_slot: string
        }[]
      }
      get_next_queue_number: {
        Args: { p_appointment_date: string; p_service_id: number }
        Returns: number
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_active_appointment: {
        Args: { p_patient_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_doctor: { Args: never; Returns: boolean }
      is_patient: { Args: never; Returns: boolean }
      is_patient_appointment_owner: {
        Args: { appointment_patient_id: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_category:
        | "healthcard"
        | "hiv"
        | "pregnancy"
        | "general_admin"
        | "laboratory"
        | "immunization"
      appointment_status:
        | "scheduled"
        | "checked_in"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
        | "pending"
      change_type:
        | "status_change"
        | "doctor_assigned"
        | "doctor_unassigned"
        | "doctor_changed"
      disease_severity: "mild" | "moderate" | "severe" | "critical"
      disease_status: "active" | "recovered" | "deceased" | "ongoing_treatment"
      disease_type:
        | "hiv_aids"
        | "dengue"
        | "malaria"
        | "measles"
        | "rabies"
        | "pregnancy_complications"
        | "other"
      gender_type: "male" | "female" | "other"
      medical_record_category:
        | "general"
        | "healthcard"
        | "hiv"
        | "pregnancy"
        | "immunization"
      notification_type:
        | "appointment_reminder"
        | "approval"
        | "cancellation"
        | "feedback_request"
        | "general"
      user_role:
        | "super_admin"
        | "healthcare_admin"
        | "doctor"
        | "patient"
        | "general_admin"
        | "staff"
      user_status: "pending" | "active" | "inactive" | "rejected" | "suspended"
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
      admin_category: [
        "healthcard",
        "hiv",
        "pregnancy",
        "general_admin",
        "laboratory",
        "immunization",
      ],
      appointment_status: [
        "scheduled",
        "checked_in",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
        "pending",
      ],
      change_type: [
        "status_change",
        "doctor_assigned",
        "doctor_unassigned",
        "doctor_changed",
      ],
      disease_severity: ["mild", "moderate", "severe", "critical"],
      disease_status: ["active", "recovered", "deceased", "ongoing_treatment"],
      disease_type: [
        "hiv_aids",
        "dengue",
        "malaria",
        "measles",
        "rabies",
        "pregnancy_complications",
        "other",
      ],
      gender_type: ["male", "female", "other"],
      medical_record_category: [
        "general",
        "healthcard",
        "hiv",
        "pregnancy",
        "immunization",
      ],
      notification_type: [
        "appointment_reminder",
        "approval",
        "cancellation",
        "feedback_request",
        "general",
      ],
      user_role: [
        "super_admin",
        "healthcare_admin",
        "doctor",
        "patient",
        "general_admin",
        "staff",
      ],
      user_status: ["pending", "active", "inactive", "rejected", "suspended"],
    },
  },
} as const
