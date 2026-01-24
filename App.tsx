
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
import { supabaseService } from './services/supabase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'people' | 'logs' | 'services' | 'particularities'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('app-theme');
      return (saved as 'light' | 'dark') || 'light';
    } catch (e) { return 'light'; }
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
      if (savedState) {
        setState(prev => ({
          ...savedState,
          userRole: prev.userRole, // Mantém o role atual
          particularities: savedState.particularities || [],
          tasks: savedState.tasks || [],
          people: savedState.people || [],
          serviceCategories: savedState.serviceCategories || DEFAULT_CATEGORIES
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const unsubscribe = supabaseService.subscribeToChanges((newState) => {
        setState(prev => ({
          ...newState,
          userRole: prev.userRole
        }));
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Erro ao assinar mudanças:", e);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    async function init() {
      try {
        await loadData();
      } catch (e: any) {
        console.error("Erro crítico na inicialização:", e);
        setInitError(e.message || "Erro desconhecido ao iniciar o app.");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const persistState = async (newState: AppState) => {
    setState(newState);
    try {
      await apiService.saveState(newState);
    } catch (e) {
      console.error("Erro de persistência:", e);
    }
  };

  if (initError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] shadow-2xl border border-rose-100 dark:border-rose-900/30 text-center max-w-md">
           <div className="bg-rose-100 dark:bg-rose-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600">
             <Icons.Trash />
           </div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4">Ops! Algo deu errado</h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 font-medium">{initError}</p>
           <button onClick={() => window.location.reload()} className="w-full bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-bold">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-20 h-20 border-4 border-blue-100 dark:border-slate-800 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-6 font-bold text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">Iniciando Sistema...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={(role) => { setState(p => ({...p, userRole: role})); setIsLoggedIn(true); }} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={state.userRole}
        onRoleChange={(role) => persistState({...state, userRole: role})}
        onLogout={() => { setIsLoggedIn(false); setActiveTab('dashboard'); }}
        theme={theme}
        toggleTheme={() => setTheme(p => p === 'light' ? 'dark' : 'light')}
      />
      
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase">
            {activeTab === 'dashboard' && 'Dashboard'}
            {activeTab === 'people' && 'Equipe'}
            {activeTab === 'logs' && 'Registros'}
            {activeTab === 'particularities' && 'Ocorrências'}
            {activeTab === 'services' && 'Serviços'}
          </h1>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={loadData}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <div className={isSyncing ? 'animate-spin' : ''}><Icons.Refresh /></div>
              {isSyncing ? 'Sincronizando...' : 'Atualizar'}
            </button>
            <div className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${state.userRole === 'master' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
              {state.userRole === 'master' ? 'Acesso Master' : 'Acesso Básico'}
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && <Dashboard state={state} onRefresh={loadData} />}
        {activeTab === 'people' && state.userRole === 'master' && (
          <PeopleManager people={state.people} onAdd={(p) => persistState({...state, people: [...state.people, p]})} onRemove={(id) => persistState({...state, people: state.people.filter(x => x.id !== id)})} />
        )}
        {activeTab === 'logs' && (
          <DailyLog 
            tasks={state.tasks} people={state.people} categories={state.serviceCategories}
            onAddTask={(t) => persistState({...state, tasks: [...state.tasks, t]})} 
            onEditTask={(t) => persistState({...state, tasks: state.tasks.map(x => x.id === t.id ? t : x)})}
            onRemoveTask={(id) => persistState({...state, tasks: state.tasks.filter(x => x.id !== id)})}
            userRole={state.userRole} onRefresh={loadData}
          />
        )}
        {activeTab === 'particularities' && (
          <ParticularityManager 
            particularities={state.particularities} people={state.people}
            onAdd={(p) => persistState({...state, particularities: [...state.particularities, p]})}
            onRemove={(id) => persistState({...state, particularities: state.particularities.filter(x => x.id !== id)})}
          />
        )}
        {activeTab === 'services' && state.userRole === 'master' && (
          <ServiceManager 
            categories={state.serviceCategories} 
            onAdd={(c) => persistState({...state, serviceCategories: [...state.serviceCategories, c]})} 
            onRemove={(id) => persistState({...state, serviceCategories: state.serviceCategories.filter(x => x.id !== id)})} 
            state={state} onImport={(s) => persistState(s)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
