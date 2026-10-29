-- Notes about the user's own schedule. While one is unread, later changes to the same
-- week update it instead of adding another, so a burst of changes is one note.
ALTER TABLE notifications ADD COLUMN ref_key text;
CREATE UNIQUE INDEX notifications_unread_ref_idx ON notifications (user_id, ref_key) WHERE read_at IS NULL;
