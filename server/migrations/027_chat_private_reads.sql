-- How far each user has read in each private conversation (partner_id is the other person),
-- so the private conversations are listed with their own unread counts. Conversations from
-- before start where the user had read the whole chat.
CREATE TABLE chat_private_reads (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id text NOT NULL,
  last_read_id bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, partner_id)
);
INSERT INTO chat_private_reads (user_id, partner_id, last_read_id)
SELECT r.user_id, m.user_id, r.last_read_id
  FROM chat_reads r JOIN chat_messages m ON m.recipient_id = r.user_id
 WHERE m.user_id IS NOT NULL
 GROUP BY r.user_id, m.user_id, r.last_read_id
ON CONFLICT DO NOTHING;
CREATE INDEX chat_messages_private_pair_idx ON chat_messages (user_id, recipient_id) WHERE recipient_id IS NOT NULL;
