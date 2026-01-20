
import { GoogleGenAI } from "@google/genai";
import { Task, Person, ServiceCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getProductivityInsights(tasks: Task[], people: Person[], categories: ServiceCategory[]) {
  if (tasks.length === 0) return "Ainda não há dados para análise no período selecionado.";

  const prompt = `
    Analise os dados de produtividade de uma equipe focada em volumes de Processos e Notas Fiscais:
    
    Categorias: ${categories.map(c => c.name).join(', ')}
    
    Dados de Produção (Métricas: Atribuídos, Realizados, Notas Fiscais):
    ${tasks.map(t => {
      const p = people.find(person => person.id === t.personId);
      const c = categories.find(cat => cat.id === t.serviceCategoryId);
      return `- Data: ${t.date} | Colaborador: ${p?.name} | Serviço: ${c?.name} | Atribuídos: ${t.assignedProcesses || 0} | Realizados: ${t.processQuantity} | Notas Fiscais: ${t.invoiceQuantity}.`;
    }).join('\n')}
    
    Forneça uma análise comparativa e executiva:
    1. Vazão de Produção: Quem está conseguindo realizar mais em relação ao que foi atribuído (eficiência de entrega).
    2. Gargalos: Identifique se há alguém com muitos processos atribuídos mas baixa realização.
    3. Equilíbrio: Sugira como redistribuir processos atribuídos com base no histórico de notas fiscais emitidas.
    
    Responda em Português do Brasil de forma executiva, direta e profissional.
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
