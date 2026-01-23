
import React from 'react';
import { Icons } from '../constants';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: 'dashboard' | 'people' | 'logs' | 'services' | 'particularities';
  setActiveTab: (tab: 'dashboard' | 'people' | 'logs' | 'services' | 'particularities') => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole, onRoleChange, onLogout, theme, toggleTheme }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Icons.Dashboard />, restricted: false },
    { id: 'people', label: 'Equipe', icon: <Icons.People />, restricted: true },
    { id: 'logs', label: 'Registros', icon: <Icons.Calendar />, restricted: false },
    { id: 'particularities', label: 'Ocorrências', icon: <Icons.Note />, restricted: false },
    { id: 'services', label: 'Serviços', icon: <Icons.Settings />, restricted: true },
  ] as const;

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex transition-colors">
      <div className="p-8 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl text-white shadow-lg">
            <Icons.Task />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-800 dark:text-white">Prod360</span>
        </div>
      </div>
      
      <nav className="flex-1 p-6 space-y-2">
        {menuItems.map((item) => {
          if (userRole === 'basic' && item.restricted) return null;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${
                isActive ? 'bg-blue-600 text-white font-bold shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-6">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-red-50"
        >
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
