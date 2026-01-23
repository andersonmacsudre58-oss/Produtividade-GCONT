
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

  /**
   * Salva o estado atual no Supabase.
   * Para evitar que itens excluídos retornem, nós substituímos o estado remoto
   * pelo estado local atual. O merge de novos dados de outros usuários deve ser feito
   * explicitamente via botão de Sincronizar (loadState).
   */
  async saveState(localState: AppState) {
    if (!supabase) return localState;
    
    try {
      // Garantimos que a estrutura esteja correta antes de salvar
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
      // Em caso de erro, retornamos o estado local para não travar a UI
      return localState;
    }
  }
};
