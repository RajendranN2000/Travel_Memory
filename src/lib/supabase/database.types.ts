/**
 * Database types for the schema in supabase/migrations.
 * Regenerate after schema changes with:
 *   pnpm exec supabase gen types typescript --local > src/lib/supabase/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; avatar_path: string | null } & Timestamps;
        Insert: { id: string; display_name?: string | null; avatar_path?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null; avatar_path?: string | null };
        Relationships: [];
      };
      destinations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          country: string;
          region: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: { slug: string; name: string; country: string; region?: string | null; is_active?: boolean };
        Update: { name?: string; country?: string; region?: string | null; is_active?: boolean };
        Relationships: [];
      };
      themes: {
        Row: { id: string; destination_id: string; config: Json; version: number } & Timestamps;
        Insert: { destination_id: string; config?: Json; version?: number };
        Update: { config?: Json; version?: number };
        Relationships: [];
      };
      templates: {
        Row: {
          id: string;
          slug: string;
          name: string;
          family: string;
          layouts: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: { slug: string; name: string; family: string; layouts: string[]; is_active?: boolean };
        Update: { name?: string; family?: string; layouts?: string[]; is_active?: boolean };
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string;
          destination_slug: string;
          template_slug: string;
          layout: string;
          palette: string | null;
          start_date: string | null;
          end_date: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id: string;
          title?: string;
          description?: string;
          destination_slug: string;
          template_slug: string;
          layout?: string;
          palette?: string | null;
          start_date?: string | null;
          end_date?: string | null;
        };
        Update: {
          title?: string;
          description?: string;
          destination_slug?: string;
          template_slug?: string;
          layout?: string;
          palette?: string | null;
          start_date?: string | null;
          end_date?: string | null;
        };
        Relationships: [];
      };
      trip_photos: {
        Row: {
          id: string;
          trip_id: string;
          owner_id: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number;
          width: number;
          height: number;
          caption: string;
          location: string;
          taken_on: string | null;
          position: number;
          frame: Json;
        } & Timestamps;
        Insert: {
          id?: string;
          trip_id: string;
          owner_id: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number;
          width: number;
          height: number;
          caption?: string;
          location?: string;
          taken_on?: string | null;
          position?: number;
          frame?: Json;
        };
        Update: {
          caption?: string;
          location?: string;
          taken_on?: string | null;
          position?: number;
          frame?: Json;
          storage_path?: string;
          mime_type?: string;
          size_bytes?: number;
          width?: number;
          height?: number;
        };
        Relationships: [];
      };
      book_projects: {
        Row: {
          owner_id: string;
          id: string;
          trip_id: string;
          title: string;
          template_key: string;
          kind: string;
          page_count: number;
          width_mm: number;
          height_mm: number;
          created_at_ms: number;
          updated_at_ms: number;
          project: Json;
        };
        Insert: {
          owner_id: string;
          id: string;
          trip_id: string;
          title?: string;
          template_key: string;
          kind: string;
          page_count: number;
          width_mm: number;
          height_mm: number;
          created_at_ms: number;
          updated_at_ms: number;
          project: Json;
        };
        Update: Partial<{
          trip_id: string;
          title: string;
          template_key: string;
          kind: string;
          page_count: number;
          width_mm: number;
          height_mm: number;
          created_at_ms: number;
          updated_at_ms: number;
          project: Json;
        }>;
        Relationships: [];
      };
      reel_projects: {
        Row: { owner_id: string; trip_id: string; draft: Json | null; saved: Json | null; saved_at: string | null; updated_at_ms: number };
        Insert: { owner_id: string; trip_id: string; draft?: Json | null; saved?: Json | null; saved_at?: string | null; updated_at_ms: number };
        Update: Partial<{ draft: Json | null; saved: Json | null; saved_at: string | null; updated_at_ms: number }>;
        Relationships: [];
      };
      reel_exports: {
        Row: { owner_id: string; id: string; trip_id: string; meta: Json; created_at_ms: number };
        Insert: { owner_id: string; id: string; trip_id: string; meta: Json; created_at_ms: number };
        Update: Partial<{ meta: Json; created_at_ms: number }>;
        Relationships: [];
      };
      book_images: {
        Row: {
          owner_id: string;
          project_id: string;
          image_id: string;
          name: string;
          width: number;
          height: number;
          storage_path: string;
        };
        Insert: {
          owner_id: string;
          project_id: string;
          image_id: string;
          name?: string;
          width: number;
          height: number;
          storage_path: string;
        };
        Update: Partial<{ name: string; width: number; height: number; storage_path: string }>;
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          user_id: string | null;
          kind: "bug" | "suggestion" | "other";
          message: string;
          contact_email: string | null;
          page: string | null;
          user_agent: string | null;
          status: "new" | "seen" | "done";
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          kind: "bug" | "suggestion" | "other";
          message: string;
          contact_email?: string | null;
          page?: string | null;
          user_agent?: string | null;
        };
        Update: { status?: "new" | "seen" | "done" };
        Relationships: [];
      };
      published_memories: {
        Row: {
          id: string;
          trip_id: string;
          owner_id: string;
          slug: string;
          visibility: "public" | "unlisted" | "private";
          allow_indexing: boolean;
          content: Json;
          photo_paths: string[];
          published_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          owner_id: string;
          slug: string;
          visibility: "public" | "unlisted" | "private";
          allow_indexing?: boolean;
          content: Json;
          photo_paths?: string[];
          published_at?: string;
        };
        Update: {
          slug?: string;
          visibility?: "public" | "unlisted" | "private";
          allow_indexing?: boolean;
          content?: Json;
          photo_paths?: string[];
          published_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_memory_reviews: {
        Args: { p_slug: string };
        Returns: Array<{ rating: number; comment: string; created_at: string; reviewer: string; is_mine: boolean }>;
      };
      submit_memory_review: { Args: { p_slug: string; p_rating: number; p_comment: string }; Returns: undefined };
      delete_my_memory_review: { Args: { p_slug: string }; Returns: undefined };
      get_published_memory: {
        Args: { p_slug: string };
        Returns: Array<{
          slug: string;
          visibility: "public" | "unlisted" | "private";
          allow_indexing: boolean;
          content: Json;
          photo_paths: string[];
          published_at: string;
          updated_at: string;
          is_owner: boolean;
        }>;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
