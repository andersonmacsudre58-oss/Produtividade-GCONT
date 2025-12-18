
import React, { useState } from 'react';
import { ServiceCategory } from '../types';
import { Icons, PRESET_COLORS } from '../constants';

interface ServiceManagerProps {
  categories: ServiceCategory[];
  onAdd: (category: ServiceCategory) => void;
  onRemove: (id: string) => void;
}

const ServiceManager: React.FC<ServiceManagerProps> = ({ categories, onAdd, onRemove }) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      color: selectedColor
    });
    setName('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Novo Tipo de Serviço</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Serviço</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Consultoria Externa"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cor de Identificação</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Icons.Plus />
              Salvar Serviço
            </button>
          </form>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Serviços Habilitados</h3>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
              {categories.length} Tipos
            </span>
          </div>
          
          <div className="divide-y divide-slate-100">
            {categories.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <p>Nenhum tipo de serviço configurado.</p>
              </div>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: cat.color }}></div>
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => onRemove(cat.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Excluir tipo de serviço"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceManager;
