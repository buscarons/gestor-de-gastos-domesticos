-- Add order_index column to expenses table if it doesn't exist
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Optional: Update existing rows to have a default order based on ID or creation time
-- This ensures they aren't all 0 if we want a stable initial sort
-- WITH numbered_rows AS (
--   SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
--   FROM expenses
-- )
-- UPDATE expenses
-- SET order_index = numbered_rows.rn
-- FROM numbered_rows
-- WHERE expenses.id = numbered_rows.id;
