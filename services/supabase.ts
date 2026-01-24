
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
      // 1. Busca dados atuais da nuvem para merge
      const { data: remoteData } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .maybeSingle();

      const remoteState = remoteData?.state as AppState;
      
      let stateToSave = localState;

      if (remoteState) {
        // Função de merge para listas: Mantém itens novos de outros PCs e atualiza os existentes
        const mergeLists = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
          const mergedMap = new Map<string, T>();
          // Adiciona remotos primeiro
          remote.forEach(item => mergedMap.set(item.id, item));
          // Sobrescreve com locais (o que você acabou de fazer tem prioridade)
          local.forEach(item => mergedMap.set(item.id, item));
          return Array.from(mergedMap.values());
        };

        stateToSave = {
          ...localState,
          people: mergeLists(localState.people || [], remoteState.people || []),
          tasks: mergeLists(localState.tasks || [], remoteState.tasks || []),
          particularities: mergeLists(localState.particularities || [], remoteState.particularities || []),
          serviceCategories: mergeLists(localState.serviceCategories || [], remoteState.serviceCategories || [])
        };
      }

      // 2. Salva o estado consolidado
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
  }
};
