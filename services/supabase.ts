
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
      console.error("Erro ao carregar do Supabase:", e);
      return null;
    }
  },

  async saveState(localState: AppState) {
    if (!supabase) return localState;
    
    try {
      const stateToSave = {
        ...localState,
        tasks: localState.tasks || [],
        people: localState.people || [],
        particularities: localState.particularities || [],
        serviceCategories: localState.serviceCategories || []
      };

      const { error } = await supabase
        .from('app_data')
        .upsert({ 
          id: 'current_state', 
          state: stateToSave,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return stateToSave;
    } catch (e) {
      console.error("Erro ao salvar no Supabase:", e);
      return localState;
    }
  },

  /**
   * Assina mudanças em tempo real na tabela de dados.
   */
  subscribeToChanges(callback: (newState: AppState) => void) {
    if (!supabase) return () => {};

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_data',
          filter: 'id=eq.current_state'
        },
        (payload) => {
          if (payload.new && payload.new.state) {
            callback(payload.new.state as AppState);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
