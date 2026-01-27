
import React, { useState, useEffect } from 'react';
import { User, RevisionReport, AppNotification, NotificationStatus, ChatMessage } from './types';
import Login from './components/Login';
import Layout from './components/Layout';
import Reviewer from './components/Reviewer';
import AdminPanel from './components/AdminPanel';
import Chatbot from './components/Chatbot';
import GlobalHistory from './components/GlobalHistory';

const USERS_STORAGE_KEY = 'space_aduanas_users';
const REPORTS_STORAGE_KEY = 'space_aduanas_reports';
const SESSION_COOKIE_NAME = 'space_session_user';

// Utilidades para manejo de Cookies
const setCookie = (name: string, value: string, days: number) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Strict";
};

const getCookie = (name: string) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = name + '=; Max-Age=-99999999;path=/;';
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeAuditResult, setActiveAuditResult] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return [
      { name: 'Marco de Avila', email: 'marco.deavila@spaceaduanas.com', password: '3569', isSuperUser: true }
    ];
  });

  const [activeTab, setActiveTab] = useState<'reviewer' | 'admin' | 'history'>('reviewer');
  const [reports, setReports] = useState<RevisionReport[]>(() => {
    const saved = localStorage.getItem(REPORTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Efecto para recuperar la sesión al cargar la página
  useEffect(() => {
    const sessionEmail = getCookie(SESSION_COOKIE_NAME);
    if (sessionEmail) {
      const foundUser = users.find(u => u.email === sessionEmail);
      if (foundUser) {
        setUser(foundUser);
      }
    }
    setIsInitializing(false);
  }, [users]);

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  const handleLogin = (credentials: { email: string; pass: string }) => {
    const foundUser = users.find(u => u.email === credentials.email && u.password === credentials.pass);
    if (foundUser) {
      setUser(foundUser);
      // Guardar sesión en Cookie por 1 día
      setCookie(SESSION_COOKIE_NAME, foundUser.email, 1);
    } else {
      alert("Credenciales incorrectas");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('reviewer');
    setActiveAuditResult(null);
    // Limpiar Cookies físicamente
    deleteCookie(SESSION_COOKIE_NAME);
  };

  const handleAddUser = (name: string, email: string) => {
    const randomPass = Math.floor(1000 + Math.random() * 9000).toString();
    const newUser = { name, email, password: randomPass, isSuperUser: false };
    setUsers(prev => [...prev, newUser]);
  };

  const handleDeleteUser = (email: string) => {
    if (email === 'marco.deavila@spaceaduanas.com') {
      alert("No se puede eliminar el administrador principal.");
      return;
    }
    if (window.confirm(`¿Estás seguro de eliminar al usuario ${email}?`)) {
      setUsers(prev => prev.filter(u => u.email !== email));
    }
  };

  const handleToggleAdmin = (email: string) => {
    if (email === 'marco.deavila@spaceaduanas.com') return;
    setUsers(prev => prev.map(u => 
      u.email === email ? { ...u, isSuperUser: !u.isSuperUser } : u
    ));
  };

  const handleSaveReport = (report: RevisionReport) => {
    setReports(prev => [report, ...prev]);
  };

  const handleUpdateReport = (pedimentoNumber: string, userName: string, updatedData: any) => {
    setReports(prev => prev.map(report => {
      if (report.pedimentoNumber === pedimentoNumber && report.userName === userName) {
        const allCorrect = updatedData.validations.every((v: any) => v.status === 'correct');
        const isConforme = updatedData.clientOverride || allCorrect;
        return {
          ...report,
          errors: updatedData.validations,
          isConforme: isConforme,
          totalSavings: updatedData.totalSavings,
          totalRisk: updatedData.totalRisk
        };
      }
      return report;
    }));
  };

  const handleContactAdmin = (msg: string = "El usuario requiere asistencia técnica inmediata.") => {
    if (!user) return;
    const newNotification: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      userEmail: user.email,
      userName: user.name,
      timestamp: new Date().toISOString(),
      message: msg,
      status: 'pending',
      chatHistory: [{ role: 'user', text: msg, timestamp: new Date() }],
      auditData: activeAuditResult 
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const handleUpdateNotificationStatus = (id: string, status: NotificationStatus) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status } : n));
  };

  const handleUpdateNotificationAudit = (id: string, auditData: any) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, auditData } : n));
  };

  const handleSendAdminMessage = (notificationId: string, text: string) => {
    const adminMsg: ChatMessage = { role: 'admin', text, timestamp: new Date() };
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, chatHistory: [...(n.chatHistory || []), adminMsg] } : n
    ));
  };

  const handleSendUserSupportMessage = (userEmail: string, text: string) => {
    const userMsg: ChatMessage = { role: 'user', text, timestamp: new Date() };
    setNotifications(prev => prev.map(n => 
      (n.userEmail === userEmail && n.status === 'in_progress') ? { ...n, chatHistory: [...(n.chatHistory || []), userMsg] } : n
    ));
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Layout 
        user={user} 
        onLogout={handleLogout} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
      >
        {activeTab === 'reviewer' && (
          <Reviewer 
            user={user} 
            onSaveReport={handleSaveReport} 
            onAuditChange={setActiveAuditResult}
            notifications={notifications}
          />
        )}
        
        {activeTab === 'admin' && user.isSuperUser && (
          <AdminPanel 
            users={users} 
            onAddUser={handleAddUser} 
            onDeleteUser={handleDeleteUser}
            onToggleAdmin={handleToggleAdmin}
            reports={reports} 
            notifications={notifications}
            onUpdateStatus={handleUpdateNotificationStatus}
            onUpdateAuditData={handleUpdateNotificationAudit}
            onUpdateReport={handleUpdateReport}
            onSendMessage={handleSendAdminMessage}
          />
        )}

        {activeTab === 'history' && user.isSuperUser && (
          <GlobalHistory reports={reports} />
        )}
      </Layout>
      <Chatbot 
        onContactAdmin={handleContactAdmin} 
        onSendUserSupportMessage={handleSendUserSupportMessage}
        notifications={notifications}
        currentUserEmail={user.email}
        currentUserName={user.name}
      />
    </>
  );
};

export default App;
