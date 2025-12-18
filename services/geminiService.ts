
import { GoogleGenAI } from "@google/genai";
import { Task, Person, ServiceCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getProductivityInsights(tasks: Task[], people: Person[], categories: ServiceCategory[]) {
  if (tasks.length === 0) return "Ainda não há dados suficientes para uma análise.";

  const prompt = `
    Analise os seguintes dados de produção quantitativa de uma equipe:
    
    Categorias de Serviço Monitoradas: ${categories.map(c => c.name).join(', ')}
    Equipe: ${people.map(p => p.name).join(', ')}
    
    Registros de Produção:
    ${tasks.map(t => {
      const p = people.find(person => person.id === t.personId);
      const c = categories.find(cat => cat.id === t.serviceCategoryId);
      return `- ${t.date}: ${p?.name} realizou ${c?.name} (${t.description}) - Quantidade: ${t.quantity}.`;
    }).join('\n')}
    
    Por favor, forneça um resumo executivo baseado nos volumes produzidos, identifique quais categorias estão com maior volume e sugira melhorias. 
    Responda em Português do Brasil de forma profissional e motivadora.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao obter insights da IA:", error);
    return "Desculpe, não foi possível gerar insights no momento.";
  }
}
