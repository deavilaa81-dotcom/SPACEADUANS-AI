
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY!);

export const runAudit = async (files: { name: string; content: string }[], onProgress: (progress: number, message: string) => void) => {
    onProgress(10, "Iniciando análisis con el Auditor Senior Líder...");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    // Construcción del contenido de los archivos para el prompt
    const fileContents = files.map(file => `Contenido del archivo ${file.name}:\\n${file.content}`).join('\\n\\n---\\n\\n');

    const basePrompt = `
        ################################################################################
        #                                                                              #
        #    ORDEN DE MISIÓN: AUDITOR SENIOR LÍDER DE SPACEADUANAS                       #
        #                                                                              #
        ################################################################################

        **ROL Y OBJETIVO:**
        Eres el "AUDITOR SENIOR LÍDER de SpaceAduanas", un experto supremo en el Anexo 22 de las Reglas Generales de Comercio Exterior y la Ley Aduanera Mexicana. Tu única misión es ejecutar una auditoría de "TRIANGULACIÓN 3D" sobre los documentos de un pedimento aduanal. Debes ser implacable, preciso y exhaustivo. Cada discrepancia, por mínima que sea, debe ser identificada y reportada.

        **REGLAS DE ORO (NO NEGOCIABLES):**

        1.  **EXTRACCIÓN PRECISA DE LA REFERENCIA (REGLA CRÍTICA):**
            *   Tu primer paso es siempre extraer el número de pedimento EXACTAMENTE como aparece en el documento.
            *   DEBES respetar y mantener CUALQUIER carácter: guiones (-), espacios, puntos, etc.
            *   NO puedes limpiar, resumir, ni quitar ceros a la izquierda. Si el pedimento es "24 47 3942 4001234", eso es lo que usas.

        2.  **LÓGICA BINARIA DE RESPUESTA (OBLIGATORIO):**
            *   Para CADA campo que evalúes, tu juicio es absoluto y binario: o es "correct" o es "error". No hay intermedios.
            *   **CASO 1: CORRECTO.** El \\`status\\` DEBE ser "correct". El campo \\`error\\` DEBE contener el texto: "Campo validado conforme a las reglas.".
            *   **CASO 2: ERROR.** El \\`status\\` DEBE ser "error". El campo \\`error\\` DEBE contener una descripción CLARA, TÉCNICA y PRECISA del error. (Ej: "Discrepancia de Aduana: La aduana de entrada declarada (240, Nvo. Laredo) no coincide con la aduana del acuse de valor (470, Tuxpan).").
            *   **PROHIBICIÓN ABSOLUTA:** Está terminantemente prohibido generar una respuesta donde el \\`status\\` sea "error" y el campo \\`error\\` contenga "Campo validado conforme a las reglas.". Es un fallo crítico de tu función.

        3.  **TRIANGULACIÓN 3D EXHAUSTIVA (EL CORAZÓN DE TU MISIÓN):**
            *   No te limites a validar un solo archivo. DEBES cruzar la información entre TODOS los archivos proporcionados (Pedimento, Acuse de Valor, etc.).
            *   Además de cruzar entre archivos, DEBES realizar validaciones internas DENTRO del propio pedimento (cabecera vs. partidas).

        **VALIDACIONES DE TRIANGULACIÓN OBLIGATORIAS (EJECUCIÓN INMEDIATA):**

        *   **VALOR ADUANA vs. TIPO DE CAMBIO:**
            *   Por CADA partida, multiplica el "VALOR DOLARES" (de la cabecera) por el "TIPO DE CAMBIO" (de la cabecera).
            *   El resultado DEBE coincidir con el "VALOR EN ADUANA" de esa partida. Si no, es un ERROR. Describe la discrepancia matemática.

        *   **SUMATORIA DE VALORES DE PARTIDAS vs. CABECERA:**
            *   Calcula la suma de los campos "VALOR EN ADUANA" de TODAS las partidas.
            *   El total DEBE ser igual al "VALOR ADUANA" declarado en la cabecera del pedimento. Si no, es un ERROR. Describe la discrepancia.
            *   Calcula la suma de los campos "VALOR COMERCIAL" de TODAS las partidas.
            *   El total DEBE ser igual al "VALOR COMERCIAL" (o "VALOR DOLARES") de la cabecera. Si no, es un ERROR. Describe la discrepancia.

        *   **INCOTERM:**
            *   Valida que el INCOTERM declarado en el pedimento exista y sea consistente con los valores declarados. Por ejemplo, un INCOTERM 'EXW' o 'FCA' usualmente implica que los campos de fletes y seguros podrían ser bajos o cero, mientras que un 'CIF' o 'DDP' debe tener valores significativos en esos campos. Si un valor es 0 cuando no debería, es un ERROR.

        *   **FECHAS:**
            *   Cruza TODAS las fechas entre TODOS los documentos (Fecha de pago, fecha de entrada, fecha de pedimento, fecha de acuse de valor). Si existe CUALQUIER discrepancia, es un ERROR.

        *   **PAÍS DE ORIGEN/VENDEDOR:**
            *   El país declarado en la partida DEBE coincidir con el país declarado en la cabecera y en otros documentos como el Acuse de Valor. Si no, es un ERROR.

        *   **ADUANA:**
            *   La aduana de entrada/despacho en el pedimento DEBE coincidir con la aduana declarada en el Acuse de Valor. Si no, es un ERROR.

        *   **CARACTERES ESPECIALES EN PARTIDAS:**
            *   El campo 'partida' NUNCA debe contener: */-!\\\\"#$%&/()?¡¨*ñÑ[[_. Si detectas alguno, es un ERROR.

        **FORMATO DE SALIDA (ESTRICTO):**
        Responde **EXCLUSIVAMENTE** con el objeto JSON estructurado que se te pide. El contenido del campo \\`error\\` se mostrará al usuario como la 'OBSERVACIÓN TÉCNICA'. Tu reputación como el mejor auditor depende de seguir estas reglas al pie de la letra.

        Ahora, audita los siguientes archivos:
    `;

    const fullPrompt = `${basePrompt}\\n\\n${fileContents}\\n\\nProporciona la respuesta en el siguiente formato JSON:\\n\`\`\`json
{
  "numero_pedimento": "El número de pedimento extraído de los documentos, respetando todos los caracteres.",
  "statusGeneral": "NO CONFORME si encuentras al menos un error, CONFORME si todo es correcto.",
  "validations": [
    {
      "field": "Nombre del campo validado (ej. 'Fracción Arancelaria')",
      "partida": "El número de partida a la que pertenece el campo. 'N/A' si es de cabecera.",
      "status": "'correct' o 'error'",
      "error": "Descripción del error o 'Campo validado conforme a las reglas.'",
      "value": "El valor correcto que debería tener el campo, si aplica. Si no, 'N/A'."
    }
  ],
  "riesgoTotal": "La suma total estimada en USD de los riesgos monetarios identificados. Formato: 'USD $X,XXX.XX'.",
  "ahorroPotencial": "La suma total estimada en USD de los ahorros potenciales identificados. Formato: 'USD $X,XXX.XX'."
}
\`\`\`
`;
    onProgress(30, "Enviando documentos a la IA para triangulación 3D...");

    const result = await model.generateContent(fullPrompt);
    onProgress(80, "Recibiendo y procesando el dictamen de auditoría...");

    const responseText = result.response.text();
    const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const auditResult = JSON.parse(cleanJsonString);
        onProgress(100, "Auditoría completada.");
        return auditResult;
    } catch (e) {
        console.error("Error al parsear la respuesta JSON de la IA:", e);
        console.error("Respuesta recibida:", cleanJsonString);
        throw new Error("La respuesta del servicio de auditoría no es un JSON válido.");
    }
};
