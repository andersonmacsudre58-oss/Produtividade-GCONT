
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Person, Task, AppState, ServiceCategory, UserRole, Particularity } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PeopleManager from './components/PeopleManager';
import DailyLog from './components/DailyLog';
import ServiceManager from './components/ServiceManager';
import ParticularityManager from './components/ParticularityManager';
import ProcessFlowManager from './components/ProcessFlowManager';
import Login from './components/Login';
import { DEFAULT_CATEGORIES, Icons } from './constants';
import { apiService } from './services/api';
import { supabaseService } from './services/supabase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'people' | 'logs' | 'services' | 'particularities' | 'fluxo'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('app-theme') as 'light' | 'dark') || 'light';
    } catch { return 'light'; }
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dismissed-notifications');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('dismissed-notifications', JSON.stringify(dismissedNotificationIds));
    } catch (e) {
      console.error(e);
    }
  }, [dismissedNotificationIds]);

  const [state, setState] = useState<AppState>({ 
    people: [], 
    tasks: [], 
    particularities: [],
    processFlows: [],
    serviceCategories: DEFAULT_CATEGORIES,
    userRole: 'master' 
  });

  const pendingNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return state.tasks
      .filter(task => {
        if (task.id && dismissedNotificationIds.includes(task.id)) return false;

        const hasAssignment = task.assignedProcesses && task.assignedProcesses > 0;
        const notCompleted = !task.processQuantity || task.processQuantity <= 0;
        if (!hasAssignment || !notCompleted) return false;

        if (!task.date) return false;
        const taskDate = new Date(task.date + 'T00:00:00');
        const diffTime = today.getTime() - taskDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 2) return false;

        const person = state.people.find(p => p.id === task.personId);
        if (!person || person.isHidden) return false;

        return true;
      })
      .map(task => {
        const person = state.people.find(p => p.id === task.personId);
        const category = state.serviceCategories.find(c => c.id === task.serviceCategoryId);
        
        let formattedDate = task.date;
        if (task.date) {
          const parts = task.date.split('-');
          if (parts.length === 3) {
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }

        const taskDate = new Date(task.date + 'T00:00:00');
        const diffTime = today.getTime() - taskDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: task.id,
          task,
          personName: person?.name || 'Desconhecido',
          categoryName: category?.name || 'Serviço',
          date: task.date,
          formattedDate,
          diffDays,
          assignedProcesses: task.assignedProcesses
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.tasks, state.people, state.serviceCategories, dismissedNotificationIds]);

  const loadData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await apiService.loadState();
      if (data) {
        setState(prev => ({ 
          ...prev,
          ...data, 
          processFlows: data.processFlows || [],
          particularities: data.particularities || [],
          userRole: prev.userRole 
        }));
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
      setState(prev => ({ 
        ...prev,
        ...newState, 
        processFlows: newState.processFlows || [],
        particularities: newState.particularities || [],
        userRole: prev.userRole 
      }));
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
              {activeTab === 'fluxo' && 'Fluxo de Processos'}
              {activeTab === 'services' && 'Serviços'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <div className={`w-1.5 h-1.5 rounded-full ${!supabaseService.isConfigured() ? 'bg-slate-300' : isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 {!supabaseService.isConfigured() ? 'Modo Local (Offline)' : `Sincronizado: ${lastSync || '--:--'}`}
               </p>
            </div>
          </div>
          
            <div className="flex items-center gap-3 relative">
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-3 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
                    showNotifications 
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-200' 
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm'
                  }`}
                  title="Notificações de Pendências"
                  id="notifDropdown"
                >
                  <Icons.Bell />
                  {pendingNotifications.length > 0 && (
                    <span id="notify" className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-950 animate-pulse">
                      {pendingNotifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                    
                    <div className="dropdown-menu absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                      <div className="p-5 border-b border-slate-100 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-850 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                          <Icons.Bell /> Mensagens & Pendências
                        </span>
                        <span className="px-2.5 py-1 text-[9px] font-black bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-450 rounded-full uppercase tracking-wider">
                          {pendingNotifications.length} Pendentes
                        </span>
                      </div>

                      <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100/50 dark:divide-slate-700/30">
                        {pendingNotifications.length === 0 ? (
                          <div className="p-10 text-center flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                              Tudo em dia!
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed max-w-[240px] mx-auto">
                              Nenhuma atribuição possui atraso de preenchimento de mais de 2 dias.
                            </p>
                          </div>
                        ) : (
                          pendingNotifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => {
                                setActiveTab('logs');
                                setShowNotifications(false);
                              }}
                              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-750/30 transition-all cursor-pointer group"
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 mt-0.5 group-hover:scale-105 transition-transform duration-200">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[12px] font-black text-slate-850 dark:text-slate-200 truncate pr-1">
                                      {notif.personName}
                                    </p>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-[9px] font-black text-rose-500 dark:text-rose-450 shrink-0 whitespace-nowrap bg-rose-50 dark:bg-rose-955/40 px-2 py-0.5 rounded-md">
                                        {notif.diffDays} dias sem preencher
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (notif.id) {
                                            setDismissedNotificationIds(prev => [...prev, notif.id].filter(Boolean) as string[]);
                                          }
                                        }}
                                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all shrink-0"
                                        title="Esconder esta notificação"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal font-medium text-left">
                                    Atividade de <span className="font-bold text-slate-750 dark:text-slate-300">{notif.categoryName}</span> atribuída em <span className="font-bold">{notif.formattedDate}</span> com <span className="font-bold text-blue-600 dark:text-blue-400">{notif.assignedProcesses}</span> processos está pendente de preenchimento do realizado.
                                  </p>
                                  <div className="flex items-center justify-between mt-3 text-[9px] font-black uppercase tracking-wider">
                                    <span className="opacity-60 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">
                                      {notif.formattedDate}
                                    </span>
                                    <span className="text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                                      Preencher Agora <Icons.Plus />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {(pendingNotifications.length > 0 || dismissedNotificationIds.length > 0) && (
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/55 border-t border-slate-100 dark:border-slate-700/50 text-center flex items-center justify-between gap-4">
                          <button 
                            onClick={() => {
                              setActiveTab('logs');
                              setShowNotifications(false);
                            }}
                            className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline transition-all"
                          >
                            Lista de Atividades
                          </button>
                          
                          {dismissedNotificationIds.length > 0 && (
                            <button 
                              onClick={() => {
                                setDismissedNotificationIds([]);
                              }}
                              className="text-[10px] font-black text-rose-500 dark:text-rose-450 uppercase tracking-widest hover:underline transition-all"
                            >
                              Restaurar ({dismissedNotificationIds.length})
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {supabaseService.isConfigured() && (
                <button 
                  onClick={loadData} disabled={isSyncing}
                  className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                >
                  <div className={isSyncing ? 'animate-spin' : ''}><Icons.Refresh /></div>
                  {isSyncing ? 'Atualizando...' : 'Recarregar Tudo'}
                </button>
              )}
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
          {activeTab === 'fluxo' && state.userRole === 'master' && (
            <ProcessFlowManager 
              processFlows={state.processFlows}
              onAdd={(f) => persist({...state, processFlows: [...state.processFlows, f]})}
              onRemove={(id) => persist({...state, processFlows: state.processFlows.filter(x => x.id !== id)})}
              onUpdate={(f) => persist({...state, processFlows: state.processFlows.map(x => x.id === f.id ? f : x)})}
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
