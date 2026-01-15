import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for public access (client-side)
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Client for backend access (admin/cron)
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  : undefined;


// Helper type for database
export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          event_type: 'conflict' | 'protest' | 'civil_unrest' | 'armed_clash' | 'demonstration' | 'other';
          severity: 'red' | 'yellow' | 'green';
          country: string | null;
          admin1: string | null;
          city: string | null;
          latitude: number;
          longitude: number;
          source_url: string[] | null;
          source_name: string[] | null;
          occurred_at: string;
          created_at: string;
          updated_at: string;
          dedup_hash: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          event_type?: string;
          severity?: string;
          country?: string | null;
          admin1?: string | null;
          city?: string | null;
          latitude: number;
          longitude: number;
          source_url?: string[] | null;
          source_name?: string[] | null;
          occurred_at?: string;
          created_at?: string;
          updated_at?: string;
          dedup_hash?: string | null;
        };
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
    };
  };
};
