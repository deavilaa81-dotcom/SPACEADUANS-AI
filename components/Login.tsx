
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (credentials: { email: string; pass: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ email, pass });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
        <div className="bg-blue-600 p-8 text-center">
          <img src="/assets/new_logo.jpg" alt="SpaceAduanas AI Logo" className="h-20 w-20 rounded-2xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white tracking-tight">SpaceAduanas AI</h1>
          <p className="text-blue-100 text-sm opacity-80 mt-1">Revisión Normativa de Pedimentos</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700"
              placeholder="nombre@spaceaduanas.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña (4 dígitos)</label>
            <input 
              type="password" 
              maxLength={4}
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700 tracking-widest text-lg"
              placeholder="••••"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            Entrar al Portal
          </button>
          
          <div className="text-center">
            <p className="text-xs text-slate-400">
              Uso exclusivo para personal autorizado de SpaceAduanas.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
