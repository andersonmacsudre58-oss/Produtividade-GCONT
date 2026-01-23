
import { AppState } from "../types";
import { dbService } from "./db";
import { supabaseService } from "./supabase";

export const apiService = {
  async loadState(): Promise<AppState | null> {
    try {
      const localData = await dbService.load();
      const cloudData = await supabaseService.getState();
      
      if (!cloudData) return localData;
      if (!localData) return cloudData;

      // Lógica de MERGE: Se a nuvem for mais nova, atualiza o local.
      // Caso contrário, mantém o local (que provavelmente tem dados novos que ainda não subiram)
      if (cloudData.updatedAt > localData.updatedAt) {
        await dbService.save(cloudData);
        return cloudData;
      }
      
      return localData;
    } catch (error) {
      console.error("Erro no carregamento inteligente:", error);
      return await dbService.load();
    }
  },

  async saveState(state: AppState): Promise<AppState | null> {
    try {
      // Garante que o estado sendo salvo tem o timestamp atualizado
      const stateWithTimestamp = {
        ...state,
        updatedAt: Date.now()
      };

      // 1. Persistência Local Imediata
      await dbService.save(stateWithTimestamp);
      
      // 2. Persistência em Nuvem
      const savedCloudState = await supabaseService.saveState(stateWithTimestamp);
      
      return savedCloudState || stateWithTimestamp;
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
      return state;
    }
  }
};
