
import React, { useState, useMemo } from 'react';
import { Person, Task, ServiceCategory, UserRole } from '../types';
import { Icons } from '../constants';

interface DailyLogProps {
  tasks: Task[];
  people: Person[];
  categories: ServiceCategory[];
  onAddTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onRemoveTask: (id: string) => void;
  userRole: UserRole;
}

const DailyLog: React.FC<DailyLogProps> = ({ tasks, people, categories, onAddTask, onEditTask, onRemoveTask, userRole }) => {
  // Função auxiliar para data local YYYY-MM-DD
  const getLocalDateStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [selectedPerson, setSelectedPerson] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [invoiceQuantity, setInvoiceQuantity] = useState<number>(0);
  const [processQuantity, setProcessQuantity] = useState<number>(1);
  const [date, setDate] = useState(getLocalDateStr());
  
  const [filterDate, setFilterDate] = useState(getLocalDateStr());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => t.date === filterDate)
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [tasks, filterDate]);

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !selectedCategoryId) return;

    const taskData: Task = {
      id: editingTaskId || Math.random().toString(36).substr(2, 9),
      personId: selectedPerson,
      serviceCategoryId: selectedCategoryId,
      invoiceQuantity: Number(invoiceQuantity),
      date,
      processQuantity: Number(processQuantity)
    };

    if (editingTaskId) {
      onEditTask(taskData);
      setEditingTaskId(null);
    } else {
      onAddTask(taskData);
    }

    setInvoiceQuantity(0);
    setProcessQuantity(1);
    setSelectedPerson('');
    setSelectedCategoryId('');
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setSelectedPerson(task.personId);
    setSelectedCategoryId(task.serviceCategoryId);
    setInvoiceQuantity(task.invoiceQuantity);
    setProcessQuantity(task.processQuantity);
    setDate(task.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setInvoiceQuantity(0);
    setProcessQuantity(1);
    setSelectedPerson('');
    setSelectedCategoryId('');
  };

  return (
    <div className="space-y-8">
      <div className={`bg-white p-8 rounded-3xl shadow-sm border transition-all ${editingTaskId ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-200'}`}>
        <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
          {editingTaskId ? <Icons.Edit /> : <Icons.Plus />}
          {editingTaskId ? 'Editar Lançamento' : 'Novo Registro de Produção'}
        </h3>
        <form onSubmit={handleSaveTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-end">
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Data do Serviço</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Colaborador</label>
            <select value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" required>
              <option value="">Selecione...</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Tipo de Serviço</label>
            <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" required>
              <option value="">Selecione...</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Qtd. Processos</label>
            <input type="number" min="1" value={processQuantity} onChange={(e) => setProcessQuantity(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Qtd. Notas Fiscais</label>
            <input type="number" min="0" value={invoiceQuantity} onChange={(e) => setInvoiceQuantity(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-2xl border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-emerald-600" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={`flex-1 ${editingTaskId ? 'bg-amber-500' : 'bg-blue-600'} text-white py-3.5 rounded-2xl font-bold shadow-lg transition-all active:scale-95`}>
              {editingTaskId ? 'SALVAR' : 'LANÇAR'}
            </button>
            {editingTaskId && (
              <button onClick={cancelEdit} className="bg-slate-100 text-slate-600 px-5 py-3.5 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                CANCELAR
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Histórico de Lançamentos</h3>
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase">Filtrar por dia:</span>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Colaborador</th>
                <th className="px-8 py-5">Serviço</th>
                <th className="px-8 py-5 text-center">Processos</th>
                <th className="px-8 py-5 text-center">Notas Fiscais</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-50 rounded-full">
                        <Icons.Calendar />
                      </div>
                      <p className="font-bold text-sm uppercase tracking-widest">Nenhum registro encontrado para este dia.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const person = people.find(p => p.id === task.personId);
                  const category = categories.find(c => c.id === task.serviceCategoryId);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                            {person?.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{person?.name || '??'}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-black">{person?.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black text-white shadow-sm" style={{ backgroundColor: category?.color }}>
                          {category?.name}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-sm font-black text-slate-800">{task.processQuantity}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-sm font-black text-emerald-600">{task.invoiceQuantity}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {userRole === 'master' && (
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(task)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Editar"><Icons.Edit /></button>
                            <button onClick={() => onRemoveTask(task.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Excluir"><Icons.Trash /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyLog;
