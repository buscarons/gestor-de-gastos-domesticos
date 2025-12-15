import { MONTHS } from "../types";

// Configuration for Future API Integration
const API_CONFIG = {
  USE_REAL_API: false, // Change to true when backend/proxy is ready
  BASE_URL: 'https://catalogodatos.gub.uy/api/3/action/datastore_search',
  RESOURCE_ID: 'YOUR_IPC_RESOURCE_ID_HERE'
};

// Interface for the API response structure (based on typical Open Data formats)
export interface IPCDataPoint {
  date: string; // YYYY-MM
  index: number; // The IPC Index value
  monthlyVariation: number; // Percentage (e.g., 0.5 for 0.5%)
}

// MOCK DATA: Estimated monthly inflation for Uruguay 2025 (approx 0.4% - 0.6% avg)
const MOCK_INFLATION_2025 = [
  0.52, // Ene
  0.48, // Feb
  0.60, // Mar
  0.45, // Abr
  0.38, // May
  0.41, // Jun
  0.55, // Jul
  0.49, // Ago
  0.62, // Sep
  0.50, // Oct
  0.45, // Nov
  0.40  // Dic (Projected)
];

/**
 * INTEGRACIÓN CON API DEL INE / DATOS ABIERTOS
 * 
 * Future-Proofing:
 * Cuando tengas una API real, cambia API_CONFIG.USE_REAL_API a true e implementa el fetch
 * en el bloque 'if' correspondiente.
 */
export const fetchMonthlyInflation = async (year: number): Promise<number[]> => {
  if (API_CONFIG.USE_REAL_API) {
    try {
      // Example implementation pattern:
      // const response = await fetch(`${API_CONFIG.BASE_URL}?resource_id=${API_CONFIG.RESOURCE_ID}&q=${year}`);
      // const data = await response.json();
      // return processApiData(data);
      console.log("Fetching from Real API...");
      return MOCK_INFLATION_2025; // Fallback for now
    } catch (e) {
      console.error("API Error", e);
      return MOCK_INFLATION_2025;
    }
  }

  // Default: Return Mock Data
  return new Promise((resolve) => {
    resolve(MOCK_INFLATION_2025);
  });
};

/**
 * Calculates the 'Real Value' of an amount at a future month, discounting accumulated inflation.
 * Formula: Real = Nominal / (1 + AccumulatedInflationRate)
 * Used for projecting FUTURE value back to today (discounting).
 */
export const calculateRealValue = (nominalAmount: number, accumulatedInflationPercentage: number): number => {
  if (accumulatedInflationPercentage === 0) return nominalAmount;
  return nominalAmount / (1 + (accumulatedInflationPercentage / 100));
};

/**
 * Calculates the 'Present Value' of a PAST amount, adjusting it for inflation up to now.
 * Used for bringing historical prices to today's purchasing power.
 * Formula: Present = PastAmount * Product(1 + MonthlyRate) for all months between then and now.
 */
export const calculatePresentValue = (pastAmount: number, fromMonthIdx: number, currentMonthIdx: number, rates: number[]): number => {
  if (fromMonthIdx >= currentMonthIdx) return pastAmount;
  
  let multiplier = 1;
  // We apply inflation from the month AFTER the purchase up to the current month
  // e.g. Purchase in Jan (Idx 0). Current is Mar (Idx 2).
  // Value adjusts by Feb inflation and Mar inflation.
  for (let i = fromMonthIdx + 1; i <= currentMonthIdx; i++) {
    const rate = rates[i] || 0;
    multiplier *= (1 + rate / 100);
  }
  
  return pastAmount * multiplier;
};

/**
 * Calculates the cumulative inflation from startMonth up to targetMonth.
 * Useful to adjust "Day 1" money to "Current Month" purchasing power.
 */
export const getCumulativeInflation = (monthlyRates: number[], startMonthIdx: number, targetMonthIdx: number): number => {
  let multiplier = 1;
  
  for (let i = startMonthIdx; i <= targetMonthIdx; i++) {
    const rate = monthlyRates[i] || 0;
    multiplier *= (1 + rate / 100);
  }
  
  // Return percentage increase (e.g., 1.05 -> 5%)
  return (multiplier - 1) * 100;
};