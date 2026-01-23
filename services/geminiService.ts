
import { GoogleGenAI } from "@google/genai";
import { Task, Person, ServiceCategory, Particularity } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getProductivityInsights(tasks: Task[], people: Person[], categories: ServiceCategory[], particularities: Particularity[] = []) {
  if (tasks.length === 0) return "Ainda não há dados para análise no período selecionado.";

  const prompt = `
    Analise os dados de produtividade de uma equipe focada em volumes de Processos e Notas Fiscais, considerando também particularidades/ocorrências do período:
    
    Categorias de Serviço: ${categories.map(c => c.name).join(', ')}
    
    Dados de Produção (Métricas: Atribuídos, Realizados, Notas Fiscais):
    ${tasks.map(t => {
      const p = people.find(person => person.id === t.personId);
      const c = categories.find(cat => cat.id === t.serviceCategoryId);
      return `- Data: ${t.date} | Colaborador: ${p?.name} | Serviço: ${c?.name} | Atribuídos: ${t.assignedProcesses || 0} | Realizados: ${t.processQuantity} | Notas Fiscais: ${t.invoiceQuantity}.`;
    }).join('\n')}

    Ocorrências/Particularidades Registradas:
    ${particularities.length > 0 ? particularities.map(p => {
      const per = people.find(person => person.id === p.personId);
      return `- Data: ${p.date} | Colaborador: ${per?.name} | Tipo: ${p.type} | Descrição: ${p.description}`;
    }).join('\n') : 'Nenhuma ocorrência registrada.'}
    
    Forneça uma análise comparativa e executiva:
    1. Vazão de Produção: Quem está conseguindo realizar mais em relação ao que foi atribuído.
    2. Gargalos e Contexto: Identifique quedas de produtividade e verifique se elas estão relacionadas às particularidades registradas (ex: se João produziu menos porque teve uma consulta médica).
    3. Equilíbrio Estratégico: Sugira como redistribuir processos considerando a capacidade atual impactada pelas ocorrências.
    
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
