-- Tells the app about every saved change so open pages update right away.
-- Notifications are sent when the transaction commits, and reach every server
-- instance listening on the channel.
CREATE FUNCTION notify_document_change() RETURNS trigger AS $$
DECLARE
  row_data documents;
BEGIN
  IF TG_OP = 'DELETE' THEN row_data := OLD; ELSE row_data := NEW; END IF;
  PERFORM pg_notify('app_changes', json_build_object(
    'type', 'document', 'scope', row_data.scope, 'key', row_data.key,
    'version', CASE WHEN TG_OP = 'DELETE' THEN 0 ELSE row_data.version END
  )::text);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_notify AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION notify_document_change();

-- People, logins, shifts and chat only say which kind of data changed.
CREATE FUNCTION notify_table_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('app_changes', json_build_object('type', TG_ARGV[0])::text);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER people_notify AFTER INSERT OR UPDATE OR DELETE ON people
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('people');
CREATE TRIGGER users_notify AFTER INSERT OR DELETE OR UPDATE OF username, role, person_id, must_change_password ON users
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('people');
CREATE TRIGGER shifts_notify AFTER INSERT OR UPDATE OR DELETE ON shifts
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('shifts');
CREATE TRIGGER chat_notify AFTER INSERT OR DELETE ON chat_messages
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('chat');
