
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LabelList
} from 'recharts';
import { AppState, Task, ServiceCategory, Particularity } from '../types';
import { Icons, PRESET_COLORS } from '../constants';
import { getProductivityInsights } from '../services/geminiService';
import { supabaseService } from '../services/supabase';

interface DashboardProps { state: AppState; onRefresh?: () => Promise<void>; }

type PeriodPreset = 'hoje' | 'semanal' | 'quinzenal' | 'mensal' | 'trimestral' | 'anual' | 'custom';
type DashboardSubTab = 'pagamento' | 'licitacao-diaria';

const Dashboard: React.FC<DashboardProps> = ({ state, onRefresh }) => {
  const getLocalDateStr = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [activePreset, setActivePreset] = useState<PeriodPreset>('hoje');
  const [startDate, setStartDate] = useState<string>(getLocalDateStr());
  const [endDate, setEndDate] = useState<string>(getLocalDateStr());
  const [activeSubTab, setActiveSubTab] = useState<DashboardSubTab>('pagamento');
  const [selectedAnalystId, setSelectedAnalystId] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const isCloudConnected = supabaseService.isConfigured();

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

  const tasksByDate = useMemo(() => {
    return (state.tasks || []).filter(t => (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate));
  }, [state.tasks, startDate, endDate]);

  const filteredTasks = useMemo(() => {
    return tasksByDate.filter(t => {
      const isLicitacaoOuDiaria = t.serviceCategoryId === '3' || t.serviceCategoryId === '4';
      return activeSubTab === 'licitacao-diaria' ? isLicitacaoOuDiaria : !isLicitacaoOuDiaria;
    });
  }, [tasksByDate, activeSubTab]);

  const stats = useMemo(() => {
    const source = selectedAnalystId ? filteredTasks.filter(t => t.personId === selectedAnalystId) : filteredTasks;
    return {
      atribuidos: source.reduce((acc, t) => acc + (Number(t.assignedProcesses) || 0), 0),
      realizados: source.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0),
      notas: source.reduce((acc, t) => acc + (Number(t.invoiceQuantity) || 0), 0)
    };
  }, [filteredTasks, selectedAnalystId]);

  const currentParticularities = useMemo(() => {
    return (state.particularities || []).filter(p => 
      (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate)
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [state.particularities, startDate, endDate]);

  const barData = useMemo(() => {
    return (state.people || []).map(person => {
      const pTasks = filteredTasks.filter(t => t.personId === person.id);
      const atribuidos = pTasks.reduce((acc, t) => acc + (Number(t.assignedProcesses) || 0), 0);
      const realizados = pTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0);
      const notas = pTasks.reduce((acc, t) => acc + (Number(t.invoiceQuantity) || 0), 0);
      const isSelected = !selectedAnalystId || selectedAnalystId === person.id;
      return { id: person.id, name: person.name, atribuidos, realizados, notas, opacity: isSelected ? 1 : 0.2 };
    }).filter(d => d.atribuidos > 0 || d.realizados > 0 || d.notas > 0).sort((a, b) => b.realizados - a.realizados);
  }, [state.people, filteredTasks, selectedAnalystId]);

  const areaData = useMemo(() => {
    const map: Record<string, any> = {};
    const source = selectedAnalystId ? filteredTasks.filter(t => t.personId === selectedAnalystId) : filteredTasks;
    source.forEach(t => {
      if (!map[t.date]) map[t.date] = { date: t.date, realizados: 0 };
      map[t.date].realizados += (Number(t.processQuantity) || 0);
    });
    return Object.values(map).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredTasks, selectedAnalystId]);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    const source = selectedAnalystId ? filteredTasks.filter(t => t.personId === selectedAnalystId) : filteredTasks;
    source.forEach(t => {
      const cat = state.serviceCategories.find(c => c.id === t.serviceCategoryId);
      const name = cat?.name || 'Outros';
      map[name] = (map[name] || 0) + (Number(t.processQuantity) || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTasks, state.serviceCategories, selectedAnalystId]);

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

  return (
    <div className="space-y-6 pb-20 fade-in">
      {/* Header com Filtros e Status de Conexão */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-[32px] shadow-sm border border-slate-200/60 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Controle Gerencial</h3>
             <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isCloudConnected ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                {isCloudConnected ? 'Nuvem Conectada' : 'Modo Local'}
             </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => {setActiveSubTab('pagamento'); setSelectedAnalystId(null);}} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'pagamento' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Pagamentos</button>
            <button onClick={() => {setActiveSubTab('licitacao-diaria'); setSelectedAnalystId(null);}} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'licitacao-diaria' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Licitação/Diária</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            {['hoje', 'semanal', 'mensal'].map(p => (
              <button key={p} onClick={() => setActivePreset(p as PeriodPreset)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${activePreset === p ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>{p.toUpperCase()}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase">De</span>
              <input type="date" value={startDate} onChange={(e) => {setStartDate(e.target.value); setActivePreset('custom');}} className="bg-transparent text-[11px] font-bold outline-none dark:text-white" />
            </div>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase">Até</span>
              <input type="date" value={endDate} onChange={(e) => {setEndDate(e.target.value); setActivePreset('custom');}} className="bg-transparent text-[11px] font-bold outline-none dark:text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Cartões Numéricos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Processos Adicionados</p>
            <h4 className="text-3xl font-black text-blue-600 dark:text-blue-500">{stats.atribuidos}</h4>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600"><Icons.Task /></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Processos Realizados</p>
            <h4 className="text-3xl font-black text-amber-600 dark:text-amber-500">{stats.realizados}</h4>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600"><Icons.Calendar /></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notas Fiscais</p>
            <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{stats.notas}</h4>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600"><Icons.Note /></div>
        </div>
      </div>

      {/* Feed de Ocorrências */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200/50 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-pulse"></div>
            Ocorrências e Particularidades da Equipe
          </h4>
          <span className="text-[10px] font-black text-slate-400 uppercase">{currentParticularities.length} registros</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
          {currentParticularities.length === 0 ? (
            <div className="text-slate-400 text-[11px] font-bold uppercase italic p-4 border-2 border-dashed border-slate-100 dark:border-slate-800 w-full rounded-2xl text-center">Nenhuma ocorrência registrada no período</div>
          ) : (
            currentParticularities.map((p) => {
              const person = state.people.find(per => per.id === p.personId);
              const colors = p.type === 'Saúde' ? 'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200' : 
                            p.type === 'Treinamento' ? 'border-blue-400 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200' : 
                            p.type === 'Administrativo' ? 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200' :
                            'border-slate-400 bg-slate-50 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200';
              return (
                <div key={p.id} className={`flex-shrink-0 min-w-[280px] p-4 rounded-2xl border ${colors} shadow-sm transition-all`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase truncate max-w-[150px] tracking-tight">{person?.name}</span>
                    <span className="text-[9px] font-bold opacity-80">{p.date.split('-').reverse().slice(0,2).join('/')}</span>
                  </div>
                  <p className="text-[11px] font-semibold leading-tight line-clamp-2">"{p.description}"</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {activeSubTab === 'pagamento' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter flex items-center gap-2">
                  <Icons.People /> Desempenho por Analista
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {selectedAnalystId ? `Focando em: ${state.people.find(p => p.id === selectedAnalystId)?.name}` : 'Clique em uma barra para detalhar o mix'}
                </p>
              </div>
              {selectedAnalystId && (
                <button onClick={() => setSelectedAnalystId(null)} className="px-4 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[9px] font-black rounded-full border border-rose-100 dark:border-rose-800 hover:bg-rose-100 uppercase tracking-widest">
                  Limpar Filtro
                </button>
              )}
            </div>
            <div className="h-[450px]">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 30, right: 10, left: -20, bottom: 20 }} onClick={(e) => e?.activePayload && setSelectedAnalystId(e.activePayload[0].payload.id)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                    <XAxis dataKey="name" fontSize={10} fontWeight={900} axisLine={false} tickLine={false} stroke="#94a3b8" />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#94a3b8" />
                    <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.02)'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)'}} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{paddingBottom: '20px', fontSize: '10px', fontWeight: 900}} />
                    <Bar dataKey="atribuidos" name="Atribuídos" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={24}>
                      <LabelList dataKey="atribuidos" position="top" style={{ fontSize: 10, fontWeight: 900, fill: '#6366f1' }} />
                      {barData.map((e, i) => <Cell key={`c1-${i}`} fillOpacity={e.opacity} />)}
                    </Bar>
                    <Bar dataKey="realizados" name="Realizados" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={24}>
                      <LabelList dataKey="realizados" position="top" style={{ fontSize: 10, fontWeight: 900, fill: '#f59e0b' }} />
                      {barData.map((e, i) => <Cell key={`c2-${i}`} fillOpacity={e.opacity} />)}
                    </Bar>
                    <Bar dataKey="notas" name="Notas Fiscais" fill="#10b981" radius={[8, 8, 0, 0]} barSize={24}>
                      <LabelList dataKey="notas" position="top" style={{ fontSize: 10, fontWeight: 900, fill: '#10b981' }} />
                      {barData.map((e, i) => <Cell key={`c3-${i}`} fillOpacity={e.opacity} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase text-xs italic tracking-widest">Sem lançamentos registrados</div>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800">
               <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter mb-8 flex items-center gap-2">
                 <Icons.Calendar /> Analise Diaria
               </h3>
               <div className="h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={areaData}>
                     <defs>
                       <linearGradient id="colorRealizados" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <XAxis dataKey="date" fontSize={9} axisLine={false} tickLine={false} tickFormatter={s => s.split('-').reverse().slice(0,2).join('/')} stroke="#94a3b8" />
                     <YAxis fontSize={9} axisLine={false} tickLine={false} stroke="#94a3b8" />
                     <Tooltip contentStyle={{borderRadius: '16px'}} />
                     <Area type="monotone" dataKey="realizados" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRealizados)">
                        <LabelList dataKey="realizados" position="top" style={{ fontSize: 11, fontWeight: 900, fill: '#3b82f6' }} offset={10} />
                     </Area>
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800">
               <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter mb-8 flex items-center gap-2">
                 <Icons.Task /> Serviços
               </h3>
               <div className="h-[300px]">
                 {pieData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie 
                         data={pieData} 
                         innerRadius={60} 
                         outerRadius={90} 
                         paddingAngle={8} 
                         dataKey="value" 
                         stroke="none"
                         label={({ name, value, cx, x, y }) => (
                           <text 
                             x={x} 
                             y={y} 
                             fill="#64748b" 
                             textAnchor={x > cx ? 'start' : 'end'} 
                             dominantBaseline="central" 
                             fontSize={7} 
                             fontWeight={800}
                           >
                             {`${name}: ${value}`}
                           </text>
                         )}
                       >
                         {pieData.map((e, i) => <Cell key={`p-${i}`} fill={PRESET_COLORS[i % PRESET_COLORS.length]} />)}
                       </Pie>
                       <Tooltip contentStyle={{borderRadius: '16px'}} />
                       <Legend iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 800, paddingTop: '10px'}} />
                     </PieChart>
                   </ResponsiveContainer>
                 ) : <div className="h-full flex items-center justify-center text-slate-200 font-black uppercase text-[10px] italic">Sem mix de serviço</div>}
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[48px] shadow-xl border border-slate-100 dark:border-slate-800 min-h-[650px] flex flex-col items-center justify-center animate-in slide-in-from-bottom-8 duration-700">
           <div className="text-center mb-16">
             <h3 className="text-4xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Diaria/Licitação</h3>
             <p className="text-slate-400 font-bold mt-4 tracking-widest text-xs uppercase italic">Visualização centralizada de volume realizado</p>
           </div>
           <div className="w-full h-[550px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={pieData} 
                      cx="50%" cy="50%" 
                      outerRadius={210} 
                      innerRadius={110} 
                      paddingAngle={15} 
                      dataKey="value" 
                      stroke="none" 
                      label={({ name, value, percent, cx, x, y }) => (
                        <text 
                          x={x} 
                          y={y} 
                          fill="#64748b" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central" 
                          fontSize={8} 
                          fontWeight={900}
                        >
                          {`${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        </text>
                      )}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`ld-${index}`} fill={entry.name === 'Diária' ? '#10b981' : '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '32px', border: 'none', boxShadow: '0 20px 60px -10px rgba(0,0,0,0.2)'}} />
                    <Legend verticalAlign="bottom" align="center" iconType="diamond" wrapperStyle={{paddingTop: '60px', fontWeight: 900, fontSize: '14px'}} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 uppercase font-black tracking-[0.3em] italic">
                  <Icons.Task /><p className="mt-8 text-sm">Sem movimentação registrada nesta categoria</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Diagnóstico IA */}
      <div className="bg-slate-950 rounded-[40px] p-10 text-white relative overflow-hidden group shadow-2xl shadow-blue-900/20">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] group-hover:bg-blue-600/20 transition-all duration-1000"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2 flex items-center gap-3"><Icons.Sparkles /> Diagnóstico Estratégico IA</h2>
          <p className="text-slate-400 text-sm mb-10 font-medium tracking-tight">Análise em tempo real dos fluxos de {activeSubTab === 'pagamento' ? 'pagamentos' : 'licitação e diária'}.</p>
          {aiInsight ? (
            <div className="bg-white/5 p-8 rounded-[32px] text-[13px] leading-relaxed max-h-[450px] overflow-y-auto custom-scrollbar italic text-slate-200 border border-white/10 animate-in fade-in duration-700">{aiInsight}</div>
          ) : (
            <button onClick={handleGetInsights} disabled={loadingAi || filteredTasks.length === 0} className="bg-blue-600 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-4 shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50">
              {loadingAi ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Icons.Sparkles />}Solicitar Relatório Inteligente
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
