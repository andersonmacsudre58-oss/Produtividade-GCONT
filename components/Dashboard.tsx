
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LabelList
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

    setStartDate(getLocalDateStr(start));
    setEndDate(getLocalDateStr(now));
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
    const dateFilteredOnly = (state.tasks || []).filter(t => (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate));
    const tasksToCalculate = dateFilteredOnly.filter(t => !isSpecialCategory(t.serviceCategoryId));

    return (state.people || []).map(person => {
      const pTasks = tasksToCalculate.filter(t => t.personId === person.id);
      const processos = pTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0);
      const notas = pTasks.reduce((acc, t) => acc + (Number(t.invoiceQuantity) || 0), 0);
      
      return {
        id: person.id,
        name: person.name,
        processos,
        notas,
        opacity: selectedPeopleIds.length === 0 || selectedPeopleIds.includes(person.id) ? 1 : 0.3
      };
    }).filter(d => d.processos > 0 || d.notas > 0).sort((a, b) => b.processos - a.processos);
  }, [state.people, state.tasks, startDate, endDate, selectedPeopleIds]);

  const areaData = useMemo(() => {
    const map: Record<string, any> = {};
    commonTasks.forEach(t => {
      if (!map[t.date]) map[t.date] = { date: t.date, processos: 0, notas: 0 };
      map[t.date].processos += (Number(t.processQuantity) || 0);
      map[t.date].notas += (Number(t.invoiceQuantity) || 0);
    });
    return Object.values(map)
      .filter((d: any) => d.processos > 0 || d.notas > 0)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [commonTasks]);

  const pieDataCommon = useMemo(() => {
    const counts: Record<string, number> = {};
    commonTasks.forEach(t => {
      const cat = state.serviceCategories.find(c => c.id === t.serviceCategoryId);
      if (cat) counts[cat.name] = (counts[cat.name] || 0) + (Number(t.processQuantity) || 0);
    });
    return Object.entries(counts)
      .map(([name, value]) => ({
        name, value, color: state.serviceCategories.find(c => c.name === name)?.color || '#3b82f6'
      }))
      .filter(d => d.value > 0);
  }, [commonTasks, state.serviceCategories]);

  const pieDataSpecial = useMemo(() => {
    const counts: Record<string, number> = {};
    specialTasks.forEach(t => {
      const cat = state.serviceCategories.find(c => c.id === t.serviceCategoryId);
      if (cat) counts[cat.name] = (counts[cat.name] || 0) + (Number(t.processQuantity) || 0);
    });
    return Object.entries(counts)
      .map(([name, value]) => ({
        name, value, color: state.serviceCategories.find(c => c.name === name)?.color || '#f59e0b'
      }))
      .filter(d => d.value > 0);
  }, [specialTasks, state.serviceCategories]);

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = 25 + outerRadius;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#64748b"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-[11px] font-black uppercase tracking-tight"
      >
        {`${name}: ${value}`}
      </text>
    );
  };

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
    <div className="flex flex-col items-center justify-center h-full p-10 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] text-slate-300 dark:text-slate-600 transition-colors">
      <div className="opacity-20"><Icons.Calendar /></div>
      <p className="mt-4 font-black text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">{msg}</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 fade-in">
      {/* FILTROS */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 md:space-y-8 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Painel Executivo</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Filtre por período e interaja com os gráficos</p>
          </div>
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto custom-scrollbar">
            {[
              { id: 'common', label: 'PROCESSOS DE PAGAMENTO' },
              { id: 'special', label: 'LICITAÇÃO / DIÁRIA' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 md:pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6 md:space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Atalhos de Período</label>
              <button onClick={handleManualRefresh} disabled={isRefreshing} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-95 disabled:opacity-50">
                <div className={isRefreshing ? 'animate-spin-slow' : ''}><Icons.Refresh /></div>
                <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Sincronizar</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map(p => (
                <button key={p.id} onClick={() => setActivePreset(p.id)} className={`px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${activePreset === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  {p.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className={`${activePreset !== 'custom' ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-3 tracking-widest">Período Customizado</label>
              <div className="flex items-center gap-2 md:gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setActivePreset('custom'); }} className="bg-transparent text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none" />
                <div className="w-px h-6 md:h-8 bg-slate-200 dark:bg-slate-700"></div>
                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setActivePreset('custom'); }} className="bg-transparent text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-3 tracking-widest">Equipe Filtrada {selectedPeopleIds.length > 0 && <span className="text-blue-500">(Interativo)</span>}</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedPeopleIds([])} className={`px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${selectedPeopleIds.length === 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'}`}>LIMPAR FILTROS</button>
                {state.people.map(p => (
                  <button key={p.id} onClick={() => togglePerson(p.id)} className={`px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-bold border transition-all ${selectedPeopleIds.includes(p.id) ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'}`}>{p.name}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 md:p-7 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 border-l-[6px] md:border-l-[8px] border-l-blue-500 transition-colors">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Processos de Pagamento</p>
          <h4 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-1 md:mt-2">{commonTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0)}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 md:p-7 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 border-l-[6px] md:border-l-[8px] border-l-amber-500 transition-colors">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Licitações / Diárias</p>
          <h4 className="text-3xl md:text-4xl font-black text-amber-600 dark:text-amber-500 mt-1 md:mt-2">{specialTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0)}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 md:p-7 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 border-l-[6px] md:border-l-[8px] border-l-emerald-500 transition-colors">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Notas Fiscais</p>
          <h4 className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-1 md:mt-2">{filteredTasks.reduce((acc, t) => acc + (Number(t.invoiceQuantity) || 0), 0)}</h4>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="space-y-8 md:space-y-12">
        {activeTab === 'common' && (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-8 md:mb-10">Ranking de Analistas <span className="text-[10px] font-normal text-slate-400 normal-case ml-2">(Clique nas barras para filtrar)</span></h3>
            <div className="chart-container-lg">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-10" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight={800} interval={0} tick={{ fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#94a3b8' }} />
                    <Tooltip cursor={{fill: 'rgba(248, 250, 252, 0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingTop: '0px', paddingBottom: '30px', fontSize: '10px' }} formatter={(value) => <span className="text-slate-500 dark:text-slate-400 font-bold uppercase">{value}</span>} />
                    <Bar 
                      dataKey="processos" 
                      name="Processos" 
                      fill="#3b82f6" 
                      radius={[6, 6, 0, 0]} 
                      barSize={24}
                      onClick={(data) => togglePerson(data.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {barData.map((entry, index) => <Cell key={`c1-${index}`} fillOpacity={entry.opacity} />)}
                      <LabelList dataKey="processos" position="top" offset={10} fontSize={11} fontWeight={800} fill="#64748b" />
                    </Bar>
                    <Bar 
                      dataKey="notas" 
                      name="Notas Fiscais" 
                      fill="#10b981" 
                      radius={[6, 6, 0, 0]} 
                      barSize={24}
                      onClick={(data) => togglePerson(data.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {barData.map((entry, index) => <Cell key={`c2-${index}`} fillOpacity={entry.opacity} />)}
                      <LabelList dataKey="notas" position="top" offset={10} fontSize={11} fontWeight={800} fill="#10b981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyNotice msg="Nenhum registro encontrado." />}
            </div>
          </div>
        )}

        <div className={activeTab === 'common' ? "grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10" : "flex flex-col items-center"}>
          {activeTab === 'common' && (
            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
              <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 mb-6 md:mb-8 uppercase tracking-tight">Evolução do Fluxo</h3>
              <div className="chart-container-md h-[300px]">
                {areaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-10" />
                      <XAxis dataKey="date" fontSize={9} stroke="#94a3b8" tickFormatter={(v) => v.split('-').slice(1).reverse().join('/')} />
                      <YAxis fontSize={9} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                      <Area type="monotone" dataKey="processos" name="Processos" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyNotice msg="Sem histórico temporal." />}
              </div>
            </div>
          )}
          
          <div className={`bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-sm border border-slate-200 dark:border-slate-800 transition-colors ${activeTab === 'special' ? 'w-full max-w-4xl' : ''}`}>
            <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 mb-6 md:mb-8 uppercase tracking-tight text-center">
              {activeTab === 'common' ? 'Mix de Serviços Comuns' : 'Distribuição: Licitação e Diárias'}
              {selectedPeopleIds.length > 0 && <span className="text-blue-500 text-xs ml-2">(Filtrado por Analista)</span>}
            </h3>
            <div className="chart-container-md h-[400px]">
              {(activeTab === 'common' ? pieDataCommon : pieDataSpecial).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie 
                      data={activeTab === 'common' ? pieDataCommon : pieDataSpecial} 
                      cx="50%" 
                      cy="45%" 
                      innerRadius="45%" 
                      outerRadius="80%" 
                      paddingAngle={6} 
                      dataKey="value" 
                      stroke="none"
                      label={activeTab === 'special' ? renderCustomLabel : false}
                      labelLine={activeTab === 'special'}
                    >
                      {(activeTab === 'common' ? pieDataCommon : pieDataSpecial).map((e, i) => <Cell key={`pi-${i}`} fill={e.color}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '12px', paddingTop: '40px' }} formatter={(value) => <span className="text-slate-500 dark:text-slate-400 font-black uppercase">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyNotice msg={activeTab === 'common' ? "Sem dados de categorias comuns." : "Sem registros de Licitação ou Diárias no período."} />}
            </div>
          </div>
        </div>
      </div>

      {/* IA */}
      <div className="bg-slate-900 dark:bg-slate-800 rounded-[40px] md:rounded-[64px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden mt-8 md:mt-12">
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
            <div className="flex-1 bg-white/5 backdrop-blur-3xl rounded-[24px] md:rounded-[40px] p-6 md:p-10 border border-white/10 max-h-[400px] md:max-h-[500px] overflow-y-auto text-slate-200 text-left custom-scrollbar">
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
