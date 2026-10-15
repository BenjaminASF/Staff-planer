-- "Höger hand" assists the shift leader and runs the shift when the leader is away.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'shift_leader', 'right_hand', 'operator'));
