
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
   * Salva o estado realizando um MERGE com os dados remotos.
   * Isso evita que Computer A apague o que Computer B acabou de salvar.
   */
  async saveState(localState: AppState) {
    if (!supabase) return localState;
    
    try {
      // 1. Busca a versão que está no servidor agora para comparar
      const { data: remoteData } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .maybeSingle();

      const remoteState = remoteData?.state as AppState;
      
      let stateToSave = localState;

      if (remoteState) {
        // Lógica de união (Merge):
        // Mantemos os itens locais (para suportar deleção e edição) 
        // mas adicionamos itens remotos que não temos (novas entradas de outros PCs)
        
        const mergeLists = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
          const remoteIds = new Set(remote.map(i => i.id));
          const localIds = new Set(local.map(i => i.id));
          
          // Itens que existem no remoto mas não no local PODEM ter sido deletados localmente.
          // Para simplificar e garantir que NADA seja perdido, vamos unir as listas 
          // priorizando o estado local para edições.
          const mergedMap = new Map<string, T>();
          
          remote.forEach(item => mergedMap.set(item.id, item));
          local.forEach(item => mergedMap.set(item.id, item)); // Local sobrescreve remoto em caso de conflito de ID
          
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

      // 2. Faz o Upsert do estado consolidado
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
