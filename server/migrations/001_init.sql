-- Shift teams. Each shift has its own weekly schedule.
CREATE TABLE shifts (
  id text PRIMARY KEY,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Staff. A person may or may not have a login (see users).
CREATE TABLE people (
  id text PRIMARY KEY,
  name text NOT NULL,
  company text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  availability text NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available', 'sick', 'vab', 'vacation', 'unavailable')),
  shift_id text REFERENCES shifts(id) ON DELETE SET NULL,
  demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX people_shift_idx ON people (shift_id);

-- Logins. Every account belongs to exactly one person.
CREATE TABLE users (
  id text PRIMARY KEY,
  person_id text NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE CHECK (username = lower(username)),
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'shift_leader', 'operator')),
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- App data stored as JSON documents, the same shapes the browser app used locally.
-- scope is 'global' or a shift id. Who may read or write a key is decided in
-- server/permissions.js.
CREATE TABLE documents (
  scope text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (scope, key)
);

CREATE TABLE audit_events (
  id text PRIMARY KEY,
  scope text NOT NULL,
  type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  undo jsonb,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_scope_created_idx ON audit_events (scope, created_at DESC);
