
import React, { useState, useEffect } from 'react';
import { Person, Task, AppState, ServiceCategory, UserRole, Particularity } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PeopleManager from './components/PeopleManager';
import DailyLog from './components/DailyLog';
import ServiceManager from './components/ServiceManager';
import ParticularityManager from './components/ParticularityManager';
import Login from './components/Login';
import { DEFAULT_CATEGORIES, Icons } from './constants';
import { apiService } from './services/api';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'people' | 'logs' | 'services' | 'particularities'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  
  const [state, setState] = useState<AppState>({ 
    people: [], 
    tasks: [], 
    particularities: [],
    serviceCategories: DEFAULT_CATEGORIES,
    userRole: 'master' 
  });

  const loadData = async () => {
    setIsSyncing(true);
    try {
      const savedState = await apiService.loadState();
      if (savedState) setState(savedState);
    } catch (error) {
      console.error("Erro no carregamento:", error);
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    async function init() {
      await loadData();
      setTimeout(() => setIsLoading(false), 800);
    }
    init();
  }, []);

  const persistState = async (newState: AppState) => {
    setState(newState);
    const mergedState = await apiService.saveState(newState);
    if (mergedState) {
      setState(mergedState);
    }
  };

  const handleLogin = (role: UserRole) => {
    setState(prev => ({ ...prev, userRole: role }));
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveTab('dashboard');
  };

  const setUserRole = (role: UserRole) => {
    persistState({ ...state, userRole: role });
    if (role === 'basic' && (activeTab === 'people' || activeTab === 'services')) {
      setActiveTab('dashboard');
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const addPerson = (person: Person) => {
    if (state.userRole !== 'master') return;
    persistState({ ...state, people: [...state.people, person] });
  };

  const removePerson = (id: string) => {
    if (state.userRole !== 'master') return;
    persistState({
      ...state,
      people: state.people.filter(p => p.id !== id),
      tasks: state.tasks.filter(t => t.personId !== id),
      particularities: state.particularities.filter(p => p.personId !== id)
    });
  };

  const addTask = (task: Task) => {
    persistState({ ...state, tasks: [...state.tasks, task] });
  };

  const editTask = (updatedTask: Task) => {
    persistState({
      ...state,
      tasks: state.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
    });
  };

  const removeTask = (id: string) => {
    persistState({
      ...state,
      tasks: state.tasks.filter(t => t.id !== id)
    });
  };

  const addParticularity = (p: Particularity) => {
    persistState({ ...state, particularities: [...state.particularities, p] });
  };

  const removeParticularity = (id: string) => {
    persistState({
      ...state,
      particularities: state.particularities.filter(p => p.id !== id)
    });
  };

  const addServiceCategory = (cat: ServiceCategory) => {
    if (state.userRole !== 'master') return;
    persistState({ ...state, serviceCategories: [...state.serviceCategories, cat] });
  };

  const removeServiceCategory = (id: string) => {
    if (state.userRole !== 'master') return;
    persistState({
      ...state,
      serviceCategories: state.serviceCategories.filter(c => c.id !== id),
      tasks: state.tasks.filter(t => t.serviceCategoryId !== id)
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-colors">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-100 dark:border-slate-800 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
        </div>
        <p className="mt-6 font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-xs animate-pulse">Iniciando Prod360...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={state.userRole}
        onRoleChange={setUserRole}
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'people' && 'Gerenciar Equipe'}
              {activeTab === 'logs' && 'Registro Diário'}
              {activeTab === 'particularities' && 'Particularidades'}
              {activeTab === 'services' && 'Tipos de Serviço'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {activeTab === 'dashboard' && 'Monitore a produtividade e o desempenho da equipe.'}
              {activeTab === 'people' && 'Adicione ou remova membros da sua equipe.'}
              {activeTab === 'logs' && 'Visualize e gerencie os serviços realizados diariamente.'}
              {activeTab === 'particularities' && 'Registre ocorrências como consultas, cursos ou licenças.'}
              {activeTab === 'services' && 'Personalize as categorias e gerencie a base de dados.'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={loadData}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 ${
                isSyncing ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-50 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className={isSyncing ? 'animate-spin' : ''}>
                <Icons.Refresh />
              </div>
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
            </button>
            <div className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
              state.userRole === 'master' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {state.userRole === 'master' ? 'Acesso Master' : 'Acesso Básico'}
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && <Dashboard state={state} onRefresh={loadData} />}
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
            onRefresh={loadData}
          />
        )}
        {activeTab === 'particularities' && (
          <ParticularityManager 
            particularities={state.particularities}
            people={state.people}
            onAdd={addParticularity}
            onRemove={removeParticularity}
          />
        )}
        {activeTab === 'services' && state.userRole === 'master' && (
          <ServiceManager 
            categories={state.serviceCategories} 
            onAdd={addServiceCategory} 
            onRemove={removeServiceCategory} 
            state={state}
            onImport={(imported) => persistState(imported)}
          />
        )}

        {(activeTab === 'people' || activeTab === 'services') && state.userRole === 'basic' && (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 text-center">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Acesso Restrito</h2>
            <p className="text-slate-500 dark:text-slate-400">Perfil operacional sem permissões administrativas.</p>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="mt-8 bg-slate-900 dark:bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-black dark:hover:bg-blue-700 transition-all"
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
