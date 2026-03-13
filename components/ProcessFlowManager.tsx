
import React, { useState, useMemo } from 'react';
import { ProcessFlow } from '../types';
import { Icons } from '../constants';

interface ProcessFlowManagerProps {
  processFlows: ProcessFlow[];
  onAdd: (flow: ProcessFlow) => void;
  onRemove: (id: string) => void;
  onUpdate: (flow: ProcessFlow) => void;
}

const ProcessFlowManager: React.FC<ProcessFlowManagerProps> = ({ processFlows, onAdd, onRemove, onUpdate }) => {
  const getLocalDateStr = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getLocalDateStr());
  const [received, setReceived] = useState<number>(0);
  const [transferred, setTransferred] = useState<number>(0);
  const [completed, setCompleted] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const flowData: ProcessFlow = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      date,
      received: Number(received),
      transferred: Number(transferred),
      completed: Number(completed)
    };

    if (editingId) {
      onUpdate(flowData);
      setEditingId(null);
    } else {
      onAdd(flowData);
    }

    setReceived(0);
    setTransferred(0);
    setCompleted(0);
  };

  const startEdit = (flow: ProcessFlow) => {
    setEditingId(flow.id);
    setDate(flow.date);
    setReceived(flow.received);
    setTransferred(flow.transferred);
    setCompleted(flow.completed);
  };

  const sortedFlows = useMemo(() => {
    return [...(processFlows || [])].sort((a, b) => b.date.localeCompare(a.date));
  }, [processFlows]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 fade-in">
      <div className="md:col-span-1">
        <div className={`bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border sticky top-6 transition-all ${editingId ? 'border-amber-400 ring-4 ring-amber-50 dark:ring-amber-900/20' : 'border-slate-200 dark:border-slate-800'}`}>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-8">
            {editingId ? 'Editar Fluxo' : 'Novo Registro de Fluxo'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Processos Recebidos</label>
              <input
                type="number"
                min="0"
                value={received}
                onChange={(e) => setReceived(Number(e.target.value))}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Processos Tramitados</label>
              <input
                type="number"
                min="0"
                value={transferred}
                onChange={(e) => setTransferred(Number(e.target.value))}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Processos Realizados</label>
              <input
                type="number"
                min="0"
                value={completed}
                onChange={(e) => setCompleted(Number(e.target.value))}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className={`flex-1 ${editingId ? 'bg-amber-500' : 'bg-blue-600'} text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95`}
              >
                {editingId ? <Icons.Edit /> : <Icons.Plus />}
                {editingId ? 'Salvar Alterações' : 'Adicionar Fluxo'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setReceived(0);
                    setTransferred(0);
                    setCompleted(0);
                  }}
                  className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  X
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Histórico de Fluxo</h3>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              {sortedFlows.length} Registros
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5">Data</th>
                  <th className="px-8 py-5 text-center">Recebidos</th>
                  <th className="px-8 py-5 text-center">Tramitados</th>
                  <th className="px-8 py-5 text-center">Realizados</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedFlows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-slate-400 dark:text-slate-600">
                      <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icons.Refresh />
                      </div>
                      <p className="font-black text-xs uppercase tracking-widest">Nenhum fluxo registrado ainda.</p>
                    </td>
                  </tr>
                ) : (
                  sortedFlows.map((flow) => (
                    <tr key={flow.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-8 py-6 font-bold text-slate-700 dark:text-slate-200">
                        {flow.date.split('-').reverse().join('/')}
                      </td>
                      <td className="px-8 py-6 text-center font-black text-blue-600 dark:text-blue-400">
                        {flow.received}
                      </td>
                      <td className="px-8 py-6 text-center font-black text-indigo-600 dark:text-indigo-400">
                        {flow.transferred}
                      </td>
                      <td className="px-8 py-6 text-center font-black text-emerald-600 dark:text-emerald-400">
                        {flow.completed}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => startEdit(flow)}
                            className="p-3 text-slate-300 dark:text-slate-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                            title="Editar"
                          >
                            <Icons.Edit />
                          </button>
                          <button
                            onClick={() => onRemove(flow.id)}
                            className="p-3 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                            title="Remover"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessFlowManager;
