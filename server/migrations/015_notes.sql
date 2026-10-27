-- Anteckningar: sticky notes on a board. A personal note is seen only by its author.
-- A group note is also seen by the users it is shared with: the ones picked one by
-- one (note_people) and everyone in the shifts picked as a whole (whole_shifts), so
-- people who join such a shift later see it too.
CREATE TABLE notes (
  id text PRIMARY KEY,
  author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('personal', 'group')),
  body text NOT NULL CHECK (body <> ''),
  color text NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'pink', 'blue', 'mint', 'lavender', 'beige')),
  -- One mark for everyone who sees the note.
  priority boolean NOT NULL DEFAULT false,
  whole_shifts text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notes_author_idx ON notes (author_id);
CREATE INDEX notes_whole_shifts_idx ON notes USING gin (whole_shifts);

CREATE TABLE note_people (
  note_id text NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, user_id)
);
CREATE INDEX note_people_user_idx ON note_people (user_id);

-- Each user's own view of a note: when they read it, whether they marked it done,
-- and where it sits on their board in each sort order.
CREATE TABLE note_states (
  note_id text NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamptz,
  done boolean NOT NULL DEFAULT false,
  layout jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (note_id, user_id)
);

-- Notifications about a note disappear with the note, or when the user loses access.
ALTER TABLE notifications ADD COLUMN note_id text REFERENCES notes(id) ON DELETE CASCADE;

-- Pages only hear that notes changed and fetch the ones they may see. Moving a note
-- or marking it done is private to the user, so those changes are not announced.
CREATE TRIGGER notes_notify AFTER INSERT OR UPDATE OR DELETE ON notes
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('notes');
CREATE TRIGGER note_people_notify AFTER INSERT OR DELETE ON note_people
  FOR EACH STATEMENT EXECUTE FUNCTION notify_table_change('notes');
CREATE TRIGGER note_states_read_notify AFTER UPDATE OF read_at ON note_states
  FOR EACH ROW WHEN (OLD.read_at IS NULL AND NEW.read_at IS NOT NULL) EXECUTE FUNCTION notify_table_change('notes');
CREATE TRIGGER note_states_read_insert_notify AFTER INSERT ON note_states
  FOR EACH ROW WHEN (NEW.read_at IS NOT NULL) EXECUTE FUNCTION notify_table_change('notes');
