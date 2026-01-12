
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc 
} from "firebase/firestore";
import { AppState } from "../types";

/**
 * IMPORTANTE: Você deve criar um projeto no Firebase Console,
 * ativar o Firestore e colar suas credenciais aqui.
 */
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "seu-sender-id",
  appId: "seu-app-id"
};

// Inicializa o Firebase apenas se as chaves não forem as padrão
const isConfigured = firebaseConfig.apiKey !== "SUA_API_KEY_AQUI";

const app = isConfigured ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;

export const cloudDb = {
  listenToGroup(groupId: string, callback: (state: AppState) => void) {
    if (!db || !groupId) return () => {};
    
    const docRef = doc(db, "groups", groupId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as AppState);
      }
    });
  },

  async syncState(groupId: string, state: AppState) {
    if (!db || !groupId) return;
    try {
      const docRef = doc(db, "groups", groupId);
      await setDoc(docRef, state, { merge: true });
    } catch (error) {
      console.error("Erro ao sincronizar com Firestore:", error);
    }
  },

  async fetchState(groupId: string): Promise<AppState | null> {
    if (!db || !groupId) return null;
    try {
      const docRef = doc(db, "groups", groupId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as AppState;
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar do Firestore:", error);
      return null;
    }
  }
};
