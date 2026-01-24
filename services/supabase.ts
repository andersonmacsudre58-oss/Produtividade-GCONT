
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

// As chaves são injetadas pelo Vite via define no build time
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const isValid = supabaseUrl && supabaseAnonKey;

export const supabase: SupabaseClient | null = isValid 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const supabaseService = {
  isConfigured(): boolean {
    return !!supabase;
  },

  async getState(): Promise<AppState | null> {
    if (!supabase) return null;
    try {
      const { data } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .maybeSingle();
      return data?.state as AppState || null;
    } catch {
      return null;
    }
  },

  async saveState(localState: AppState): Promise<AppState> {
    if (!supabase) return localState;
    try {
      await supabase.from('app_data').upsert({ 
        id: 'current_state', 
        state: localState,
        updated_at: new Date().toISOString()
      });
      return localState;
    } catch {
      return localState;
    }
  },

  subscribeToChanges(onUpdate: (newState: AppState) => void) {
    if (!supabase) return () => {};
    const channel = supabase
      .channel('sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_data' }, (p) => {
        if (p.new && (p.new as any).state) onUpdate((p.new as any).state);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }
};
