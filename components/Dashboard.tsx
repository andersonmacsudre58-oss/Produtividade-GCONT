
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { AppState, Task } from '../types';
import { Icons } from '../constants';
import { getProductivityInsights } from '../services/geminiService';

interface DashboardProps {
  state: AppState;
}

type TimeRange = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const [timeRange, setTimeRange] = useState<TimeRange | 'custom'>('weekly');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Filter tasks based on selected range OR specific date
  const filteredTasks = useMemo(() => {
    if (timeRange === 'custom' && selectedDate) {
      return state.tasks.filter(t => t.date === selectedDate);
    }

    const now = new Date();
    const rangeInDays: Record<string, number> = {
      daily: 1,
      weekly: 7,
      fortnightly: 15,
      monthly: 30,
      quarterly: 90,
      semiannual: 180,
      annual: 365
    };

    const days = rangeInDays[timeRange as string] || 7;
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() - days);
    const thresholdStr = thresholdDate.toISOString().split('T')[0];

    return state.tasks.filter(t => t.date >= thresholdStr);
  }, [state.tasks, timeRange, selectedDate]);

  // Data for Evolution Line Chart
  const evolutionData = useMemo(() => {
    const dates: Record<string, any> = {};
    
    if (timeRange === 'custom' && selectedDate) {
      // For a single day, we show that day and maybe one day before/after for context
      // But user specifically wants to see metrics of THAT day. 
      // To make the chart useful, we'll show a 3-day window around the selected date
      const centerDate = new Date(selectedDate + 'T00:00:00');
      for (let i = -2; i <= 0; i++) {
        const d = new Date(centerDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        dates[dateStr] = { date: dateStr, total: 0 };
        state.serviceCategories.forEach(cat => {
          dates[dateStr][cat.name] = 0;
        });
      }
    } else {
      const daysToGenerate: Record<string, number> = {
        daily: 1, weekly: 7, fortnightly: 15, monthly: 30, quarterly: 90, semiannual: 180, annual: 365
      };
      const count = daysToGenerate[timeRange as string] || 7;
      for (let i = 0; i < count; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (count - 1 - i));
        const dateStr = d.toISOString().split('T')[0];
        dates[dateStr] = { date: dateStr, total: 0 };
        state.serviceCategories.forEach(cat => {
          dates[dateStr][cat.name] = 0;
        });
      }
    }

    // Fill data
    state.tasks.forEach(t => {
      if (dates[t.date]) {
        const cat = state.serviceCategories.find(c => c.id === t.serviceCategoryId);
        if (cat) {
          dates[t.date][cat.name] += t.quantity;
          dates[t.date].total += t.quantity;
        }
      }
    });

    return Object.values(dates).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [state.tasks, state.serviceCategories, timeRange, selectedDate]);

  // Data for Individual Productivity (Bar Chart)
  const teamData = useMemo(() => {
    const data = state.people.map(person => {
      const total = filteredTasks
        .filter(t => t.personId === person.id)
        .reduce((sum, t) => sum + t.quantity, 0);
      return {
        name: person.name,
        quantity: total
      };
    });
    return data.sort((a, b) => b.quantity - a.quantity);
  }, [filteredTasks, state.people]);

  // Data for Category Distribution (Pie Chart)
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    state.serviceCategories.forEach(cat => counts[cat.id] = 0);
    
    filteredTasks.forEach(t => {
      if (counts[t.serviceCategoryId] !== undefined) {
        counts[t.serviceCategoryId] += t.quantity;
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
    setAiInsight(result || "Não foi possível gerar insights no momento.");
    setLoadingAi(false);
  };

  const totalQuantity = filteredTasks.reduce((acc, t) => acc + t.quantity, 0);

  const rangeLabels: Record<string, string> = {
    daily: 'Hoje',
    weekly: 'Últimos 7 dias',
    fortnightly: 'Última Quinzena',
    monthly: 'Último Mês',
    quarterly: 'Último Trimestre',
    semiannual: 'Último Semestre',
    annual: 'Último Ano'
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (date) {
      setTimeRange('custom');
    } else {
      setTimeRange('weekly');
    }
  };

  const displayPeriodLabel = timeRange === 'custom' && selectedDate 
    ? `Dia: ${selectedDate.split('-').reverse().join('/')}` 
    : rangeLabels[timeRange as string];

  return (
    <div className="space-y-8">
      {/* Time Range Selector & Specific Date Picker */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
              <Icons.Calendar />
            </div>
            <span className="font-bold text-slate-800 whitespace-nowrap">Período de Análise</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(Object.keys(rangeLabels) as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  setSelectedDate('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  timeRange === range 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {rangeLabels[range]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t xl:border-t-0 xl:border-l border-slate-100 pt-6 xl:pt-0 xl:pl-6">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Ou Data Específica:</label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className={`px-4 py-2 rounded-xl text-xs font-bold border outline-none transition-all ${
                timeRange === 'custom' 
                  ? 'border-blue-500 ring-4 ring-blue-500/10 bg-blue-50 text-blue-700' 
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            />
            {selectedDate && (
              <button 
                onClick={() => {setSelectedDate(''); setTimeRange('weekly');}}
                className="absolute -right-2 -top-2 bg-slate-800 text-white p-1 rounded-full hover:bg-red-500 transition-colors shadow-md"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 transition-hover hover:shadow-md">
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Produzido</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-5xl font-black text-slate-900">{totalQuantity}</p>
            <span className="text-slate-400 font-bold text-sm">itens</span>
          </div>
          <div className="mt-6 flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-full w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
            <span>{displayPeriodLabel}</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 transition-hover hover:shadow-md">
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Colaboradores</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-5xl font-black text-slate-900">{state.people.length}</p>
            <span className="text-slate-400 font-bold text-sm">ativos</span>
          </div>
          <div className="mt-6 flex items-center text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-full w-fit">
            <Icons.People />
            <span className="ml-2">Equipe Total</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 transition-hover hover:shadow-md">
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Registros</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-5xl font-black text-slate-900">{filteredTasks.length}</p>
            <span className="text-slate-400 font-bold text-sm">lançamentos</span>
          </div>
          <div className="mt-6 flex items-center text-violet-600 text-xs font-bold bg-violet-50 px-3 py-1.5 rounded-full w-fit">
            <Icons.Task />
            <span className="ml-2">Atividade do Período</span>
          </div>
        </div>
      </div>

      {/* Evolution Progression Chart */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">Gráfico de Evolução</h3>
            <p className="text-slate-400 text-sm font-medium mt-1">Comparativo de produtividade por categoria</p>
          </div>
          <div className="bg-slate-50 px-4 py-2 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            {displayPeriodLabel}
          </div>
        </div>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolutionData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => {
                  const d = val.split('-');
                  return `${d[2]}/${d[1]}`;
                }}
                stroke="#94a3b8"
                fontSize={11}
                fontWeight={600}
                minTickGap={30}
              />
              <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
              <Tooltip 
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', padding: '16px' }}
                itemStyle={{ fontWeight: 700, fontSize: '12px' }}
                labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 600, fontSize: '12px' }} />
              <Area 
                type="monotone" 
                dataKey="total" 
                name="Produção Total" 
                stroke="#3b82f6" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
              {state.serviceCategories.map((cat) => (
                <Line 
                  key={cat.id} 
                  type="monotone" 
                  dataKey={cat.name} 
                  stroke={cat.color} 
                  strokeWidth={2} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Individual Team Productivity */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-extrabold text-slate-800">Ranking da Equipe</h3>
            <div className="text-slate-300">
              <Icons.People />
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  stroke="#64748b" 
                  fontSize={12}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="quantity" name="Total Realizado" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-extrabold text-slate-800">Distribuição de Serviços</h3>
            <div className="text-slate-300">
              <Icons.Settings />
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ paddingTop: '20px', fontWeight: 600, fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="bg-gradient-to-br from-indigo-700 via-blue-700 to-indigo-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
                <Icons.Sparkles />
              </div>
              <h2 className="text-3xl font-black tracking-tight">Análise Inteligente</h2>
            </div>
            <p className="text-blue-100 text-lg mb-10 max-w-lg leading-relaxed font-medium">
              A inteligência artificial irá analisar os volumes produzidos em <strong>{displayPeriodLabel}</strong> para fornecer recomendações estratégicas.
            </p>
            {!aiInsight && !loadingAi && (
              <button 
                onClick={handleGetInsights}
                className="bg-white text-indigo-700 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0"
              >
                Gerar Relatório de Desempenho
              </button>
            )}
          </div>
          
          {loadingAi && (
            <div className="flex-1 flex flex-col items-center gap-6 py-12">
              <div className="relative">
                <div className="animate-spin h-16 w-16 border-4 border-white/20 border-t-white rounded-full"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                </div>
              </div>
              <span className="font-black tracking-[0.3em] text-[10px] uppercase text-white/70">Processando métricas...</span>
            </div>
          )}

          {aiInsight && !loadingAi && (
            <div className="flex-1 bg-white/5 backdrop-blur-3xl rounded-[32px] p-8 border border-white/10 shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Diagnóstico Concluído</span>
                  <span className="text-sm font-bold mt-1">Período: {displayPeriodLabel}</span>
                </div>
                <button 
                  onClick={() => setAiInsight(null)}
                  className="bg-white/10 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/20 transition-all"
                >
                  <Icons.Trash />
                </button>
              </div>
              <div className="text-base leading-relaxed whitespace-pre-wrap font-medium text-white/90">
                {aiInsight}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
