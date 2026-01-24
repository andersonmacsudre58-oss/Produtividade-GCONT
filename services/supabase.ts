
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase: Chaves de configuração não encontradas. O sistema funcionará apenas em modo LOCAL.");
}

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

      if (error) {
        console.error("❌ Erro ao buscar dados no Supabase:", error.message);
        return null;
      }
      
      return data?.state as AppState || null;
    } catch (e) {
      console.error("❌ Falha crítica de conexão com Supabase:", e);
      return null;
    }
  },

  async saveState(localState: AppState): Promise<AppState> {
    if (!supabase) return localState;
    
    try {
      // Pequena pausa para evitar colisões de escrita extremamente rápidas
      const { error } = await supabase
        .from('app_data')
        .upsert({ 
          id: 'current_state', 
          state: localState,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        console.error("❌ Erro ao fazer Upsert no Supabase:", error.message);
        throw error;
      }

      console.log("✅ Sincronização com Supabase concluída.");
      return localState;
    } catch (e) {
      console.error("❌ Erro ao salvar no Supabase:", e);
      return localState;
    }
  },

  // Escuta mudanças em tempo real feitas por outros computadores
  subscribeToChanges(onUpdate: (newState: AppState) => void) {
    if (!supabase) return () => {};

    const channel = supabase
      .channel('app_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_data', filter: 'id=eq.current_state' },
        (payload) => {
          if (payload.new && (payload.new as any).state) {
            console.log("🔄 Dados atualizados remotamente recebidos via Realtime");
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
