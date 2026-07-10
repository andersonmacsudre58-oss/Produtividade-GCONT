import React, { useState, useMemo } from 'react';
import { Person, Particularity } from '../types';
import { Icons } from '../constants';

interface ParticularityManagerProps {
  particularities: Particularity[];
  people: Person[];
  onAdd: (p: Particularity) => void;
  onRemove: (id: string) => void;
}

const ParticularityManager: React.FC<ParticularityManagerProps> = ({ particularities, people, onAdd, onRemove }) => {
  const getLocalDateStr = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // State para o formulário
  const [selectedPerson, setSelectedPerson] = useState('');
  const [date, setDate] = useState(getLocalDateStr());
  const [isPeriod, setIsPeriod] = useState(false);
  const [endDate, setEndDate] = useState(getLocalDateStr());
  const [type, setType] = useState<Particularity['type']>('Saúde');
  const [description, setDescription] = useState('');

  // State para os filtros de listagem
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const calculatedDays = useMemo(() => {
    if (!isPeriod || !date || !endDate) return 1;
    const start = new Date(date + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [isPeriod, date, endDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !description.trim()) return;

    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      personId: selectedPerson,
      date,
      endDate: isPeriod ? endDate : date,
      type,
      description: description.trim()
    });

    setDescription('');
    setIsPeriod(false);
    setDate(getLocalDateStr());
    setEndDate(getLocalDateStr());
  };

  const filteredParticularities = useMemo(() => {
    let result = [...particularities];
    
    if (filterStartDate) {
      result = result.filter(p => (p.endDate || p.date) >= filterStartDate);
    }
    
    if (filterEndDate) {
      result = result.filter(p => p.date <= filterEndDate);
    }
    
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [particularities, filterStartDate, filterEndDate]);

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const getTypeStyle = (t: Particularity['type']) => {
    switch (t) {
      case 'Saúde': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Treinamento': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Administrativo': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
      <div className="md:col-span-1">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Icons.Note /> Registrar Ocorrência
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Colaborador</label>
              <select 
                value={selectedPerson} 
                onChange={(e) => setSelectedPerson(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione...</option>
                {people.filter(p => !p.isHidden || p.id === selectedPerson).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Checkbox para Definir Período de Afastamento */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={isPeriod}
                  onChange={(e) => {
                    setIsPeriod(e.target.checked);
                    if (e.target.checked) {
                      setEndDate(date);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Registrar Período (Afastamento)</span>
                  <span className="block text-[9px] text-slate-400 font-medium">Atestado, férias ou licença estendida</span>
                </div>
              </label>
            </div>

            {/* Campos de Data */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                  {isPeriod ? 'Data de Início' : 'Data'}
                </label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (!isPeriod || endDate < e.target.value) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {isPeriod && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Data de Término</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    min={date}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-2 text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-wider flex items-center gap-1">
                    ⏱️ Total: {calculatedDays} {calculatedDays === 1 ? 'dia' : 'dias'} de afastamento
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Saúde', 'Treinamento', 'Administrativo', 'Outros'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 px-3 rounded-xl text-[10px] font-bold border transition-all ${type === t ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Descrição / Motivo</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={isPeriod ? "Ex: Licença médica de atestado ou período completo de férias." : "Ex: Consulta médica agendada para o período da manhã."}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 shadow-lg transition-all active:scale-95"
            >
              SALVAR REGISTRO
            </button>
          </form>
        </div>
      </div>

      <div className="md:col-span-2 space-y-4">
        {/* Filtros de Listagem */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[140px]">
             <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Início do Período</label>
             <input 
               type="date" 
               value={filterStartDate} 
               onChange={(e) => setFilterStartDate(e.target.value)}
               className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold dark:text-white outline-none"
             />
          </div>
          <div className="flex-1 min-w-[140px]">
             <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Fim do Período</label>
             <input 
               type="date" 
               value={filterEndDate} 
               onChange={(e) => setFilterEndDate(e.target.value)}
               className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold dark:text-white outline-none"
             />
          </div>
          <button 
            onClick={clearFilters}
            className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Histórico de Particularidades</h3>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">
              {filteredParticularities.length} Registros
            </span>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredParticularities.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icons.Note />
                </div>
                <p className="font-bold text-xs uppercase tracking-widest">Nenhuma particularidade encontrada para este período.</p>
              </div>
            ) : (
              filteredParticularities.map((p) => {
                const person = people.find(per => per.id === p.personId);
                const isRange = p.endDate && p.endDate !== p.date;
                const start = new Date(p.date + 'T00:00:00');
                const end = new Date((p.endDate || p.date) + 'T00:00:00');
                const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                return (
                  <div key={p.id} className="p-6 flex items-start justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <div className="flex gap-4">
                      {isRange ? (
                        <div className={`mt-1 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black ${getTypeStyle(p.type)}`}>
                          <span className="text-sm leading-none">{diffDays}d</span>
                          <span className="text-[7px] opacity-75 uppercase tracking-tighter mt-0.5">Afastado</span>
                        </div>
                      ) : (
                        <div className={`mt-1 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold ${getTypeStyle(p.type)}`}>
                          <span className="font-black text-sm leading-none">{p.date.split('-').reverse()[0]}</span>
                          <span className="text-[9px] opacity-75 uppercase mt-0.5">{p.date.split('-').reverse()[1]}/{p.date.split('-').reverse()[2]?.slice(2)}</span>
                        </div>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{person?.name || '??'}</p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${getTypeStyle(p.type)}`}>{p.type}</span>
                          {isRange && (
                            <span className="bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 text-[9px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 border border-rose-100 dark:border-rose-900/30">
                              ⏱️ {formatDateBR(p.date)} até {formatDateBR(p.endDate!)} ({diffDays} dias)
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{p.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(p.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticularityManager;
