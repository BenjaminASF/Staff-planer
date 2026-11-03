-- Anteckningar by role (see "Anteckningar" in permissions.js): operators have no notes at
-- all, and an admin and a senior operator never share a group note. Group notes also get
-- comments.

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

-- Notes where an admin and a senior operator meet, and who comes off each one:
-- - an admin's note: the senior operators;
-- - a senior operator's note, or someone else's note that a senior operator is on (one by
--   one or through a whole shift): the admins.
CREATE TEMP TABLE note_access_removed ON COMMIT DROP AS
SELECT np.note_id, np.user_id
  FROM note_people np
  JOIN notes n ON n.id = np.note_id
  JOIN users a ON a.id = n.author_id
  JOIN users u ON u.id = np.user_id
 WHERE (a.role = 'admin' AND u.role = 'senior_operator')
    OR (u.role = 'admin' AND a.role <> 'admin' AND (
          a.role = 'senior_operator'
          OR n.whole_shifts <> '{}'
          OR EXISTS (SELECT 1 FROM note_people sp JOIN users su ON su.id = sp.user_id
                      WHERE sp.note_id = n.id AND su.role = 'senior_operator')));

DELETE FROM note_people np USING note_access_removed r WHERE np.note_id = r.note_id AND np.user_id = r.user_id;

-- Their marks and notifications go as well, and the same for senior operators who reached an
-- admin's note through a whole shift, and admins who reached someone else's that way.
DELETE FROM note_states s USING notes n, users a, users u
 WHERE n.id = s.note_id AND a.id = n.author_id AND u.id = s.user_id AND u.id <> a.id
   AND ((a.role = 'admin' AND u.role = 'senior_operator') OR (u.role = 'admin' AND a.role <> 'admin'))
   AND NOT EXISTS (SELECT 1 FROM note_people np WHERE np.note_id = n.id AND np.user_id = u.id);
DELETE FROM notifications x USING notes n, users a, users u
 WHERE n.id = x.note_id AND a.id = n.author_id AND u.id = x.user_id AND u.id <> a.id
   AND ((a.role = 'admin' AND u.role = 'senior_operator') OR (u.role = 'admin' AND a.role <> 'admin'))
   AND NOT EXISTS (SELECT 1 FROM note_people np WHERE np.note_id = n.id AND np.user_id = u.id);
