
import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface LoginProps {
  onLogin: (credentials: { email: string; pass: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  useEffect(() => {
    const user = Cookies.get('user');
    if (user) {
      try {
        const { email, pass } = JSON.parse(user);
        if (email && pass) {
          onLogin({ email, pass });
        }
      } catch (error) {
        console.error("Error parsing user cookie:", error);
      }
    }
  }, [onLogin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    Cookies.set('user', JSON.stringify({ email, pass }), { expires: 7 }); // Expires in 7 days
    onLogin({ email, pass });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
        <div className="bg-blue-600 p-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white/20 rounded-2xl mb-4 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
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
