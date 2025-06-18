
-- Update the api_credentials table to better support survey-specific API configurations
-- We'll use the existing credentials JSONB field to store both api_key and survey_id

-- First, let's add a comment to clarify the new structure
COMMENT ON COLUMN api_credentials.credentials IS 'JSONB object containing api_key and survey_id for quota generator, or other provider-specific credentials';

-- No structural changes needed since we're using the existing JSONB credentials field
-- The credentials field will now store: {"api_key": "qwa_...", "survey_id": "uuid"}
