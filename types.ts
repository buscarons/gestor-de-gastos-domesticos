
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date?: string;
  // New fields for detailed product tracking
  productId?: string;
  unitPrice?: number;
  quantity?: number;
}

export interface ProductTag {
  id: string;
  name: string;
  emoji: string;
}

export interface Product {
  id: string;
  name: string;
  defaultPrice: number;
  image?: string; // Base64 string of the image
  tagId: string;
}

export interface ExpenseItem {
  id: string;
  year: number;     // New field for multi-year support
  category: string; // e.g., "Servicios", "Salud", "Supermercado"
  name: string;     // e.g., "UTE", "CASMU Israel"
  amounts: number[]; // Array of 12 numbers (Jan-Dec)
  transactions?: Record<number, Transaction[]>; // Map of month index to transactions
}

export interface IncomeItem {
  id: string;
  year: number;
  category: string; // e.g., "Ingreso Fijo", "Ingreso Extra"
  name: string;     // e.g., "Sueldo Titular", "Aguinaldo"
  amounts: number[];
}

export interface YearConfig {
  year: number;
  startMonthIndex: number; // 0 for Jan, 6 for July, etc.
}

export interface MonthlyTotal {
  month: string;
  total: number;
}

export interface CategoryTotal {
  name: string;
  value: number;
}

export type ViewState = 'dashboard' | 'entry' | 'products';

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Official categories matching the Glossary criteria
export const STANDARD_CATEGORIES = [
  "Servicios Básicos",
  "Impuestos / Vivienda",
  "Salud",
  "Gastos Variables"
];

export const STANDARD_INCOME_CATEGORIES = [
  "Ingreso Fijo",
  "Ingreso Extra",
  "Ahorro / Inversión"
];

// Define which categories support detailed transaction breakdowns
export const CATEGORIES_WITH_BREAKDOWN = [
  "Gastos Variables",
  "Supermercado",
  "Alimentación",
  "Farmacia",
  "Feria"
];
