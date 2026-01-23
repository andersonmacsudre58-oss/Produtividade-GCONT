
import { AppState } from "../types";
import { dbService } from "./db";
import { supabaseService } from "./supabase";

export const apiService = {
  async loadState(): Promise<AppState | null> {
    try {
      const cloudData = await supabaseService.getState();
      
      if (cloudData) {
        await dbService.save(cloudData);
        return cloudData;
      }
      return await dbService.load();
    } catch (error) {
      console.error("Erro no carregamento Supabase:", error);
      return await dbService.load();
    }
  },

  async saveState(state: AppState): Promise<AppState | null> {
    try {
      // 1. Salva localmente primeiro (IndexedDB) para garantir persistência offline
      await dbService.save(state);

      // 2. Tenta sincronizar com a nuvem
      // Agora o supabaseService.saveState apenas sobrescreve com a versão local mais recente
      const savedState = await supabaseService.saveState(state);
      
      if (savedState) {
        // Atualiza o banco local com a confirmação do que foi para a nuvem
        await dbService.save(savedState);
        return savedState;
      }
      
      return state;
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
      // Se falhar a nuvem, o dado já está no IndexedDB (passo 1)
      return state;
    }
  }
};
