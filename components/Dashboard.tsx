
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
  const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]); // Estado para filtro multi-equipe
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Toggle de seleção de pessoa
  const togglePerson = (id: string) => {
    setSelectedPeopleIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const selectAllPeople = () => setSelectedPeopleIds([]);

  // Filtro centralizado por período e por equipe selecionada
  const filteredTasks = useMemo(() => {
    return state.tasks.filter(t => {
      const dateMatch = t.date >= startDate && t.date <= endDate;
      const personMatch = selectedPeopleIds.length === 0 || selectedPeopleIds.includes(t.personId);
      return dateMatch && personMatch;
    });
  }, [state.tasks, startDate, endDate, selectedPeopleIds]);

  // Atalhos de período
  const setRangePreset = (days: number) => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
  };

  // Evolução Diária
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

  // Ranking com Duas Barras (Somente pessoas que têm tarefas no período ou selecionadas)
  const teamData = useMemo(() => {
    const peopleToAnalyze = selectedPeopleIds.length > 0 
      ? state.people.filter(p => selectedPeopleIds.includes(p.id))
      : state.people;

    const data = peopleToAnalyze.map(person => {
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
  }, [filteredTasks, state.people, selectedPeopleIds]);

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
  
  const uniqueServicesCount = useMemo(() => {
    const serviceSet = new Set(filteredTasks.map(t => t.serviceCategoryId));
    return serviceSet.size;
  }, [filteredTasks]);

  return (
    <div className="space-y-8">
      {/* Bloco de Filtros: Data + Equipe */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 space-y-8">
        {/* Filtros de Data */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
                <Icons.Calendar />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight">Período de Análise</h3>
                <p className="text-xs text-slate-400 font-medium tracking-wide">Selecione o intervalo ou atalhos</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => setRangePreset(0)} className={`px-4 py-2 border rounded-xl text-[10px] font-black tracking-widest transition-all ${startDate === today ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>HOJE</button>
              <button onClick={() => setRangePreset(7)} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-black tracking-widest text-slate-400 transition-all">SEMANAL</button>
              <button onClick={() => setRangePreset(15)} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-black tracking-widest text-slate-400 transition-all">QUINZENAL</button>
              <button onClick={() => setRangePreset(30)} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-black tracking-widest text-slate-400 transition-all">MENSAL</button>
              <button onClick={() => setRangePreset(90)} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-black tracking-widest text-slate-400 transition-all">TRIMESTRAL</button>
              <button onClick={() => setRangePreset(365)} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-black tracking-widest text-slate-400 transition-all">ANUAL</button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex flex-col px-3">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-0.5">De</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none" />
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex flex-col px-3">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Até</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros de Equipe Multi-Seleção */}
        <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
              <Icons.People />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">Análise Individual / Grupo</h3>
              <p className="text-xs text-slate-400 font-medium tracking-wide">Filtre por um ou mais colaboradores</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              onClick={selectAllPeople}
              className={`px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all border ${selectedPeopleIds.length === 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-400'}`}
            >
              TODA A EQUIPE
            </button>
            {state.people.map(person => {
              const isSelected = selectedPeopleIds.includes(person.id);
              return (
                <button
                  key={person.id}
                  onClick={() => togglePerson(person.id)}
                  className={`px-5 py-2.5 rounded-2xl text-[11px] font-bold transition-all border flex items-center gap-2 ${isSelected ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600 animate-pulse' : 'bg-slate-200'}`}></div>
                  {person.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Processos</p>
          <p className="text-4xl font-black text-slate-900 mt-1">{totalProc}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Notas Fiscais</p>
          <p className="text-4xl font-black text-emerald-600 mt-1">{totalInv}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Analistas no Filtro</p>
          <p className="text-4xl font-black text-slate-900 mt-1">{selectedPeopleIds.length || state.people.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tipos de Serviços</p>
          <p className="text-4xl font-black text-blue-600 mt-1">{uniqueServicesCount}</p>
        </div>
      </div>

      {/* Gráfico Ranking de Equipe com Duas Barras */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
        <h3 className="text-xl font-extrabold text-slate-800 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            Desempenho Selecionado: Processos <span className="text-blue-500">●</span> vs Notas <span className="text-emerald-500">●</span>
          </div>
          {selectedPeopleIds.length > 0 && (
            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Visão Individual/Grupo</span>
          )}
        </h3>
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
              <Bar dataKey="processos" name="Qtd. Processos" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
              <Bar dataKey="notas" name="Qtd. Notas Fiscais" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <h3 className="text-xl font-extrabold text-slate-800 mb-8">Evolução da Carga</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={(val) => val.split('-').reverse().slice(0, 2).join('/')} fontSize={10} stroke="#94a3b8" />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="processos" name="Processos" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={3} />
                <Area type="monotone" dataKey="notas" name="Notas" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <h3 className="text-xl font-extrabold text-slate-800 mb-8">Volume por Categoria</h3>
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
              Diagnóstico estratégico focado nos filtros aplicados: <strong>{selectedPeopleIds.length || 'Toda a Equipe'}</strong> colaboradores selecionados.
            </p>
            {!aiInsight && !loadingAi && (
              <button onClick={handleGetInsights} className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-2xl">Gerar Análise IA</button>
            )}
          </div>
          {loadingAi && <div className="animate-spin h-12 w-12 border-4 border-white/20 border-t-white rounded-full"></div>}
          {aiInsight && !loadingAi && (
            <div className="flex-1 bg-white/5 backdrop-blur-3xl rounded-[32px] p-8 border border-white/10 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="text-base leading-relaxed whitespace-pre-wrap font-medium text-slate-200">{aiInsight}</div>
              <button onClick={() => setAiInsight(null)} className="mt-6 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest">Limpar Análise</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
