-- E-mail address used to tell operators when their week's schedule is shared.
ALTER TABLE people ADD COLUMN email text NOT NULL DEFAULT '';
