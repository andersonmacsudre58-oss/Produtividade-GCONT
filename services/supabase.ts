
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Validação rigorosa das chaves
const isValidConfig = supabaseUrl.startsWith('http') && supabaseAnonKey.length > 10;

export const supabase: SupabaseClient | null = isValidConfig 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.error("❌ Supabase não configurado ou chaves inválidas. Verifique SUPABASE_URL e SUPABASE_ANON_KEY.");
}

export const supabaseService = {
  isConfigured(): boolean {
    return !!supabase;
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
        console.error("❌ Erro ao buscar no Supabase:", error.message, error.details);
        return null;
      }
      
      return data?.state as AppState || null;
    } catch (e) {
      console.error("❌ Falha crítica de conexão:", e);
      return null;
    }
  },

  async saveState(localState: AppState): Promise<AppState> {
    if (!supabase) return localState;
    
    try {
      // Criamos um payload limpo (removemos campos temporários se houver)
      const payload = { 
        id: 'current_state', 
        state: localState,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('app_data')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error("❌ Erro ao salvar no Supabase:", error.message, error.details);
        // Se der erro de "Entity not found", verifique se a tabela 'app_data' existe.
        throw error;
      }

      console.log("✅ Dados sincronizados com a nuvem.");
      return localState;
    } catch (e) {
      console.error("❌ Exceção ao salvar:", e);
      return localState;
    }
  },

  subscribeToChanges(onUpdate: (newState: AppState) => void) {
    if (!supabase) return () => {};

    console.log("📡 Iniciando escuta de mudanças em tempo real...");
    
    const channel = supabase
      .channel('app_sync_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_data', filter: 'id=eq.current_state' },
        (payload) => {
          if (payload.new && (payload.new as any).state) {
            console.log("🔄 Mudança detectada em outro dispositivo. Atualizando...");
            onUpdate((payload.new as any).state as AppState);
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔌 Status da conexão Realtime: ${status}`);
      });

    return () => {
      console.log("📴 Encerrando escuta de mudanças.");
      supabase.removeChannel(channel);
    };
  }
};
