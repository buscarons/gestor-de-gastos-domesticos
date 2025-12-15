
import { createClient } from '@supabase/supabase-js';

// Access environment variables securely
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // We don't throw error immediately to allow app to load in "offline/local" mode if needed,
    // but Services should check this.
    console.warn("Supabase credentials missing in .env");
}

export const supabase = createClient(
    supabaseUrl || "",
    supabaseAnonKey || ""
);
