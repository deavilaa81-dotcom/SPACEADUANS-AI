
import React, { useState, useRef, useEffect } from 'react';
import { chatWithExpert } from '../services/geminiService';
import { ChatMessage, AppNotification } from '../types';

interface ChatbotProps {
  onContactAdmin: (msg?: string) => void;
  onSendUserSupportMessage: (email: string, text: string) => void;
  notifications: AppNotification[];
  currentUserEmail: string;
  currentUserName: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ onContactAdmin, onSendUserSupportMessage, notifications, currentUserEmail, currentUserName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hola Soy Space Bot ¿en que puedo ayudarte el dia de hoy?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeNotification = notifications.find(n => n.userEmail === currentUserEmail && n.status === 'in_progress');
  const isHumanSupportActive = !!activeNotification;

  useEffect(() => {
    if (isHumanSupportActive && activeNotification?.chatHistory) {
      const adminMessages = activeNotification.chatHistory.filter(m => m.role === 'admin');
      if (adminMessages.length > 0) {
        setMessages(prev => {
          const existingTexts = prev.map(m => m.text);
          const newAdminMsgs = adminMessages.filter(am => !existingTexts.includes(am.text));
          if (newAdminMsgs.length > 0) {
            return [...prev, ...newAdminMsgs];
          }
          return prev;
        });
      }
    }

    const resolvedNotification = notifications.find(n => n.userEmail === currentUserEmail && n.status === 'resolved');
    if (resolvedNotification) {
      setMessages(prev => {
        const hasResolutionMsg = prev.some(m => m.text.includes("El administrador ha finalizado la sesión"));
        if (!hasResolutionMsg) {
          return [...prev, { 
            role: 'model', 
            text: `✅ Hola ${currentUserName.split(' ')[0]}, el administrador ha finalizado la sesión de soporte técnico. La IA de SpaceAduanas vuelve a estar disponible para tus consultas.`, 
            timestamp: new Date() 
          }];
        }
        return prev;
      });
    }
  }, [notifications, currentUserEmail, isHumanSupportActive, activeNotification, currentUserName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');

    if (isHumanSupportActive) {
      onSendUserSupportMessage(currentUserEmail, currentInput);
      return;
    }

    setLoading(true);
    try {
      const history = messages.map(m => ({
        role: m.role === 'admin' ? 'model' : m.role,
        parts: [{ text: m.text }]
      }));
      const response = await chatWithExpert(history, currentInput);
      setMessages(prev => [...prev, { role: 'model', text: response || 'Lo siento, hubo un problema al procesar tu solicitud.', timestamp: new Date() }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    setContactStatus('sending');
    setTimeout(() => {
      onContactAdmin("Solicitud de ayuda directa.");
      setContactStatus('sent');
      
      setMessages(prev => [
        ...prev, 
        { 
          role: 'model', 
          text: `🤖 Hola ${currentUserName.split(' ')[0]}, he procesado tu solicitud de ayuda humana. Mientras un administrador se conecta al canal de soporte, he pausado mis respuestas automáticas para que puedas hablar directamente con el equipo técnico. Por favor, espera un momento...`, 
          timestamp: new Date() 
        }
      ]);
      
      setTimeout(() => setContactStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <>
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-white w-[350px] sm:w-[400px] h-[550px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scaleIn origin-bottom-right">
          <div className="bg-blue-600 p-4 flex items-center justify-between text-white shadow-md">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1 border-2 border-blue-400">
                <img src="/assets/robot.png" alt="Robot AI" className="w-full h-full rounded-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  {isHumanSupportActive ? 'Soporte Directo (Admin)' : 'Space Bot'}
                </h3>
                <div className="flex items-center text-[10px] opacity-80">
                  <span className={`w-2 h-2 ${isHumanSupportActive ? 'bg-orange-400 animate-pulse' : 'bg-green-400'} rounded-full mr-1`}></span> 
                  {isHumanSupportActive ? 'Charlando con Admin' : 'IA Activa'}
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : m.role === 'admin'
                    ? 'bg-indigo-600 text-white rounded-tl-none border-l-4 border-indigo-300'
                    : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
                }`}>
                  {m.role === 'admin' && <p className="text-[10px] font-bold uppercase mb-1 opacity-70">Administrador</p>}
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 rounded-tl-none">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            {isHumanSupportActive && (
              <div className="mb-2 text-center">
                <span className="text-[10px] bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold uppercase">
                  Modo: Chat Directo con Administrador
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isHumanSupportActive ? "Escribe al administrador..." : "Pregunta sobre Anexo 22..."}
                className="flex-1 bg-slate-100 border-none focus:ring-2 focus:ring-blue-500 rounded-xl px-4 py-2 text-sm outline-none"
              />
              <button 
                onClick={handleSend}
                disabled={loading}
                className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
            {!isHumanSupportActive && (
              <button 
                onClick={handleContact}
                disabled={contactStatus !== 'idle'}
                className={`mt-3 w-full text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center space-x-2 border-2 ${
                  contactStatus === 'sent' 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-white text-blue-600 border-blue-50 hover:bg-blue-50'
                }`}
              >
                {contactStatus === 'idle' && (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10l-6-6-6 6M6 14l6 6 6-6" />
                    </svg>
                    <span>Solicitar Asistencia Humana</span>
                  </>
                )}
                {contactStatus === 'sending' && <span>Enviando alerta...</span>}
                {contactStatus === 'sent' && <span>¡Alerta enviada correctamente!</span>}
              </button>
            )}
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-transparent border-none p-0 w-40 h-40 cursor-pointer"
        >
          {isHumanSupportActive && (
            <span className="absolute top-4 right-4 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-orange-500 text-[10px] items-center justify-center text-white font-bold">!</span>
            </span>
          )}
          <img 
            src="/assets/robot.png" 
            alt="Robot AI" 
            className="w-full h-full object-contain"
          />
        </button>
      )}
    </div>
    </>
  );
};

export default Chatbot;
