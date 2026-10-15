-- Short notes for one user: an admin changed something, or someone shared a
-- to-do task with them. Removed with the login.
CREATE TABLE notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  actor_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC);

-- Only the recipient is told; the note itself is fetched from the API.
CREATE FUNCTION notify_notification() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('app_changes', json_build_object('type', 'notification', 'userId', NEW.user_id)::text);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_notify AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_notification();
