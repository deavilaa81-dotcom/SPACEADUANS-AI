
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, arrayUnion, getDocs, writeBatch, deleteDoc, getDoc } from 'firebase/firestore';
import { User, RevisionReport, AppNotification, NotificationStatus, ChatMessage } from './types';
import Login from './components/Login';
import Layout from './components/Layout';
import Reviewer from './components/Reviewer';
import AdminPanel from './components/AdminPanel';
// import Chatbot from './components/Chatbot'; // Desactivado para el plan gratuito
import GlobalHistory from './components/GlobalHistory';

const REPORTS_STORAGE_KEY = 'space_aduanas_reports';
const SESSION_COOKIE_NAME = 'space_session_user';

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
  
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'reviewer' | 'admin' | 'history'>('reviewer');
  const [reports, setReports] = useState<RevisionReport[]>(() => {
    const saved = localStorage.getItem(REPORTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Inicialización y sincronización de datos
  useEffect(() => {
    const initializeData = async () => {
      setIsInitializing(true);

      // Sincronizar Usuarios para el panel de admin
      const usersUnsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
        const serverUsers = snapshot.docs.map(doc => doc.data() as User);
        setUsers(serverUsers);
      });

      // Suscripción a Notificaciones en tiempo real
      const notifUnsubscribe = onSnapshot(collection(db, "notifications"), (snapshot) => {
        const serverNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
        setNotifications(serverNotifications);
      });

      // Rehidratar sesión del usuario desde la cookie
      const sessionEmail = getCookie(SESSION_COOKIE_NAME);
      if (sessionEmail) {
        const userRef = doc(db, "users", sessionEmail);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser(userSnap.data() as User);
        } else {
          // El usuario en la cookie ya no existe en la BD, se limpia la cookie.
          deleteCookie(SESSION_COOKIE_NAME);
        }
      }

      setIsInitializing(false);
      
      return () => {
        usersUnsubscribe();
        notifUnsubscribe();
      };
    };

    const unsubscribePromise = initializeData();
    
    return () => { 
      unsubscribePromise.then(unsub => unsub && unsub());
    };
  }, []);

  // Persistir reportes en LocalStorage
  useEffect(() => {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  const handleLogin = async (credentials: { email: string; pass: string }) => {
    const userRef = doc(db, "users", credentials.email);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const foundUser = userSnap.data() as User;
      if (foundUser.password === credentials.pass) {
        setUser(foundUser);
        setCookie(SESSION_COOKIE_NAME, foundUser.email, 1);
      } else {
        alert("Credenciales incorrectas o el usuario no existe.");
      }
    } else {
      alert("Credenciales incorrectas o el usuario no existe.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('reviewer');
    setActiveAuditResult(null);
    deleteCookie(SESSION_COOKIE_NAME);
  };

  const handleAddUser = async (name: string, email: string) => {
    const randomPass = Math.floor(1000 + Math.random() * 9000).toString();
    const newUser: User = { name, email, password: randomPass, isSuperUser: false };
    await setDoc(doc(db, "users", newUser.email), newUser);
    // La actualización local ya no es necesaria gracias a onSnapshot
  };

  const handleDeleteUser = async (email: string) => {
    if (window.confirm(`¿Estás seguro de eliminar al usuario ${email}?`)) {
      await deleteDoc(doc(db, "users", email));
      // La actualización local ya no es necesaria gracias a onSnapshot
    }
  };

  const handleToggleAdmin = async (email: string) => {
    const userRef = doc(db, "users", email);
    const targetUser = users.find(u => u.email === email);
    if(targetUser) {
        await updateDoc(userRef, { isSuperUser: !targetUser.isSuperUser });
        // La actualización local ya no es necesaria gracias a onSnapshot
    }
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

  const handleContactAdmin = async (msg: string = "El usuario requiere asistencia técnica inmediata.") => {
    if (!user) return;
    const newNotification: AppNotification = {
      id: doc(collection(db, 'notifications')).id,
      userEmail: user.email,
      userName: user.name,
      timestamp: new Date().toISOString(),
      message: msg,
      status: 'pending',
      chatHistory: [{ role: 'user', text: msg, timestamp: new Date() }],
      auditData: activeAuditResult 
    };
    await setDoc(doc(db, "notifications", newNotification.id), newNotification);
  };

  const handleUpdateNotificationStatus = async (id: string, status: NotificationStatus) => {
    const notifRef = doc(db, "notifications", id);
    await updateDoc(notifRef, { status });
  };

  const handleUpdateNotificationAudit = (id: string, auditData: any) => {
    const notifRef = doc(db, "notifications", id);
    updateDoc(notifRef, { auditData });
  };

  const handleSendAdminMessage = async (notificationId: string, text: string) => {
    const adminMsg: ChatMessage = { role: 'admin', text, timestamp: new Date() };
    const notifRef = doc(db, "notifications", notificationId);
    await updateDoc(notifRef, {
      chatHistory: arrayUnion(adminMsg)
    });
  };

  const handleSendUserSupportMessage = (userEmail: string, text: string) => {
    const userMsg: ChatMessage = { role: 'user', text, timestamp: new Date() };
    const notification = notifications.find(n => n.userEmail === userEmail && n.status === 'in_progress');
    if (notification) {
      const notifRef = doc(db, "notifications", notification.id);
      updateDoc(notifRef, {
        chatHistory: arrayUnion(userMsg)
      });
    }
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
      {/* <Chatbot 
        onContactAdmin={handleContactAdmin} 
        onSendUserSupportMessage={handleSendUserSupportMessage}
        notifications={notifications}
        currentUserEmail={user.email}
        currentUserName={user.name}
      /> */}
    </>
  );
};

export default App;
