
import React, { useState, useEffect, useCallback } from 'react';
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
import { supabaseService } from './services/supabase';

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

  // Função robusta de carregamento
  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsSyncing(true);
    try {
      const savedState = await apiService.loadState();
      if (savedState) {
        setState(prev => ({
          ...prev,
          ...savedState,
          userRole: prev.userRole // Preserva o role da sessão atual
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      if (showLoading) setTimeout(() => setIsSyncing(false), 600);
    }
  }, []);

  // Persistência com debounce implícito (pela lógica de eventos do React)
  const persistState = async (newState: AppState) => {
    // Atualização otimista da UI
    setState(newState);
    
    try {
      await apiService.saveState(newState);
    } catch (e) {
      console.error("Erro na persistência remota:", e);
    }
  };

  // Efeito Inicial e Real-time
  useEffect(() => {
    if (isLoggedIn) {
      loadData(true).then(() => setIsLoading(false));

      // Inscreve para atualizações de outros usuários
      const unsubscribe = supabaseService.subscribeToChanges((remoteState) => {
        // Só atualizamos se o dado remoto for diferente (evita loops)
        setState(prev => {
          if (JSON.stringify(prev.tasks) !== JSON.stringify(remoteState.tasks) ||
              JSON.stringify(prev.people) !== JSON.stringify(remoteState.people)) {
            return { ...prev, ...remoteState };
          }
          return prev;
        });
      });

      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, loadData]);

  // Gerenciamento de Tema
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const handleLogin = (role: UserRole) => {
    setState(prev => ({ ...prev, userRole: role }));
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveTab('dashboard');
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Actions de Estado (Todas chamam persistState)
  const addPerson = (person: Person) => {
    const newState = { ...state, people: [...state.people, person] };
    persistState(newState);
  };

  const removePerson = (id: string) => {
    const newState = {
      ...state,
      people: state.people.filter(p => p.id !== id),
      tasks: state.tasks.filter(t => t.personId !== id),
      particularities: state.particularities.filter(p => p.personId !== id)
    };
    persistState(newState);
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
    persistState({ ...state, tasks: state.tasks.filter(t => t.id !== id) });
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
    persistState({ ...state, serviceCategories: [...state.serviceCategories, cat] });
  };

  const removeServiceCategory = (id: string) => {
    persistState({
      ...state,
      serviceCategories: state.serviceCategories.filter(c => c.id !== id),
      tasks: state.tasks.filter(t => t.serviceCategoryId !== id)
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">Carregando Fluxo...</p>
      </div>
    );
  }

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={state.userRole}
        onRoleChange={(role) => persistState({...state, userRole: role})}
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1 capitalize">{activeTab}</h1>
            <p className="text-sm text-slate-500">Gestão de produtividade em tempo real.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {isSyncing && (
               <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-black rounded-full animate-pulse">
                 <Icons.Refresh /> SINCRONIZANDO
               </div>
            )}
            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${state.userRole === 'master' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
              {state.userRole}
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && <Dashboard state={state} onRefresh={() => loadData(true)} />}
        {activeTab === 'people' && <PeopleManager people={state.people} onAdd={addPerson} onRemove={removePerson} />}
        {activeTab === 'logs' && (
          <DailyLog 
            tasks={state.tasks} 
            people={state.people} 
            categories={state.serviceCategories}
            onAddTask={addTask} 
            onEditTask={editTask}
            onRemoveTask={removeTask}
            userRole={state.userRole}
            onRefresh={() => loadData(true)}
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
        {activeTab === 'services' && (
          <ServiceManager 
            categories={state.serviceCategories} 
            onAdd={addServiceCategory} 
            onRemove={removeServiceCategory} 
            state={state}
            onImport={(imported) => persistState(imported)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
