
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
  const [invoiceNumber, setInvoiceNumber] = useState(''); // Alterado de description
  const [quantity, setQuantity] = useState<number>(1);
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
    if (!selectedPerson || !selectedCategoryId || !invoiceNumber.trim()) return;

    if (editingTaskId) {
      onEditTask({
        id: editingTaskId,
        personId: selectedPerson,
        serviceCategoryId: selectedCategoryId,
        invoiceNumber: invoiceNumber.trim(),
        date,
        quantity: quantity
      });
      setEditingTaskId(null);
    } else {
      onAddTask({
        id: Math.random().toString(36).substr(2, 9),
        personId: selectedPerson,
        serviceCategoryId: selectedCategoryId,
        invoiceNumber: invoiceNumber.trim(),
        date,
        quantity: quantity
      });
    }

    setInvoiceNumber('');
    setQuantity(1);
    setSelectedPerson('');
    setSelectedCategoryId('');
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setSelectedPerson(task.personId);
    setSelectedCategoryId(task.serviceCategoryId);
    setInvoiceNumber(task.invoiceNumber);
    setQuantity(task.quantity);
    setDate(task.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setInvoiceNumber('');
    setQuantity(1);
    setSelectedPerson('');
    setSelectedCategoryId('');
  };

  return (
    <div className="space-y-8">
      <div className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${editingTaskId ? 'border-amber-400 ring-2 ring-amber-50' : 'border-slate-200'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">
            {editingTaskId ? 'Editar Registro' : 'Novo Registro de Produção'}
          </h3>
          {editingTaskId && (
            <button onClick={cancelEdit} className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">Cancelar Edição</button>
          )}
        </div>
        
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
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Notas Fiscais / Ref.</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Ex: NF-1234, NF-5678..."
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Qtd</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value))} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
            </div>
            <button type="submit" className={`${editingTaskId ? 'bg-amber-500' : 'bg-blue-600'} text-white p-2.5 rounded-xl mt-auto`}>
              {editingTaskId ? <Icons.Edit /> : <Icons.Plus />}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Registros do Dia</h3>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="px-4 py-1.5 rounded-lg border border-slate-200 outline-none text-sm" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Serviço</th>
                <th className="px-6 py-4">Notas Fiscais</th>
                <th className="px-6 py-4 text-center">Qtd</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
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
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{task.invoiceNumber}</td>
                      <td className="px-6 py-4 text-center font-black text-slate-800">{task.quantity}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          {userRole === 'master' && (
                            <>
                              <button onClick={() => startEdit(task)} className="p-2 text-slate-400 hover:text-blue-600"><Icons.Edit /></button>
                              <button onClick={() => onRemoveTask(task.id)} className="p-2 text-slate-400 hover:text-red-600"><Icons.Trash /></button>
                            </>
                          )}
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
