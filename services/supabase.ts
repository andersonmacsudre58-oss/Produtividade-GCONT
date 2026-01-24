
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

// O Vite injeta estas variáveis durante o npm run build
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Diagnóstico inicial para o desenvolvedor (visível no F12)
console.log("Supabase URL carregada:", supabaseUrl ? "Configurada ✅" : "Vazia ❌");
console.log("Supabase Key carregada:", supabaseAnonKey ? "Configurada ✅" : "Vazia ❌");

const isValidConfig = supabaseUrl.startsWith('http') && supabaseAnonKey.length > 10;

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
    if (!supabase) {
      console.warn("⚠️ Supabase não inicializado. Verifique as variáveis de ambiente no Render.");
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .maybeSingle();

      if (error) {
        console.error(`❌ Erro Supabase (${error.code}):`, error.message);
        if (error.code === '42P01') {
          console.error("DICA: A tabela 'app_data' não existe no seu banco de dados Supabase.");
        }
        if (error.message.includes('policy')) {
          console.error("DICA: Erro de permissão RLS. Execute o SQL de 'Acesso Público Total'.");
        }
        throw error;
      }
      
      return data?.state as AppState || null;
    } catch (e) {
      console.error("❌ Falha crítica ao ler da nuvem:", e);
      throw e;
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

      const { error } = await supabase
        .from('app_data')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error("❌ Erro ao salvar dados na nuvem:", error.message);
        throw error;
      }

      return localState;
    } catch (e) {
      console.error("❌ Falha crítica ao salvar na nuvem:", e);
      throw e;
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
          console.log("🔔 Sincronização em tempo real: Novos dados recebidos!");
          if (payload.new && (payload.new as any).state) {
            onUpdate((payload.new as any).state as AppState);
          }
        }
      )
      .subscribe((status) => {
        console.log("Status da conexão Realtime:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
