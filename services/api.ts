
import { AppState } from "../types";
import { dbService } from "./db";
import { supabaseService } from "./supabase";

export const apiService = {
  async loadState(): Promise<AppState | null> {
    try {
      // 1. Tenta buscar da nuvem (fonte da verdade)
      const cloudData = await supabaseService.getState();
      
      if (cloudData) {
        // Atualiza o cache local para uso offline futuro
        await dbService.save(cloudData);
        return cloudData;
      }
      
      // 2. Se a nuvem estiver vazia ou offline, usa o local
      return await dbService.load();
    } catch (error) {
      console.error("Erro no carregamento híbrido:", error);
      return await dbService.load();
    }
  },

  async saveState(state: AppState): Promise<AppState | null> {
    try {
      // 1. Salva localmente primeiro para persistência imediata
      await dbService.save(state);

      // 2. Sincroniza com a nuvem
      const savedState = await supabaseService.saveState(state);
      
      return savedState || state;
    } catch (error) {
      console.error("Erro ao salvar dados na API:", error);
      return state;
    }
  }
};
