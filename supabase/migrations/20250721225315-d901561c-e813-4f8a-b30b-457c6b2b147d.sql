
-- Make allocation_id nullable in segment_tracking table to support the intended workflow
-- where tracking records can exist before allocations are created
ALTER TABLE public.segment_tracking 
ALTER COLUMN allocation_id DROP NOT NULL;

-- Add a comment to document this design decision
COMMENT ON COLUMN public.segment_tracking.allocation_id IS 'Nullable to allow tracking records to exist before quota allocations are created';
