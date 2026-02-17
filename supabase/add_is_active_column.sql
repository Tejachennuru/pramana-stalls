-- Only add the column. Do NOT insert any special stall data.
ALTER TABLE public.stalls ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
