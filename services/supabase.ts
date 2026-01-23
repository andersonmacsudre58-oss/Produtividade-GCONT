
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Task, Person, ServiceCategory, Particularity } from '../types';

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
    if (!supabase) return;
    
    try {
      const { data: remoteData } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .maybeSingle();

      const remoteState = remoteData?.state as AppState;
      
      let stateToSave = localState;

      if (remoteState) {
        const mergeById = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
          const map = new Map<string, T>();
          remote.forEach(item => map.set(item.id, item));
          local.forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        };

        stateToSave = {
          ...localState,
          tasks: mergeById(localState.tasks || [], remoteState.tasks || []),
          people: mergeById(localState.people || [], remoteState.people || []),
          particularities: mergeById(localState.particularities || [], remoteState.particularities || []),
          serviceCategories: mergeById(localState.serviceCategories || [], remoteState.serviceCategories || [])
        };
      }

      const { error } = await supabase
        .from('app_data')
        .upsert({ id: 'current_state', state: stateToSave });

      if (error) throw error;
      
      return stateToSave;
    } catch (e) {
      console.error("Erro ao salvar/mergear no Supabase:", e);
      throw e;
    }
  }
};
