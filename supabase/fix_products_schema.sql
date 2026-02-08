-- Ensure products table exists and has correct columns
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, -- Use TEXT to support both UUIDs and legacy numeric strings
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  default_price NUMERIC DEFAULT 0,
  image TEXT,
  tag_id TEXT -- Use TEXT to support flexible IDs
);

-- Add tag_id column if it was missing (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='tag_id') THEN
        ALTER TABLE products ADD COLUMN tag_id TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy for Select
DROP POLICY IF EXISTS "Users can view own products" ON products;
CREATE POLICY "Users can view own products" ON products FOR SELECT USING (auth.uid() = user_id);

-- Policy for Insert
DROP POLICY IF EXISTS "Users can insert own products" ON products;
CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for Update
DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (auth.uid() = user_id);

-- Policy for Delete
DROP POLICY IF EXISTS "Users can delete own products" ON products;
CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (auth.uid() = user_id);
