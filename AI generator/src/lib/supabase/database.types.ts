import type { AspectRatioId, JobStatus, StyleId, UserRole } from "@/lib/constants";

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  monthly_generation_limit: number;
  created_at: string;
  updated_at: string;
};

export type UserPreference = {
  user_id: string;
  default_style: StyleId;
  default_aspect_ratio: AspectRatioId;
  updated_at: string;
};

export type GenerationJob = {
  id: string;
  user_id: string;
  prompt: string;
  style: StyleId;
  aspect_ratio: AspectRatioId;
  status: JobStatus;
  error_code: string | null;
  error_message: string | null;
  provider: string;
  provider_request_id: string | null;
  provider_output_url: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type GeneratedImage = {
  id: string;
  job_id: string;
  user_id: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  byte_size: number | null;
  width: number | null;
  height: number | null;
  prompt: string;
  style: StyleId;
  aspect_ratio: AspectRatioId;
  created_at: string;
};

export type Favorite = {
  user_id: string;
  image_id: string;
  created_at: string;
};

export type UsageRecord = {
  id: string;
  user_id: string;
  job_id: string | null;
  kind: "generation_success" | "generation_failed";
  units: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "email">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      user_preferences: {
        Row: UserPreference;
        Insert: Partial<UserPreference> & Pick<UserPreference, "user_id">;
        Update: Partial<UserPreference>;
        Relationships: [];
      };
      generation_jobs: {
        Row: GenerationJob;
        Insert: Partial<GenerationJob> &
          Pick<GenerationJob, "user_id" | "prompt" | "style" | "aspect_ratio" | "provider">;
        Update: Partial<GenerationJob>;
        Relationships: [];
      };
      generated_images: {
        Row: GeneratedImage;
        Insert: Partial<GeneratedImage> &
          Pick<
            GeneratedImage,
            "job_id" | "user_id" | "storage_path" | "mime_type" | "prompt" | "style" | "aspect_ratio"
          >;
        Update: Partial<GeneratedImage>;
        Relationships: [];
      };
      favorites: {
        Row: Favorite;
        Insert: Favorite;
        Update: Partial<Favorite>;
        Relationships: [];
      };
      usage_records: {
        Row: UsageRecord;
        Insert: Partial<UsageRecord> & Pick<UsageRecord, "user_id" | "kind">;
        Update: Partial<UsageRecord>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
