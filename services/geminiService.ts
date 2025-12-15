import { GoogleGenAI } from "@google/genai";
import { ExpenseItem, MONTHS, STANDARD_CATEGORIES } from "../types";

const getSystemInstruction = () => `
Eres un asesor financiero experto y amigable especializado en economía doméstica de Uruguay.
Tu objetivo es analizar los datos de gastos E INGRESOS mensuales del usuario y proveer insights valiosos.

REGLA DE ANÁLISIS DE DATOS:
- El usuario te proporcionará una configuración que indica a partir de qué mes los datos son fiables.
- **IGNORA** los meses anteriores a ese punto de inicio para calcular promedios.
- Si ves ceros en meses anteriores al inicio configurado, asume que es falta de registro, no que el gasto fue cero.

Formato de respuesta:
1. Usa Markdown.
2. Sé conciso.
3. Habla en pesos uruguayos ($).
`;

export const analyzeExpenses = async (data: ExpenseItem[], question: string, configText?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Convert complex data structure to a readable string summary for the model
    const dataSummary = data.map(item => {
      const activeMonths = item.amounts.map((amt, idx) => `${MONTHS[idx]}: $${amt}`).join(', ');
      return `- ${item.category} / ${item.name}: [${activeMonths}]`;
    }).join('\n');

    const prompt = `
    Aquí están mis datos de GASTOS para el año seleccionado.
    CONFIGURACIÓN DE CONTEXTO: ${configText || 'Analiza todos los datos disponibles.'}
    
    Datos:
    ${dataSummary}

    Pregunta del usuario: ${question}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(),
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Lo siento, hubo un problema al conectar con el asistente financiero. Por favor verifica tu conexión o intenta más tarde.";
  }
};

// --- NEW FUNCTIONALITY: SMART IMPORT ---

export interface ParsedExpense {
  name: string;
  category: string;
  amount: number;
  monthIndex: number | null; // null if not specified in text
}

export const parseExpensesFromText = async (text: string, defaultMonthIndex: number, currentYear: number): Promise<ParsedExpense[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
    Analiza el siguiente texto y extrae una lista de gastos.
    Texto del usuario: "${text}"

    Contexto:
    - Año actual: ${currentYear}
    - Mes por defecto (si no se especifica uno en el texto): ${MONTHS[defaultMonthIndex]} (Index: ${defaultMonthIndex})
    - Categorías permitidas: ${JSON.stringify(STANDARD_CATEGORIES)}

    Instrucciones:
    1. Identifica el concepto, el monto y el mes.
    2. Asigna una de las 'Categorías permitidas' basándote en el concepto.
    3. Si el texto menciona explícitamente un mes (ej. "gasto de enero", "luz de febrero"), usa el índice de ese mes (0 para Enero, 11 para Diciembre).
    4. Si NO menciona mes, devuelve null en 'monthIndex'.
    5. Si hay moneda extranjera, ignórala o asume pesos si no es claro. Si dice USD, trata de estimar o déjalo en el número crudo pero prioriza Pesos Uruguayos.
    6. Devuelve SOLO un JSON array.

    Ejemplo de salida JSON:
    [
      { "name": "Supermercado", "category": "Gastos Variables", "amount": 1500, "monthIndex": 4 },
      { "name": "UTE", "category": "Servicios Básicos", "amount": 2500, "monthIndex": null }
    ]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed : [];

  } catch (error) {
    console.error("Error parsing expenses with Gemini:", error);
    throw new Error("No se pudo procesar el texto con IA.");
  }
};