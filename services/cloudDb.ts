
// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { AppState } from "../types";

/**
 * IMPORTANTE: Substitua os valores abaixo com os dados do seu 
 * Console Firebase > Configurações do Projeto > Seus Aplicativos (Web)
 */
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "987654321",
  appId: "1:987654321:web:abc123def456"
};

const isConfigured = firebaseConfig.apiKey !== "SUA_API_KEY_AQUI";
let db: any = null;

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("✅ Firebase Database Conectado!");
  } catch (e) {
    console.error("❌ Erro ao conectar Firebase:", e);
  }
}

export const cloudDb = {
  // Busca o estado inicial
  async fetchState(groupId: string): Promise<AppState | null> {
    if (!db) return null;
    try {
      const docRef = doc(db, "productivity_data", groupId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as AppState;
      }
      return null;
    } catch (e) {
      console.error("Erro ao buscar dados na nuvem:", e);
      return null;
    }
  },

  // Salva o estado permanentemente
  async syncState(groupId: string, state: AppState) {
    if (!db) return;
    try {
      const docRef = doc(db, "productivity_data", groupId);
      // 'merge: true' garante que ele não apague campos novos se houver atualização parcial
      await setDoc(docRef, state, { merge: true });
    } catch (e) {
      console.error("Erro ao sincronizar com a nuvem:", e);
    }
  }
};
