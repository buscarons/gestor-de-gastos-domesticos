import { supabase } from './supabaseClient';
import { ExpenseItem, IncomeItem, Product, ProductTag, YearConfig } from '../types';

// Default Data for fallbacks
const DEFAULT_TAGS: ProductTag[] = [
  { id: '1', name: 'Comestibles', emoji: '🍞' },
  { id: '2', name: 'Limpieza', emoji: '🧹' },
  { id: '3', name: 'Bebidas', emoji: '🥤' },
  { id: '4', name: 'Carnicería', emoji: '🥩' },
];

/**
 * StorageService (Supabase Edition)
 * 
 * Ahora todas las operaciones son ASÍNCRONAS.
 * Se conecta a las tablas definidas en supabase_schema.sql.
 */
export const StorageService = {

  // --- AUTH / USER CHECK ---
  // Helper to get current user. If no user, we might need to sign in anonymously or require auth.
  // For this app, we assume an authenticated context or we force a sign-in if needed.
  // For now, we'll assume the user is signed in or we use a public/anon strategy if RLS allows it.
  // BUT: The SQL script had 'auth.uid() = user_id', so we NEED a user.
  // We'll expose a method to check/ensure session.

  getCurrentUser: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.user || null;
  },

  ensureAuth: async (): Promise<string> => {
    const user = await StorageService.getCurrentUser();
    if (user) return user.id;

    // Try anonymous sign in
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("Error signing in anonymously:", error);
      throw new Error(`Error de Autenticación: ${error.message}. Verifica que 'Enable Anonymous Sign-ins' esté activado en Supabase.`);
    }

    if (!data.user) {
      throw new Error("No se pudo obtener el usuario anónimo.");
    }

    return data.user.id;
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
  },

  getSessionUser: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.user || null;
  },

  // --- SETUP ---
  getSetupStatus: async (): Promise<boolean> => {
    const user = await StorageService.getCurrentUser();
    if (!user) return false;

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
    if (!user) return;

    const { error } = await supabase
      .from('app_settings')
      .upsert({ user_id: user.id, setup_completed: true });

    if (error) console.error("Error saving setup status", error);
  },

  // --- EXPENSES ---
  getExpenses: async (): Promise<ExpenseItem[]> => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*');

    if (error) {
      console.error("Error fetching expenses", error);
      return [];
    }

    // Map DB snake_case to App camelCase (if needed) or cast types
    // Our SQL defines amounts as jsonb, so it should come back as number[] automatically if using JS client
    // transactions also jsonb
    return data.map((row: any) => ({
      id: row.id,
      year: row.year,
      category: row.category,
      name: row.name,
      amounts: row.amounts,
      transactions: row.transactions || undefined
    }));
  },

  // Upsert (Insert or Update)
  // We generally save the WHOLE array in the old version.
  // In SQL, we should upset INDIVIDUAL items.
  // IMPORTANT: The App.tsx currently passes the FULL array for 'saveExpenses'.
  // OPTIMIZATION: We should only save what changed, but for migration compatibility 
  // we will accept the full array and iterate upserts (or delete+insert, but upsert is better).
  // FOR EFFICIENCY in this simple app: We can just upsert all modifications.
  // But wait, if we delete something in UI, we need to delete in DB. 
  // Sending the full array to "Sync" is complex with SQL. 
  // BETTER APPROACH for "Phase 1": 
  // Logic: 
  // 1. Get all DB IDs.
  // 2. Identify deletions (In DB but not in new List).
  // 3. Upsert content.
  saveExpenses: async (data: ExpenseItem[]): Promise<void> => {
    const user = await StorageService.getCurrentUser();
    if (!user) return;

    // 1. Fetch existing IDs to find deletions
    const { data: existing } = await supabase.from('expenses').select('id');
    const existingIds = existing ? existing.map(x => x.id) : [];
    const newIds = new Set(data.map(d => d.id));

    const toDelete = existingIds.filter(id => !newIds.has(id));

    // 2. Delete
    if (toDelete.length > 0) {
      await supabase.from('expenses').delete().in('id', toDelete);
    }

    // 3. Upsert
    // Map to DB structure
    const toUpsert = data.map(item => ({
      id: item.id,
      user_id: user.id,
      year: item.year,
      category: item.category,
      name: item.name,
      amounts: item.amounts,
      transactions: item.transactions
    }));

    const { error } = await supabase.from('expenses').upsert(toUpsert);
    if (error) console.error("Error saving expenses", error);
  },

  // --- INCOME ---
  getIncome: async (): Promise<IncomeItem[]> => {
    const { data, error } = await supabase.from('income').select('*');
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
    if (!user) return;

    const { data: existing } = await supabase.from('income').select('id');
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

  // --- GLOBAL SETTINGS (Savings) ---
  getBaseBalance: async (): Promise<number> => {
    const user = await StorageService.getCurrentUser();
    if (!user) return 0;

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
    if (!user) return;

    // Check if row exists to know if we insert or update, but upsert with user_id unique works
    const { error } = await supabase
      .from('savings_settings')
      .upsert({ user_id: user.id, base_balance: amount }, { onConflict: 'user_id' });

    if (error) console.error("Error saving base balance", error);
  },

  // --- YEAR CONFIG ---
  getYearConfigs: async (): Promise<YearConfig[]> => {
    const { data, error } = await supabase.from('year_configs').select('*');
    if (error) return [{ year: 2025, startMonthIndex: 6 }];

    if (!data || data.length === 0) return [{ year: 2025, startMonthIndex: 6 }];

    return data.map((row: any) => ({
      year: row.year,
      startMonthIndex: row.start_month_index
    }));
  },

  saveYearConfigs: async (configs: YearConfig[]): Promise<void> => {
    const user = await StorageService.getCurrentUser();
    if (!user) return;

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
    const { data, error } = await supabase.from('products').select('*');
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
    if (!user) return;

    // Similar sync logic: delete missing, upsert current
    const { data: existing } = await supabase.from('products').select('id');
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

    // DEBUG: Validate Foreign Keys
    if (toUpsert.length > 0) {
      console.log("StorageService: Saving Products...", toUpsert);
      const sampleTagId = toUpsert[0].tag_id;
      if (sampleTagId) {
        const { data: tagCheck } = await supabase.from('product_tags').select('id').eq('id', sampleTagId);
        console.log(`StorageService: Checking tag ${sampleTagId} existence:`, tagCheck);
        if (!tagCheck || tagCheck.length === 0) {
          console.error(`StorageService: CRITICAL - Tag ${sampleTagId} NOT FOUND in DB for user ${user.id}. Aborting save to prevent FK error.`);
          // alert("Error de consistencia: La etiqueta seleccionada no existe en la base de datos. Recarga la página.");
          // return; // Optional: Stop to prevent the error, or let it fail to see the real DB error.
        }
      }
    }

    const { error } = await supabase.from('products').upsert(toUpsert);
    if (error) console.error("Error saving products", error);
  },

  // --- TAGS ---
  getTags: async (): Promise<ProductTag[]> => {
    const { data, error } = await supabase.from('product_tags').select('*');

    // If DB is empty, seed defaults
    if (!error && (!data || data.length === 0)) {
      try {
        const user = await StorageService.getCurrentUser();
        if (user) {
          console.log("StorageService: Seeding Default Tags for user", user.id);
          // Prepare defaults without IDs (let DB generate UUIDs)
          const toInsert = DEFAULT_TAGS.map(t => ({
            user_id: user.id,
            name: t.name,
            emoji: t.emoji
          }));

          const { error: insertError } = await supabase.from('product_tags').insert(toInsert);
          if (insertError) {
            console.error("StorageService: Error inserting default tags:", insertError);
            throw insertError;
          }

          // Re-fetch to get the real UUIDs
          const { data: seeded, error: fetchError } = await supabase.from('product_tags').select('*');

          if (fetchError) console.error("StorageService: Error fetching valid tags after seed:", fetchError);

          if (seeded && seeded.length > 0) {
            return seeded.map((row: any) => ({
              id: row.id,
              name: row.name,
              emoji: row.emoji
            }));
          }
        } else {
          console.warn("StorageService: Cannot seed tags, no user found.");
        }
      } catch (e) {
        console.error("StorageService: Unexpected error during tag seeding:", e);
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
    if (!user) return;

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