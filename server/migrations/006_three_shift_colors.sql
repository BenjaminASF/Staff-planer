-- Shifts are colored only Red, Blue or Yellow. Shifts that had another color lose it.
UPDATE shifts SET color = '' WHERE color NOT IN ('', 'red', 'blue', 'yellow');
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_color_check;
ALTER TABLE shifts ADD CONSTRAINT shifts_color_check CHECK (color IN ('', 'red', 'blue', 'yellow'));
