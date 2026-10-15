-- Document notifications also say who saved the change, so pages can tell
-- other people's changes from their own (for example to play a sound).
CREATE OR REPLACE FUNCTION notify_document_change() RETURNS trigger AS $$
DECLARE
  row_data documents;
BEGIN
  IF TG_OP = 'DELETE' THEN row_data := OLD; ELSE row_data := NEW; END IF;
  PERFORM pg_notify('app_changes', json_build_object(
    'type', 'document', 'scope', row_data.scope, 'key', row_data.key,
    'version', CASE WHEN TG_OP = 'DELETE' THEN 0 ELSE row_data.version END,
    'by', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_data.updated_by END
  )::text);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
