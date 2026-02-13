
import { GoogleGenAI, Type } from "@google/genai";
import { PedimentoError, FileContent } from "../types";

/**
 * Utilidad para limpiar la respuesta de la IA y asegurar que sea un JSON válido.
 */
const cleanJsonResponse = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.trim();
  const firstBracket = cleaned.indexOf('{');
  const lastBracket = cleaned.lastIndexOf('}');
  
  if (firstBracket !== -1 && lastBracket !== -1) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }
  
  cleaned = cleaned.replace(/^```json/i, "").replace(/```$/, "").trim();
  return cleaned;
};

export const analyzePedimento = async (
  pedimentos: FileContent[], 
  invoices: FileContent[], 
  certs: FileContent[],
  coves: FileContent[]
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  const hasPedimento = pedimentos.length > 0;
  const isOnlyCert = !hasPedimento && certs.length > 0;

  const systemInstruction = isOnlyCert 
    ? `Eres el "Auditor Especialista T-MEC". Revisa los Certificados de Origen proporcionados conforme al Anexo 5-A de las Reglas del T-MEC.`
    : `Eres el "AUDITOR SENIOR LÍDER de SpaceAduanas", experto en Anexo 22 y Ley Aduanera Mexicana.
       
       REGLA CRÍTICA DE REFERENCIA (OBLIGATORIO):
       - Extrae el número de pedimento EXACTAMENTE como aparece en el documento.
       - DEBES respetar y mantener todos los guiones (-), espacios, puntos o caracteres especiales que contenga la referencia original.
       - NO limpies, NO resumas y NO quites ceros a la izquierda del número de pedimento.
       
       MISION: Ejecutar una TRIANGULACIÓN 3D EXHAUSTIVA utilizando TODOS los archivos proporcionados (Pedimentos, Facturas, COVEs y Certificados).
       
       REGLA DE CARACTERES ESPECIALES EN PARTIDAS:
       - El campo 'partida' NUNCA debe contener caracteres especiales como: */-!"#$%&/()?¡¨*ñ Ñ[[_
       - Si detectas CUALQUIER carácter de estos en el número de partida, marca el estatus como 'error'.

       BARRIDO COMPLETO DE PARTIDAS:
       - Identifica cada discrepancia por separado. 
       - IMPORTANTE: Crea un objeto distinto en 'validations' para cada campo por partida (FRACCION, CANTIDAD, VALOR). No los agrupes.

       REGLAS DE REPORTE:
       - 'field': Nombres claros como "FRACCION ARANCELARIA", "CANTIDAD UMC", "VALOR COMERCIAL".
       - Ahorro Space: Mínimo $2,600 MXN si es 'correct'. 0 si es 'error'.`;

  const parts: any[] = [];
  
  pedimentos.forEach((p, i) => {
    parts.push({ text: `DOCUMENTO: PEDIMENTO PARTE ${i + 1}` });
    parts.push({ inlineData: { mimeType: p.mimeType, data: p.data } });
  });
  
  invoices.forEach((inv, i) => {
    parts.push({ text: `DOCUMENTO: FACTURA/EVIDENCIA ${i + 1}` });
    parts.push({ inlineData: { mimeType: inv.mimeType, data: inv.data } });
  });
  
  coves.forEach((c, i) => {
    parts.push({ text: `DOCUMENTO: COVE ${i + 1}` });
    parts.push({ inlineData: { mimeType: c.mimeType, data: c.data } });
  });
  
  certs.forEach((cert, i) => {
    parts.push({ text: `DOCUMENTO: CERTIFICADO DE ORIGEN ${i + 1}` });
    parts.push({ inlineData: { mimeType: cert.mimeType, data: cert.data } });
  });

  parts.push({ text: "Analiza exhaustivamente todo el set de archivos. Extrae el número de pedimento respetando guiones. Responde solo JSON." });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pedimentoNumber: { 
              type: Type.STRING,
              description: "Número de pedimento tal cual aparece en el documento, respetando guiones y formato."
            },
            validations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  field: { type: Type.STRING },
                  partida: { type: Type.STRING },
                  error: { type: Type.STRING },
                  correctValue: { type: Type.STRING },
                  status: { type: Type.STRING },
                  potentialFine: { type: Type.STRING },
                  savings: { type: Type.STRING }
                },
                required: ["field", "partida", "error", "status", "potentialFine", "savings"]
              }
            },
            isConforme: { type: Type.BOOLEAN },
            recommendations: { type: Type.STRING },
            totalSavings: { type: Type.STRING },
            totalRisk: { type: Type.STRING }
          },
          required: ["pedimentoNumber", "validations", "isConforme", "totalSavings", "totalRisk"]
        }
      }
    });

    const cleanedText = cleanJsonResponse(response.text || "{}");
    return JSON.parse(cleanedText);
  } catch (e: any) {
    throw new Error(`AI Error: ${e.message}`);
  }
};

export const chatWithExpert = async (history: any[], message: string) => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    history,
    config: { 
        systemInstruction: "Eres el consultor senior de SpaceAduanas. Ayuda al usuario con dudas técnicas de comercio exterior basándote en la normativa mexicana y el Anexo 22."
    }
  });
  const response = await chat.sendMessage({ message });
  return response.text;
};
