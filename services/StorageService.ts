import { supabase } from './supabaseClient';
import { ExpenseItem, IncomeItem, Product, ProductTag, YearConfig } from '../types';

// Default Tags for fallback
const DEFAULT_TAGS: ProductTag[] = [
  { id: '1', name: 'Comestibles', emoji: '🍞' },
  { id: '2', name: 'Limpieza', emoji: '🧹' },
  { id: '3', name: 'Bebidas', emoji: '🥤' },
  { id: '4', name: 'Carnicería', emoji: '🥩' },
];

/**
 * StorageService (Hybrid: Supabase + LocalStorage for Guest)
 */
export const StorageService = {

  // --- AUTH / USER CHECK ---
  getCurrentUser: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.user || null;
  },

  /**
   * Checks if valid session exists.
   * NO LONGER forces anonymous sign-in.
   * Returns user ID or null if guest.
   */
  ensureAuth: async (): Promise<string | null> => {
    const user = await StorageService.getCurrentUser();
    return user ? user.id : null;
  },

  signInWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Clear guest data on logout to reset demo state? 
    // Or keep it? User might want to toggle.
    // Ideally, logout goes to "Guest Mode" which might have data.
    // Let's reload page on logout usually.
  },

  getSessionUser: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.user || null;
  },

  // --- SETUP ---
  getSetupStatus: async (): Promise<boolean> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      // Guest Mode
      return localStorage.getItem('guest_setup_completed') === 'true';
    }

    const { data, error } = await supabase
      .from('app_settings')
      .select('setup_completed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return false;
    return data.setup_completed;
  },

  completeSetup: async (): Promise<void> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      localStorage.setItem('guest_setup_completed', 'true');
      return;
    }

    const { error } = await supabase
      .from('app_settings')
      .upsert({ user_id: user.id, setup_completed: true });

    if (error) console.error("Error saving setup status", error);
  },

  // --- EXPENSES ---
  getExpenses: async (): Promise<ExpenseItem[]> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      const stored = localStorage.getItem('guest_expenses');
      return stored ? JSON.parse(stored) : [];
    }

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true });

    if (error) {
      console.error("Error fetching expenses", error);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      year: row.year,
      category: row.category,
      name: row.name,
      amounts: row.amounts,
      transactions: row.transactions || undefined,
      orderIndex: row.order_index
    }));
  },

  saveExpenses: async (data: ExpenseItem[]): Promise<void> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      localStorage.setItem('guest_expenses', JSON.stringify(data));
      return;
    }

    // Supabase Sync Logic - Only look at current user's data
    const { data: existing } = await supabase
      .from('expenses')
      .select('id')
      .eq('user_id', user.id);
    const existingIds = existing ? existing.map(x => x.id) : [];
    const newIds = new Set(data.map(d => d.id));

    const toDelete = existingIds.filter(id => !newIds.has(id));

    if (toDelete.length > 0) {
      await supabase.from('expenses').delete().in('id', toDelete);
    }

    const toUpsert = data.map((item, index) => ({
      id: item.id,
      user_id: user.id,
      year: item.year,
      category: item.category,
      name: item.name,
      amounts: item.amounts,
      transactions: item.transactions,
      order_index: index // Save the index from the array order
    }));

    const { error } = await supabase.from('expenses').upsert(toUpsert);
    if (error) console.error("Error saving expenses", error);
  },

  // --- INCOME ---
  getIncome: async (): Promise<IncomeItem[]> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      const stored = localStorage.getItem('guest_income');
      return stored ? JSON.parse(stored) : [];
    }

    const { data, error } = await supabase
      .from('income')
      .select('*')
      .eq('user_id', user.id);
    if (error) {
      console.error("Error fetching income", error);
      return [];
    }
    return data.map((row: any) => ({
      id: row.id,
      year: row.year,
      category: row.category,
      name: row.name,
      amounts: row.amounts
    }));
  },

  saveIncome: async (data: IncomeItem[]): Promise<void> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      localStorage.setItem('guest_income', JSON.stringify(data));
      return;
    }

    const { data: existing } = await supabase
      .from('income')
      .select('id')
      .eq('user_id', user.id);
    const existingIds = existing ? existing.map(x => x.id) : [];
    const newIds = new Set(data.map(d => d.id));
    const toDelete = existingIds.filter(id => !newIds.has(id));

    if (toDelete.length > 0) {
      await supabase.from('income').delete().in('id', toDelete);
    }

    const toUpsert = data.map(item => ({
      id: item.id,
      user_id: user.id,
      year: item.year,
      category: item.category,
      name: item.name,
      amounts: item.amounts
    }));

    const { error } = await supabase.from('income').upsert(toUpsert);
    if (error) console.error("Error saving income", error);
  },

  // --- BASE BALANCE ---
  getBaseBalance: async (): Promise<number> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      return Number(localStorage.getItem('guest_base_balance') || 0);
    }

    const { data, error } = await supabase
      .from('savings_settings')
      .select('base_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return 0;
    return Number(data.base_balance);
  },

  saveBaseBalance: async (amount: number): Promise<void> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      localStorage.setItem('guest_base_balance', amount.toString());
      return;
    }

    const { error } = await supabase
      .from('savings_settings')
      .upsert({ user_id: user.id, base_balance: amount }, { onConflict: 'user_id' });

    if (error) console.error("Error saving base balance", error);
  },

  // --- YEAR CONFIG ---
  getYearConfigs: async (): Promise<YearConfig[]> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      const stored = localStorage.getItem('guest_year_configs');
      return stored ? JSON.parse(stored) : [{ year: new Date().getFullYear(), startMonthIndex: 0 }];
    }

    const { data, error } = await supabase
      .from('year_configs')
      .select('*')
      .eq('user_id', user.id);
    if (error) return [{ year: 2025, startMonthIndex: 6 }];

    if (!data || data.length === 0) return [{ year: 2025, startMonthIndex: 6 }];

    return data.map((row: any) => ({
      year: row.year,
      startMonthIndex: row.start_month_index
    }));
  },

  saveYearConfigs: async (configs: YearConfig[]): Promise<void> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      localStorage.setItem('guest_year_configs', JSON.stringify(configs));
      return;
    }

    const toUpsert = configs.map(c => ({
      user_id: user.id,
      year: c.year,
      start_month_index: c.startMonthIndex
    }));

    const { error } = await supabase
      .from('year_configs')
      .upsert(toUpsert, { onConflict: 'user_id,year' });

    if (error) console.error("Error saving year configs", error);
  },

  // --- PRODUCTS ---
  getProducts: async (): Promise<Product[]> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      const stored = localStorage.getItem('guest_products');
      return stored ? JSON.parse(stored) : [];
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id);
    if (error) return [];

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      defaultPrice: Number(row.default_price),
      image: row.image,
      tagId: row.tag_id
    }));
  },

  saveProducts: async (products: Product[]): Promise<void> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      localStorage.setItem('guest_products', JSON.stringify(products));
      return;
    }

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', user.id);
    const existingIds = existing ? existing.map(x => x.id) : [];
    const newIds = new Set(products.map(d => d.id));
    const toDelete = existingIds.filter(id => !newIds.has(id));

    if (toDelete.length > 0) {
      await supabase.from('products').delete().in('id', toDelete);
    }

    const toUpsert = products.map(p => ({
      id: p.id,
      user_id: user.id,
      name: p.name,
      default_price: p.defaultPrice,
      image: p.image,
      tag_id: p.tagId
    }));

    const { error } = await supabase.from('products').upsert(toUpsert);
    if (error) {
      console.error("Error saving products", error);
      throw error;
    }
  },

  // --- TAGS ---
  getTags: async (): Promise<ProductTag[]> => {
    const user = await StorageService.getCurrentUser();

    // GUEST MODE
    if (!user) {
      const stored = localStorage.getItem('guest_tags');
      // If no stored tags, return defaults (or empty depending on demo init strategy)
      // Usually DemoDataService initializes this.
      return stored ? JSON.parse(stored) : DEFAULT_TAGS;
    }

    // CLOUD MODE
    const { data, error } = await supabase
      .from('product_tags')
      .select('*')
      .eq('user_id', user.id);

    // If DB is empty, seed defaults
    if (!error && (!data || data.length === 0)) {
      try {
        console.log("StorageService: Seeding Default Tags for user", user.id);
        const toInsert = DEFAULT_TAGS.map(t => ({
          user_id: user.id,
          name: t.name,
          emoji: t.emoji
        }));
        await supabase.from('product_tags').insert(toInsert);

        // Re-fetch
        const { data: seeded } = await supabase.from('product_tags').select('*');
        if (seeded && seeded.length > 0) {
          return seeded.map((row: any) => ({
            id: row.id,
            name: row.name,
            emoji: row.emoji
          }));
        }
      } catch (e) {
        console.error("Error seeding tags", e);
      }
    }

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      emoji: row.emoji
    }));
  },

  saveTags: async (tags: ProductTag[]): Promise<void> => {
    const user = await StorageService.getCurrentUser();
    if (!user) {
      localStorage.setItem('guest_tags', JSON.stringify(tags));
      return;
    }

    const toUpsert = tags.map(t => ({
      id: t.id,
      user_id: user.id,
      name: t.name,
      emoji: t.emoji
    }));

    const { error } = await supabase.from('product_tags').upsert(toUpsert);
    if (error) console.error("Error saving tags", error);
  }
};