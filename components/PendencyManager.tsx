import React, { useState, useMemo } from 'react';
import { Person, Pendency } from '../types';
import { Icons } from '../constants';

interface PendencyManagerProps {
  pendencies: Pendency[];
  people: Person[];
  onAdd: (p: Pendency) => void;
  onRemove: (id: string) => void;
  documentTypes: string[];
  pendingTypes: string[];
  onUpdateDocumentTypes: (types: string[]) => void;
  onUpdatePendingTypes: (types: string[]) => void;
}

const PendencyManager: React.FC<PendencyManagerProps> = ({ 
  pendencies, 
  people, 
  onAdd, 
  onRemove,
  documentTypes,
  pendingTypes,
  onUpdateDocumentTypes,
  onUpdatePendingTypes
}) => {
  const getLocalDateStr = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  // State para o formulário
  const [selectedPerson, setSelectedPerson] = useState('');
  const [date, setDate] = useState(getLocalDateStr());
  const [documentType, setDocumentType] = useState('');
  const [sector, setSector] = useState<Pendency['sector']>('GCIF');
  const [pendingType, setPendingType] = useState('');

  // Sane defaults or selected ones
  const activeDocType = documentTypes.includes(documentType) ? documentType : (documentTypes[0] || '');
  const activePendingType = pendingTypes.includes(pendingType) ? pendingType : (pendingTypes[0] || '');

  // Add state for editing options
  const [newDocType, setNewDocType] = useState('');
  const [newPendingType, setNewPendingType] = useState('');
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

  // State para os filtros de listagem
  const [filterPerson, setFilterPerson] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;

    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      personId: selectedPerson,
      date,
      documentType: activeDocType,
      sector,
      pendingType: activePendingType
    });

    // Reset some form options
    // keep selected person, or clear it
  };

  const filteredPendencies = useMemo(() => {
    let result = [...pendencies];
    
    if (filterPerson) {
      result = result.filter(p => p.personId === filterPerson);
    }
    if (filterStartDate) {
      result = result.filter(p => p.date >= filterStartDate);
    }
    if (filterEndDate) {
      result = result.filter(p => p.date <= filterEndDate);
    }
    
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [pendencies, filterPerson, filterStartDate, filterEndDate]);

  const clearFilters = () => {
    setFilterPerson('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const sectors: Pendency['sector'][] = [
    'GCIF', 'JURÍDICO'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
      {/* Formulário de Cadastro */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <span className="text-amber-500"><Icons.AlertCircle /></span> Preencher Pendência
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
                <option value="">Selecione o colaborador...</option>
                {people.filter(p => !p.isHidden || p.id === selectedPerson).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Data do Registro</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Documento de Pendência</label>
              <select 
                value={activeDocType} 
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {documentTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Setor</label>
              <div className="grid grid-cols-2 gap-2">
                {sectors.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSector(s)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${sector === s ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Tipo de Pendência</label>
              <select 
                value={activePendingType} 
                onChange={(e) => setPendingType(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {pendingTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 h-12 text-white py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Icons.Plus /> Registrar Pendência
            </button>
          </form>
        </div>

        {/* Card de Configurações das Opções */}
        <button
          type="button"
          onClick={() => setIsConfigExpanded(!isConfigExpanded)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-850 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all shadow-sm"
        >
          <span className="flex items-center gap-2">
            <span className="text-violet-500"><Icons.Settings /></span> Configurar Opções
          </span>
          <span className="text-[10px] font-extrabold uppercase text-violet-600 dark:text-violet-400 tracking-wider flex items-center gap-1">
            {isConfigExpanded ? 'Ocultar ×' : 'Expandir +'}
          </span>
        </button>

        {isConfigExpanded && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="text-violet-500"><Icons.Settings /></span> Configurar Opções da Pendência
            </h3>
            
            {/* Gerenciar Documentos */}
            <div className="space-y-3 mb-6">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Documentos de Pendência</label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl min-h-[40px] border border-slate-100 dark:border-slate-850">
                {documentTypes.length === 0 ? (
                  <span className="text-[10px] font-medium text-slate-400 pl-1 p-0.5">Nenhum cadastrado</span>
                ) : (
                  documentTypes.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shadow-slate-100 dark:shadow-none">
                      {t}
                      <button
                        type="button"
                        onClick={() => onUpdateDocumentTypes(documentTypes.filter(x => x !== t))}
                        className="text-slate-400 hover:text-red-500 font-black text-xs pl-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Novo documento..." 
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newDocType.trim() && !documentTypes.includes(newDocType.trim())) {
                      onUpdateDocumentTypes([...documentTypes, newDocType.trim()]);
                      setNewDocType('');
                    }
                  }}
                  className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Gerenciar Tipos de Pendência */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Tipos de Pendência</label>
              <div className="max-h-[160px] overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-850">
                {pendingTypes.length === 0 ? (
                  <span className="text-[10px] font-medium text-slate-400 pl-1 p-0.5">Nenhum cadastrado</span>
                ) : (
                  pendingTypes.map((t) => (
                    <div key={t} className="flex items-center justify-between bg-white dark:bg-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm gap-2">
                      <span className="truncate">{t}</span>
                      <button
                        type="button"
                        onClick={() => onUpdatePendingTypes(pendingTypes.filter(x => x !== t))}
                        className="text-red-500 hover:text-red-700 font-bold px-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Novo tipo..." 
                  value={newPendingType}
                  onChange={(e) => setNewPendingType(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newPendingType.trim() && !pendingTypes.includes(newPendingType.trim())) {
                      onUpdatePendingTypes([...pendingTypes, newPendingType.trim()]);
                      setNewPendingType('');
                    }
                  }}
                  className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Listagem de Pendências */}
      <div className="lg:col-span-2 space-y-4">
        {/* Filtros */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[140px]">
             <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Colaborador</label>
             <select 
               value={filterPerson} 
               onChange={(e) => setFilterPerson(e.target.value)}
               className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold dark:text-white outline-none"
             >
               <option value="">Todos</option>
               {people.map(p => (
                 <option key={p.id} value={p.id}>{p.name}</option>
               ))}
             </select>
          </div>
          <div className="flex-1 min-w-[140px]">
             <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Início</label>
             <input 
               type="date" 
               value={filterStartDate} 
               onChange={(e) => setFilterStartDate(e.target.value)}
               className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold dark:text-white outline-none"
             />
          </div>
          <div className="flex-1 min-w-[140px]">
             <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Fim</label>
             <input 
               type="date" 
               value={filterEndDate} 
               onChange={(e) => setFilterEndDate(e.target.value)}
               className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold dark:text-white outline-none"
             />
          </div>
          <button 
            onClick={clearFilters}
            className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>

        {/* Lista */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Histórico de Pendências</h3>
            <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">
              {filteredPendencies.length} Pendências
            </span>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPendencies.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-xs uppercase tracking-widest">Nenhuma pendência encontrada.</p>
              </div>
            ) : (
              filteredPendencies.map((pend) => {
                const person = people.find(per => per.id === pend.personId);
                return (
                  <div key={pend.id} className="p-6 flex items-start justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <div className="flex gap-4">
                      <div className="mt-1 w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex flex-col items-center justify-center font-bold text-xs leading-none">
                        <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">
                          {pend.date.split('-')[2]}
                        </span>
                        <span className="text-[11px] font-black">
                          {pend.date.split('-')[1]}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center flex-wrap gap-2 mb-1.5">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{person?.name || 'Desconhecido'}</p>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-blue-150 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            {pend.documentType}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                            pend.sector === 'GCIF' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                          }`}>
                            {pend.sector}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-normal">
                          {pend.pendingType}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mt-1">
                          Registrado em: {pend.date.split('-').reverse().join('/')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(pend.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Excluir Pendência"
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

export default PendencyManager;
