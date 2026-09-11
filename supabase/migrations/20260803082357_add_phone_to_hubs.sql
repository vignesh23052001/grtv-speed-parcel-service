/*
# Add phone column to hubs

1. Modified Tables
- `hubs`: Added `phone` (text) column for branch contact numbers.
2. Security
- No RLS changes needed, existing policies cover the new column.
*/

ALTER TABLE hubs ADD COLUMN IF NOT EXISTS phone text;
