
import { GoogleGenAI } from "@google/genai";
import { Task, Person, ServiceCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getProductivityInsights(tasks: Task[], people: Person[], categories: ServiceCategory[]) {
  if (tasks.length === 0) return "Ainda não há dados para análise no período selecionado.";

  const prompt = `
    Analise os dados de produtividade de uma equipe focada em volumes de Processos e Notas Fiscais:
    
    Categorias: ${categories.map(c => c.name).join(', ')}
    
    Dados de Produção:
    ${tasks.map(t => {
      const p = people.find(person => person.id === t.personId);
      const c = categories.find(cat => cat.id === t.serviceCategoryId);
      return `- Data: ${t.date} | Colaborador: ${p?.name} | Serviço: ${c?.name} | Processos: ${t.processQuantity} | Notas Fiscais: ${t.invoiceQuantity}.`;
    }).join('\n')}
    
    Forneça uma análise comparativa:
    1. Quem está com maior volume de notas fiscais vs processos.
    2. Identifique tendências de sobrecarga ou eficiência.
    3. Sugira estratégias para equilibrar a produção.
    
    Responda em Português do Brasil de forma executiva e profissional.
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
