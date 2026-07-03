
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LabelList, LineChart, Line
} from 'recharts';
import { AppState, Task, ServiceCategory, Particularity, Pendency } from '../types';
import { Icons, PRESET_COLORS } from '../constants';
import { getProductivityInsights } from '../services/geminiService';

interface DashboardProps { state: AppState; onRefresh?: () => Promise<void>; }

type PeriodPreset = 'hoje' | 'semanal' | 'quinzenal' | 'mensal' | 'trimestral' | 'anual' | 'custom';
type DashboardSubTab = 'pagamento' | 'licitacao-diaria' | 'fluxo-processos' | 'pendencias';

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
  const [flowVisibility, setFlowVisibility] = useState({
    received: true,
    transferred: true
  });

  // States para filtros de Pendências
  const [pendencyCollabId, setPendencyCollabId] = useState<string>('Todos');
  const [pendencyYear, setPendencyYear] = useState<string>('Todos');
  const [pendencyMonth, setPendencyMonth] = useState<string>('Todos');
  const [pendencyDay, setPendencyDay] = useState<string>('Todos');

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

  const flowData = useMemo(() => {
    return (state.processFlows || [])
      .filter(f => (!startDate || f.date >= startDate) && (!endDate || f.date <= endDate))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(f => ({
        ...f,
        formattedDate: f.date.split('-').reverse().slice(0, 2).join('/')
      }));
  }, [state.processFlows, startDate, endDate]);

  const flowTotals = useMemo(() => {
    return flowData.reduce((acc, f) => ({
      received: acc.received + (f.received || 0),
      transferred: acc.transferred + (f.transferred || 0),
      completed: acc.completed + (f.completed || 0)
    }), { received: 0, transferred: 0, completed: 0 });
  }, [flowData]);

  const flowPieData = useMemo(() => {
    const { received, transferred } = flowTotals;
    if (received === 0 && transferred === 0) return [];
    return [
      { name: 'Recebidos', value: received, color: '#f97316' },
      { name: 'Tramitados', value: transferred, color: '#06b6d4' }
    ];
  }, [flowTotals]);

  const flowBarData = useMemo(() => {
    return [
      { name: 'Recebidos', value: flowTotals.received, fill: '#f97316' },
      { name: 'Tramitados', value: flowTotals.transferred, fill: '#06b6d4' }
    ];
  }, [flowTotals]);

  const filteredPendencies = useMemo(() => {
    let result = state.pendencies || [];

    if (pendencyCollabId && pendencyCollabId !== 'Todos') {
      result = result.filter(p => p.personId === pendencyCollabId);
    }

    if (pendencyYear && pendencyYear !== 'Todos') {
      result = result.filter(p => {
        const pYear = p.date.split('-')[0];
        return pYear === pendencyYear;
      });
    }

    if (pendencyMonth && pendencyMonth !== 'Todos') {
      result = result.filter(p => {
        const pMonth = p.date.split('-')[1];
        return pMonth === pendencyMonth;
      });
    }

    if (pendencyDay && pendencyDay !== 'Todos') {
      result = result.filter(p => {
        const pDay = p.date.split('-')[2];
        const formattedDay = pendencyDay.padStart(2, '0');
        return pDay === formattedDay;
      });
    }

    return result;
  }, [state.pendencies, pendencyCollabId, pendencyYear, pendencyMonth, pendencyDay]);

  const pendencyChartData = useMemo(() => {
    const dataMap: Record<string, number> = {};

    if (pendencyMonth === 'Todos') {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      months.forEach(m => { dataMap[m] = 0; });
      filteredPendencies.forEach(p => {
        const parts = p.date.split('-');
        if (parts.length >= 2) {
          const monthIndex = parseInt(parts[1], 10) - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
            dataMap[months[monthIndex]]++;
          }
        }
      });
      return months.map(name => ({ name, 'Pendências': dataMap[name] }));
    } else if (pendencyDay === 'Todos') {
      const days: string[] = [];
      for (let i = 1; i <= 31; i++) {
        const dStr = String(i).padStart(2, '0');
        days.push(dStr);
        dataMap[dStr] = 0;
      }
      filteredPendencies.forEach(p => {
        const parts = p.date.split('-');
        if (parts.length >= 3) {
          const dayStr = parts[2];
          if (dataMap[dayStr] !== undefined) {
            dataMap[dayStr]++;
          }
        }
      });
      return days.map(name => ({ name, 'Pendências': dataMap[name] }));
    } else {
      // Group by specific fields (e.g., Document types) since day is fixed
      const keys = ['Relatório', 'Memorando', 'Despacho', 'Disponibilidade'];
      keys.forEach(k => { dataMap[k] = 0; });
      filteredPendencies.forEach(p => {
        if (dataMap[p.documentType] !== undefined) {
          dataMap[p.documentType]++;
        } else {
          dataMap[p.documentType] = (dataMap[p.documentType] || 0) + 1;
        }
      });
      return Object.entries(dataMap).map(([name, value]) => ({ name, 'Pendências': value }));
    }
  }, [filteredPendencies, pendencyMonth, pendencyDay]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    (state.pendencies || []).forEach(p => {
      const yr = p.date.split('-')[0];
      if (yr) years.add(yr);
    });
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort();
  }, [state.pendencies]);

  const monthOptions = [
    { value: 'Todos', label: 'Todos os Meses' },
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const dayOptions = useMemo(() => {
    const days = [{ value: 'Todos', label: 'Todos os Dias' }];
    for (let i = 1; i <= 31; i++) {
      const dStr = String(i).padStart(2, '0');
      days.push({ value: dStr, label: `Dia ${i}` });
    }
    return days;
  }, []);

  const docSummary = useMemo(() => {
    const list = [
      { label: 'Memorando', count: 0 },
      { label: 'Relatório', count: 0 },
      { label: 'Despacho', count: 0 },
      { label: 'Disponibilidade', count: 0 },
    ];
    let total = 0;
    filteredPendencies.forEach(p => {
      const found = list.find(item => item.label.toLowerCase() === p.documentType.toLowerCase());
      if (found) {
        found.count++;
        total++;
      }
    });
    list.sort((a, b) => b.count - a.count);
    return { list, total };
  }, [filteredPendencies]);

  const sectorSummary = useMemo(() => {
    const list = [
      { label: 'GCIF', count: 0 },
      { label: 'Jurídico', count: 0 },
    ];
    let total = 0;
    filteredPendencies.forEach(p => {
      const normalizedSector = p.sector === 'JURÍDICO' ? 'Jurídico' : 'GCIF';
      const found = list.find(item => item.label === normalizedSector);
      if (found) {
        found.count++;
        total++;
      }
    });
    list.sort((a, b) => b.count - a.count);
    return { list, total };
  }, [filteredPendencies]);

  const typeSummary = useMemo(() => {
    const initialList = [
      { label: 'Contrato de Gestão incorreto/ausente', dbMatches: ['contrato de gestão incorreto/ausente', 'contrato de gestão incorreto', 'contrato de gestão incorreto ou ausente'], count: 0 },
      { label: 'Centro de custo incorreto', dbMatches: ['centro de custo incorreto'], count: 0 },
      { label: 'Valor da nota incorreto', dbMatches: ['valor da nf incorreto', 'valor da nota incorreto'], count: 0 },
      { label: 'Anexado incorretamente', dbMatches: ['anexado incorretamente'], count: 0 },
      { label: 'Natureza incorreta', dbMatches: ['natureza incorreta', 'natureza incorretas'], count: 0 },
      { label: 'Nº da nota incorreto', dbMatches: ['nº da nota incorreto', 'nº de nota incorreto', 'numero da nota incorreto'], count: 0 },
      { label: 'Nº do memorando incorreto', dbMatches: ['nº do memorando incorreto', 'numero do memorando incorreto'], count: 0 }
    ];
    
    const list = [...initialList];
    let total = 0;

    filteredPendencies.forEach(p => {
      const pType = p.pendingType || (p as any).pendencyType || '';
      const pTypeLower = pType.toLowerCase().trim();
      
      const found = list.find(item => item.dbMatches.includes(pTypeLower));
      if (found) {
        found.count++;
        total++;
      } else if (pType) {
        const existing = list.find(item => item.label.toLowerCase() === pTypeLower);
        if (existing) {
          existing.count++;
        } else {
          list.push({ label: pType, dbMatches: [pTypeLower], count: 1 });
        }
        total++;
      }
    });

    list.sort((a, b) => b.count - a.count);
    return { list, total };
  }, [filteredPendencies]);

  const collaboratorPendencySummary = useMemo(() => {
    // Determine the active tasks for this period matching our pendency filters
    const periodTasks = (state.tasks || []).filter(t => {
      if (pendencyYear && pendencyYear !== 'Todos') {
        const tYear = t.date.split('-')[0];
        if (tYear !== pendencyYear) return false;
      }
      if (pendencyMonth && pendencyMonth !== 'Todos') {
        const tMonth = t.date.split('-')[1];
        if (tMonth !== pendencyMonth) return false;
      }
      if (pendencyDay && pendencyDay !== 'Todos') {
        const tDay = t.date.split('-')[2];
        const formattedDay = pendencyDay.padStart(2, '0');
        if (tDay !== formattedDay) return false;
      }
      return true;
    });

    // Determine the active pendencies for this period matching our date filters (excluding collab filter to compare all teammates)
    const periodPendencies = (state.pendencies || []).filter(p => {
      if (pendencyYear && pendencyYear !== 'Todos') {
        const pYear = p.date.split('-')[0];
        if (pYear !== pendencyYear) return false;
      }
      if (pendencyMonth && pendencyMonth !== 'Todos') {
        const pMonth = p.date.split('-')[1];
        if (pMonth !== pendencyMonth) return false;
      }
      if (pendencyDay && pendencyDay !== 'Todos') {
        const pDay = p.date.split('-')[2];
        const formattedDay = pendencyDay.padStart(2, '0');
        if (pDay !== formattedDay) return false;
      }
      return true;
    });

    const list = (state.people || []).map(person => {
      // Total completed processes for this person in user's selecting period:
      const pTasks = periodTasks.filter(t => t.personId === person.id);
      const totalRealizados = pTasks.reduce((acc, t) => acc + (Number(t.processQuantity) || 0), 0);

      // Total pendencies for this person:
      const pPendencies = periodPendencies.filter(p => p.personId === person.id);
      const totalPendecias = pPendencies.length;

      // Calculate % of impact:
      let impactPercent = 0;
      if (totalRealizados > 0) {
        impactPercent = (totalPendecias / totalRealizados) * 100;
      } else if (totalPendecias > 0) {
        impactPercent = 100;
      }

      return {
        id: person.id,
        name: person.name,
        totalRealizados,
        totalPendecias,
        impactPercent
      };
    });

    // Keep those with activity OR those who are in team
    let filteredList = list.filter(item => item.totalRealizados > 0 || item.totalPendecias > 0);

    // Filter by collaborator if one is selected and is not "Todos"
    if (pendencyCollabId && pendencyCollabId !== 'Todos') {
      filteredList = filteredList.filter(item => item.id === pendencyCollabId);
    }

    // Sort by totalPendecias desc, then totalRealizados desc, then impactPercent desc
    filteredList.sort((a, b) => b.totalPendecias - a.totalPendecias || b.totalRealizados - a.totalRealizados || b.impactPercent - a.impactPercent);

    // Sum totals of columns
    const totalRealizadosAll = filteredList.reduce((acc, item) => acc + item.totalRealizados, 0);
    const totalPendeciasAll = filteredList.reduce((acc, item) => acc + item.totalPendecias, 0);
    let totalImpactPercent = 0;
    if (totalRealizadosAll > 0) {
      totalImpactPercent = (totalPendeciasAll / totalRealizadosAll) * 100;
    }

    return { list: filteredList, totalRealizadosAll, totalPendeciasAll, totalImpactPercent };
  }, [state.tasks, state.pendencies, state.people, pendencyYear, pendencyMonth, pendencyDay, pendencyCollabId]);

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
      {/* Header do Dashboard sem alertas de sincronização */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-[32px] shadow-sm border border-slate-200/60 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Controle Gerencial</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            <button onClick={() => {setActiveSubTab('pagamento'); setSelectedAnalystId(null);}} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'pagamento' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Pagamentos</button>
            <button onClick={() => {setActiveSubTab('licitacao-diaria'); setSelectedAnalystId(null);}} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'licitacao-diaria' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Licitação/Diária</button>
            <button onClick={() => {setActiveSubTab('fluxo-processos'); setSelectedAnalystId(null);}} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'fluxo-processos' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Fluxo de Processos</button>
            <button onClick={() => {setActiveSubTab('pendencias'); setSelectedAnalystId(null);}} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'pendencias' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Pendências</button>
          </div>
        </div>
        
        {activeSubTab === 'pendencias' ? (
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro Colaborador */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Colaborador</span>
                <select 
                  value={pendencyCollabId} 
                  onChange={(e) => setPendencyCollabId(e.target.value)}
                  className="bg-transparent text-[11px] font-bold outline-none dark:text-white cursor-pointer min-w-[120px]"
                >
                  <option value="Todos" className="dark:bg-slate-900">Todos os Colaboradores</option>
                  {state.people.map(p => (
                    <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtro Ano */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ano</span>
                <select 
                  value={pendencyYear} 
                  onChange={(e) => setPendencyYear(e.target.value)}
                  className="bg-transparent text-[11px] font-bold outline-none dark:text-white cursor-pointer min-w-[70px]"
                >
                  <option value="Todos" className="dark:bg-slate-900">Todos</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr} className="dark:bg-slate-900">{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtro Mês */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mês</span>
                <select 
                  value={pendencyMonth} 
                  onChange={(e) => setPendencyMonth(e.target.value)}
                  className="bg-transparent text-[11px] font-bold outline-none dark:text-white cursor-pointer min-w-[100px]"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-900">{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtro Dia */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dia</span>
                <select 
                  value={pendencyDay} 
                  onChange={(e) => setPendencyDay(e.target.value)}
                  className="bg-transparent text-[11px] font-bold outline-none dark:text-white cursor-pointer min-w-[90px]"
                >
                  {dayOptions.map(opt => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-900">{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Colaborador</span>
                <select 
                  value={selectedAnalystId || ''} 
                  onChange={(e) => setSelectedAnalystId(e.target.value || null)}
                  className="bg-transparent text-[11px] font-bold outline-none dark:text-white cursor-pointer"
                >
                  <option value="" className="dark:bg-slate-900">Todos os Analistas</option>
                  {state.people.map(p => (
                    <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

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
        )}
      </div>

      {activeSubTab === 'pendencias' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Pendências</p>
              <h4 className="text-3xl font-black text-amber-600 dark:text-amber-500">{filteredPendencies.length}</h4>
            </div>
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-650"><Icons.AlertCircle /></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Setor GCIF</p>
              <h4 className="text-3xl font-black text-violet-600 dark:text-violet-500">{filteredPendencies.filter(p => p.sector === 'GCIF').length}</h4>
            </div>
            <div className="w-12 h-12 bg-violet-50 dark:bg-violet-900/20 rounded-2xl flex items-center justify-center text-violet-600 font-extrabold text-xs">GCIF</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Setor JURÍDICO</p>
              <h4 className="text-3xl font-black text-rose-600 dark:text-rose-500">{filteredPendencies.filter(p => p.sector === 'JURÍDICO').length}</h4>
            </div>
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-600 font-extrabold text-[10px]">JURID</div>
          </div>
        </div>
      ) : (
        <>
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
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-605"><Icons.Calendar /></div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notas Fiscais</p>
                <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{stats.notas}</h4>
              </div>
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600"><Icons.Note /></div>
            </div>
          </div>

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
        </>
      )}

      {activeSubTab === 'pagamento' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter flex items-center gap-2">
                  <Icons.People /> Desempenho por Analista
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {selectedAnalystId ? `Focando em: ${state.people.find(p => p.id === selectedAnalystId)?.name}` : 'Clique em uma barra ou use o filtro no topo'}
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
                  <BarChart data={barData} margin={{ top: 30, right: 10, left: -20, bottom: 20 }} onClick={(e: any) => e?.activePayload && setSelectedAnalystId(e.activePayload[0].payload.id)}>
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
                             fontSize={12} 
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
      ) : activeSubTab === 'licitacao-diaria' ? (
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
                          fontSize={14} 
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
      ) : activeSubTab === 'fluxo-processos' ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[48px] shadow-xl border border-slate-100 dark:border-slate-800 min-h-[650px] flex flex-col items-center justify-center animate-in slide-in-from-bottom-8 duration-700">
           <div className="text-center mb-12">
             <h3 className="text-4xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Fluxo de Processos</h3>
             <p className="text-slate-400 font-bold mt-4 tracking-widest text-xs uppercase italic">Acompanhamento de entrada, tramitação e conclusão</p>
             
             <div className="flex flex-wrap justify-center gap-4 mt-10">
               <button 
                 onClick={() => setFlowVisibility(v => ({ ...v, received: !v.received }))}
                 className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${flowVisibility.received ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm dark:bg-orange-950/20 dark:border-orange-950/30 dark:text-orange-400' : 'bg-white border-slate-100 text-slate-400 opacity-60'}`}
               >
                 <div className={`w-2 h-2 rounded-full ${flowVisibility.received ? 'bg-orange-500' : 'bg-slate-300'}`}></div>
                 Recebidos
               </button>
               <button 
                 onClick={() => setFlowVisibility(v => ({ ...v, transferred: !v.transferred }))}
                 className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${flowVisibility.transferred ? 'bg-cyan-50 border-cyan-200 text-cyan-600 shadow-sm dark:bg-cyan-950/20 dark:border-cyan-950/30 dark:text-cyan-400' : 'bg-white border-slate-100 text-slate-400 opacity-60'}`}
               >
                 <div className={`w-2 h-2 rounded-full ${flowVisibility.transferred ? 'bg-cyan-500' : 'bg-slate-300'}`}></div>
                 Tramitados
               </button>
               <button 
                 onClick={() => setFlowVisibility(v => ({ ...v, received: !v.received }))}
                 className="hidden"
               >
                 <div className={`w-2 h-2 rounded-full ${flowVisibility.received ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                 Realizados
               </button>
             </div>
           </div>
           
           <div className="w-full h-[400px] mb-12">
              {flowData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={flowData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="formattedDate" fontSize={12} fontWeight={900} axisLine={false} tickLine={false} stroke="#94a3b8" />
                    <YAxis fontSize={12} axisLine={false} tickLine={false} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 60px -10px rgba(0,0,0,0.15)'}} 
                      itemStyle={{fontSize: '12px', fontWeight: 900}}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '40px', fontWeight: 900, fontSize: '12px'}} />
                    {flowVisibility.received && <Line type="monotone" dataKey="received" name="Recebidos" stroke="#f97316" strokeWidth={4} dot={{ r: 6, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8 }} />}
                    {flowVisibility.transferred && <Line type="monotone" dataKey="transferred" name="Tramitados" stroke="#06b6d4" strokeWidth={4} dot={{ r: 6, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8 }} />}

                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 uppercase font-black tracking-[0.3em] italic">
                  <Icons.Refresh /><p className="mt-8 text-sm">Sem dados de fluxo registrados para este período</p>
                </div>
              )}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Distribuição Percentual</h4>
                <div className="h-[300px]">
                  {flowPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={flowPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {flowPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px]">Sem dados</div>}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Comparativo de Totais</h4>
                <div className="h-[300px]">
                  {flowBarData.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={flowBarData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" fontSize={10} fontWeight={900} axisLine={false} tickLine={false} stroke="#94a3b8" />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#94a3b8" />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                          {flowBarData.map((entry, index) => (
                            <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                          ))}
                          <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 900, fill: '#64748b' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px]">Sem dados</div>}
                </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[48px] shadow-xl border border-slate-100 dark:border-slate-800 min-h-[500px] flex flex-col justify-center animate-in slide-in-from-bottom-8 duration-700">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Histórico de Pendências</h3>
            <p className="text-slate-400 font-bold mt-2 tracking-widest text-[10px] uppercase italic">
              Quantitativo de pendências registradas por colaborador e datas selecionadas
            </p>
          </div>

          <div className="w-full h-[350px] mb-8">
            {filteredPendencies.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pendencyChartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="name" fontSize={11} fontWeight={900} axisLine={false} tickLine={false} stroke="#94a3b8" />
                  <YAxis fontSize={11} axisLine={false} tickLine={false} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                  <Line 
                    type="monotone" 
                    dataKey="Pendências" 
                    stroke="#f59e0b" 
                    strokeWidth={4} 
                    dot={{ r: 6, strokeWidth: 2, fill: '#fff' }} 
                    activeDot={{ r: 8 }}
                  >
                    <LabelList dataKey="Pendências" position="top" style={{ fontSize: 11, fontWeight: 900, fill: '#f59e0b' }} offset={10} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-200 uppercase font-black tracking-[0.3em] italic">
                <div className="w-10 h-10 text-amber-500 mb-4 animate-bounce flex items-center justify-center">
                  <Icons.AlertCircle />
                </div>
                <p className="text-sm">Nenhuma pendência registrada para os filtros selecionados</p>
              </div>
            )}
          </div>

          {/* Tabelas de Diagnóstico Quantitativo e Distributivo de Pendências */}
          {filteredPendencies.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 my-10 animate-in fade-in duration-500">
              
              {/* Tabela 1: Doc pendência */}
              <div id="doc-pendency-table" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-2 border-b-2 border-blue-500 mb-4">
                    <span className="text-[12px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Doc pendência</span>
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight flex items-center gap-1">
                      Qnt Processo
                      <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {docSummary.list.map((row, index) => (
                      <div 
                        key={row.label} 
                        className={`flex justify-between items-center py-2.5 px-3 rounded-lg text-xs ${
                          index % 2 === 1 ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-transparent'
                        }`}
                      >
                        <span className="font-semibold text-slate-600 dark:text-slate-350 pr-4 truncate">{row.label}</span>
                        <div className="border-l border-slate-200 dark:border-slate-800 pl-4 min-w-[50px] text-right font-black text-slate-800 dark:text-white">
                          {row.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center px-3 font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                  <span>Total</span>
                  <div className="border-l border-slate-200 dark:border-slate-800 pl-4 min-w-[50px] text-right">
                    {docSummary.total}
                  </div>
                </div>
              </div>

              {/* Tabela 2: Setor */}
              <div id="sector-pendency-table" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-2 border-b-2 border-blue-500 mb-4">
                    <span className="text-[12px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Setor</span>
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight flex items-center gap-1">
                      Qnt Processo
                      <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {sectorSummary.list.map((row, index) => (
                      <div 
                        key={row.label} 
                        className={`flex justify-between items-center py-2.5 px-3 rounded-lg text-xs ${
                          index % 2 === 1 ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-transparent'
                        }`}
                      >
                        <span className="font-semibold text-slate-600 dark:text-slate-350 pr-4 truncate">{row.label}</span>
                        <div className="border-l border-slate-200 dark:border-slate-800 pl-4 min-w-[50px] text-right font-black text-slate-800 dark:text-white">
                          {row.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center px-3 font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                  <span>Total</span>
                  <div className="border-l border-slate-200 dark:border-slate-800 pl-4 min-w-[50px] text-right">
                    {sectorSummary.total}
                  </div>
                </div>
              </div>

              {/* Tabela 3: Tipo de pendência */}
              <div id="type-pendency-table" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-2 border-b-2 border-blue-500 mb-4">
                    <span className="text-[12px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Tipo de pendência</span>
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight flex items-center gap-1">
                      Qnt Processo
                      <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {typeSummary.list.map((row, index) => (
                      <div 
                        key={row.label} 
                        className={`flex justify-between items-center py-2.5 px-3 rounded-lg text-xs ${
                          index % 2 === 1 ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-transparent'
                        }`}
                      >
                        <span className="font-semibold text-slate-600 dark:text-slate-350 pr-4 truncate" title={row.label}>{row.label}</span>
                        <div className="border-l border-slate-200 dark:border-slate-800 pl-4 min-w-[50px] text-right font-black text-slate-800 dark:text-white">
                          {row.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center px-3 font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                  <span>Total</span>
                  <div className="border-l border-slate-200 dark:border-slate-800 pl-4 min-w-[50px] text-right">
                    {typeSummary.total}
                  </div>
                </div>
              </div>

              {/* Tabela 4: Impacto de erro por colaborador */}
              <div id="collab-pendency-impact-table" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-2 border-b-2 border-blue-500 mb-4 gap-1">
                    <span className="text-[12px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Colaborador</span>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-tight">
                      <span>Realiz.</span>
                      <span className="text-amber-500">Pend.</span>
                      <span className="text-rose-500">% Imp.</span>
                    </div>
                  </div>
                  <div className="space-y-0.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                    {collaboratorPendencySummary.list.map((row, index) => (
                      <div 
                        key={row.id} 
                        className={`flex justify-between items-center py-2.5 px-3 rounded-lg text-xs ${
                          index % 2 === 1 ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-transparent'
                        }`}
                      >
                        <span className="font-semibold text-slate-600 dark:text-slate-350 pr-2 truncate max-w-[80px]" title={row.name}>{row.name}</span>
                        <div className="flex items-center gap-3 font-bold text-[11px] text-right ml-auto">
                          <span className="text-slate-500 dark:text-slate-400 min-w-[15px]">{row.totalRealizados}</span>
                          <span className="text-amber-600 dark:text-amber-400 font-extrabold min-w-[15px]">{row.totalPendecias}</span>
                          <span className="text-rose-600 dark:text-rose-450 font-black min-w-[32px] bg-rose-50 dark:bg-rose-950/30 px-1 py-0.5 rounded text-[10px] text-center">
                            {row.impactPercent.toFixed(2).replace('.', ',')}%
                          </span>
                        </div>
                      </div>
                    ))}
                    {collaboratorPendencySummary.list.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-400 italic">Sem registros no período</div>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center px-3 font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                  <span>Total</span>
                  <div className="flex items-center gap-3 font-black text-[11px] text-right ml-auto">
                    <span className="text-slate-500 dark:text-slate-450 min-w-[15px]">{collaboratorPendencySummary.totalRealizadosAll}</span>
                    <span className="text-amber-600 dark:text-amber-400 min-w-[15px]">{collaboratorPendencySummary.totalPendeciasAll}</span>
                    <span className="text-rose-600 dark:text-rose-400 min-w-[32px] bg-rose-100 dark:bg-rose-950/60 px-1 py-0.5 rounded text-[10px] text-center">
                      {collaboratorPendencySummary.totalImpactPercent.toFixed(2).replace('.', ',')}%
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}


        </div>
      )}

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
