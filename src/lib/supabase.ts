import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

export const SUPABASE_BUCKET =
  (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined)?.trim() ||
  'digital-paithini-files';

export const AUTH_EMAIL_DOMAIN =
  (import.meta.env.VITE_AUTH_EMAIL_DOMAIN as string | undefined)?.trim() ||
  'digitalpaithini.local';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
