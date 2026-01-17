
import { createClient } from '@supabase/supabase-js';
import { AppState } from '../types';

// As chaves devem ser configuradas no painel do Render como Environment Variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseService = {
  async getState(): Promise<AppState | null> {
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .single();

      if (error) throw error;
      return data?.state as AppState;
    } catch (e) {
      console.error("Erro ao carregar do Supabase:", e);
      return null;
    }
  },

  async saveState(state: AppState) {
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
