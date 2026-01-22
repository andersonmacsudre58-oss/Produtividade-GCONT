
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Task, Person, ServiceCategory } from '../types';

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
   * SALVAMENTO SEGURO COM MERGE
   * Resolve o problema de "atropelamento" de dados entre múltiplos computadores.
   */
  async saveState(localState: AppState) {
    if (!supabase) return;
    
    try {
      // 1. Busca a versão mais recente que está no servidor agora
      const { data: remoteData } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .maybeSingle();

      const remoteState = remoteData?.state as AppState;
      
      let stateToSave = localState;

      if (remoteState) {
        // 2. Lógica de MERGE: Unir listas evitando duplicados pelo ID
        // Isso garante que se o Computador B adicionou algo, o Computador A não apague ao salvar.
        
        const mergeById = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
          const map = new Map<string, T>();
          // Adiciona os remotos primeiro (prioridade para o que já está no banco)
          remote.forEach(item => map.set(item.id, item));
          // Sobrescreve/Adiciona com os locais (mudanças atuais)
          local.forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        };

        stateToSave = {
          ...localState,
          tasks: mergeById(localState.tasks, remoteState.tasks),
          people: mergeById(localState.people, remoteState.people),
          serviceCategories: mergeById(localState.serviceCategories, remoteState.serviceCategories)
        };
      }

      // 3. Salva o estado consolidado
      const { error } = await supabase
        .from('app_data')
        .upsert({ id: 'current_state', state: stateToSave });

      if (error) throw error;
      
      return stateToSave; // Retorna o estado mergeado para atualizar a UI local
    } catch (e) {
      console.error("Erro ao salvar/mergear no Supabase:", e);
      throw e;
    }
  }
};
