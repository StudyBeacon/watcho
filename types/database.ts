// ============================================
// WATCHTOGETHER — DATABASE TYPES
// Matches the schema in supabase/migrations/001_initial_schema.sql
// ============================================

export type UserRole = "owner" | "admin" | "member";
export type ChannelType = "text" | "voice" | "watch";
export type UserStatus = "online" | "idle" | "offline";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: UserStatus;
  created_at: string;
}

export interface Server {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
}

export interface ServerMember {
  server_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
  // Joined fields (when fetching with profile)
  profiles?: Pick<Profile, "id" | "username" | "avatar_url" | "status">;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: ChannelType;
  position: number;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  // Joined fields (when fetching with profile)
  profiles?: Pick<Profile, "id" | "username" | "avatar_url">;
}

export interface VoiceParticipant {
  channel_id: string;
  user_id: string;
  joined_at: string;
  is_screen_sharing: boolean;
  // Joined fields (when fetching with profile)
  profiles?: Pick<Profile, "id" | "username" | "avatar_url">;
}

export interface WatchSession {
  id: string;
  channel_id: string;
  video_source: string | null;
  video_url: string | null;
  video_title: string | null;
  is_playing: boolean;
  current_time_seconds: number;
  updated_by: string | null;
  updated_at: string;
}

export interface Ban {
  server_id: string;
  user_id: string;
  banned_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface Mute {
  server_id: string;
  user_id: string;
  muted_by: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

// ============================================
// SUPABASE TYPED CLIENT
// GenericSchema requires Tables, Views, Functions
// GenericTable requires Row, Insert, Update, Relationships
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          status?: UserStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          status?: UserStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      servers: {
        Row: Server;
        Insert: {
          name: string;
          owner_id: string;
          id?: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          owner_id?: string;
          id?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      server_members: {
        Row: ServerMember;
        Insert: {
          server_id: string;
          user_id: string;
          role?: UserRole;
          joined_at?: string;
        };
        Update: {
          role?: UserRole;
          server_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      channels: {
        Row: Channel;
        Insert: {
          server_id: string;
          name: string;
          type: ChannelType;
          id?: string;
          position?: number;
        };
        Update: {
          name?: string;
          type?: ChannelType;
          id?: string;
          position?: number;
        };
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: {
          channel_id: string;
          user_id: string;
          content: string;
          id?: string;
          created_at?: string;
          edited_at?: string | null;
        };
        Update: {
          content?: string;
          edited_at?: string | null;
          id?: string;
          channel_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      voice_participants: {
        Row: VoiceParticipant;
        Insert: {
          channel_id: string;
          user_id: string;
          joined_at?: string;
          is_screen_sharing?: boolean;
        };
        Update: {
          is_screen_sharing?: boolean;
          channel_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      watch_sessions: {
        Row: WatchSession;
        Insert: {
          channel_id: string;
          video_source?: string | null;
          video_url?: string | null;
          video_title?: string | null;
          is_playing?: boolean;
          current_time_seconds?: number;
          updated_by?: string | null;
          id?: string;
          updated_at?: string;
        };
        Update: {
          video_source?: string | null;
          video_url?: string | null;
          video_title?: string | null;
          is_playing?: boolean;
          current_time_seconds?: number;
          updated_by?: string | null;
          id?: string;
          channel_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bans: {
        Row: Ban;
        Insert: {
          server_id: string;
          user_id: string;
          banned_by?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          reason?: string | null;
        };
        Relationships: [];
      };
      mutes: {
        Row: Mute;
        Insert: {
          server_id: string;
          user_id: string;
          muted_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          expires_at?: string | null;
        };
        Relationships: [];
      };
      message_reactions: {
        Row: MessageReaction;
        Insert: {
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          emoji?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}