-- Temporary accounts: logins an admin creates for hired staff, with an end date. They sign in
-- with username and password only (never Microsoft), and only to the functions in features.
-- disabled_at pauses an account; expires_at ends it. Both end its sessions at once (see auth.js).
ALTER TABLE users ADD COLUMN temporary boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN expires_at timestamptz;
ALTER TABLE users ADD COLUMN disabled_at timestamptz;
ALTER TABLE users ADD COLUMN features text[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN created_by text REFERENCES users(id) ON DELETE SET NULL;
-- A temporary account always ends, and is never an admin.
ALTER TABLE users ADD CONSTRAINT users_temporary_check
  CHECK (NOT temporary OR (expires_at IS NOT NULL AND role <> 'admin' AND entra_oid IS NULL));
