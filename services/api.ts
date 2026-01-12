
import { AppState } from "../types";

export const apiService = {
  async loadState(): Promise<AppState | null> {
    try {
      // Usamos um timeout curto para não travar a UI se o servidor estiver offline
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/state', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('API respondeu com erro, usando dados locais.');
        return null;
      }
      
      return await response.json();
    } catch (error) {
      // Em desenvolvimento local ou falha de rede, falha silenciosamente
      console.error("Servidor indisponível ou erro de rede:", error);
      return null;
    }
  },

  async saveState(state: AppState): Promise<boolean> {
    try {
      const response = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      return response.ok;
    } catch (error) {
      console.error("Erro ao sincronizar com o servidor:", error);
      return false;
    }
  }
};
