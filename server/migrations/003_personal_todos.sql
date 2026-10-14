-- "Att göra" becomes a personal list per user (scope 'user:<user id>') instead of
-- one list per shift. Each shift's existing list is copied to the shift leaders of
-- that shift, or to every admin if the shift has no leader.
WITH shift_todos AS (
  SELECT scope AS shift_id, value
    FROM documents
   WHERE key = 'todos' AND scope <> 'global' AND scope NOT LIKE 'user:%'
     AND jsonb_typeof(value) = 'array' AND jsonb_array_length(value) > 0
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
SELECT 'user:' || o.user_id, 'todos', jsonb_agg(item)
  FROM owners o
  JOIN shift_todos st ON st.shift_id = o.shift_id
  CROSS JOIN LATERAL jsonb_array_elements(st.value) AS item
 GROUP BY o.user_id;

DELETE FROM documents WHERE key = 'todos' AND scope <> 'global' AND scope NOT LIKE 'user:%';
