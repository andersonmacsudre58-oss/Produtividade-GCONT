
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LabelList
} from 'recharts';
import { AppState, Task, ServiceCategory, Particularity } from '../types';
import { Icons, PRESET_COLORS } from '../constants';
import { getProductivityInsights } from '../services/geminiService';

interface DashboardProps {
  state: AppState;
  onRefresh?: () => Promise<void>;
}

type PeriodPreset = 'hoje' | 'semanal' | 'quinzenal' | 'mensal' | 'trimestral' | 'anual' | 'custom';
type DashboardSubTab = 'pagamento' | 'licitacao-diaria';

const Dashboard: React.FC<DashboardProps> = ({ state, onRefresh }) => {
  const getLocalDateStr = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(getLocalDateStr());
  const [activePreset, setActivePreset] = useState<PeriodPreset>('mensal');
  const [activeSubTab, setActiveSubTab] = useState<DashboardSubTab>('pagamento');
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const now = new Date();
    let start = new Date();

    switch (activePreset) {
      case 'hoje': break;
      case 'semanal': start.setDate(now.getDate() - 7); break;
      case 'quinzenal': start.setDate(now.getDate() - 15); break;
      case 'mensal': start.setDate(now.getDate() - 30); break;
      case 'trimestral': start.setDate(now.getDate() - 90); break;
      case 'anual': start.setDate(now.getDate() - 365); break;
      case 'custom': return;
    }

    setStartDate(getLocalDateStr(start));
    setEndDate(getLocalDateStr(now));
  }, [activePreset]);

  // Filtro base por data
  const tasksByDate = useMemo(() => {
    return (state.tasks || []).filter(t => {
      return (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
    });
  }, [state.tasks, startDate, endDate]);

  // Filtro por Analista
  const tasksByAnalyst = useMemo(() => {
    return tasksByDate.filter(t => {
      return selectedPeopleIds.length === 0 || selectedPeopleIds.includes(t.personId);
    });
  }, [tasksByDate, selectedPeopleIds]);

  // --- LÓGICA DE SEPARAÇÃO POR ABA ---
  const filteredTasks = useMemo(() => {
    return tasksByAnalyst.filter(t => {
      const isLicitacaoOuDiaria = t.serviceCategoryId === '3' || t.serviceCategoryId === '4';
      return activeSubTab === 'licitacao-diaria' ? isLicitacaoOuDiaria : !isLicitacaoOuDiaria;
    });
  }, [tasksByAnalyst, activeSubTab]);

  // Gráfico de Barras (sempre usa as tasks filtradas pela aba atual)
  const barData = useMemo(() => {
    return (state.people || []).map(person => {
      const pTasks = filteredTasks.filter(t => t.personId === person.id);
      const atribuidos = pTasks.reduce((acc, t) => acc + (Number(t.assignedProcesses) || 0), 0);
      const realizados = pTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0);
      const notas = pTasks.reduce((acc, t) => acc + (Number(t.invoiceQuantity) || 0), 0);
      const isSelected = selectedPeopleIds.length === 0 || selectedPeopleIds.includes(person.id);
      return { id: person.id, name: person.name, atribuidos, realizados, notas, opacity: isSelected ? 1 : 0.15 };
    }).filter(d => d.atribuidos > 0 || d.realizados > 0).sort((a, b) => b.realizados - a.realizados);
  }, [state.people, filteredTasks, selectedPeopleIds]);

  // Gráfico de Tendência
  const areaData = useMemo(() => {
    const map: Record<string, any> = {};
    filteredTasks.forEach(t => {
      if (!map[t.date]) map[t.date] = { date: t.date, realizados: 0 };
      map[t.date].realizados += (Number(t.processQuantity) || 0);
    });
    return Object.values(map).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredTasks]);

  // Gráfico de Pizza (Mix de Serviços)
  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTasks.forEach(t => {
      const cat = state.serviceCategories.find(c => c.id === t.serviceCategoryId);
      const name = cat?.name || 'Outros';
      map[name] = (map[name] || 0) + (Number(t.processQuantity) || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTasks, state.serviceCategories]);

  const handleGetInsights = async () => {
    if (filteredTasks.length === 0) return;
    setLoadingAi(true);
    try {
      const insight = await getProductivityInsights(filteredTasks, state.people, state.serviceCategories, state.particularities);
      setAiInsight(insight);
    } catch (e) {
      setAiInsight("Erro ao gerar análise.");
    } finally {
      setLoadingAi(false);
    }
  };

  const presets: { id: PeriodPreset, label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'semanal', label: 'Semanal' },
    { id: 'mensal', label: 'Mensal' },
    { id: 'custom', label: 'Personalizado' }
  ];

  return (
    <div className="space-y-8 pb-20 fade-in">
      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Análise Gerencial</h3>
            <div className="flex gap-2">
               <button 
                 onClick={() => { setActiveSubTab('pagamento'); setAiInsight(null); }} 
                 className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'pagamento' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'}`}
               >
                 Processos de Pagamento
               </button>
               <button 
                 onClick={() => { setActiveSubTab('licitacao-diaria'); setAiInsight(null); }} 
                 className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'licitacao-diaria' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'}`}
               >
                 Licitação / Diária
               </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button key={p.id} onClick={() => setActivePreset(p.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${activePreset === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}>
                {p.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
           <div className="flex flex-col">
             <span className="text-[8px] font-black text-slate-400 uppercase ml-1 mb-1">Início</span>
             <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setActivePreset('custom'); }} className="bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1" />
           </div>
           <div className="flex flex-col">
             <span className="text-[8px] font-black text-slate-400 uppercase ml-1 mb-1">Fim</span>
             <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setActivePreset('custom'); }} className="bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1" />
           </div>
           <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
           <div className="flex-1 min-w-[200px]">
             <span className="text-[8px] font-black text-slate-400 uppercase ml-1 mb-1 block">Filtrar Analistas</span>
             <div className="flex flex-wrap gap-1.5">
               {state.people.map(p => (
                 <button key={p.id} onClick={() => setSelectedPeopleIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-all ${selectedPeopleIds.includes(p.id) ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                   {p.name.split(' ')[0]}
                 </button>
               ))}
               {selectedPeopleIds.length > 0 && <button onClick={() => setSelectedPeopleIds([])} className="px-2 py-1 rounded-md text-[9px] font-black text-red-500 hover:bg-red-50">Limpar</button>}
             </div>
           </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Sumário Cards - Refletindo o Filtro da Aba */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proc. Atribuídos</p>
             <h4 className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{filteredTasks.reduce((acc, t) => acc + (Number(t.assignedProcesses) || 0), 0)}</h4>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proc. Realizados</p>
             <h4 className="text-4xl font-black text-amber-600 dark:text-amber-500 mt-2">{filteredTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0)}</h4>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas Fiscais</p>
             <h4 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{filteredTasks.reduce((acc, t) => acc + (Number(t.invoiceQuantity) || 0), 0)}</h4>
          </div>
        </div>

        {/* 1. Gráfico de Barras */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-8 flex items-center gap-3">
            <Icons.People /> Desempenho por Analista ({activeSubTab === 'pagamento' ? 'Pagamentos' : 'Licitação/Diária'})
          </h3>
          <div className="h-[450px]">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-10" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight={800} tick={{ fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#94a3b8' }} />
                  <Tooltip cursor={{fill: 'rgba(248, 250, 252, 0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px' }} />
                  <Bar dataKey="atribuidos" name="Atribuídos" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24}>
                    <LabelList dataKey="atribuidos" position="top" style={{ fill: '#6366f1', fontSize: 10, fontWeight: 900 }} />
                    {barData.map((entry, index) => <Cell key={`c0-${index}`} fillOpacity={entry.opacity} />)}
                  </Bar>
                  <Bar dataKey="realizados" name="Realizados" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24}>
                    <LabelList dataKey="realizados" position="top" style={{ fill: '#f59e0b', fontSize: 10, fontWeight: 900 }} />
                    {barData.map((entry, index) => <Cell key={`c1-${index}`} fillOpacity={entry.opacity} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-300 uppercase font-black text-xs border-2 border-dashed border-slate-100 rounded-3xl">Sem lançamentos nesta categoria</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 2. Gráfico de Tendência */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-6">Tendência de Produção</h3>
            <div className="h-[300px]">
              {areaData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-10" />
                    <XAxis dataKey="date" fontSize={9} fontWeight={700} axisLine={false} tickLine={false} tickFormatter={(str) => str.split('-').reverse().slice(0, 2).join('/')} stroke="#94a3b8" />
                    <YAxis fontSize={9} fontWeight={700} axisLine={false} tickLine={false} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                    <Area type="monotone" dataKey="realizados" name="Realizados" stroke={activeSubTab === 'pagamento' ? '#3b82f6' : '#8b5cf6'} fill={activeSubTab === 'pagamento' ? '#3b82f6' : '#8b5cf6'} fillOpacity={0.1} strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-slate-300 uppercase font-black text-[10px] border-2 border-dashed border-slate-100 rounded-3xl">Sem dados temporais</div>}
            </div>
          </div>

          {/* 3. Gráfico de Pizza */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
             <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-6">Mix de Serviços</h3>
             <div className="h-[300px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={activeSubTab === 'licitacao-diaria' 
                            ? (entry.name === 'Diária' ? '#10b981' : '#3b82f6') 
                            : PRESET_COLORS[index % PRESET_COLORS.length]
                          } 
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-slate-300 uppercase font-black text-[10px] border-2 border-dashed border-slate-100 rounded-3xl">Sem mix de serviços</div>}
             </div>
          </div>
        </div>

        {/* 4. Diagnóstico IA */}
        <div className="bg-slate-900 dark:bg-slate-800 rounded-[40px] p-8 text-white relative overflow-hidden flex flex-col justify-center transition-colors">
          <div className="absolute top-0 right-0 p-10 opacity-10"><Icons.Sparkles /></div>
          <h2 className="text-xl font-black uppercase tracking-widest mb-2">IA: Diagnóstico de {activeSubTab === 'pagamento' ? 'Pagamentos' : 'Licitação/Diária'}</h2>
          <p className="text-slate-400 text-sm mb-6">Insights focados exclusivamente no contexto da aba selecionada.</p>
          {aiInsight ? (
            <div className="bg-white/5 p-5 rounded-2xl text-xs leading-relaxed max-h-[250px] overflow-y-auto custom-scrollbar border border-white/10">{aiInsight}</div>
          ) : (
            <button onClick={handleGetInsights} disabled={loadingAi || filteredTasks.length === 0} className="bg-blue-600 px-8 py-4 rounded-xl font-black text-xs uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2 w-fit shadow-xl shadow-blue-900/40">
              {loadingAi ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : <Icons.Sparkles />}
              Analisar {activeSubTab === 'pagamento' ? 'Processos' : 'Licitações'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
