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
          whatsapp_opt_in: boolean;
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
          whatsapp_opt_in?: boolean;
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
      ai_image_styles: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          positive_prompt: string;
          negative_prompt: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          positive_prompt: string;
          negative_prompt?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_image_styles"]["Insert"]>;
      };
      admin_communications: {
        Row: {
          id: string;
          subject: string;
          body_html: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject: string;
          body_html: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_communications"]["Insert"]>;
      };
      admin_communication_recipients: {
        Row: {
          id: string;
          communication_id: string;
          player_id: string;
          recipient_email: string | null;
          status: "pending" | "sent" | "failed" | "skipped_no_email";
          sent_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          communication_id: string;
          player_id: string;
          recipient_email?: string | null;
          status?: "pending" | "sent" | "failed" | "skipped_no_email";
          sent_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_communication_recipients"]["Insert"]>;
      };
      campaigns: {
        Row: {
          id: string;
          gm_id: string;
          name: string;
          description: string | null;
          is_public: boolean;
          /** Se false, i player non possono iscriversi da soli (campagna Long pubblica). */
          long_registrations_open?: boolean;
          type: "oneshot" | "quest" | "long" | null;
          image_url: string | null;
          image_style_prompt: string | null;
          ai_image_style_key: string | null;
          /** Contesto strutturato dall'Agente Architetto (AI): tono, magia, meccaniche, paletti visivi. */
          ai_context: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["campaigns"]["Row"],
          "created_at" | "updated_at" | "ai_context" | "image_style_prompt" | "ai_image_style_key"
        > & { ai_context?: Json | null; image_style_prompt?: string | null; ai_image_style_key?: string | null };
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
          include_in_campaign_ai_memory: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["wiki_entities"]["Row"],
          "created_at" | "updated_at" | "include_in_campaign_ai_memory"
        > & { include_in_campaign_ai_memory?: boolean };
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
          map_type: string;
          visibility: string;
          parent_map_id: string | null;
          telegram_fallback_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["maps"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["maps"]["Insert"]>;
      };
      portals: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          pos_x_grid: number;
          pos_y_grid: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["portals"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["portals"]["Insert"]>;
      };
      campaign_email_settings: {
        Row: {
          campaign_id: string;
          join_enabled: boolean;
          join_subject: string;
          join_body_html: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["campaign_email_settings"]["Row"], "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_email_settings"]["Insert"]>;
      };
      campaign_bulk_email_templates: {
        Row: {
          id: string;
          campaign_id: string;
          subject: string;
          body_html: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["campaign_bulk_email_templates"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_bulk_email_templates"]["Insert"]>;
      };
      campaign_characters: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          image_url: string | null;
          sheet_file_path: string | null;
          current_xp: number;
          level: number;
          character_class: string | null;
          class_subclass: string | null;
          armor_class: number | null;
          hit_points: number | null;
          background: string | null;
          race_slug: string | null;
          subclass_slug: string | null;
          background_slug: string | null;
          rules_snapshot: Json;
          assigned_to: string | null;
          time_offset_hours: number;
          pos_x_grid: number;
          pos_y_grid: number;
          coins_gp: number;
          coins_sp: number;
          coins_cp: number;
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
      leads: {
        Row: {
          id: string;
          name: string;
          email: string;
          experience_level: string | null;
          source: string | null;
          marketing_opt_in: boolean;
          status: "new" | "contacted" | "converted" | "archived";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          experience_level?: string | null;
          source?: string | null;
          marketing_opt_in?: boolean;
          status?: "new" | "contacted" | "converted" | "archived";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
      };
      session_feedback: {
        Row: {
          id: string;
          session_id: string;
          campaign_id: string;
          player_id: string;
          session_rating: number;
          campaign_rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["session_feedback"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["session_feedback"]["Insert"]>;
      };
      campaign_exploration_maps: {
        Row: {
          id: string;
          campaign_id: string;
          floor_label: string;
          sort_order: number;
          image_path: string;
          grid_cell_meters: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          floor_label?: string;
          sort_order?: number;
          image_path: string;
          grid_cell_meters?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_exploration_maps"]["Insert"]>;
      };
      campaign_exploration_fow_regions: {
        Row: {
          id: string;
          map_id: string;
          polygon: Json;
          is_revealed: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          map_id: string;
          polygon: Json;
          is_revealed?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_exploration_fow_regions"]["Insert"]>;
      };
    };
  };
}
