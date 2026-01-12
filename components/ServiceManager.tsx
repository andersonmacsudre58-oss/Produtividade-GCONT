
import React, { useState, useRef } from 'react';
import { ServiceCategory, AppState } from '../types';
import { Icons, PRESET_COLORS } from '../constants';

interface ServiceManagerProps {
  categories: ServiceCategory[];
  onAdd: (category: ServiceCategory) => void;
  onRemove: (id: string) => void;
  state: AppState;
  onImport: (state: AppState) => void;
}

const ServiceManager: React.FC<ServiceManagerProps> = ({ categories, onAdd, onRemove, state, onImport }) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const exportBackup = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `prod360_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.people && json.tasks && json.serviceCategories) {
          if (confirm("Isso irá substituir todos os dados atuais. Deseja continuar?")) {
            onImport(json);
            alert("Dados importados com sucesso!");
          }
        } else {
          alert("Arquivo inválido. Certifique-se de que é um backup do Prod360.");
        }
      } catch (err) {
        alert("Erro ao processar o arquivo.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-8">
          {/* Form Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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

          {/* Database Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Banco de Dados</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
              O sistema utiliza um banco de dados local (IndexedDB) que persiste automaticamente. 
              Para segurança, você pode exportar um backup físico.
            </p>
            <div className="space-y-3">
              <button
                onClick={exportBackup}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Backup dos Dados (JSON)
              </button>
              <button
                onClick={handleImportClick}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Restaurar Backup
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
              />
            </div>
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
    </div>
  );
};

export default ServiceManager;
