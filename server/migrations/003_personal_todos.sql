-- "Att göra" becomes a personal list per user (scope 'user:<user id>') instead of
-- one list per shift. Each shift's existing list is copied to the shift leaders of
-- that shift, or to every admin if the shift has no leader. A user who gets several
-- lists gets them in shift order, each keeping its own item order.
WITH shift_todos AS (
  SELECT d.scope AS shift_id, s.sort_order, d.value
    FROM documents d
    LEFT JOIN shifts s ON s.id = d.scope
   WHERE d.key = 'todos' AND d.scope <> 'global' AND d.scope NOT LIKE 'user:%'
     AND jsonb_typeof(d.value) = 'array' AND jsonb_array_length(d.value) > 0
),
leaders AS (
  SELECT st.shift_id, u.id AS user_id
    FROM shift_todos st
    JOIN people p ON p.shift_id = st.shift_id
    JOIN users u ON u.person_id = p.id AND u.role = 'shift_leader'
),
owners AS (
  SELECT shift_id, user_id FROM leaders
  UNION
  SELECT st.shift_id, u.id
    FROM shift_todos st
    JOIN users u ON u.role = 'admin'
   WHERE NOT EXISTS (SELECT 1 FROM leaders l WHERE l.shift_id = st.shift_id)
)
INSERT INTO documents (scope, key, value)
SELECT 'user:' || o.user_id, 'todos', jsonb_agg(t.item ORDER BY st.sort_order NULLS LAST, st.shift_id, t.position)
  FROM owners o
  JOIN shift_todos st ON st.shift_id = o.shift_id
  CROSS JOIN LATERAL jsonb_array_elements(st.value) WITH ORDINALITY AS t(item, position)
 GROUP BY o.user_id;

DELETE FROM documents WHERE key = 'todos' AND scope <> 'global' AND scope NOT LIKE 'user:%';
