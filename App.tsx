
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
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('app-theme') as 'light' | 'dark') || 'light';
    } catch { return 'light'; }
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
      const data = await apiService.loadState();
      if (data) {
        setState(prev => ({ ...data, userRole: prev.userRole }));
        setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      }
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, []);

  // Efeito de Sincronização Automática entre PCs
  useEffect(() => {
    if (!isLoggedIn) return;
    
    // Conecta ao "rádio" do Supabase
    const unsubscribe = supabaseService.subscribeToChanges((newState) => {
      // Quando este PC "ouve" que outro PC salvou algo, ele atualiza o estado local
      setState(prev => ({ ...newState, userRole: prev.userRole }));
      setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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

  const persist = async (newState: AppState) => {
    // 1. Atualiza a interface IMEDIATAMENTE no computador atual
    setState(newState);
    // 2. Tenta salvar na nuvem (isso vai avisar todos os outros PCs via Realtime)
    await apiService.saveState(newState);
    setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estabelecendo Conexão...</p>
    </div>
  );

  if (!isLoggedIn) return <Login onLogin={(role) => { setState(p => ({...p, userRole: role})); setIsLoggedIn(true); }} />;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        userRole={state.userRole} onRoleChange={(role) => persist({...state, userRole: role})}
        onLogout={() => { setIsLoggedIn(false); setActiveTab('dashboard'); }}
        theme={theme} toggleTheme={() => setTheme(p => p === 'light' ? 'dark' : 'light')}
      />
      
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'people' && 'Equipe'}
              {activeTab === 'logs' && 'Registros'}
              {activeTab === 'particularities' && 'Ocorrências'}
              {activeTab === 'services' && 'Serviços'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizado: {lastSync || '--:--'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={loadData} disabled={isSyncing}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
            >
              <div className={isSyncing ? 'animate-spin' : ''}><Icons.Refresh /></div>
              {isSyncing ? 'Atualizando...' : 'Recarregar Tudo'}
            </button>
          </div>
        </header>

        <div className="min-h-0 min-w-0">
          {activeTab === 'dashboard' && <Dashboard state={state} onRefresh={loadData} />}
          {activeTab === 'people' && state.userRole === 'master' && (
            <PeopleManager 
              people={state.people} 
              onAdd={(p) => persist({...state, people: [...state.people, p]})} 
              onRemove={(id) => persist({...state, people: state.people.filter(x => x.id !== id)})} 
              onUpdate={(p) => persist({...state, people: state.people.map(x => x.id === p.id ? p : x)})}
            />
          )}
          {activeTab === 'logs' && (
            <DailyLog 
              tasks={state.tasks} people={state.people} categories={state.serviceCategories}
              onAddTask={(t) => persist({...state, tasks: [...state.tasks, t]})} 
              onEditTask={(t) => persist({...state, tasks: state.tasks.map(x => x.id === t.id ? t : x)})}
              onRemoveTask={(id) => persist({...state, tasks: state.tasks.filter(x => x.id !== id)})}
              userRole={state.userRole} onRefresh={loadData}
            />
          )}
          {activeTab === 'particularities' && (
            <ParticularityManager 
              particularities={state.particularities} people={state.people}
              onAdd={(p) => persist({...state, particularities: [...state.particularities, p]})}
              onRemove={(id) => persist({...state, particularities: state.particularities.filter(x => x.id !== id)})}
            />
          )}
          {activeTab === 'services' && state.userRole === 'master' && (
            <ServiceManager 
              categories={state.serviceCategories} 
              onAdd={(c) => persist({...state, serviceCategories: [...state.serviceCategories, c]})} 
              onRemove={(id) => persist({...state, serviceCategories: state.serviceCategories.filter(x => x.id !== id)})} 
              state={state} onImport={(s) => persist(s)}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
