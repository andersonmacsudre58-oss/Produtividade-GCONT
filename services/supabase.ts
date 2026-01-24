
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

// Função para obter variáveis de ambiente de forma segura no navegador
const getSafeEnv = (key: string): string => {
  try {
    // Tenta acessar via process.env (injetado pelo Vite)
    return (typeof process !== 'undefined' && process.env && process.env[key]) || '';
  } catch (e) {
    return '';
  }
};

const supabaseUrl = getSafeEnv('SUPABASE_URL');
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY');

// Diagnóstico silencioso
const isValidConfig = !!supabaseUrl && supabaseUrl.startsWith('http') && !!supabaseAnonKey && supabaseAnonKey.length > 10;

export const supabase: SupabaseClient | null = isValidConfig 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const supabaseService = {
  isConfigured(): boolean {
    return !!supabase;
  },

  getConfigs() {
    return {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      isValid: isValidConfig
    };
  },

  async getState(): Promise<AppState | null> {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .maybeSingle();

      if (error) {
        console.warn(`Supabase: ${error.message}`);
        return null;
      }
      
      return data?.state as AppState || null;
    } catch (e) {
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

      await supabase
        .from('app_data')
        .upsert(payload, { onConflict: 'id' });

      return localState;
    } catch (e) {
      return localState;
    }
  },

  subscribeToChanges(onUpdate: (newState: AppState) => void) {
    if (!supabase) return () => {};

    const channel = supabase
      .channel('public_app_data_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_data', filter: 'id=eq.current_state' },
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
