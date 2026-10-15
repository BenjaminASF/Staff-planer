-- Three statuses replace the old five: Tillgänglig, Ej tillgänglig and Ledig.
-- Sick and VAB become "Ej tillgänglig"; vacation becomes "Ledig".
ALTER TABLE people DROP CONSTRAINT IF EXISTS people_availability_check;
UPDATE people SET availability = 'unavailable' WHERE availability IN ('sick', 'vab');
UPDATE people SET availability = 'off' WHERE availability = 'vacation';
ALTER TABLE people ADD CONSTRAINT people_availability_check
  CHECK (availability IN ('available', 'unavailable', 'off'));
