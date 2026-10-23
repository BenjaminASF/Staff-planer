-- A chat message goes to everyone, or privately to one person when recipient_id is set.
-- Private messages disappear with the recipient's account.
ALTER TABLE chat_messages ADD COLUMN recipient_id text REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN recipient_name text;
CREATE INDEX chat_messages_recipient_idx ON chat_messages (recipient_id) WHERE recipient_id IS NOT NULL;
