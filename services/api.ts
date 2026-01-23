
import { AppState } from "../types";
import { dbService } from "./db";
import { supabaseService } from "./supabase";

export const apiService = {
  async loadState(): Promise<AppState | null> {
    try {
      // Prioridade absoluta para a nuvem para garantir dados frescos
      const cloudData = await supabaseService.getState();
      
      if (cloudData) {
        await dbService.save(cloudData);
        return cloudData;
      }
      
      // Fallback para local apenas se offline/sem dados na nuvem
      return await dbService.load();
    } catch (error) {
      console.error("Erro no carregamento:", error);
      return await dbService.load();
    }
  },

  async saveState(state: AppState): Promise<AppState | null> {
    try {
      // Salva local para agilidade da UI
      await dbService.save(state);
      
      // Envia para a nuvem (sobrescrevendo com a versão mais recente do usuário)
      const savedState = await supabaseService.saveState(state);
      
      return savedState || state;
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
      return state;
    }
  }
};
