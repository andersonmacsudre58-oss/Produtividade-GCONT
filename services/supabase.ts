
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

// O Vite injeta essas variáveis no momento do 'npm run build' no Render
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const isValid = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

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
      const { data, error } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .maybeSingle();
      
      if (error) throw error;
      return data?.state as AppState || null;
    } catch (err) {
      console.error("Erro ao buscar dados na nuvem:", err);
      return null;
    }
  },

  async saveState(localState: AppState): Promise<AppState> {
    if (!supabase) return localState;
    try {
      const { error } = await supabase.from('app_data').upsert({ 
        id: 'current_state', 
        state: localState,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
      if (error) throw error;
      return localState;
    } catch (err) {
      console.error("Erro ao salvar dados na nuvem:", err);
      return localState;
    }
  },

  subscribeToChanges(onUpdate: (newState: AppState) => void) {
    if (!supabase) return () => {};
    
    const channel = supabase
      .channel('global_sync')
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
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
