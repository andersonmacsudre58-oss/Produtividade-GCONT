
import React, { useState, useEffect } from 'react';
import { Person, Task, AppState, ServiceCategory, UserRole } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PeopleManager from './components/PeopleManager';
import DailyLog from './components/DailyLog';
import ServiceManager from './components/ServiceManager';
import Login from './components/Login';
import { DEFAULT_CATEGORIES } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'people' | 'logs' | 'services'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('prod360_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.serviceCategories) parsed.serviceCategories = DEFAULT_CATEGORIES;
      if (!parsed.userRole) parsed.userRole = 'master';
      return parsed;
    }
    return { 
      people: [], 
      tasks: [], 
      serviceCategories: DEFAULT_CATEGORIES,
      userRole: 'master' 
    };
  });

  useEffect(() => {
    localStorage.setItem('prod360_data', JSON.stringify(state));
  }, [state]);

  const handleLogin = (role: UserRole) => {
    setState(prev => ({ ...prev, userRole: role }));
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveTab('dashboard');
  };

  const setUserRole = (role: UserRole) => {
    setState(prev => ({ ...prev, userRole: role }));
    if (role === 'basic' && (activeTab === 'people' || activeTab === 'services')) {
      setActiveTab('dashboard');
    }
  };

  const addPerson = (person: Person) => {
    if (state.userRole !== 'master') return;
    setState(prev => ({ ...prev, people: [...prev.people, person] }));
  };

  const removePerson = (id: string) => {
    if (state.userRole !== 'master') return;
    setState(prev => ({
      ...prev,
      people: prev.people.filter(p => p.id !== id),
      tasks: prev.tasks.filter(t => t.personId !== id)
    }));
  };

  const addTask = (task: Task) => {
    setState(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
  };

  const editTask = (updatedTask: Task) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
    }));
  };

  const removeTask = (id: string) => {
    if (state.userRole !== 'master') return;
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id)
    }));
  };

  const addServiceCategory = (cat: ServiceCategory) => {
    if (state.userRole !== 'master') return;
    setState(prev => ({ ...prev, serviceCategories: [...prev.serviceCategories, cat] }));
  };

  const removeServiceCategory = (id: string) => {
    if (state.userRole !== 'master') return;
    setState(prev => ({
      ...prev,
      serviceCategories: prev.serviceCategories.filter(c => c.id !== id),
      tasks: prev.tasks.filter(t => t.serviceCategoryId !== id)
    }));
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={state.userRole}
        onRoleChange={setUserRole}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'people' && 'Gerenciar Equipe'}
              {activeTab === 'logs' && 'Registro Diário'}
              {activeTab === 'services' && 'Tipos de Serviço'}
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              {activeTab === 'dashboard' && 'Monitore a produtividade e o desempenho da equipe.'}
              {activeTab === 'people' && 'Adicione ou remova membros da sua equipe.'}
              {activeTab === 'logs' && 'Visualize e gerencie os serviços realizados diariamente.'}
              {activeTab === 'services' && 'Personalize as categorias de serviço monitoradas.'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-sm ${
              state.userRole === 'master' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {state.userRole === 'master' ? 'Acesso Master' : 'Acesso Básico'}
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Sair do sistema"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard state={state} />
        )}

        {activeTab === 'people' && state.userRole === 'master' && (
          <PeopleManager people={state.people} onAdd={addPerson} onRemove={removePerson} />
        )}

        {activeTab === 'logs' && (
          <DailyLog 
            tasks={state.tasks} 
            people={state.people} 
            categories={state.serviceCategories}
            onAddTask={addTask} 
            onEditTask={editTask}
            onRemoveTask={removeTask}
            userRole={state.userRole}
          />
        )}

        {activeTab === 'services' && state.userRole === 'master' && (
          <ServiceManager 
            categories={state.serviceCategories} 
            onAdd={addServiceCategory} 
            onRemove={removeServiceCategory} 
          />
        )}

        {(activeTab === 'people' || activeTab === 'services') && state.userRole === 'basic' && (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center">
            <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
            <p className="text-slate-500 max-w-sm mx-auto">Você está utilizando um perfil operacional (Básico) e não possui permissões para configurações de equipe ou serviços.</p>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-slate-200"
            >
              Retornar ao Painel
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
