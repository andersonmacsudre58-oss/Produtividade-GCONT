
import { AppState } from "../types";
import { dbService } from "./db";
import { supabaseService } from "./supabase";

export const apiService = {
  async loadState(): Promise<AppState | null> {
    try {
      // 1. Tenta buscar no Supabase (Banco Real)
      const cloudData = await supabaseService.getState();
      
      if (cloudData) {
        // Cache local para performance
        await dbService.save(cloudData);
        return cloudData;
      }

      // 2. Fallback: Offline ou primeira vez
      return await dbService.load();
    } catch (error) {
      console.error("Erro no carregamento Supabase:", error);
      return await dbService.load();
    }
  },

  async saveState(state: AppState): Promise<boolean> {
    try {
      // 1. Salva localmente (instantâneo)
      await dbService.save(state);

      // 2. Sincroniza com Supabase (Persistência)
      await supabaseService.saveState(state);
      
      return true;
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
      return false;
    }
  }
};
