-- A message to everyone that an admin or shift leader marked as priority. It stays
-- pinned at the top of the chat for everyone until the mark is taken away.
ALTER TABLE chat_messages ADD COLUMN priority_at timestamptz;
ALTER TABLE chat_messages ADD COLUMN priority_by text;
CREATE INDEX chat_messages_priority_idx ON chat_messages (priority_at) WHERE priority_at IS NOT NULL;
-- Open chats update when a mark is set or taken away, as they do for new messages.
CREATE TRIGGER chat_priority_notify AFTER UPDATE OF priority_at ON chat_messages
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('chat');
