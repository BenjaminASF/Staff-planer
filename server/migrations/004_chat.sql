-- Chat for admins and shift leaders. Images are stored in the database so the
-- app needs no separate file storage on Railway; the browser shrinks them first.
CREATE TABLE chat_messages (
  id bigserial PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  body text NOT NULL DEFAULT '',
  image bytea,
  image_type text CHECK (image_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (body <> '' OR image IS NOT NULL)
);
CREATE INDEX chat_messages_created_idx ON chat_messages (created_at);

-- The newest message each user has seen, for the unread badge.
CREATE TABLE chat_reads (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_read_id bigint NOT NULL DEFAULT 0
);
