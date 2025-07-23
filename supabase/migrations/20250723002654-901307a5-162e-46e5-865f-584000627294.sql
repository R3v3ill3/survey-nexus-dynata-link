
-- Update all membership tiers to $0 for testing
UPDATE public.membership_tiers 
SET 
  monthly_price = 0,
  yearly_price = 0,
  updated_at = NOW()
WHERE tier IN ('free', 'professional', 'enterprise');
