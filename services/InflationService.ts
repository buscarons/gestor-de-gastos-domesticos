import { supabase } from './supabaseClient';
import { MONTHS } from "../types";

// Configuration for Uruguay Open Data (CKAN API)
const API_CONFIG = {
  BASE_URL: 'https://catalogodatos.gub.uy/api/3/action/datastore_search',
  // This is a common Resource ID for IPC General Index. 
  // NOTE: This ID might change if INE publishes a new dataset. 
  // We use a robust fallback if this fails.
  RESOURCE_ID: '8e207908-1175-4c07-9e0c-352227d894e7',
  limit: 100
};

// MOCK DATA (Fallback) - 2025 Estimates
const MOCK_INFLATION_2025 = [0.52, 0.48, 0.60, 0.45, 0.38, 0.41, 0.55, 0.49, 0.62, 0.50, 0.45, 0.40];

export interface InflationRecord {
  year: number;
  month: number;
  indexValue: number;
  monthlyVariation: number;
}

export const InflationService = {

  /**
   * Obtiene la estimación o dato real de inflación por mes.
   * Estrategia "Cache-First":
   * 1. Consulta Supabase.
   * 2. Si faltan datos del año actual, consulta API INE.
   * 3. Retorna array de 12 números (indices de variación mensual, e.g., 0.5).
   */
  getMonthlyInflation: async (year: number): Promise<number[]> => {
    try {
      // 1. Check DB Cache
      const { data: cached, error } = await supabase
        .from('inflation_data')
        .select('*')
        .eq('year', year)
        .order('month', { ascending: true });

      if (!error && cached && cached.length > 0) {
        // Check if we have data for "current month - 1" (since inflation is previous month)
        const currentMonth = new Date().getMonth() + 1; // 1-12
        const hasRecentData = cached.some(r => r.month === currentMonth - 1) || cached.length === 12;

        if (hasRecentData || year < new Date().getFullYear()) {
          // Fill array with DB data, fallback to 0 or mock for missing future months
          return mapCacheToRates(cached, year);
        }
      }

      // 2. Fetch from External API if cache is incomplete for current year
      console.info(`Fetching Fresh Inflation Data for ${year}...`);
      const freshData = await fetchFromOpenDataAPI(year);

      if (freshData.length > 0) {
        // 3. Save to Supabase (Background)
        await saveToCache(freshData);
        // Return fresh combined with cache
        return mapCacheToRates(freshData, year);
      }

      // Fallback
      return MOCK_INFLATION_2025;

    } catch (e) {
      console.warn("Error fetching inflation data, using fallback", e);
      return MOCK_INFLATION_2025;
    }
  }
};

// --- HELPERS ---

// Map database records to the simple number[] array format expected by the app
const mapCacheToRates = (records: any[], year: number): number[] => {
  const rates = Array(12).fill(0);
  // If no records, maybe return default?
  if (records.length === 0) return year === 2025 ? MOCK_INFLATION_2025 : rates;

  records.forEach(r => {
    // month is 1-12, array is 0-11
    if (r.month >= 1 && r.month <= 12) {
      rates[r.month - 1] = Number(r.monthly_variation) || 0;
    }
  });

  // For future months in current year that are 0, we could fill with valid averages if desired,
  // but for now 0 or the Mock fallback for those specific months might be safer logic if needed.
  // Simple approach: Mix properties using Mock for zeros if it's 2025?
  if (year === 2025) {
    return rates.map((r, i) => r === 0 ? MOCK_INFLATION_2025[i] : r);
  }

  return rates;
};

// Fetch from catalogodatos.gub.uy
// Note: CKAN APIs are powerful but datasets vary in column names.
// We implement a generic search for "IPC" rows.
const fetchFromOpenDataAPI = async (year: number): Promise<any[]> => {
  try {
    // CORS Hack: Skip external API on localhost to avoid console spam (since proxy only works on Netlify)
    // But in production (Netlify), use the proxy.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.warn("Skipping Open Data API on localhost. Using fallback/cache.");
      return [];
    }

    // Use relative path - Netlify will proxy this to the real API
    const url = "/api/inflation";
    // const url = `${API_CONFIG.BASE_URL}?resource_id=${API_CONFIG.RESOURCE_ID}&q=IPC`; 

    const res = await fetch(url);
    if (!res.ok) throw new Error("API Network Error");

    const json = await res.json();
    if (!json.success || !json.result || !json.result.records) return [];

    const records = json.result.records;
    // PARSING LOGIC: Depends on the specific CSV structure of the resource.
    // Usually columns: "Fecha", "Indice", "Variación Mensual"
    // We need to handle DD/MM/YYYY or YYYY-MM

    const parsed: any[] = [];

    records.forEach((record: any) => {
      // Try to identify Date
      // Example Date formats: "2025-01-31", "31/01/2025"
      const dateStr = record['Fecha'] || record['Mes'] || record['Periodo'];
      if (!dateStr) return;

      // Parse date
      let recYear = 0;
      let recMonth = 0;

      if (dateStr.includes('/')) {
        const parts = dateStr.split('/'); // 31/01/2025
        if (parts.length === 3) {
          recYear = parseInt(parts[2]);
          recMonth = parseInt(parts[1]);
        }
      } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-'); // 2025-01-31
        if (parts.length === 3) {
          recYear = parseInt(parts[0]);
          recMonth = parseInt(parts[1]);
        }
      }

      if (recYear === year) {
        const variation = parseFloat(record['Variacion Mensual'] || record['Var. Mensual'] || '0');
        const indexVal = parseFloat(record['Indice'] || record['Valor'] || '0');

        parsed.push({
          year: recYear,
          month: recMonth,
          monthly_variation: variation,
          index_value: indexVal
        });
      }
    });

    return parsed;
  } catch (e) {
    console.error("Failed to fetch from Open Data API", e);
    return [];
  }
};

const saveToCache = async (records: any[]) => {
  if (records.length === 0) return;

  // We use the authenticated user (or anon) to perform the insert.
  // RLS checks will pass for authenticated users.

  const formatted = records.map(r => ({
    year: r.year,
    month: r.month,
    index_value: r.index_value,
    monthly_variation: r.monthly_variation,
    // conflict handling managed by unique constraint in SQL
  }));

  const { error } = await supabase
    .from('inflation_data')
    .upsert(formatted, { onConflict: 'year,month' });

  if (error) console.error("Error updating inflation cache", error);
};

// Export calculation helpers (unchanged)
export const calculateRealValue = (nominalAmount: number, accumulatedInflationPercentage: number): number => {
  if (accumulatedInflationPercentage === 0) return nominalAmount;
  return nominalAmount / (1 + (accumulatedInflationPercentage / 100));
};

export const calculatePresentValue = (pastAmount: number, fromMonthIdx: number, currentMonthIdx: number, rates: number[]): number => {
  if (fromMonthIdx >= currentMonthIdx) return pastAmount;
  let multiplier = 1;
  for (let i = fromMonthIdx + 1; i <= currentMonthIdx; i++) {
    const rate = rates[i] || 0;
    multiplier *= (1 + rate / 100);
  }
  return pastAmount * multiplier;
};

export const getCumulativeInflation = (monthlyRates: number[], startMonthIdx: number, targetMonthIdx: number): number => {
  let multiplier = 1;
  for (let i = startMonthIdx; i <= targetMonthIdx; i++) {
    const rate = monthlyRates[i] || 0;
    multiplier *= (1 + rate / 100);
  }
  return (multiplier - 1) * 100;
};