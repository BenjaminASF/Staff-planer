-- "Att göra" is replaced by Anteckningar. Every task that was not done becomes a
-- personal note for the list's owner, in the list's order, so nothing open is lost.
-- Done tasks and the old lists are then removed, with the notifications about shared tasks.
INSERT INTO notes (id, author_id, kind, body, created_at, updated_at)
SELECT gen_random_uuid()::text, u.id, 'personal', left(btrim(t.item->>'text'), 1000),
       CASE WHEN t.item->>'createdAt' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}' THEN (t.item->>'createdAt')::timestamptz ELSE now() END
         + t.position * interval '1 millisecond',
       now()
  FROM documents d
  JOIN users u ON d.scope = 'user:' || u.id
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(d.value) = 'array' THEN d.value ELSE '[]'::jsonb END) WITH ORDINALITY AS t(item, position)
 WHERE d.key = 'todos'
   AND jsonb_typeof(t.item) = 'object'
   AND btrim(COALESCE(t.item->>'text', '')) <> ''
   AND COALESCE(t.item->>'completedAt', '') = '';

DELETE FROM documents WHERE key = 'todos';
DELETE FROM notifications WHERE kind = 'todoShared';
