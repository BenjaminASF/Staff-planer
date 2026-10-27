-- Push notifications to phones and computers (Web Push). They complement the in-app
-- notifications and never replace them.

-- Set by an admin only. While true the user gets no push notifications on any device,
-- whatever the user chose; their registered devices are kept for when it is lifted.
ALTER TABLE users ADD COLUMN push_blocked boolean NOT NULL DEFAULT false;

-- One row per device (browser) where the user turned push notifications on. A device
-- belongs to whoever turned it on last, so a shared phone never gets someone else's.
CREATE TABLE push_subscriptions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device text NOT NULL DEFAULT '',
  failures integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz
);
CREATE INDEX push_subscriptions_user_idx ON push_subscriptions (user_id);

-- Push notifications waiting to be sent, and recently sent ones. A pending row is the
-- one notice a user gets for its dedupe_key, however many changes happen before it
-- goes out; sent rows tell how long ago the last one went. A notice disappears with
-- the in-app notification or chat message it is about.
CREATE TABLE push_outbox (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  dedupe_key text NOT NULL,
  ref jsonb NOT NULL DEFAULT '{}',
  notification_id text REFERENCES notifications(id) ON DELETE CASCADE,
  message_id bigint REFERENCES chat_messages(id) ON DELETE CASCADE,
  send_after timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE UNIQUE INDEX push_outbox_pending_idx ON push_outbox (user_id, dedupe_key) WHERE sent_at IS NULL;
CREATE INDEX push_outbox_due_idx ON push_outbox (send_after) WHERE sent_at IS NULL;
CREATE INDEX push_outbox_sent_idx ON push_outbox (user_id, dedupe_key, sent_at) WHERE sent_at IS NOT NULL;
