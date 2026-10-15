-- More shift colors, and each color belongs to at most one shift.
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_color_check;
ALTER TABLE shifts ADD CONSTRAINT shifts_color_check
  CHECK (color IN ('', 'red', 'blue', 'yellow', 'green', 'purple', 'orange', 'brown'));

-- Shifts that share a color: the first one keeps it, the others lose it.
UPDATE shifts s SET color = ''
  FROM (SELECT id, row_number() OVER (PARTITION BY color ORDER BY sort_order, created_at, id) AS position
          FROM shifts WHERE color <> '') d
 WHERE d.id = s.id AND d.position > 1;

CREATE UNIQUE INDEX shifts_color_unique ON shifts (color) WHERE color <> '';
