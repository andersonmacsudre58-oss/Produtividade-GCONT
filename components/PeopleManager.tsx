
import React, { useState, useMemo } from 'react';
import { Person } from '../types';
import { Icons } from '../constants';

interface PeopleManagerProps {
  people: Person[];
  onAdd: (person: Person) => void;
  onRemove: (id: string) => void;
}

const PeopleManager: React.FC<PeopleManagerProps> = ({ people, onAdd, onRemove }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      name,
      role
    });
    setName('');
    setRole('');
  };

  const filteredPeople = useMemo(() => {
    return (people || []).filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [people, searchTerm]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 fade-in">
      {/* Form Card */}
      <div className="md:col-span-1">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 sticky top-6 transition-colors">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-8">Novo Membro</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Cargo / Função</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Analista de Contas"
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-bold"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95"
            >
              <Icons.Plus />
              Adicionar à Equipe
            </button>
          </form>
        </div>
      </div>

      {/* List Card */}
      <div className="md:col-span-2">
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Equipe Ativa</h3>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                {people.length} Membros
              </span>
            </div>
            
            <div className="relative w-full sm:w-64">
              <input 
                type="text"
                placeholder="Buscar por nome ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="absolute left-3 top-2.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPeople.length === 0 ? (
              <div className="p-16 text-center text-slate-400 dark:text-slate-600">
                <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icons.People />
                </div>
                <p className="font-black text-xs uppercase tracking-widest">{searchTerm ? 'Nenhum resultado para a busca.' : 'Nenhum colaborador cadastrado ainda.'}</p>
              </div>
            ) : (
              filteredPeople.map((person) => (
                <div key={person.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100 text-lg tracking-tight">{person.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">{person.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { if(confirm(`Remover ${person.name}?`)) onRemove(person.id); }}
                    className="p-3 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Remover colaborador"
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

export default PeopleManager;
