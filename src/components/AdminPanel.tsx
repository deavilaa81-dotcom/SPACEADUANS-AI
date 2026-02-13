
import React, { useState } from 'react';
import { User, RevisionReport, AppNotification, NotificationStatus, PedimentoError } from '../types';

interface AdminPanelProps {
  users: User[];
  onAddUser: (name: string, email: string) => void;
  onDeleteUser: (email: string) => void;
  onToggleAdmin: (email: string) => void;
  reports: RevisionReport[];
  notifications: AppNotification[];
  onUpdateStatus: (id: string, status: NotificationStatus) => void;
  onUpdateAuditData: (id: string, auditData: any) => void;
  onUpdateReport: (pedimentoNumber: string, userName: string, updatedData: any) => void;
  onSendMessage: (id: string, text: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, onAddUser, onDeleteUser, onToggleAdmin, reports, notifications, onUpdateStatus, onUpdateAuditData, onUpdateReport, onSendMessage }) => {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [adminInput, setAdminInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.endsWith('@spaceaduanas.com')) {
      setError('Solo se permiten correos con dominio @spaceaduanas.com');
      return;
    }
    if (users.find(u => u.email === newEmail)) {
      setError('El usuario ya existe');
      return;
    }
    if (newName.trim().length < 3) {
      setError('Por favor ingresa un nombre válido');
      return;
    }
    onAddUser(newName, newEmail);
    setNewEmail('');
    setNewName('');
    setError('');
  };

  const handleSendAdminMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !adminInput.trim()) return;
    onSendMessage(activeChatId, adminInput);
    setAdminInput('');
  };

  const toggleAuditCorrection = (notificationId: string, index: number) => {
    const n = notifications.find(notif => notif.id === notificationId);
    if (!n || !n.auditData) return;

    const newAuditData = { ...n.auditData };
    const validations = [...newAuditData.validations];
    const target = { ...validations[index] };

    if (target.status === 'error') {
      target.status = 'correct';
      target.isManuallyCorrected = true;
    } else {
      target.status = 'error';
      target.isManuallyCorrected = false;
    }

    validations[index] = target;
    newAuditData.validations = validations;
    onUpdateAuditData(notificationId, newAuditData);
  };

  const toggleClientOverride = (notificationId: string) => {
    const n = notifications.find(notif => notif.id === notificationId);
    if (!n || !n.auditData) return;

    const newAuditData = { ...n.auditData, clientOverride: !n.auditData.clientOverride };
    onUpdateAuditData(notificationId, newAuditData);
  };

  const handleSyncToUser = (notificationId: string) => {
    const n = notifications.find(notif => notif.id === notificationId);
    if (!n || !n.auditData) return;

    setIsSyncing(true);
    
    // 1. Actualizamos el historial global llamando a la función del padre
    onUpdateReport(n.auditData.pedimentoNumber, n.userName, n.auditData);

    // 2. Enviamos un mensaje automático al chat informando de la actualización
    onSendMessage(notificationId, "✅ He actualizado tu reporte con los ajustes solicitados. Los cambios ya se reflejan en el historial y en tu pantalla de auditoría.");
    
    setTimeout(() => {
      setIsSyncing(false);
      alert("Ajustes sincronizados globalmente y enviados al usuario.");
    }, 800);
  };

  const activeChat = notifications.find(n => n.id === activeChatId);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Solicitudes de Soporte
            </h2>
            
            <div className="space-y-3">
              {notifications.length === 0 && <p className="text-sm text-orange-600 italic">No hay alertas activas.</p>}
              {notifications.map((n) => (
                <div key={n.id} className={`p-4 rounded-xl border transition-all ${
                  n.status === 'resolved' ? 'bg-slate-50 border-slate-200 opacity-60' : 
                  n.status === 'in_progress' ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-orange-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${n.status === 'resolved' ? 'bg-slate-400' : n.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-orange-500 animate-bounce'}`}></span>
                        <p className="text-sm font-bold text-slate-800">{n.userName} <span className="text-xs font-normal text-slate-500">({n.userEmail})</span></p>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          n.status === 'resolved' ? 'bg-slate-200 text-slate-600' : 
                          n.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {n.status === 'resolved' ? 'Atendido' : n.status === 'in_progress' ? 'En Atención' : 'Pendiente'}
                        </span>
                        {n.auditData && (
                          <span className="text-[8px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Con Auditoría</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{n.message}</p>
                      <p className="text-[9px] text-slate-400">{new Date(n.timestamp).toLocaleString()}</p>
                    </div>

                    <div className="flex flex-col space-y-2">
                      {n.status === 'pending' && (
                        <button 
                          onClick={() => {
                            onUpdateStatus(n.id, 'in_progress');
                            setActiveChatId(n.id);
                          }}
                          className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Atender
                        </button>
                      )}
                      {n.status === 'in_progress' && (
                        <>
                          <button 
                            onClick={() => setActiveChatId(n.id)}
                            className="text-xs font-bold bg-white border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            Abrir Chat
                          </button>
                          <button 
                            onClick={() => {
                              onUpdateStatus(n.id, 'resolved');
                              if (activeChatId === n.id) setActiveChatId(null);
                            }}
                            className="text-xs font-bold bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Finalizar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-1 flex flex-col space-y-6">
          <div className="bg-slate-800 rounded-2xl h-[450px] shadow-xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 flex items-center justify-between border-b border-slate-700">
              <h3 className="text-white text-sm font-bold">Chat de Soporte</h3>
              {activeChat && (
                <button onClick={() => setActiveChatId(null)} className="text-slate-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!activeChat ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-xs text-white">Selecciona una alerta en atención para iniciar el chat directo con el usuario.</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <p className="text-[10px] text-blue-400 font-bold uppercase">Canal directo con</p>
                    <p className="text-sm text-white font-bold">{activeChat.userName.toUpperCase()}</p>
                  </div>
                  {activeChat.chatHistory?.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-2 rounded-xl text-xs ${
                        m.role === 'admin' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {activeChat && (
              <form onSubmit={handleSendAdminMsg} className="p-3 bg-slate-900 border-t border-slate-700 flex space-x-2">
                <input 
                  type="text" 
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  placeholder={`Responder a ${activeChat.userName}...`}
                  className="flex-1 bg-slate-800 border-none rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button className="bg-blue-600 p-2 rounded-lg text-white hover:bg-blue-700 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            )}
          </div>

          {activeChat && activeChat.auditData && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl animate-scaleIn max-h-[500px] overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
                <span>Auditoría de {activeChat.userName.split(' ')[0]}</span>
                <span className="text-[10px] font-mono text-blue-600">{activeChat.auditData.pedimentoNumber}</span>
              </h3>

              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-[10px] font-black text-orange-700 uppercase tracking-tighter">Override de Cliente</p>
                  <p className="text-[9px] text-slate-600 italic">Forzar estatus CONFORME</p>
                </div>
                <button 
                  onClick={() => toggleClientOverride(activeChat.id)}
                  className={`w-10 h-6 rounded-full transition-all relative ${activeChat.auditData.clientOverride ? 'bg-orange-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${activeChat.auditData.clientOverride ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <button 
                onClick={() => handleSyncToUser(activeChat.id)}
                disabled={isSyncing}
                className="w-full mb-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center"
              >
                {isSyncing ? (
                  <>
                    <svg className="animate-spin h-3 w-3 mr-2 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sincronizando...
                  </>
                ) : 'Sincronizar Globalmente'}
              </button>

              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Gestión Manual de Partidas</p>
                {activeChat.auditData.validations?.map((v: PedimentoError, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-[10px] border border-slate-100">
                    <div className="flex-1 pr-2 truncate">
                      <span className="font-bold text-slate-700">[{v.partida || '-'}]</span> {v.field}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`font-black text-[8px] px-1.5 py-0.5 rounded ${v.status === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {v.status === 'correct' ? 'CUMPLE' : 'ERROR'}
                      </span>
                      <button 
                        onClick={() => toggleAuditCorrection(activeChat.id, idx)}
                        className={`w-8 h-4 rounded-full transition-all relative ${v.status === 'correct' ? 'bg-green-600' : 'bg-slate-300'}`}
                      >
                         <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${v.status === 'correct' ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Gestionar Usuarios
          </h2>
          <form onSubmit={handleAdd} className="mb-6">
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Nombre Completo"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
              <input 
                type="email" 
                placeholder="ejemplo@spaceaduanas.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
              {error && <p className="text-xs text-red-500 italic">{error}</p>}
              <button 
                type="submit"
                className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-lg hover:bg-slate-900 transition-colors text-sm shadow-md active:scale-95"
              >
                Agregar Usuario
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Lista de Acceso</p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {users.map((u, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-all group">
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm font-bold text-slate-700 truncate">{u.name}</p>
                    <p className="text-[10px] text-slate-400 truncate font-medium">{u.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">PWD: {u.password}</span>
                      {u.isSuperUser && (
                         <span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">ADMIN</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onToggleAdmin(u.email)}
                      disabled={u.email === 'marco.deavila@spaceaduanas.com'}
                      className={`p-1.5 rounded-lg transition-all ${u.isSuperUser ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => onDeleteUser(u.email)}
                      disabled={u.email === 'marco.deavila@spaceaduanas.com'}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Resumen de Auditoría
              </h2>
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Auditados</p>
                <p className="text-2xl font-black text-slate-800">{reports.length}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Conformes</p>
                <p className="text-2xl font-black text-blue-700">{reports.filter(r => r.isConforme).length}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                <p className="text-[9px] font-black text-red-400 uppercase mb-1">Riesgos</p>
                <p className="text-2xl font-black text-red-700">{reports.filter(r => !r.isConforme).length}</p>
              </div>
              <div className="p-4 bg-slate-800 rounded-2xl text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Usuarios</p>
                <p className="text-2xl font-black text-white">{users.length}</p>
              </div>
           </div>
           <p className="text-xs text-slate-400 font-medium italic">Accede a la pestaña "Historial Global" para consultar el reporte detallado.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
