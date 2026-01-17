
import { AppState } from "../types";
import { dbService } from "./db";
import { cloudDb } from "./cloudDb";

// Este ID é o nome do seu 'banco' dentro do Firebase. 
// Você pode mudar para o nome da sua empresa/projeto.
const GROUP_ID = "main_production_v1";

export const apiService = {
  async loadState(): Promise<AppState | null> {
    try {
      // 1. Tenta buscar na Nuvem (Firebase)
      const cloudData = await cloudDb.fetchState(GROUP_ID);
      
      if (cloudData) {
        // Se encontrou, atualiza o cache local do navegador
        await dbService.save(cloudData);
        return cloudData;
      }

      // 2. Fallback: Se estiver sem internet, usa o que está salvo no navegador
      return await dbService.load();
    } catch (error) {
      console.error("Erro no carregamento híbrido:", error);
      return await dbService.load();
    }
  },

  async saveState(state: AppState): Promise<boolean> {
    try {
      // 1. Salva no navegador (resultado instantâneo na tela)
      await dbService.save(state);

      // 2. Sincroniza com o Firebase (persistência permanente)
      await cloudDb.syncState(GROUP_ID, state);
      
      return true;
    } catch (error) {
      console.error("Erro ao persistir dados na nuvem:", error);
      return false;
    }
  }
};
