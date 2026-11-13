-- "Slutförd" is announced once per work order: when the notice went out. Opening it
-- again and marking it Slutförd a second time sends no new notice.
ALTER TABLE work_orders ADD COLUMN completion_notified_at timestamptz;
-- Work orders already completed have had their notice.
UPDATE work_orders SET completion_notified_at = completed_at WHERE completed_at IS NOT NULL;
