
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
  pedimento: FileContent | null, 
  invoices?: FileContent[], 
  originCert?: FileContent | null,
  cove?: FileContent | null
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isOnlyCert = !pedimento && !!originCert;

  const systemInstruction = isOnlyCert 
    ? `Eres el "Auditor Especialista T-MEC". Revisa el Certificado de Origen conforme al Anexo 5-A de las Reglas del T-MEC.`
    : `Eres el "AUDITOR SENIOR LÍDER de SpaceAduanas", experto en Anexo 22 y Ley Aduanera Mexicana.
       
       MISION: Ejecutar una TRIANGULACIÓN 3D EXHAUSTIVA (Pedimento vs Factura vs COVE).
       
       REGLA DE CARACTERES ESPECIALES (CRÍTICA):
       - El campo 'partida' NUNCA debe contener caracteres especiales como: */-!"#$%&/()?¡¨*ñ Ñ[[_
       - Si detectas CUALQUIER carácter de estos en el número de partida, marca el estatus como 'error' con la descripción "Detección de caracteres no permitidos en campo partida".

       BARRIDO COMPLETO DE PARTIDAS:
       - Identifica TODAS las partidas detectadas.
       - Por cada partida (1, 2, 3...):
         1. FRACCIÓN ARANCELARIA: Cruza vs Certificado de Origen.
         2. UMC y CANTIDAD: Clave '6' (PZA) vs Factura.
         3. VALOR COMERCIAL: Cruza Valor Unitario y Total.

       REGLAS DE ESTATUS:
       - 'correct' si el match es perfecto.
       - 'error' si hay discrepancias o caracteres prohibidos.

       REGLAS DE REPORTE:
       - 'correctValue' formato: "FRACCIÓN | CANTIDAD UMC | VALOR COMERCIAL"
       - Ahorro Space: Mínimo $2,600 MXN si es 'correct'. 0 si es 'error'.`;

  const parts: any[] = [];
  
  if (pedimento) {
    parts.push({ text: "DOCUMENTO: PEDIMENTO" });
    parts.push({ inlineData: { mimeType: pedimento.mimeType, data: pedimento.data } });
  }
  
  if (invoices && invoices.length > 0) {
    invoices.forEach((inv, i) => {
      parts.push({ text: `DOCUMENTO: FACTURA/EVIDENCIA ${i + 1}` });
      parts.push({ inlineData: { mimeType: inv.mimeType, data: inv.data } });
    });
  }
  
  if (cove) {
    parts.push({ text: "DOCUMENTO: COVE" });
    parts.push({ inlineData: { mimeType: cove.mimeType, data: cove.data } });
  }
  
  if (originCert) {
    parts.push({ text: "DOCUMENTO: CERTIFICADO DE ORIGEN" });
    parts.push({ inlineData: { mimeType: originCert.mimeType, data: originCert.data } });
  }

  parts.push({ text: "Analiza exhaustivamente. Revisa caracteres especiales en partidas. Responde solo JSON." });

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
            pedimentoNumber: { type: Type.STRING },
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
