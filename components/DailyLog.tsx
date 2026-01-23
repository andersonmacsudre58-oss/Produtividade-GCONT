
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
  onRefresh?: () => Promise<void>;
}

const DailyLog: React.FC<DailyLogProps> = ({ tasks, people, categories, onAddTask, onEditTask, onRemoveTask, userRole, onRefresh }) => {
  const getLocalDateStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [selectedPerson, setSelectedPerson] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [assignedProcesses, setAssignedProcesses] = useState<number>(0);
  const [processQuantity, setProcessQuantity] = useState<number>(1);
  const [invoiceQuantity, setInvoiceQuantity] = useState<number>(0);
  const [date, setDate] = useState(getLocalDateStr());
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [filterDate, setFilterDate] = useState(getLocalDateStr());
  const [filterPersonId, setFilterPersonId] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => {
        const matchesDate = t.date === filterDate;
        const matchesPerson = filterPersonId === '' || t.personId === filterPersonId;
        return matchesDate && matchesPerson;
      })
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [tasks, filterDate, filterPersonId]);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsSyncing(true);
      await onRefresh();
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !selectedCategoryId) return;

    const taskData: Task = {
      id: editingTaskId || Math.random().toString(36).substr(2, 9),
      personId: selectedPerson,
      serviceCategoryId: selectedCategoryId,
      assignedProcesses: Number(assignedProcesses),
      processQuantity: Number(processQuantity),
      invoiceQuantity: Number(invoiceQuantity),
      date
    };

    if (editingTaskId) {
      onEditTask(taskData);
      setEditingTaskId(null);
    } else {
      onAddTask(taskData);
    }

    setAssignedProcesses(0);
    setProcessQuantity(1);
    setInvoiceQuantity(0);
    setSelectedPerson('');
    setSelectedCategoryId('');
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setSelectedPerson(task.personId);
    setSelectedCategoryId(task.serviceCategoryId);
    setAssignedProcesses(task.assignedProcesses || 0);
    setProcessQuantity(task.processQuantity);
    setInvoiceQuantity(task.invoiceQuantity);
    setDate(task.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setAssignedProcesses(0);
    setProcessQuantity(1);
    setInvoiceQuantity(0);
    setSelectedPerson('');
    setSelectedCategoryId('');
  };

  return (
    <div className="space-y-8 pb-10">
      <div className={`bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border transition-all ${editingTaskId ? 'border-amber-400 ring-4 ring-amber-50 dark:ring-amber-900/20' : 'border-slate-200 dark:border-slate-800'}`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center gap-2">
          {editingTaskId ? <Icons.Edit /> : <Icons.Plus />}
          {editingTaskId ? 'Editar Lançamento' : 'Novo Registro de Produção'}
        </h3>
        <form onSubmit={handleSaveTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-end">
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs font-medium" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">Colaborador</label>
            <select value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs font-medium" required>
              <option value="">Selecione...</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">Serviço</label>
            <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs font-medium" required>
              <option value="">Selecione...</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">Proc. Atribuídos</label>
            <input type="number" min="0" value={assignedProcesses} onChange={(e) => setAssignedProcesses(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-indigo-600 dark:text-indigo-400 text-sm" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">Qtd. Realizada</label>
            <input type="number" min="0" value={processQuantity} onChange={(e) => setProcessQuantity(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">Notas Fiscais</label>
            <input type="number" min="0" value={invoiceQuantity} onChange={(e) => setInvoiceQuantity(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-emerald-600 dark:text-emerald-400 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={`flex-1 ${editingTaskId ? 'bg-amber-500' : 'bg-blue-600'} text-white py-3.5 rounded-2xl font-bold shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest`}>
              {editingTaskId ? 'SALVAR' : 'LANÇAR'}
            </button>
            {editingTaskId && (
              <button onClick={cancelEdit} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-3.5 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs">
                X
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Histórico de Lançamentos</h3>
            <button 
              onClick={handleRefresh}
              disabled={isSyncing}
              title="Sincronizar Lançamentos"
              className={`p-2 rounded-xl transition-all ${isSyncing ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <div className={isSyncing ? 'animate-spin' : ''}>
                <Icons.Refresh />
              </div>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Colaborador:</span>
              <select 
                value={filterPersonId} 
                onChange={(e) => setFilterPersonId(e.target.value)} 
                className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="" className="dark:bg-slate-900">Todos</option>
                {people.map(p => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Dia:</span>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Colaborador</th>
                <th className="px-8 py-5">Serviço</th>
                <th className="px-8 py-5 text-center">Atribuídos</th>
                <th className="px-8 py-5 text-center">Realizados</th>
                <th className="px-8 py-5 text-center">Notas</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-slate-400 dark:text-slate-600">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full">
                        <Icons.Calendar />
                      </div>
                      <p className="font-bold text-sm uppercase tracking-widest">Nenhum registro encontrado para este filtro.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const person = people.find(p => p.id === task.personId);
                  const category = categories.find(c => c.id === task.serviceCategoryId);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-sm">
                            {person?.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{person?.name || '??'}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black">{person?.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black text-white shadow-sm" style={{ backgroundColor: category?.color }}>
                          {category?.name}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{task.assignedProcesses || 0}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{task.processQuantity}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{task.invoiceQuantity}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(task)} className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all" title="Editar"><Icons.Edit /></button>
                          <button onClick={() => onRemoveTask(task.id)} className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all" title="Excluir"><Icons.Trash /></button>
                        </div>
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
