import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Type-safe wrapper for Supabase queries
 */
export async function withErrorHandling<T>(
  promise: Promise<{ data: T | null; error: any }>
): Promise<{ success: boolean; data: T | null; error: string | null }> {
  try {
    const { data, error } = await promise;
    if (error) {
      return { success: false, data: null, error: error.message };
    }
    return { success: true, data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, data: null, error: message };
  }
}
