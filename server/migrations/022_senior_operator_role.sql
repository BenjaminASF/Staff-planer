-- "Senior operatör" is an operator who also records waste and comments on the production page.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'shift_leader', 'right_hand', 'senior_operator', 'operator'));
