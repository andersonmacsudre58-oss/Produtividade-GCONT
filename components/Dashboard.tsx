
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
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState<string>(lastWeek);
  const [endDate, setEndDate] = useState<string>(today);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Filtro centralizado por período de datas
  const filteredTasks = useMemo(() => {
    return state.tasks.filter(t => t.date >= startDate && t.date <= endDate);
  }, [state.tasks, startDate, endDate]);

  // Atalhos de período
  const setRangePreset = (days: number) => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
  };

  // Dados para o Gráfico de Evolução (Linha/Área)
  const evolutionData = useMemo(() => {
    const dates: Record<string, any> = {};
    
    // Criar slots para cada dia no intervalo selecionado para garantir que o gráfico não tenha buracos
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Limitar a geração de pontos para evitar travamentos em intervalos gigantes
    const maxDays = diffDays > 365 ? 365 : diffDays;

    for (let i = 0; i <= maxDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dates[dateStr] = { date: dateStr, total: 0 };
      state.serviceCategories.forEach(cat => {
        dates[dateStr][cat.name] = 0;
      });
    }

    filteredTasks.forEach(t => {
      if (dates[t.date]) {
        const cat = state.serviceCategories.find(c => c.id === t.serviceCategoryId);
        if (cat) {
          dates[t.date][cat.name] += t.quantity;
          dates[t.date].total += t.quantity;
        }
      }
    });

    return Object.values(dates).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredTasks, state.serviceCategories, startDate, endDate]);

  // Ranking da Equipe
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

  // Distribuição por Categoria
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

  return (
    <div className="space-y-8">
      {/* Seletor de Período Refatorado */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-100">
              <Icons.Calendar />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Período de Análise</h3>
              <p className="text-xs text-slate-400 font-medium">Selecione o intervalo de datas para os gráficos</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
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

            <div className="flex gap-2">
              <button onClick={() => setRangePreset(0)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">Hoje</button>
              <button onClick={() => setRangePreset(7)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">7d</button>
              <button onClick={() => setRangePreset(30)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">30d</button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total no Período</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-5xl font-black text-slate-900">{totalQuantity}</p>
            <span className="text-slate-400 font-bold text-sm">itens</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Colaboradores</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-5xl font-black text-slate-900">{state.people.length}</p>
            <span className="text-slate-400 font-bold text-sm">ativos</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Registros</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-5xl font-black text-slate-900">{filteredTasks.length}</p>
            <span className="text-slate-400 font-bold text-sm">lançamentos</span>
          </div>
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
        <h3 className="text-xl font-extrabold text-slate-800 mb-8">Evolução da Produtividade</h3>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => val.split('-').reverse().slice(0, 2).join('/')}
                stroke="#94a3b8"
                fontSize={11}
              />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="total" name="Total" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={3} />
              {state.serviceCategories.map(cat => (
                <Area key={cat.id} type="monotone" dataKey={cat.name} stackId="1" stroke={cat.color} fill={cat.color} fillOpacity={0.2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 h-[450px]">
          <h3 className="text-xl font-extrabold text-slate-800 mb-8">Ranking da Equipe</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} fontSize={12} fontWeight={700} />
              <Tooltip />
              <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 h-[450px]">
          <h3 className="text-xl font-extrabold text-slate-800 mb-8">Distribuição de Serviços</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-600 p-3 rounded-2xl">
                <Icons.Sparkles />
              </div>
              <h2 className="text-3xl font-black tracking-tight">Análise com IA</h2>
            </div>
            <p className="text-slate-400 text-lg mb-10 max-w-lg leading-relaxed">
              Clique para analisar a produção do período de <strong>{startDate.split('-').reverse().join('/')}</strong> até <strong>{endDate.split('-').reverse().join('/')}</strong>.
            </p>
            {!aiInsight && !loadingAi && (
              <button 
                onClick={handleGetInsights}
                className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-2xl"
              >
                Gerar Insights do Período
              </button>
            )}
          </div>
          
          {loadingAi && <div className="animate-spin h-12 w-12 border-4 border-white/20 border-t-white rounded-full"></div>}

          {aiInsight && !loadingAi && (
            <div className="flex-1 bg-white/5 backdrop-blur-3xl rounded-[32px] p-8 border border-white/10 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="text-base leading-relaxed whitespace-pre-wrap font-medium text-slate-200">
                {aiInsight}
              </div>
              <button onClick={() => setAiInsight(null)} className="mt-6 text-xs font-bold text-slate-500 hover:text-white transition-all uppercase tracking-widest">Limpar Análise</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
