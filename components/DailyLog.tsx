
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
  const [description, setDescription] = useState('');
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
    if (!selectedPerson || !selectedCategoryId || !description.trim()) return;

    if (editingTaskId) {
      onEditTask({
        id: editingTaskId,
        personId: selectedPerson,
        serviceCategoryId: selectedCategoryId,
        description: description.trim(),
        date,
        quantity: quantity
      });
      setEditingTaskId(null);
    } else {
      onAddTask({
        id: Math.random().toString(36).substr(2, 9),
        personId: selectedPerson,
        serviceCategoryId: selectedCategoryId,
        description: description.trim(),
        date,
        quantity: quantity
      });
    }

    // Reset form but keep date for consecutive entries
    setDescription('');
    setQuantity(1);
    setSelectedPerson('');
    setSelectedCategoryId('');
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setSelectedPerson(task.personId);
    setSelectedCategoryId(task.serviceCategoryId);
    setDescription(task.description);
    setQuantity(task.quantity);
    setDate(task.date);
    // Move to top form view if possible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setDescription('');
    setQuantity(1);
    setSelectedPerson('');
    setSelectedCategoryId('');
  };

  return (
    <div className="space-y-8">
      {/* Registration / Edit Form */}
      <div className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${editingTaskId ? 'border-amber-400 ring-2 ring-amber-50 shadow-amber-50' : 'border-slate-200'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">
            {editingTaskId ? 'Editar Registro de Serviço' : 'Novo Registro de Serviço'}
          </h3>
          {editingTaskId && (
            <button 
              onClick={cancelEdit}
              className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
            >
              Cancelar Edição
            </button>
          )}
        </div>
        
        <form onSubmit={handleSaveTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Colaborador</label>
            <select
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione...</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Serviço</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que foi realizado?"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="lg:col-span-1 flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value))}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className={`${editingTaskId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'} text-white p-2.5 rounded-xl transition-colors shadow-md mt-auto flex items-center justify-center`}
              title={editingTaskId ? 'Salvar alterações' : 'Adicionar registro'}
            >
              {editingTaskId ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> : <Icons.Plus />}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-slate-800">Registros do Dia</h3>
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
              {filteredTasks.length} Registros
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">Visualizar data:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-1.5 rounded-lg border border-slate-200 outline-none text-sm font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Tipo de Serviço</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4 text-center">Quantidade</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Nenhum registro encontrado para este dia.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const person = people.find(p => p.id === task.personId);
                  const category = categories.find(c => c.id === task.serviceCategoryId);
                  const isEditing = editingTaskId === task.id;
                  
                  return (
                    <tr key={task.id} className={`transition-colors ${isEditing ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                            {person?.name.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{person?.name || 'Removido'}</p>
                            <p className="text-xs text-slate-500">{person?.role || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: category?.color || '#94a3b8' }}
                        >
                          {category?.name || 'Desconhecido'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700 line-clamp-1">{task.description}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700 text-sm">
                        {task.quantity}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {userRole === 'master' ? (
                            <>
                              <button
                                onClick={() => startEdit(task)}
                                className={`p-2 rounded-lg transition-all ${isEditing ? 'text-amber-600 bg-amber-100' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`}
                                title="Editar registro"
                              >
                                <Icons.Edit />
                              </button>
                              <button
                                onClick={() => onRemoveTask(task.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Remover registro"
                              >
                                <Icons.Trash />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">Somente Leitura</span>
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
