import { ExpenseItem, IncomeItem, Product, ProductTag, YearConfig } from '../types';

// Storage Keys
const KEYS = {
  EXPENSES: 'expenses_v4_dynamic',
  INCOME: 'income_v4_dynamic',
  SAVINGS: 'savings_settings_v1',
  PRODUCTS: 'products_v2_images',
  TAGS: 'product_tags_v1',
  YEAR_CONFIG: 'year_configs_v1',
  SETUP: 'app_setup_completed_v1'
};

const DEFAULT_TAGS: ProductTag[] = [
  { id: '1', name: 'Comestibles', emoji: '🍞' },
  { id: '2', name: 'Limpieza', emoji: '🧹' },
  { id: '3', name: 'Bebidas', emoji: '🥤' },
  { id: '4', name: 'Carnicería', emoji: '🥩' },
];

/**
 * StorageService
 * 
 * Esta capa abstrae la lógica de persistencia.
 * ACTUALMENTE: Usa LocalStorage (Navegador).
 * FUTURO: Aquí es donde conectarías Firebase, Supabase o tu propia API 
 * sin tener que modificar el resto de la aplicación (App.tsx, etc).
 */
export const StorageService = {
  
  // --- SETUP ---
  getSetupStatus: (): boolean => {
    return localStorage.getItem(KEYS.SETUP) === 'true';
  },
  
  completeSetup: (): void => {
    localStorage.setItem(KEYS.SETUP, 'true');
  },

  // --- EXPENSES ---
  getExpenses: (): ExpenseItem[] => {
    const saved = localStorage.getItem(KEYS.EXPENSES);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Migration logic if needed, ensuring year exists
      return parsed.map((item: any) => ({ ...item, year: item.year || 2025 }));
    } catch (e) {
      console.error("Error loading expenses", e);
      return [];
    }
  },

  saveExpenses: (data: ExpenseItem[]): void => {
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(data));
  },

  // --- INCOME ---
  getIncome: (): IncomeItem[] => {
    const saved = localStorage.getItem(KEYS.INCOME);
    return saved ? JSON.parse(saved) : [];
  },

  saveIncome: (data: IncomeItem[]): void => {
    localStorage.setItem(KEYS.INCOME, JSON.stringify(data));
  },

  // --- GLOBAL SETTINGS (Savings) ---
  getBaseBalance: (): number => {
    const saved = localStorage.getItem(KEYS.SAVINGS);
    return saved ? parseFloat(saved) : 0;
  },

  saveBaseBalance: (amount: number): void => {
    localStorage.setItem(KEYS.SAVINGS, amount.toString());
  },

  // --- YEAR CONFIG ---
  getYearConfigs: (): YearConfig[] => {
    const saved = localStorage.getItem(KEYS.YEAR_CONFIG);
    if (!saved) return [{ year: 2025, startMonthIndex: 6 }]; // Default
    try {
      return JSON.parse(saved);
    } catch {
      return [{ year: 2025, startMonthIndex: 6 }];
    }
  },

  saveYearConfigs: (configs: YearConfig[]): void => {
    localStorage.setItem(KEYS.YEAR_CONFIG, JSON.stringify(configs));
  },

  // --- PRODUCTS ---
  getProducts: (): Product[] => {
    const saved = localStorage.getItem(KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : [];
  },

  saveProducts: (products: Product[]): void => {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  // --- TAGS ---
  getTags: (): ProductTag[] => {
    const saved = localStorage.getItem(KEYS.TAGS);
    return saved ? JSON.parse(saved) : DEFAULT_TAGS;
  },

  saveTags: (tags: ProductTag[]): void => {
    localStorage.setItem(KEYS.TAGS, JSON.stringify(tags));
  }
};