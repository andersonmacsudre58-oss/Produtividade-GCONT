
import { AppState } from "../types";
import { dbService } from "./db";
import { supabaseService } from "./supabase";

export const apiService = {
  async loadState(): Promise<AppState | null> {
    try {
      // Prioridade total para a nuvem
      const cloudData = await supabaseService.getState();
      
      if (cloudData) {
        await dbService.save(cloudData);
        return cloudData;
      }
      
      // Se a nuvem retornar vazio (primeira vez), tenta o local
      return await dbService.load();
    } catch (error) {
      // Se der erro na nuvem (conexão/permissão), ainda tenta o local mas loga o erro
      console.warn("⚠️ Usando cache local devido a erro na nuvem.");
      return await dbService.load();
    }
  },

  async saveState(state: AppState): Promise<AppState | null> {
    // Salva local para não perder o trabalho em caso de queda de internet
    await dbService.save(state);

    try {
      // Tenta sincronizar
      await supabaseService.saveState(state);
      return state;
    } catch (error) {
      console.error("⚠️ Salvo apenas localmente.");
      return state;
    }
  }
};
