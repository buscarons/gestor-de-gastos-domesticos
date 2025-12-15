import { GoogleGenAI } from "@google/genai";
import { ExpenseItem, MONTHS, STANDARD_CATEGORIES } from "../types";



// --- NEW FUNCTIONALITY: SMART IMPORT ---

export interface ParsedExpense {
  name: string;
  category: string;
  amount: number;
  monthIndex: number | null; // null if not specified in text
}

export const parseExpensesFromText = async (text: string, defaultMonthIndex: number, currentYear: number, validStartMonthIndex: number): Promise<ParsedExpense[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
    Analiza el siguiente texto y extrae una lista de gastos.
    Texto del usuario: "${text}"

    Contexto:
    - Año actual: ${currentYear}
    - Mes por defecto (si no se especifica uno en el texto): ${MONTHS[defaultMonthIndex]} (Index: ${defaultMonthIndex})
    - Mes de INICIO de registros válidos: ${MONTHS[validStartMonthIndex]} (Index: ${validStartMonthIndex}).
    - Categorías permitidas: ${JSON.stringify(STANDARD_CATEGORIES)}

    Instrucciones:
    1. Identifica el concepto, el monto y el mes.
    2. Asigna una de las 'Categorías permitidas' basándote en el concepto.
    3. Si el texto menciona explícitamente un mes (ej. "gasto de enero", "luz de febrero"), usa el índice de ese mes (0 para Enero, 11 para Diciembre).
    4. IMPORTANTE: Si un gasto cae en un mes anterior al "Mes de INICIO" (${MONTHS[validStartMonthIndex]}), **IGNÓRALO** y no lo incluyas en la lista.
    5. Si NO menciona mes, usa el 'Mes por defecto'. Si el 'Mes por defecto' es anterior al inicio, ignora el gasto también.
    6. Devuelve null en 'monthIndex' si no logras determinar el mes, pero trata de asignarlo al 'Mes por defecto' si es posible.
    7. Devuelve SOLO un JSON array.

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