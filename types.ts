
export interface User {
  name: string;
  email: string;
  password: string;
  isSuperUser: boolean;
}

export interface FileContent {
  data: string;
  mimeType: string;
}

export interface PedimentoError {
  field: string;
  partida?: string;
  error: string;
  correctValue: string;
  status: 'error' | 'correct';
  potentialFine?: string; 
  savings?: string;       
  isManuallyCorrected?: boolean;
}

export interface RevisionReport {
  id: string;
  pedimentoNumber: string;
  userName: string;
  date: string;
  errors: PedimentoError[];
  isConforme: boolean;
  recommendations?: string;
  totalSavings?: string;  
  totalRisk?: string;     
}

export interface ChatMessage {
  role: 'user' | 'model' | 'admin';
  text: string;
  timestamp: Date;
}

export type NotificationStatus = 'pending' | 'in_progress' | 'resolved';

export interface AppNotification {
  id: string;
  userEmail: string;
  userName: string;
  timestamp: string;
  message: string;
  status: NotificationStatus;
  chatHistory?: ChatMessage[];
  auditData?: any; // Snapshot de la auditoría actual para que el admin la revise
}
