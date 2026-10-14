-- Each shift can have a color that marks it in the app.
ALTER TABLE shifts ADD COLUMN color text NOT NULL DEFAULT ''
  CHECK (color IN ('', 'red', 'blue', 'yellow', 'green', 'purple', 'orange'));

-- The Red, Blue and Yellow shifts. Shifts that already have these names get
-- their color; missing ones are added after the existing shifts.
UPDATE shifts SET color = 'red' WHERE lower(name) = 'röd';
UPDATE shifts SET color = 'blue' WHERE lower(name) = 'blå';
UPDATE shifts SET color = 'yellow' WHERE lower(name) = 'gul';

INSERT INTO shifts (id, name, color, sort_order)
SELECT gen_random_uuid()::text, v.name, v.color,
       (SELECT COALESCE(max(sort_order), 0) FROM shifts) + v.position
  FROM (VALUES ('Röd', 'red', 1), ('Blå', 'blue', 2), ('Gul', 'yellow', 3)) AS v(name, color, position)
 WHERE NOT EXISTS (SELECT 1 FROM shifts s WHERE lower(s.name) = lower(v.name));
