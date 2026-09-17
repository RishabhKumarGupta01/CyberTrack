/**
 * CryptoTrace Intelligence Platform — Supabase Client & Connection Engine
 * 
 * Provides typed connection to Supabase Auth and PostgreSQL Database.
 * Gracefully detects whether cloud credentials are configured.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : (globalThis as any).process?.env?.VITE_SUPABASE_URL)?.trim();
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : (globalThis as any).process?.env?.VITE_SUPABASE_ANON_KEY)?.trim();

/**
 * Checks if Supabase has been configured with non-empty URL and Key.
 */
export function isSupabaseConfigured(): boolean {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.length > 0 &&
    supabaseUrl.startsWith('http') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 0
  );
}

// Fallback dummy URL to allow client initialization even before user sets .env keys
const DEFAULT_URL = 'https://placeholder.supabase.co';
const DEFAULT_KEY = 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl! : DEFAULT_URL,
  isSupabaseConfigured() ? supabaseAnonKey! : DEFAULT_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);
