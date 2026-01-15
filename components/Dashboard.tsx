
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { AppState, Task, ServiceCategory } from '../types';
import { Icons } from '../constants';
import { getProductivityInsights } from '../services/geminiService';

interface DashboardProps {
  state: AppState;
  onRefresh?: () => Promise<void>;
}

type TabType = 'common' | 'special';
type PeriodPreset = 'hoje' | 'semanal' | 'quinzenal' | 'mensal' | 'trimestral' | 'anual' | 'custom';

const Dashboard: React.FC<DashboardProps> = ({ state, onRefresh }) => {
  const getLocalDateStr = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(getLocalDateStr());
  const [activePreset, setActivePreset] = useState<PeriodPreset>('mensal');
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('common');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const now = new Date();
    let start = new Date();

    switch (activePreset) {
      case 'hoje':
        break;
      case 'semanal':
        start.setDate(now.getDate() - 7);
        break;
      case 'quinzenal':
        start.setDate(now.getDate() - 15);
        break;
      case 'mensal':
        start.setDate(now.getDate() - 30);
        break;
      case 'trimestral':
        start.setDate(now.getDate() - 90);
        break;
      case 'anual':
        start.setDate(now.getDate() - 365);
        break;
      case 'custom':
        return;
    }

    if (activePreset !== 'custom') {
      setStartDate(getLocalDateStr(start));
      setEndDate(getLocalDateStr(now));
    }
  }, [activePreset]);

  const isSpecialCategory = (categoryId: string) => {
    const cat = state.serviceCategories.find(c => c.id === categoryId);
    if (!cat) return false;
    const name = cat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return name.includes('licitacao') || name.includes('diaria') || name.includes('contrato');
  };

  const togglePerson = (id: string) => {
    setSelectedPeopleIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleManualRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const filteredTasks = useMemo(() => {
    const tasks = state.tasks || [];
    return tasks.filter(t => {
      const dateMatch = (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
      const personMatch = selectedPeopleIds.length === 0 || selectedPeopleIds.includes(t.personId);
      return dateMatch && personMatch;
    });
  }, [state.tasks, startDate, endDate, selectedPeopleIds]);

  const commonTasks = filteredTasks.filter(t => !isSpecialCategory(t.serviceCategoryId));
  const specialTasks = filteredTasks.filter(t => isSpecialCategory(t.serviceCategoryId));

  const barData = useMemo(() => {
    return (state.people || []).map(person => {
      const pTasks = commonTasks.filter(t => t.personId === person.id);
      return {
        name: person.name,
        processos: pTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0),
        notas: pTasks.reduce((acc, t) => acc + (Number(t.invoiceQuantity) || 0), 0)
      };
    }).filter(d => d.processos > 0 || d.notas > 0).sort((a, b) => b.processos - a.processos);
  }, [commonTasks, state.people]);

  const areaData = useMemo(() => {
    const map: Record<string, any> = {};
    commonTasks.forEach(t => {
      if (!map[t.date]) map[t.date] = { date: t.date, processos: 0, notas: 0 };
      map[t.date].processos += (Number(t.processQuantity) || 0);
      map[t.date].notas += (Number(t.invoiceQuantity) || 0);
    });
    return Object.values(map).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [commonTasks]);

  const pieDataCommon = useMemo(() => {
    const counts: Record<string, number> = {};
    commonTasks.forEach(t => {
      const cat = state.serviceCategories.find(c => c.id === t.serviceCategoryId);
      if (cat) counts[cat.name] = (counts[cat.name] || 0) + (Number(t.processQuantity) || 0);
    });
    return Object.entries(counts).map(([name, value]) => ({
      name, value, color: state.serviceCategories.find(c => c.name === name)?.color || '#3b82f6'
    }));
  }, [commonTasks, state.serviceCategories]);

  const pieDataSpecial = useMemo(() => {
    const counts: Record<string, number> = {};
    specialTasks.forEach(t => {
      const cat = state.serviceCategories.find(c => c.id === t.serviceCategoryId);
      if (cat) counts[cat.name] = (counts[cat.name] || 0) + (Number(t.processQuantity) || 0);
    });
    return Object.entries(counts).map(([name, value]) => ({
      name, value, color: state.serviceCategories.find(c => c.name === name)?.color || '#f59e0b'
    }));
  }, [specialTasks, state.serviceCategories]);

  const handleGetInsights = async () => {
    if (filteredTasks.length === 0) return;
    setLoadingAi(true);
    try {
      const insight = await getProductivityInsights(filteredTasks, state.people, state.serviceCategories);
      setAiInsight(insight);
    } catch (e) {
      setAiInsight("Erro ao gerar análise inteligente.");
    } finally {
      setLoadingAi(false);
    }
  };

  const presets: { id: PeriodPreset, label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'semanal', label: 'Semanal' },
    { id: 'quinzenal', label: 'Quinzenal' },
    { id: 'mensal', label: 'Mensal' },
    { id: 'trimestral', label: 'Trimestral' },
    { id: 'anual', label: 'Anual' },
    { id: 'custom', label: 'Personalizado' }
  ];

  const EmptyNotice = ({ msg }: { msg: string }) => (
    <div className="flex flex-col items-center justify-center h-full p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-300">
      <div className="opacity-20"><Icons.Calendar /></div>
      <p className="mt-4 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">{msg}</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 fade-in">
      {/* FILTROS */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-sm border border-slate-200 space-y-6 md:space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel Executivo</h3>
            <p className="text-xs text-slate-400 font-bold">Filtre por período e tipo de serviço</p>
          </div>
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto custom-scrollbar">
            {[
              { id: 'common', label: 'PROCESSOS DE PAGAMENTO' },
              { id: 'special', label: 'LICITAÇÃO / DIÁRIA' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 md:pt-8 border-t border-slate-100 space-y-6 md:space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Atalhos de Período</label>
              <button onClick={handleManualRefresh} disabled={isRefreshing} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50">
                <div className={isRefreshing ? 'animate-spin-slow' : ''}><Icons.Refresh /></div>
                <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Sincronizar</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map(p => (
                <button key={p.id} onClick={() => setActivePreset(p.id)} className={`px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${activePreset === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                  {p.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className={`${activePreset !== 'custom' ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Período Customizado</label>
              <div className="flex items-center gap-2 md:gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-fit">
                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setActivePreset('custom'); }} className="bg-transparent text-xs md:text-sm font-bold text-slate-700 outline-none" />
                <div className="w-px h-6 md:h-8 bg-slate-200"></div>
                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setActivePreset('custom'); }} className="bg-transparent text-xs md:text-sm font-bold text-slate-700 outline-none" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Filtrar Equipe</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedPeopleIds([])} className={`px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${selectedPeopleIds.length === 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}>TODOS</button>
                {state.people.map(p => (
                  <button key={p.id} onClick={() => togglePerson(p.id)} className={`px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-bold border transition-all ${selectedPeopleIds.includes(p.id) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-400 border-slate-200'}`}>{p.name}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-7 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 border-l-[6px] md:border-l-[8px] border-l-blue-500">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Processos de Pagamento</p>
          <h4 className="text-3xl md:text-4xl font-black text-slate-900 mt-1 md:mt-2">{commonTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0)}</h4>
        </div>
        <div className="bg-white p-5 md:p-7 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 border-l-[6px] md:border-l-[8px] border-l-amber-500">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Licitações / Diárias</p>
          <h4 className="text-3xl md:text-4xl font-black text-amber-600 mt-1 md:mt-2">{specialTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0)}</h4>
        </div>
        <div className="bg-white p-5 md:p-7 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 border-l-[6px] md:border-l-[8px] border-l-emerald-500">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas Fiscais</p>
          <h4 className="text-3xl md:text-4xl font-black text-emerald-600 mt-1 md:mt-2">{filteredTasks.reduce((acc, t) => acc + (Number(t.invoiceQuantity) || 0), 0)}</h4>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="space-y-8 md:space-y-12">
        {activeTab === 'special' && (
          <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-sm border border-slate-200">
            <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight mb-8 md:mb-10">Setor Licitações & Diárias</h3>
            <div className="chart-container-lg">
              {pieDataSpecial.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie 
                      data={pieDataSpecial} 
                      cx="50%" 
                      cy="45%" 
                      innerRadius="40%" 
                      outerRadius="75%" 
                      paddingAngle={8} 
                      dataKey="value" 
                      label={({name, value}) => `${name}: ${value}`}
                    >
                      {pieDataSpecial.map((e, i) => <Cell key={`sp-${i}`} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyNotice msg="Sem dados especiais no período selecionado." />}
            </div>
          </div>
        )}

        {activeTab === 'common' && (
          <div className="space-y-8 md:space-y-12">
            <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-sm border border-slate-200">
              <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight mb-8 md:mb-10">Ranking de Analistas</h3>
              <div className="chart-container-lg">
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight={800} interval={0} />
                      <YAxis axisLine={false} tickLine={false} fontSize={10} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px' }} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px' }} />
                      <Bar dataKey="processos" name="Processos" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20} />
                      <Bar dataKey="notas" name="Notas Fiscais" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyNotice msg="Nenhum registro de pagamento encontrado." />}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
              <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-sm border border-slate-200">
                <h3 className="text-lg md:text-xl font-black text-slate-800 mb-6 md:mb-8 uppercase tracking-tight">Evolução do Fluxo</h3>
                <div className="chart-container-md">
                  {areaData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" fontSize={9} stroke="#94a3b8" tickFormatter={(v) => v.split('-').slice(1).reverse().join('/')} />
                        <YAxis fontSize={9} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="processos" name="Processos" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <EmptyNotice msg="Sem histórico temporal." />}
                </div>
              </div>
              <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-sm border border-slate-200">
                <h3 className="text-lg md:text-xl font-black text-slate-800 mb-6 md:mb-8 uppercase tracking-tight">Mix de Serviços</h3>
                <div className="chart-container-md">
                  {pieDataCommon.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie data={pieDataCommon} cx="50%" cy="45%" innerRadius="40%" outerRadius="75%" paddingAngle={6} dataKey="value">
                          {pieDataCommon.map((e, i) => <Cell key={`pi-${i}`} fill={e.color}/>)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyNotice msg="Sem dados de categorias comuns." />}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* IA */}
      <div className="bg-slate-900 rounded-[40px] md:rounded-[64px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden mt-8 md:mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 relative z-10 text-center md:text-left">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest mb-4 md:mb-6">Diagnóstico IA</h2>
            <p className="text-slate-400 text-base md:text-lg mb-8 md:mb-10 leading-relaxed">Analise tendências e produtividade automaticamente.</p>
            {!aiInsight && !loadingAi && (
              <button onClick={handleGetInsights} disabled={filteredTasks.length === 0} className="bg-white text-slate-900 px-8 md:px-12 py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-black text-sm uppercase hover:bg-blue-50 transition-all disabled:opacity-50 w-full md:w-auto">Gerar Análise</button>
            )}
          </div>
          {loadingAi && <div className="animate-spin h-10 md:h-14 w-10 md:w-14 border-[4px] md:border-[6px] border-white/20 border-t-white rounded-full"></div>}
          {aiInsight && !loadingAi && (
            <div className="flex-1 bg-white/5 backdrop-blur-3xl rounded-[24px] md:rounded-[40px] p-6 md:p-10 border border-white/10 max-h-[400px] md:max-h-[500px] overflow-y-auto text-slate-200 text-left">
              <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{aiInsight}</div>
              <button onClick={() => setAiInsight(null)} className="mt-8 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest border-t border-white/5 pt-6 w-full text-left">Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
