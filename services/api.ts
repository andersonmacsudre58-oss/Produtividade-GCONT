
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
      // 1. Salva localmente para persistência offline imediata
      await dbService.save(state);

      // 2. Sincroniza com Supabase usando lógica de MERGE
      // O mergedState contém os dados locais + quaisquer dados que outros computadores enviaram
      const mergedState = await supabaseService.saveState(state);
      
      if (mergedState) {
        await dbService.save(mergedState);
        return mergedState;
      }
      
      return state;
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
      return null;
    }
  }
};
