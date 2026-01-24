
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Log para debug (ajuda o desenvolvedor a ver se as chaves foram injetadas)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase: Chaves de configuração não encontradas. O sistema funcionará apenas em modo LOCAL (Offline).");
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
      // Validação de sanidade: Não salva se o estado parecer corrompido ou vazio demais
      // (Ex: se não houver pessoas E não houver tarefas, mas o estado anterior tinha dados)
      // Isso previne que um erro de inicialização apague o banco de dados.
      
      const { data: existing } = await supabase
        .from('app_data')
        .select('state')
        .eq('id', 'current_state')
        .maybeSingle();

      const remoteState = existing?.state as AppState;

      // Se temos dados remotos e o local está suspeitosamente vazio, abortamos o overwrite
      if (remoteState && 
          localState.people.length === 0 && 
          remoteState.people.length > 5) {
          console.error("🛑 Bloqueio de Sincronização: Tentativa de sobrescrever dados remotos com uma lista local vazia.");
          return remoteState;
      }

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

      console.log("✅ Sincronização com Supabase concluída com sucesso.");
      return localState;
    } catch (e) {
      console.error("❌ Erro ao salvar no Supabase:", e);
      return localState;
    }
  }
};
