-- "Att göra" is replaced by Anteckningar. Every task that was not done becomes a note
-- by the list's owner, in the list's order, so nothing open is lost. A task shared with
-- others becomes a group note shared with the same people (those who could see it:
-- existing users other than operators), already marked read since they had seen it.
-- Done tasks and the old lists are then removed, with the notifications about shared tasks.

-- An unreadable or out-of-range date must not stop the migration: it falls back to now.
CREATE OR REPLACE FUNCTION pg_temp.todo_time(value text) RETURNS timestamptz AS $$
DECLARE
  parsed timestamptz;
BEGIN
  parsed := value::timestamptz;
  IF parsed < '2000-01-01' OR parsed > now() + interval '1 day' THEN RETURN NULL; END IF;
  RETURN parsed;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TEMP TABLE todo_moves ON COMMIT DROP AS
SELECT gen_random_uuid()::text AS note_id,
       u.id AS owner_id,
       left(btrim(t.item->>'text'), 1000) AS body,
       COALESCE(pg_temp.todo_time(t.item->>'createdAt'), now()) + t.position * interval '1 millisecond' AS created_at,
       ARRAY(
         SELECT DISTINCT r.id
           FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(t.item->'sharedWith') = 'array' THEN t.item->'sharedWith' ELSE '[]'::jsonb END) AS s(user_id)
           JOIN users r ON r.id = s.user_id
          WHERE r.id <> u.id AND r.role <> 'operator'
       ) AS shared_with
  FROM documents d
  JOIN users u ON d.scope = 'user:' || u.id
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(d.value) = 'array' THEN d.value ELSE '[]'::jsonb END) WITH ORDINALITY AS t(item, position)
 WHERE d.key = 'todos'
   AND jsonb_typeof(t.item) = 'object'
   AND btrim(COALESCE(t.item->>'text', '')) <> ''
   AND COALESCE(t.item->>'completedAt', '') = '';

INSERT INTO notes (id, author_id, kind, body, created_at, updated_at)
SELECT note_id, owner_id, CASE WHEN cardinality(shared_with) > 0 THEN 'group' ELSE 'personal' END, body, created_at, now()
  FROM todo_moves;

INSERT INTO note_people (note_id, user_id)
SELECT m.note_id, s.user_id FROM todo_moves m CROSS JOIN LATERAL unnest(m.shared_with) AS s(user_id);

INSERT INTO note_states (note_id, user_id, read_at)
SELECT m.note_id, s.user_id, now() FROM todo_moves m CROSS JOIN LATERAL unnest(m.shared_with) AS s(user_id);

DELETE FROM documents WHERE key = 'todos';
DELETE FROM notifications WHERE kind = 'todoShared';

-- The helper lives on this database connection; it is not needed after the move.
DROP FUNCTION pg_temp.todo_time(text);
