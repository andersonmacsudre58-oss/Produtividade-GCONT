
import { GoogleGenAI } from "@google/genai";
import { Task, Person, ServiceCategory, Particularity } from "../types";

const getSafeApiKey = (): string => {
  try {
    return (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';
  } catch (e) {
    return '';
  }
};

const apiKey = getSafeApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function getProductivityInsights(tasks: Task[], people: Person[], categories: ServiceCategory[], particularities: Particularity[] = []) {
  if (!ai) return "IA não configurada. Verifique a API_KEY.";
  if (tasks.length === 0) return "Ainda não há dados para análise no período selecionado.";

  const prompt = `
    Analise os dados de produtividade de uma equipe:
    Categorias: ${categories.map(c => c.name).join(', ')}
    Produção: ${tasks.length} registros.
    Particularidades: ${particularities.length} registros.
    Forneça uma análise executiva sobre vazão, gargalos e equilíbrio da equipe em Português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Erro IA:", error);
    return "Falha ao gerar insights da IA.";
  }
}
