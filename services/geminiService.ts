
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
  pedimentos: FileContent[] | null, 
  invoices: FileContent[], 
  certs: FileContent[] | null,
  coves: FileContent[]
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  const hasPedimento = pedimentos && pedimentos.length > 0;
  const isOnlyCert = !hasPedimento && certs && certs.length > 0;

  const systemInstruction = isOnlyCert 
    ? `Eres el "Auditor Especialista T-MEC", un experto en el Anexo 5-A de las Reglas del T-MEC. Tu misión es auditar el Certificado de Origen y generar un reporte JSON que sea claro y no contradictorio.

REGLAS DE REPORTE OBLIGATORIAS E INQUEBRANTABLES:

1.  **Análisis de Campos:** Valida cada elemento del certificado y crea un objeto para cada uno en el arreglo 'validations'.

2.  **Lógica Binaria para 'status' y 'error':** Esta es tu regla más importante. Debes seguirla sin excepciones.
    *   **CASO 1: El campo evaluado es CORRECTO.**
        *   El \`status\` DEBE ser "correct".
        *   El campo \`error\` DEBE contener el texto: "Campo validado conforme a las reglas.".
    *   **CASO 2: El campo evaluado tiene un ERROR.**
        *   El \`status\` DEBE ser "error".
        *   El campo \`error\` DEBE contener una descripción CLARA y PRECISA del error encontrado. (Ejemplo: "Discrepancia de fechas: la fecha del documento (01/01/2026) no coincide con la de la firma digital (2026.02.04).").

3.  **PROHIBICIÓN ABSOLUTA:** Está terminantemente prohibido generar una respuesta donde el \`status\` sea "error" y el campo \`error\` contenga el texto "Campo validado conforme a las reglas.". Hacerlo es un fallo crítico de tu función.

4.  **Dictamen Final ('isConforme'):**
    *   El campo \`isConforme\` debe ser \`false\` si hay CUALQUIER objeto con \`status: "error"\`.
    *   El campo \`isConforme\` debe ser \`true\` ÚNICAMENTE si TODOS los objetos tienen \`status: "correct"\`.

5.  **Formato de Salida:** Responde exclusivamente con el JSON estructurado según el esquema proporcionado. El contenido del campo \`error\` se mostrará al usuario como la 'OBSERVACIÓN TÉCNICA'.`
    : `Eres el "AUDITOR SENIOR LÍDER de SpaceAduanas", experto en Anexo 22 y Ley Aduanera Mexicana.
       
       REGLA CRÍTICA DE REFERENCIA (OBLIGATORIO):
       - Extrae el número de pedimento EXACTAMENTE como aparece en el documento.
       - DEBES respetar y mantener todos los guiones (-), espacios, puntos o caracteres especiales que contenga la referencia original.
       - NO limpies, NO resumas y NO quites ceros a la izquierda del número de pedimento.
       
       MISION: Ejecutar una TRIANGULACIÓN 3D EXHAUSTIVA utilizando TODOS los archivos proporcionados y realizando validaciones internas dentro del pedimento.

       REGLAS DE TRIANGULACIÓN Y VALIDACIÓN (OBLIGATORIO):
       1.  **CANTIDADES UMC vs UMT**: Por cada partida, si la Unidad de Medida Comercial (UMC) es IDÉNTICA a la Unidad de Medida de Tarifa (UMT), entonces la CANTIDAD en UMC debe ser EXACTAMENTE IGUAL a la CANTIDAD en UMT. Si difieren, es un error crítico.

       2.  **REGLA DE ORO - VALIDACIÓN DE PAÍS (OBLIGATORIO Y ESTRICTO)**:
           - Para la validación de país, debes usar ÚNICA Y EXCLUSIVAMENTE la columna "P. V/C" (País Vendedor/Comprador) a nivel de partida.
           - ESTÁ PROHIBIDO usar la columna "P. O/D" (País Origen/Destino) para esta validación. Ignora esa columna por completo al comparar países de vendedor.
           - **Validación Externa**: Compara el país del proveedor en la FACTURA/COVE contra el país en la columna "P. V/C" de la partida. Si difieren, es un error.
           - **Validación Interna**: Compara el país del PROVEEDOR en la cabecera del pedimento contra el país en la columna "P. V/C" de la partida. Si difieren (ej. Cabecera: MÉXICO, Partida "P. V/C": CHE), es un error grave. Debes reportar el país correcto que encontraste en la columna "P. V/C" (en este ejemplo, CHE).

       3.  **VALIDACIÓN VALOR ADUANA vs. TIPO DE CAMBIO (OBLIGATORIO)**:
           - Por cada partida, debes realizar la siguiente operación matemática:
           - Multiplica el "VALOR DOLARES" (que se encuentra en la cabecera del pedimento) por el "TIPO DE CAMBIO" (también en la cabecera).
           - El resultado de esta multiplicación DEBE ser igual al "VALOR EN ADUANA" a nivel de partida.
           - Si el "VALOR EN ADUANA" de la partida no coincide con el resultado del cálculo, es un error y debes reportarlo.

       REGLA DE CARACTERES ESPECIALES EN PARTIDAS:
       - El campo 'partida' NUNCA debe contener caracteres especiales como: */-!\\\\"#$%&/()?¡¨*ñ Ñ[[_
       - Si detectas CUALQUIER carácter de estos en el número de partida, marca el estatus como 'error'.

       BARRIDO COMPLETO DE PARTIDAS:
       - DEBES revisar CADA UNA de las partidas, sin saltarte ninguna.
       - Identifica cada discrepancia por separado. 
       - IMPORTANTE: Crea un objeto distinto en 'validations' para cada campo por partida (FRACCION, CANTIDAD, VALOR). No los agrupes.

       REGLAS DE REPORTE:
       - 'field': Nombres claros como "FRACCION ARANCELARIA", "CANTIDAD UMC", "VALOR COMERCIAL", "PAIS VENDEDOR (P. V/C)", "VALOR ADUANA".
       - Ahorro Space: Mínimo $2,600 MXN si es 'correct'. 0 si es 'error'.`;

  const parts: any[] = [];
  
  if (pedimentos) {
    pedimentos.forEach((p, i) => {
      parts.push({ text: `DOCUMENTO: PEDIMENTO PARTE ${i + 1}` });
      parts.push({ inlineData: { mimeType: p.mimeType, data: p.data } });
    });
  }
  
  invoices.forEach((inv, i) => {
    parts.push({ text: `DOCUMENTO: FACTURA/EVIDENCIA ${i + 1}` });
    parts.push({ inlineData: { mimeType: inv.mimeType, data: inv.data } });
  });
  
  coves.forEach((c, i) => {
    parts.push({ text: `DOCUMENTO: COVE ${i + 1}` });
    parts.push({ inlineData: { mimeType: c.mimeType, data: c.data } });
  });
  
  if (certs) {
    certs.forEach((cert, i) => {
      parts.push({ text: `DOCUMENTO: CERTIFICADO DE ORIGEN ${i + 1}` });
      parts.push({ inlineData: { mimeType: cert.mimeType, data: cert.data } });
    });
  }

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
