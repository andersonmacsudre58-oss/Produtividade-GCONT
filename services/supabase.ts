
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

// As chaves devem ser configuradas no painel do Render como Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Inicializa o cliente apenas se as credenciais estiverem presentes para evitar o erro "supabaseUrl is required"
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const supabaseService = {
  async getState(): Promise<AppState | null> {
    if (!supabase) {
      console.warn("Supabase não configurado. Operando em modo local.");
      return null;
    }
    
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

  async saveState(state: AppState) {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('app_data')
        .upsert({ id: 'current_state', state: state });

      if (error) throw error;
    } catch (e) {
      console.error("Erro ao salvar no Supabase:", e);
    }
  }
};
