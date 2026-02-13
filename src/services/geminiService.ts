import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

// Función para el Chatbot General que llama a la Cloud Function
export const chatWithExpert = async (history: any[], message: string) => {
  const chatFunction = httpsCallable(functions, 'chatWithExpert');
  try {
    const result: any = await chatFunction({ history, message });
    return result.data.response;
  } catch (error) {
    console.error("Error al llamar a la Cloud Function 'chatWithExpert':", error);
    return "Lo siento, estoy teniendo problemas para conectarme con mi cerebro. Por favor, inténtalo de nuevo más tarde.";
  }
};

// Función de Auditoría que llama a la Cloud Function
export const runAudit = async (files: { name: string; content: string }[], onProgress: (progress: number, message: string) => void) => {
  onProgress(10, "Estableciendo conexión segura con el servidor de auditoría...");
  const auditFunction = httpsCallable(functions, 'runAudit');
  
  try {
    onProgress(30, "Enviando documentos al servidor para triangulación 3D...");
    const result: any = await auditFunction({ files });
    onProgress(100, "Auditoría completada.");
    return result.data.response;
  } catch (error) {
    console.error("Error al llamar a la Cloud Function 'runAudit':", error);
    throw new Error("La auditoría no pudo completarse debido a un error de comunicación con el servidor.");
  }
};
