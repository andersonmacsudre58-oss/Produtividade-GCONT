
import React from 'react';
import { Icons } from '../constants';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: 'dashboard' | 'people' | 'logs' | 'services';
  setActiveTab: (tab: 'dashboard' | 'people' | 'logs' | 'services') => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole, onRoleChange, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Icons.Dashboard />, restricted: false },
    { id: 'people', label: 'Equipe', icon: <Icons.People />, restricted: true },
    { id: 'logs', label: 'Registros', icon: <Icons.Calendar />, restricted: false },
    { id: 'services', label: 'Serviços', icon: <Icons.Settings />, restricted: true },
  ] as const;

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
      <div className="p-8 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-100">
            <Icons.Task />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-800">Prod360</span>
        </div>
      </div>
      
      <nav className="flex-1 p-6 space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-4">Menu Principal</p>
        {menuItems.map((item) => {
          if (userRole === 'basic' && item.restricted) return null;
          
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-blue-600 text-white font-bold shadow-xl shadow-blue-100 translate-x-1' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <div className={isActive ? 'text-white' : 'text-slate-400'}>
                {item.icon}
              </div>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-6 space-y-4">
        <div className="bg-slate-50 rounded-[24px] p-5 border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
              userRole === 'master' ? 'bg-indigo-600' : 'bg-emerald-600'
            }`}>
              {userRole === 'master' ? 'A' : '1'}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{userRole === 'master' ? 'Anderson' : 'Usuário 1'}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{userRole === 'master' ? 'Master' : 'Básico'}</p>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sair do Sistema
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
