
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { AppState } from '../types';
import { Icons } from '../constants';
import { getProductivityInsights } from '../services/geminiService';

interface DashboardProps {
  state: AppState;
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState<string>(lastMonth);
  const [endDate, setEndDate] = useState<string>(today);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Filtro por período
  const filteredTasks = useMemo(() => {
    return state.tasks.filter(t => t.date >= startDate && t.date <= endDate);
  }, [state.tasks, startDate, endDate]);

  // Evolução Diária (Volume total)
  const evolutionData = useMemo(() => {
    const dates: Record<string, any> = {};
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dates[dateStr] = { date: dateStr, processos: 0, notas: 0 };
    }

    filteredTasks.forEach(t => {
      if (dates[t.date]) {
        dates[t.date].processos += t.processQuantity;
        dates[t.date].notas += (t.invoiceQuantity || 0);
      }
    });

    return Object.values(dates).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredTasks, startDate, endDate]);

  // Ranking com Duas Barras (Processos e Notas)
  const teamData = useMemo(() => {
    const data = state.people.map(person => {
      const pTasks = filteredTasks.filter(t => t.personId === person.id);
      const totalProcessos = pTasks.reduce((sum, t) => sum + t.processQuantity, 0);
      const totalNotas = pTasks.reduce((sum, t) => sum + (t.invoiceQuantity || 0), 0);
      return {
        name: person.name,
        processos: totalProcessos,
        notas: totalNotas
      };
    });
    return data.sort((a, b) => b.processos - a.processos);
  }, [filteredTasks, state.people]);

  // Distribuição por Categoria
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    state.serviceCategories.forEach(cat => counts[cat.id] = 0);
    filteredTasks.forEach(t => {
      if (counts[t.serviceCategoryId] !== undefined) {
        counts[t.serviceCategoryId] += t.processQuantity;
      }
    });
    return state.serviceCategories.map(cat => ({
      name: cat.name,
      value: counts[cat.id],
      color: cat.color
    })).filter(item => item.value > 0);
  }, [filteredTasks, state.serviceCategories]);

  const handleGetInsights = async () => {
    setLoadingAi(true);
    const result = await getProductivityInsights(filteredTasks, state.people, state.serviceCategories);
    setAiInsight(result || "Análise concluída.");
    setLoadingAi(false);
  };

  const totalProc = filteredTasks.reduce((acc, t) => acc + t.processQuantity, 0);
  const totalInv = filteredTasks.reduce((acc, t) => acc + (t.invoiceQuantity || 0), 0);

  return (
    <div className="space-y-8">
      {/* Seletor de Período (Intervalo de Datas) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl text-white">
              <Icons.Calendar />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">Período de Análise</h3>
              <p className="text-xs text-slate-400 font-medium">Selecione o intervalo de datas</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <div className="flex flex-col px-3">
              <label className="text-[10px] font-black uppercase text-slate-400">De</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none"
              />
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col px-3">
              <label className="text-[10px] font-black uppercase text-slate-400">Até</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Processos</p>
          <p className="text-4xl font-black text-slate-900 mt-1">{totalProc}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Notas Fiscais</p>
          <p className="text-4xl font-black text-emerald-600 mt-1">{totalInv}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Equipe Ativa</p>
          <p className="text-4xl font-black text-slate-900 mt-1">{state.people.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Média Notas/Proc.</p>
          <p className="text-4xl font-black text-blue-600 mt-1">{totalProc > 0 ? (totalInv / totalProc).toFixed(1) : 0}</p>
        </div>
      </div>

      {/* Gráfico Ranking de Equipe com Duas Barras */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
        <h3 className="text-xl font-extrabold text-slate-800 mb-8">Desempenho da Equipe: Processos vs Notas</h3>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} fontWeight={700} stroke="#64748b" />
              <YAxis axisLine={false} tickLine={false} fontSize={11} stroke="#94a3b8" />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }} />
              <Bar dataKey="processos" name="Qtd. Processos" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20} />
              <Bar dataKey="notas" name="Qtd. Notas Fiscais" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Evolução Diária */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <h3 className="text-xl font-extrabold text-slate-800 mb-8">Evolução do Período</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => val.split('-').reverse().slice(0, 2).join('/')}
                  fontSize={10} stroke="#94a3b8" 
                />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="processos" name="Processos" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                <Area type="monotone" dataKey="notas" name="Notas" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por Categoria */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <h3 className="text-xl font-extrabold text-slate-800 mb-8">Carga por Categoria</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-600 p-3 rounded-2xl">
                <Icons.Sparkles />
              </div>
              <h2 className="text-3xl font-black tracking-tight">IA de Produção</h2>
            </div>
            <p className="text-slate-400 text-lg mb-10 max-w-lg leading-relaxed font-medium">
              Analise a relação entre **Processos** e **Notas Fiscais** emitidas pela sua equipe neste intervalo.
            </p>
            {!aiInsight && !loadingAi && (
              <button onClick={handleGetInsights} className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-2xl">Gerar Análise Estratégica</button>
            )}
          </div>
          {loadingAi && <div className="animate-spin h-12 w-12 border-4 border-white/20 border-t-white rounded-full"></div>}
          {aiInsight && !loadingAi && (
            <div className="flex-1 bg-white/5 backdrop-blur-3xl rounded-[32px] p-8 border border-white/10 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="text-base leading-relaxed whitespace-pre-wrap font-medium text-slate-200">{aiInsight}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
