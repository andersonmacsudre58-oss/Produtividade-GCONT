
import React, { useState } from 'react';
import { UserRole } from '../types';
import { Icons } from '../constants';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Credenciais Master
    if (username.toUpperCase() === 'ANDERSON' && password === '1') {
      onLogin('master');
      return;
    }

    // Credenciais Básico
    if (username === '1' && password === '1') {
      onLogin('basic');
      return;
    }

    setError('Usuário ou senha inválidos.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-200 dark:shadow-none mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">Prod360</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Gestão Inteligente de Produtividade</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Acesse sua conta</h2>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl flex items-center gap-3 animate-shake">
                <div className="bg-red-500 text-white rounded-full p-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-black dark:hover:bg-blue-700 transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 flex items-center justify-center gap-2"
            >
              Entrar no Sistema
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
              <span>Nível Master</span>
              <span className="text-slate-300 dark:text-slate-800">|</span>
              <span>Nível Básico</span>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-400 dark:text-slate-600 text-sm mt-8">
          © 2024 Prod360. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;