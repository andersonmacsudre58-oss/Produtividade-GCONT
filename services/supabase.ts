
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

// O Vite injeta essas variáveis através do vite.config.ts durante a build
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const isValid = supabaseUrl.length > 10 && supabaseAnonKey.length > 10;

export const supabase: SupabaseClient | null = isValid 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.log("%cℹ️ Sincronização em nuvem desabilitada (Configuração ausente)", "color: #94a3b8; font-weight: bold;");
  console.log("Para habilitar a sincronização entre múltiplos computadores, configure SUPABASE_URL e SUPABASE_ANON_KEY nas configurações do projeto.");
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
        console.error("❌ Erro ao baixar dados:", error.message);
        return null;
      }
      
      return data?.state as AppState || null;
    } catch (err) {
      return null;
    }
  },

  async saveState(localState: AppState): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('app_data').upsert({ 
        id: 'current_state', 
        state: localState,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
      if (error) {
        console.error("❌ Falha na Sincronização:", error.message);
      } else {
        console.log("%c☁️ Enviado para Nuvem", "color: #10b981; font-weight: bold;");
      }
    } catch (err) {
      console.error("Erro crítico ao salvar:", err);
    }
  },

  subscribeToChanges(onUpdate: (newState: AppState) => void) {
    if (!supabase) return () => {};
    
    console.log("%c📡 Iniciando Escuta Real-time...", "color: #3b82f6; font-weight: bold;");
    
    const channel = supabase
      .channel('global_sync')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'app_data', filter: 'id=eq.current_state' }, 
        (payload) => {
          console.log("%c🔄 DADOS REMOTOS RECEBIDOS", "color: white; background: #6366f1; font-weight: bold; padding: 2px 6px; border-radius: 4px;");
          if (payload.new && (payload.new as any).state) {
            onUpdate((payload.new as any).state as AppState);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log("%c✅ CONECTADO AO SUPABASE REALTIME", "color: #10b981; font-weight: bold;");
        } else {
          console.log("📡 Status Realtime:", status);
        }
      });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
