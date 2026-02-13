import React from 'react';
import { User, RevisionReport, AppNotification, NotificationStatus } from '../types';

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
  onSendMessage: (notificationId: string, text: string) => void;
  onDeleteNotification: (id: string) => void; // Added this line
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  notifications, 
  onUpdateStatus, 
  onSendMessage, 
  onDeleteNotification // Added this line
}) => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Solicitudes de Soporte</h2>
      <div className="space-y-4">
        {notifications.map(notif => (
          <div key={notif.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">{notif.userName} ({notif.userEmail})</h3>
              <div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${notif.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : notif.status === 'in_progress' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}`}>
                  {notif.status}
                </span>
                <button 
                  onClick={() => onDeleteNotification(notif.id)} 
                  className="ml-2 px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full hover:bg-red-600">
                  Eliminar
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">{notif.message}</p>
            <p className="text-xs text-gray-400">{new Date(notif.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;