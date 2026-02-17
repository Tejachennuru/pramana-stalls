-- 1. ADD COLUMN is_active
ALTER TABLE public.stalls ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. INSERT SPECIAL STALL (Corrected for Identity Column)
-- We use OVERRIDING SYSTEM VALUE to force the ID 9999
INSERT INTO public.stalls (id, name, category, base_price, reg_fee, size, description, is_active)
OVERRIDING SYSTEM VALUE
VALUES (9999, 'Pramana Special Stall', 'Category A', 100000, 5000, '20x20', 'Exclusive stall reserved for special purposes (Admin Only).', false)
ON CONFLICT (id) DO UPDATE SET 
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description;
