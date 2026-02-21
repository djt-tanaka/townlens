/**
 * Supabase DB スキーマの TypeScript 型定義。
 * supabase/migrations/ の SQL と整合させること。
 *
 * 注意: Supabase クライアントの型推論と互換するため、readonly を使用しない。
 * 各テーブルに Relationships フィールドが必須（postgrest-js v2.96+ の GenericTable 要件）。
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
          email: string;
          display_name: string | null;
          plan: "free" | "standard" | "premium";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          plan?: "free" | "standard" | "premium";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          plan?: "free" | "standard" | "premium";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      usage_records: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          report_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          report_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          month?: string;
          report_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_records_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          cities: string[];
          preset: string;
          status: "processing" | "completed" | "failed";
          result_json: Json | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cities: string[];
          preset: string;
          status?: "processing" | "completed" | "failed";
          result_json?: Json | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "processing" | "completed" | "failed";
          result_json?: Json | null;
          error_message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      api_cache: {
        Row: {
          cache_key: string;
          data: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          cache_key: string;
          data: Json;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          data?: Json;
          expires_at?: string;
        };
        Relationships: [];
      };
      municipalities: {
        Row: {
          area_code: string;
          city_name: string;
          prefecture: string;
          generated_at: string;
        };
        Insert: {
          area_code: string;
          city_name: string;
          prefecture: string;
          generated_at?: string;
        };
        Update: {
          city_name?: string;
          prefecture?: string;
          generated_at?: string;
        };
        Relationships: [];
      };
      city_rankings: {
        Row: {
          id: string;
          preset: string;
          area_code: string;
          city_name: string;
          prefecture: string;
          rank: number;
          star_rating: number;
          indicator_stars: Json;
          population: number | null;
          generated_at: string;
        };
        Insert: {
          id?: string;
          preset: string;
          area_code: string;
          city_name: string;
          prefecture: string;
          rank: number;
          star_rating: number;
          indicator_stars: Json;
          population?: number | null;
          generated_at?: string;
        };
        Update: {
          rank?: number;
          star_rating?: number;
          indicator_stars?: Json;
          population?: number | null;
          generated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
