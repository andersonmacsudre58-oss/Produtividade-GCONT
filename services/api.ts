
import { AppState } from "../types";

export const apiService = {
  async loadState(): Promise<AppState | null> {
    try {
      const response = await fetch('/api/state');
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
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
      return false;
    }
  }
};
