
import { AppState } from "../types";
import { dbService } from "./db";
import { supabaseService } from "./supabase";

export const apiService = {
  async loadState(): Promise<AppState | null> {
    try {
      // Tenta buscar da nuvem primeiro
      const cloudData = await supabaseService.getState();
      
      if (cloudData) {
        // Se houver dados na nuvem, atualiza o cache local
        await dbService.save(cloudData);
        return cloudData;
      }
      
      // Se a nuvem falhar ou estiver vazia, retorna o local
      return await dbService.load();
    } catch (error) {
      console.error("Erro no carregamento híbrido:", error);
      return await dbService.load();
    }
  },

  async saveState(state: AppState): Promise<AppState | null> {
    try {
      // 1. Salva localmente IMEDIATAMENTE (Garante que o usuário não perca nada se a internet cair)
      await dbService.save(state);

      // 2. Tenta sincronizar com a nuvem em segundo plano
      const savedState = await supabaseService.saveState(state);
      
      return savedState || state;
    } catch (error) {
      console.error("Erro ao salvar dados (API Gateway):", error);
      return state;
    }
  }
};
