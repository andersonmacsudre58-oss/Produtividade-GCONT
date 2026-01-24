
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

// O Vite substitui process.env.X por strings literais no build via o campo 'define'
const supabaseUrl = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || '';
const supabaseAnonKey = (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || '';

const isValidConfig = 
  typeof supabaseUrl === 'string' && 
  supabaseUrl.startsWith('http') && 
  typeof supabaseAnonKey === 'string' && 
  supabaseAnonKey.length > 10;

// Cliente Supabase instanciado apenas se as chaves forem válidas
export const supabase: SupabaseClient | null = isValidConfig 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const supabaseService = {
  isConfigured(): boolean {
    return !!supabase;
  },

  async getState(): Promise<AppState | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .maybeSingle();

      if (error) return null;
      return data?.state as AppState || null;
    } catch {
      return null;
    }
  },

  async saveState(localState: AppState): Promise<AppState> {
    if (!supabase) return localState;
    try {
      const payload = { 
        id: 'current_state', 
        state: localState,
        updated_at: new Date().toISOString()
      };
      await supabase.from('app_data').upsert(payload, { onConflict: 'id' });
      return localState;
    } catch {
      return localState;
    }
  },

  subscribeToChanges(onUpdate: (newState: AppState) => void) {
    if (!supabase) return () => {};
    try {
      const channel = supabase
        .channel('realtime_sync')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'app_data', filter: 'id=eq.current_state' },
          (payload) => {
            if (payload.new && (payload.new as any).state) {
              onUpdate((payload.new as any).state as AppState);
            }
          }
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    } catch {
      return () => {};
    }
  }
};
