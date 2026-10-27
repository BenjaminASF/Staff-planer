-- Push notifications keep coming after signing out, but a device stops getting them
-- 48 hours after its user signed out there (see push.js). A device is tied to the
-- session of whoever turned push on or last signed in on it; when that session ends,
-- signed_out_at records when.
ALTER TABLE push_subscriptions
  ADD COLUMN session_hash text,
  ADD COLUMN signed_out_at timestamptz,
  -- Hash of a random key only the device knows. With it the device can renew its own
  -- subscription when the browser replaces it, also while nobody is signed in.
  ADD COLUMN secret_hash text;
CREATE INDEX push_subscriptions_session_idx ON push_subscriptions (session_hash) WHERE session_hash IS NOT NULL;

-- Devices registered before this change count as signed out now; they are tied to a
-- session again the next time their user opens Staff Planner on them.
UPDATE push_subscriptions SET signed_out_at = now();

-- However a session ends (signing out, automatic sign-out, a new password, expiry),
-- its devices start their 48 hours from then.
CREATE FUNCTION push_session_ended() RETURNS trigger AS $$
BEGIN
  UPDATE push_subscriptions SET session_hash = NULL, signed_out_at = LEAST(now(), OLD.expires_at)
   WHERE session_hash = OLD.token_hash;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_push_ended AFTER DELETE ON sessions
  FOR EACH ROW EXECUTE FUNCTION push_session_ended();
