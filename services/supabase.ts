
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const supabaseService = {
  async getState(): Promise<AppState | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .maybeSingle();
      if (error) throw error;
      return data?.state as AppState || null;
    } catch (e) {
      return null;
    }
  },

  async saveState(state: AppState) {
    if (!supabase) return state;
    try {
      await supabase
        .from('app_data')
        .upsert({ id: 'current_state', state });
      return state;
    } catch (e) {
      return state;
    }
  }
};
