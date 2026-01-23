
import { GoogleGenAI } from "@google/genai";
import { Task, Person, ServiceCategory, Particularity } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getProductivityInsights(tasks: Task[], people: Person[], categories: ServiceCategory[], particularities: Particularity[] = []) {
  if (tasks.length === 0) return "Ainda não há dados para análise.";

  const prompt = `
    Analise os dados de produtividade de uma equipe:
    Categorias: ${categories.map(c => c.name).join(', ')}
    Produção: ${tasks.map(t => {
      const p = people.find(person => person.id === t.personId);
      const c = categories.find(cat => cat.id === t.serviceCategoryId);
      return `- ${p?.name}: ${t.processQuantity} realizados de ${t.assignedProcesses} atribuídos (${c?.name})`;
    }).join('\n')}
    Ocorrências: ${particularities.map(p => `- ${p.date}: ${p.type} (${p.description})`).join('\n')}
    Forneça uma análise executiva em Português sobre gargalos e vazão.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "Falha ao gerar insights da IA.";
  }
}
