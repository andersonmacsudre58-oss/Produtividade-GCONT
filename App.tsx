
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
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
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

  const loadData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const savedState = await apiService.loadState();
      if (savedState) {
        setState(prev => ({
          ...savedState,
          userRole: prev.userRole,
          particularities: savedState.particularities || [],
          tasks: savedState.tasks || [],
          people: savedState.people || [],
          serviceCategories: savedState.serviceCategories || DEFAULT_CATEGORIES
        }));
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (error) {
      console.warn("Falha ao carregar dados remotos, operando localmente.");
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    
    // Inscrição em tempo real: Se outro computador mudar algo no Supabase, 
    // este computador atualiza o estado imediatamente.
    const unsubscribe = supabaseService.subscribeToChanges((newState) => {
      setState(prev => ({
        ...newState,
        userRole: prev.userRole
      }));
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    });
    
    return () => unsubscribe();
  }, [isLoggedIn]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const persistState = async (newState: AppState) => {
    setState(newState);
    try {
      await apiService.saveState(newState);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      // Falha silenciosa de rede
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 dark:border-slate-800 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
          </div>
        </div>
        <p className="mt-6 font-bold text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">Carregando Banco de Dados...</p>
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
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'people' && 'Equipe'}
              {activeTab === 'logs' && 'Registros'}
              {activeTab === 'particularities' && 'Ocorrências'}
              {activeTab === 'services' && 'Serviços'}
            </h1>
            {lastUpdated && (
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                Sincronizado às {lastUpdated}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={loadData}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                isSyncing 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100 dark:border-blue-800' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className={isSyncing ? 'animate-spin' : ''}>
                <Icons.Refresh />
              </div>
              {isSyncing ? 'Buscando Dados...' : 'Atualizar Agora'}
            </button>
            <div className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-transparent ${state.userRole === 'master' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
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
