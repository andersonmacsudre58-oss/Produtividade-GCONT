
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
      console.error("Erro no carregamento:", error);
      return await dbService.load();
    }
  },

  async saveState(state: AppState): Promise<AppState> {
    try {
      await dbService.save(state);
      await supabaseService.saveState(state);
      return state;
    } catch (error) {
      console.error("Erro ao salvar:", error);
      return state;
    }
  }
};
