// Generated types placeholder.
// After running migrations, regenerate with:
//   npx supabase gen types typescript --project-id <ref> --schema public > lib/supabase/types.ts
//
// Until then, hand-rolled minimal types so the rest of the app type-checks.

export type Severity =
  | "info"
  | "monitor"
  | "minor_repair"
  | "major_repair"
  | "safety_hazard";

export type InspectionStatus = "in_progress" | "review" | "finalized" | "delivered";
export type PropertyType = "single_family" | "condo" | "townhouse" | "multi_family";
export type OccupancyStatus = "occupied" | "vacant";
export type UploadStatus = "queued" | "uploading" | "uploaded" | "failed";
export type TranscriptStatus = "pending" | "completed" | "failed";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";

export type SectionType =
  | "grounds"
  | "roof"
  | "exterior"
  | "structure"
  | "garage"
  | "attic"
  | "electrical"
  | "plumbing"
  | "hvac"
  | "water_heater"
  | "interior"
  | "kitchen"
  | "bathroom"
  | "laundry"
  | "fireplace"
  | "pool"
  | "outbuilding";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  license_number: string | null;
  license_state: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus | null;
  trial_ends_at: string | null;
  default_report_template_id: string | null;
  default_disclaimer: string | null;
  default_signature_url: string | null;
  onboarding_completed_at: string | null;
}

export interface Inspection {
  id: string;
  inspector_id: string;
  status: InspectionStatus;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  property_year_built: number | null;
  property_sqft: number | null;
  property_type: PropertyType | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  inspection_date: string | null;
  weather_conditions: string | null;
  temperature_f: number | null;
  occupancy_status: OccupancyStatus | null;
  utilities_on: Record<string, boolean>;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  delivered_at: string | null;
  pdf_url: string | null;
  share_url_slug: string | null;
}

export interface InspectionSection {
  id: string;
  inspection_id: string;
  section_type: SectionType;
  section_order: number;
  summary_text: string | null;
  inspector_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  inspection_id: string;
  section_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  caption: string | null;
  taken_at: string | null;
  upload_status: UploadStatus;
  ai_analysis: VisionAnalysis | null;
  order_in_section: number | null;
  created_at: string;
}

export interface VoiceNote {
  id: string;
  inspection_id: string;
  photo_id: string | null;
  section_id: string | null;
  storage_path: string;
  duration_seconds: number | null;
  transcript: string | null;
  transcript_status: TranscriptStatus;
  created_at: string;
}

export interface Finding {
  id: string;
  inspection_id: string;
  section_id: string | null;
  photo_id: string | null;
  severity: Severity;
  title: string;
  description: string;
  recommended_action: string | null;
  is_approved: boolean;
  inspector_edited: boolean;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface VisionAnalysis {
  primary_subject: string;
  section: SectionType;
  visible_defects: {
    defect: string;
    severity_guess: Severity;
    confidence: number;
  }[];
  equipment_data: {
    make?: string;
    model?: string;
    serial?: string;
    manufacture_date?: string;
    specifications?: string;
  };
  context_notes: string;
}

// Minimal Database shape so @supabase/ssr generics compile.
// Replace with `supabase gen types` output once the DB is provisioned.
export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User> & { id: string; email: string }; Update: Partial<User> };
      inspections: {
        Row: Inspection;
        Insert: Partial<Inspection> & { inspector_id: string; property_address: string };
        Update: Partial<Inspection>;
      };
      inspection_sections: {
        Row: InspectionSection;
        Insert: Partial<InspectionSection> & { inspection_id: string; section_type: SectionType };
        Update: Partial<InspectionSection>;
      };
      photos: {
        Row: Photo;
        Insert: Partial<Photo> & { inspection_id: string; storage_path: string };
        Update: Partial<Photo>;
      };
      voice_notes: {
        Row: VoiceNote;
        Insert: Partial<VoiceNote> & { inspection_id: string; storage_path: string };
        Update: Partial<VoiceNote>;
      };
      findings: {
        Row: Finding;
        Insert: Partial<Finding> & {
          inspection_id: string;
          severity: Severity;
          title: string;
          description: string;
        };
        Update: Partial<Finding>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
