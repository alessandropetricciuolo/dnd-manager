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
          /** Configurazione calendario fantasy per campagne long. */
          long_calendar_config: Json | null;
          /** Data base usata per derivare la data dei PG (campagne long). */
          long_calendar_base_date: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["campaigns"]["Row"],
          "created_at" | "updated_at" | "ai_context" | "image_style_prompt" | "ai_image_style_key" | "long_calendar_config" | "long_calendar_base_date"
        > & {
          ai_context?: Json | null;
          image_style_prompt?: string | null;
          ai_image_style_key?: string | null;
          long_calendar_config?: Json | null;
          long_calendar_base_date?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
      };
      sessions: {
        Row: {
          id: string;
          campaign_id: string | null;
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
      campaign_guilds: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          rank: "D" | "C" | "B" | "A" | "S";
          score: number;
          auto_rank: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          rank?: "D" | "C" | "B" | "A" | "S";
          score?: number;
          auto_rank?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_guilds"]["Insert"]>;
      };
      campaign_missions: {
        Row: {
          id: string;
          campaign_id: string;
          grade: string;
          title: string;
          committente: string;
          ubicazione: string;
          paga: string;
          urgenza: string;
          description: string;
          status: "open" | "completed";
          points_reward: number;
          completed_at: string | null;
          completed_by_guild_id: string | null;
          treasure_gp: number;
          treasure_sp: number;
          treasure_cp: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          grade: string;
          title: string;
          committente: string;
          ubicazione: string;
          paga: string;
          urgenza: string;
          description: string;
          status?: "open" | "completed";
          points_reward?: number;
          completed_at?: string | null;
          completed_by_guild_id?: string | null;
          treasure_gp?: number;
          treasure_sp?: number;
          treasure_cp?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_missions"]["Insert"]>;
      };
      campaign_memory_chunks: {
        Row: {
          id: string;
          campaign_id: string;
          source_type:
            | "wiki"
            | "character_background"
            | "session_summary"
            | "session_note"
            | "gm_note"
            | "secret_whisper"
            | "map_description";
          source_id: string;
          chunk_index: number;
          title: string;
          content: string;
          summary: string | null;
          metadata: Json;
          embedding: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["campaign_memory_chunks"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_memory_chunks"]["Insert"]>;
      };
      mission_encounters: {
        Row: {
          id: string;
          campaign_id: string;
          mission_id: string;
          name: string;
          notes: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          mission_id: string;
          name: string;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mission_encounters"]["Insert"]>;
      };
      mission_encounter_monsters: {
        Row: {
          id: string;
          encounter_id: string;
          wiki_entity_id: string;
          quantity: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          encounter_id: string;
          wiki_entity_id: string;
          quantity?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mission_encounter_monsters"]["Insert"]>;
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
          calendar_anchor_date: Json | null;
          calendar_anchor_hours: number | null;
          calendar_current_date: Json | null;
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
      gm_global_audio_tracks: {
        Row: {
          id: string;
          title: string;
          audio_type: "music" | "sfx" | "atmosphere";
          mood: string;
          storage_key: string;
          public_url: string;
          mime_type: string | null;
          file_size_bytes: number | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          audio_type: "music" | "sfx" | "atmosphere";
          mood?: string;
          storage_key: string;
          public_url: string;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["gm_global_audio_tracks"]["Insert"]>;
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
