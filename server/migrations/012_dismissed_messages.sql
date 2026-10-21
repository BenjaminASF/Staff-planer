-- Info messages a user has closed. On users they stay hidden for good; on sessions
-- only until the next login, since every login starts a new session.
ALTER TABLE users ADD COLUMN dismissed_messages text[] NOT NULL DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN dismissed_messages text[] NOT NULL DEFAULT '{}';
