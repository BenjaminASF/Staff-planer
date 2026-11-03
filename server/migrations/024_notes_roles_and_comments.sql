-- Anteckningar by role (see "Anteckningar" in permissions.js): operators have no notes at
-- all. Group notes also get comments.

-- Comments on a group note, by anyone who sees it. They go with the note.
-- (Written so the file can run again; the tests do that on prepared data.)
CREATE TABLE IF NOT EXISTS note_comments (
  id text PRIMARY KEY,
  note_id text NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (body <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS note_comments_note_idx ON note_comments (note_id, created_at);

DROP TRIGGER IF EXISTS note_comments_notify ON note_comments;
CREATE TRIGGER note_comments_notify AFTER INSERT OR DELETE ON note_comments
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('notes');

-- Every note an operator wrote is removed for good, personal and shared, with its
-- recipients, read and done marks, comments and notifications (ON DELETE CASCADE).
DELETE FROM notes n USING users u WHERE u.id = n.author_id AND u.role = 'operator';

-- Operators come off other people's notes, with their marks and notifications about notes.
DELETE FROM note_people np USING users u WHERE u.id = np.user_id AND u.role = 'operator';
DELETE FROM note_states s USING users u WHERE u.id = s.user_id AND u.role = 'operator';
DELETE FROM notifications x USING users u WHERE u.id = x.user_id AND u.role = 'operator' AND x.note_id IS NOT NULL;
