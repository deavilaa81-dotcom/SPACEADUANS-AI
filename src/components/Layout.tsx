
import React from 'react';
import { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: 'reviewer' | 'admin' | 'history';
  setActiveTab: (tab: 'reviewer' | 'admin' | 'history') => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, activeTab, setActiveTab }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <img src="/assets/new_logo.jpg" alt="SpaceAduanas AI Logo" className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800">SpaceAduanas <span className="text-blue-600">AI</span></h1>
            <p className="text-xs text-slate-500 font-medium">Revisión Inteligente de Pedimentos</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-1">
          <button 
            onClick={() => setActiveTab('reviewer')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'reviewer' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Revisor
          </button>
          {user.isSuperUser && (
            <>
              <button 
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'admin' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Panel Admin
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Historial Global
              </button>
            </>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">{user.email}</p>
            <p className="text-xs text-slate-500 capitalize">{user.isSuperUser ? 'Administrador' : 'Usuario'}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Cerrar Sesión"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;
