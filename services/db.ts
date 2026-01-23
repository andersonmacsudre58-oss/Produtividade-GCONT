
import { AppState } from "../types";

const DB_NAME = "Prod360DB";
const STORE_NAME = "appState";

export const dbService = {
  open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => (e.target as any).result.createObjectStore(STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async save(state: AppState): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(state, "current_state");
  },
  async load(): Promise<AppState | null> {
    const db = await this.open();
    return new Promise((resolve) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get("current_state");
      request.onsuccess = () => resolve(request.result || null);
    });
  }
};
