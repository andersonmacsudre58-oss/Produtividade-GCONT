
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LabelList
} from 'recharts';
import { AppState, Task } from '../types';
import { Icons, PRESET_COLORS } from '../constants';
import { getProductivityInsights } from '../services/geminiService';

interface DashboardProps {
  state: AppState;
  onRefresh?: () => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onRefresh }) => {
  const getLocalDateStr = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(getLocalDateStr());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const tasksByDate = useMemo(() => {
    return (state.tasks || []).filter(t => {
      return (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
    });
  }, [state.tasks, startDate, endDate]);

  // Filter particularities by the selected date range
  const particularitiesByDate = useMemo(() => {
    return (state.particularities || []).filter(p => {
      return (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate);
    });
  }, [state.particularities, startDate, endDate]);

  const commonBarData = useMemo(() => {
    return (state.people || []).map(person => {
      const pTasks = tasksByDate.filter(t => t.personId === person.id);
      const atribuidos = pTasks.reduce((acc, t) => acc + (Number(t.assignedProcesses) || 0), 0);
      const realizados = pTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0);
      return { id: person.id, name: person.name, atribuidos, realizados };
    }).filter(d => d.atribuidos > 0 || d.realizados > 0);
  }, [state.people, tasksByDate]);

  const handleGetInsights = async () => {
    if (tasksByDate.length === 0) return;
    setLoadingAi(true);
    try {
      // Pass the filtered particularities to the AI service for a contextual analysis
      const insight = await getProductivityInsights(tasksByDate, state.people, state.serviceCategories, particularitiesByDate);
      setAiInsight(insight);
    } catch (e) {
      setAiInsight("Erro ao gerar análise.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Atribuído</p>
           <h4 className="text-3xl font-black text-blue-600 mt-1">
             {tasksByDate.reduce((acc, t) => acc + (Number(t.assignedProcesses) || 0), 0)}
           </h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Realizado</p>
           <h4 className="text-3xl font-black text-emerald-600 mt-1">
             {tasksByDate.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0)}
           </h4>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaboradores Ativos</p>
           <h4 className="text-3xl font-black text-indigo-600 mt-1">{state.people.length}</h4>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
        <h3 className="text-xl font-black mb-8">Desempenho da Equipe</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={commonBarData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={10} fontWeight={800} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Legend />
              <Bar dataKey="atribuidos" name="Atribuídos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizados" name="Realizados" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-8 text-white">
        <h2 className="text-xl font-black uppercase tracking-widest mb-4">Análise IA</h2>
        {aiInsight ? (
          <div className="prose prose-invert max-w-none">
            <p className="text-xs leading-relaxed opacity-80 whitespace-pre-wrap">{aiInsight}</p>
          </div>
        ) : (
          <button onClick={handleGetInsights} disabled={loadingAi} className="bg-blue-600 px-6 py-3 rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors">
            {loadingAi ? 'Analisando...' : 'Gerar Insights'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
