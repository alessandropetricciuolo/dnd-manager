/**
 * Database types for Supabase
 * Generati/aggiornati da: supabase gen types typescript
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          nickname: string | null;
          is_player_public: boolean;
          fame_score: number;
          sessions_attended_count: number;
          role: "player" | "gm" | "admin";
          first_name: string | null;
          last_name: string | null;
          date_of_birth: string | null;
          phone: string | null;
          username: string | null;
          bio: string | null;
          portrait_url: string | null;
          is_gm_public: boolean;
          stat_combat: number;
          stat_roleplay: number;
          stat_lethality: string;
          notifications_disabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          nickname?: string | null;
          is_player_public?: boolean;
          fame_score?: number;
          sessions_attended_count?: number;
          role?: "player" | "gm" | "admin";
          first_name?: string | null;
          last_name?: string | null;
          date_of_birth?: string | null;
          phone?: string | null;
          username?: string | null;
          bio?: string | null;
          portrait_url?: string | null;
          is_gm_public?: boolean;
          stat_combat?: number;
          stat_roleplay?: number;
          stat_lethality?: string;
          notifications_disabled?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      achievements: {
        Row: {
          id: string;
          title: string;
          description: string;
          icon_name: string;
          points: number;
          is_incremental: boolean;
          max_progress: number;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          icon_name?: string;
          points?: number;
          is_incremental?: boolean;
          max_progress?: number;
          category?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["achievements"]["Insert"]>;
      };
      player_achievements: {
        Row: {
          id: string;
          player_id: string;
          achievement_id: string;
          current_progress: number;
          is_unlocked: boolean;
          unlocked_at: string | null;
        };
        Insert: {
          id?: string;
          player_id: string;
          achievement_id: string;
          current_progress?: number;
          is_unlocked?: boolean;
          unlocked_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["player_achievements"]["Insert"]>;
      };
      avatars: {
        Row: {
          id: string;
          name: string;
          image_url: string;
          is_default: boolean;
          required_achievement_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          image_url: string;
          is_default?: boolean;
          required_achievement_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["avatars"]["Insert"]>;
      };
      campaigns: {
        Row: {
          id: string;
          gm_id: string;
          name: string;
          description: string | null;
          is_public: boolean;
          type: "oneshot" | "quest" | "long" | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["campaigns"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
      };
      sessions: {
        Row: {
          id: string;
          campaign_id: string;
          title: string | null;
          scheduled_at: string;
          status: "scheduled" | "completed" | "cancelled";
          max_players: number;
          notes: string | null;
          location: string | null;
          dm_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sessions"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
      };
      wiki_entities: {
        Row: {
          id: string;
          campaign_id: string;
          type: "npc" | "monster" | "item" | "location" | "lore";
          name: string;
          content: Json;
          image_url: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["wiki_entities"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["wiki_entities"]["Insert"]>;
      };
      wiki_relationships: {
        Row: {
          id: string;
          campaign_id: string;
          source_id: string;
          target_id: string;
          label: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["wiki_relationships"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["wiki_relationships"]["Insert"]>;
      };
      maps: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          description: string | null;
          image_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["maps"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["maps"]["Insert"]>;
      };
      campaign_characters: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          image_url: string | null;
          sheet_file_path: string | null;
          background: string | null;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["campaign_characters"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["campaign_characters"]["Insert"]>;
      };
      secret_whispers: {
        Row: {
          id: string;
          campaign_id: string;
          sender_id: string;
          receiver_id: string;
          message: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          sender_id: string;
          receiver_id: string;
          message?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["secret_whispers"]["Insert"]>;
      };
    };
  };
}
