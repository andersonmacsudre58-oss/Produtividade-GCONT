
import React, { useState } from 'react';
import { Person, Particularity } from '../types';
import { Icons } from '../constants';

interface ParticularityManagerProps {
  particularities: Particularity[];
  people: Person[];
  onAdd: (p: Particularity) => void;
  onRemove: (id: string) => void;
}

const ParticularityManager: React.FC<ParticularityManagerProps> = ({ particularities, people, onAdd, onRemove }) => {
  const getLocalDateStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [selectedPerson, setSelectedPerson] = useState('');
  const [date, setDate] = useState(getLocalDateStr());
  const [type, setType] = useState<Particularity['type']>('Saúde');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !description.trim()) return;

    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      personId: selectedPerson,
      date,
      type,
      description: description.trim()
    });

    setDescription('');
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
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Data</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                placeholder="Ex: Consulta médica agendada para o período da manhã."
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

      <div className="md:col-span-2">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Histórico de Particularidades</h3>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">
              {particularities.length} Registros
            </span>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {particularities.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icons.Note />
                </div>
                <p className="font-bold text-xs uppercase tracking-widest">Nenhuma particularidade registrada.</p>
              </div>
            ) : (
              [...particularities].sort((a, b) => b.date.localeCompare(a.date)).map((p) => {
                const person = people.find(per => per.id === p.personId);
                return (
                  <div key={p.id} className="p-6 flex items-start justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <div className="flex gap-4">
                      <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${getTypeStyle(p.type)}`}>
                        {p.date.split('-').reverse().slice(0, 2).join('/')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{person?.name || '??'}</p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${getTypeStyle(p.type)}`}>{p.type}</span>
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
