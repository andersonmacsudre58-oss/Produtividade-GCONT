
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
  const [selectedPerson, setSelectedPerson] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [invoiceQuantity, setInvoiceQuantity] = useState<number>(0);
  const [processQuantity, setProcessQuantity] = useState<number>(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
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
      invoiceQuantity: invoiceQuantity,
      date,
      processQuantity: processQuantity
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
      <div className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${editingTaskId ? 'border-amber-400 ring-2 ring-amber-50' : 'border-slate-200'}`}>
        <h3 className="text-lg font-bold text-slate-800 mb-6">{editingTaskId ? 'Editar Registro' : 'Novo Registro de Atividade'}</h3>
        <form onSubmit={handleSaveTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Colaborador</label>
            <select value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" required>
              <option value="">Selecione...</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Serviço</label>
            <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" required>
              <option value="">Selecione...</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Qtd Processos</label>
            <input type="number" min="1" value={processQuantity} onChange={(e) => setProcessQuantity(parseInt(e.target.value))} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Qtd Notas Fiscais</label>
            <input type="number" min="0" value={invoiceQuantity} onChange={(e) => setInvoiceQuantity(parseInt(e.target.value))} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold">{editingTaskId ? 'Salvar' : 'Adicionar'}</button>
            {editingTaskId && <button onClick={cancelEdit} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold">X</button>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Lançamentos do Dia</h3>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="px-4 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Serviço</th>
                <th className="px-6 py-4 text-center">Processos</th>
                <th className="px-6 py-4 text-center">NFs</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhum registro hoje.</td></tr>
              ) : (
                filteredTasks.map((task) => {
                  const person = people.find(p => p.id === task.personId);
                  const category = categories.find(c => c.id === task.serviceCategoryId);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 text-sm">{person?.name || '??'}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black">{person?.role}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black text-white" style={{ backgroundColor: category?.color }}>
                          {category?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-slate-800">{task.processQuantity}</td>
                      <td className="px-6 py-4 text-center font-black text-emerald-600">{task.invoiceQuantity}</td>
                      <td className="px-6 py-4 text-right">
                        {userRole === 'master' && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => startEdit(task)} className="text-slate-400 hover:text-blue-600"><Icons.Edit /></button>
                            <button onClick={() => onRemoveTask(task.id)} className="text-slate-400 hover:text-red-600"><Icons.Trash /></button>
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
