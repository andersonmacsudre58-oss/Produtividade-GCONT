
import { AppState } from "../types";

export const apiService = {
  async loadState(): Promise<AppState | null> {
    try {
      const response = await fetch('/api/state');
      
      if (!response.ok) {
        console.warn('Servidor respondeu com erro, tentando novamente em instantes...');
        return null;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erro ao conectar com a API do Render:", error);
      return null;
    }
  },

  async saveState(state: AppState): Promise<boolean> {
    try {
      const response = await fetch('/api/state', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(state)
      });
      return response.ok;
    } catch (error) {
      console.error("Erro ao salvar dados no servidor:", error);
      return false;
    }
  }
};
