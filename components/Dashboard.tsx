
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LabelList
} from 'recharts';
import { AppState, Task, ServiceCategory } from '../types';
import { Icons, PRESET_COLORS } from '../constants';
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

  const clearPeopleFilter = () => setSelectedPeopleIds([]);

  const handleManualRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const tasksByDate = useMemo(() => {
    return (state.tasks || []).filter(t => {
      return (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
    });
  }, [state.tasks, startDate, endDate]);

  const tasksForDetailedCharts = useMemo(() => {
    return tasksByDate.filter(t => {
      return selectedPeopleIds.length === 0 || selectedPeopleIds.includes(t.personId);
    });
  }, [tasksByDate, selectedPeopleIds]);

  const processBarData = (tasks: Task[], onlySpecial: boolean) => {
    return (state.people || []).map(person => {
      const pTasks = tasks.filter(t => t.personId === person.id && isSpecialCategory(t.serviceCategoryId) === onlySpecial);
      const atribuidos = pTasks.reduce((acc, t) => acc + (Number(t.assignedProcesses) || 0), 0);
      const realizados = pTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0);
      const notas = pTasks.reduce((acc, t) => acc + (Number(t.invoiceQuantity) || 0), 0);
      const isSelected = selectedPeopleIds.length === 0 || selectedPeopleIds.includes(person.id);
      return { id: person.id, name: person.name, atribuidos, realizados, notas, opacity: isSelected ? 1 : 0.15 };
    }).filter(d => d.atribuidos > 0 || d.realizados > 0 || d.notas > 0).sort((a, b) => b.realizados - a.realizados);
  };

  const processAreaData = (tasks: Task[], onlySpecial: boolean) => {
    const map: Record<string, any> = {};
    tasks.filter(t => isSpecialCategory(t.serviceCategoryId) === onlySpecial).forEach(t => {
      if (!map[t.date]) map[t.date] = { date: t.date, realizados: 0 };
      map[t.date].realizados += (Number(t.processQuantity) || 0);
    });
    return Object.values(map).sort((a: any, b: any) => a.date.localeCompare(b.date));
  };

  const processPieData = (tasks: Task[], onlySpecial: boolean) => {
    const map: Record<string, number> = {};
    tasks.filter(t => isSpecialCategory(t.serviceCategoryId) === onlySpecial).forEach(t => {
      const cat = state.serviceCategories.find(c => c.id === t.serviceCategoryId);
      const name = cat?.name || 'Outros';
      map[name] = (map[name] || 0) + (Number(t.processQuantity) || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  };

  const commonBarData = useMemo(() => processBarData(tasksByDate, false), [state.people, tasksByDate, selectedPeopleIds]);
  const commonAreaData = useMemo(() => processAreaData(tasksForDetailedCharts, false), [tasksForDetailedCharts]);
  const commonPieData = useMemo(() => processPieData(tasksForDetailedCharts, false), [tasksForDetailedCharts, state.serviceCategories]);
  const specialPieData = useMemo(() => processPieData(tasksForDetailedCharts, true), [tasksForDetailedCharts, state.serviceCategories]);

  const handleGetInsights = async () => {
    if (tasksForDetailedCharts.length === 0) return;
    setLoadingAi(true);
    try {
      const insight = await getProductivityInsights(tasksForDetailedCharts, state.people, state.serviceCategories);
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
      {/* FILTROS PRINCIPAIS */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 md:space-y-8 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Análise Gerencial</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Monitoramento de Atribuições e Realizações</p>
          </div>
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto custom-scrollbar">
            {[
              { id: 'common', label: 'PROCESSOS / ATRIBUIÇÕES' },
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

        <div className="pt-6 md:pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-wrap gap-2">
                {presets.map(p => (
                  <button key={p.id} onClick={() => setActivePreset(p.id)} className={`px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${activePreset === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    {p.label.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 mb-1">Início</span>
                  <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setActivePreset('custom'); }} className="bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 mb-1">Fim</span>
                  <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setActivePreset('custom'); }} className="bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1" />
                </div>
                <button onClick={handleManualRefresh} disabled={isRefreshing} className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-all active:scale-95 disabled:opacity-50">
                  <div className={isRefreshing ? 'animate-spin-slow' : ''}><Icons.Refresh /></div>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Icons.People /> Filtrar por Colaborador
                </span>
                {selectedPeopleIds.length > 0 && <button onClick={clearPeopleFilter} className="text-[10px] font-black text-blue-600 dark:text-blue-400 hover:underline">LIMPAR FILTRO</button>}
              </div>
              <div className="flex flex-wrap gap-2">
                {state.people.map(person => {
                  const isSelected = selectedPeopleIds.includes(person.id);
                  return (
                    <button key={person.id} onClick={() => togglePerson(person.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${isSelected ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-100 text-slate-500 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                      {person.name}
                    </button>
                  );
                })}
              </div>
            </div>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 md:p-7 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 border-l-[6px] border-l-indigo-500 transition-colors">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Atribuídos {activeTab === 'special' ? '(Esp.)' : ''}</p>
          <h4 className="text-3xl md:text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-1 md:mt-2">
            {tasksForDetailedCharts.reduce((acc, t) => acc + (isSpecialCategory(t.serviceCategoryId) === (activeTab === 'special') ? (Number(t.assignedProcesses) || 0) : 0), 0)}
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 md:p-7 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 border-l-[6px] border-l-blue-500 transition-colors">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Realizados {activeTab === 'special' ? '(Esp.)' : ''}</p>
          <h4 className="text-3xl md:text-4xl font-black text-blue-600 dark:text-blue-500 mt-1 md:mt-2">
            {tasksForDetailedCharts.reduce((acc, t) => acc + (isSpecialCategory(t.serviceCategoryId) === (activeTab === 'special') ? (Number(t.processQuantity) || 0) : 0), 0)}
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 md:p-7 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 border-l-[6px] border-l-emerald-500 transition-colors">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Notas {activeTab === 'special' ? '(Esp.)' : ''}</p>
          <h4 className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-1 md:mt-2">
            {tasksForDetailedCharts.reduce((acc, t) => acc + (isSpecialCategory(t.serviceCategoryId) === (activeTab === 'special') ? (Number(t.invoiceQuantity) || 0) : 0), 0)}
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 md:p-7 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 border-l-[6px] border-l-amber-500 transition-colors">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tipos de Serviço</p>
          <h4 className="text-3xl md:text-4xl font-black text-amber-600 dark:text-amber-500 mt-1 md:mt-2">
            {(activeTab === 'common' ? commonPieData : specialPieData).length} <span className="text-xs uppercase opacity-40">Ativos</span>
          </h4>
        </div>
      </div>

      {/* GRAFICOS CONDICIONAIS */}
      <div className="space-y-8">
        {activeTab === 'common' ? (
          <>
            {/* Gráfico de Barras: Visível apenas em 'Comuns' */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Performance por Analista</h3>
                <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Clique na barra para filtrar</span>
              </div>
              <div className="chart-container-lg">
                {commonBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={commonBarData} margin={{ top: 30, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-10" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight={800} tick={{ fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#94a3b8' }} />
                      <Tooltip cursor={{fill: 'rgba(248, 250, 252, 0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px' }} />
                      
                      <Bar dataKey="atribuidos" name="Atribuídos" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} onClick={(data) => togglePerson(data.id)} style={{ cursor: 'pointer' }}>
                        <LabelList dataKey="atribuidos" position="top" style={{ fill: '#6366f1', fontSize: 10, fontWeight: 900 }} />
                        {commonBarData.map((entry, index) => <Cell key={`c0-${index}`} fillOpacity={entry.opacity} />)}
                      </Bar>
                      <Bar dataKey="realizados" name="Realizados" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} onClick={(data) => togglePerson(data.id)} style={{ cursor: 'pointer' }}>
                        <LabelList dataKey="realizados" position="top" style={{ fill: '#3b82f6', fontSize: 10, fontWeight: 900 }} />
                        {commonBarData.map((entry, index) => <Cell key={`c1-${index}`} fillOpacity={entry.opacity} />)}
                      </Bar>
                      <Bar dataKey="notas" name="Notas Fiscais" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} onClick={(data) => togglePerson(data.id)} style={{ cursor: 'pointer' }}>
                        <LabelList dataKey="notas" position="top" style={{ fill: '#10b981', fontSize: 10, fontWeight: 900 }} />
                        {commonBarData.map((entry, index) => <Cell key={`c2-${index}`} fillOpacity={entry.opacity} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyNotice msg="Nenhum registro encontrado." />}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gráfico de Tendência: Visível apenas em 'Comuns' */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-tight">Tendência de Produção</h3>
                <div className="chart-container-md h-[300px]">
                  {commonAreaData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={commonAreaData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-10" />
                        <XAxis dataKey="date" fontSize={9} stroke="#94a3b8" tickFormatter={(v) => v.split('-').slice(1).reverse().join('/')} />
                        <YAxis fontSize={9} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                        <Area type="monotone" dataKey="realizados" name="Realizados" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={4}>
                           <LabelList dataKey="realizados" position="top" offset={10} style={{ fill: '#3b82f6', fontSize: 10, fontWeight: 900 }} />
                        </Area>
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <EmptyNotice msg="Sem histórico temporal." />}
                </div>
              </div>

              {/* Gráfico de Pizza: Lado a Lado em 'Comuns' */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-tight">Distribuição de Serviços</h3>
                <div className="chart-container-md h-[300px]">
                  {commonPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={commonPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {commonPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PRESET_COLORS[index % PRESET_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyNotice msg="Dados insuficientes." />}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Aba 'Licitação/Diária': SOMENTE GRÁFICO DE PIZZA EM DESTAQUE */
          <div className="bg-white dark:bg-slate-900 p-8 md:p-16 rounded-[48px] shadow-sm border border-slate-200 dark:border-slate-800 transition-all flex flex-col items-center">
            <h3 className="text-xl md:text-3xl font-black text-slate-800 dark:text-slate-100 mb-12 uppercase tracking-tight text-center">
              Distribuição de Serviços de Licitação e Diárias
              {selectedPeopleIds.length > 0 && <span className="block text-blue-500 text-xs mt-2">(Filtro por colaborador ativo)</span>}
            </h3>
            
            <div className="w-full max-w-4xl h-[500px]">
              {specialPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={specialPieData}
                      cx="50%"
                      cy="45%"
                      labelLine={true}
                      outerRadius={180}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {specialPieData.map((entry, index) => (
                        <Cell key={`cell-special-${index}`} fill={PRESET_COLORS[index % PRESET_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', color: '#fff', padding: '12px' }} />
                    <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full">
                  <EmptyNotice msg="Nenhum dado de Licitação/Diária para exibir neste período." />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Diagnóstico IA - Mantido ao final para insights gerais */}
        <div className="bg-slate-900 dark:bg-slate-800 rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col justify-center transition-all">
          <div className="absolute top-0 right-0 p-10 opacity-10"><Icons.Sparkles /></div>
          <h2 className="text-xl font-black uppercase tracking-widest mb-2">Diagnóstico IA</h2>
          <p className="text-slate-400 text-sm mb-6">Análise inteligente baseada no contexto atual.</p>
          {aiInsight ? (
            <div className="bg-white/5 p-5 rounded-2xl text-xs leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar">
              {aiInsight}
              <button onClick={() => setAiInsight(null)} className="block mt-4 text-[10px] font-black opacity-50 uppercase hover:opacity-100 transition-opacity">Limpar Análise</button>
            </div>
          ) : (
            <button onClick={handleGetInsights} disabled={loadingAi || tasksForDetailedCharts.length === 0} className="bg-blue-600 px-6 py-4 rounded-xl font-black text-xs uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2 w-fit">
              {loadingAi ? <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></div> : <Icons.Sparkles />}
              Gerar Insights Estratégicos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
