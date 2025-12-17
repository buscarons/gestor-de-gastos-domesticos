-- Add unique constraint to product_tags table
-- This prevents a user from having multiple tags with the same name.
-- Pre-requisite: The table must not contain duplicates for a user before running this.

ALTER TABLE product_tags
ADD CONSTRAINT unique_user_tag_name UNIQUE (user_id, name);
