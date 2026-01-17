
import React, { useState } from 'react';
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
      {/* Form Card */}
      <div className="md:col-span-1">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-6 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Cadastrar Colaborador</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cargo / Função</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Analista de Contas"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg dark:shadow-none flex items-center justify-center gap-2"
            >
              <Icons.Plus />
              Adicionar
            </button>
          </form>
        </div>
      </div>

      {/* List Card */}
      <div className="md:col-span-2">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Membros da Equipe</h3>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold">
              {people.length} Total
            </span>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {people.length === 0 ? (
              <div className="p-10 text-center text-slate-400 dark:text-slate-600">
                <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icons.People />
                </div>
                <p>Nenhum colaborador cadastrado ainda.</p>
              </div>
            ) : (
              people.map((person) => (
                <div key={person.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{person.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-500">{person.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(person.id)}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
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