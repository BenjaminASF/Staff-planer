-- Each user's own choice for push notifications, on all their devices. It lasts until
-- they change it, also after signing out. An admin's push_blocked always comes first;
-- when it is lifted, this choice applies again.
--   push_enabled: on (🔔) or off (🔕)
--   push_level:   'all', or 'important' for schedule, placement, private chat and updates only
ALTER TABLE users ADD COLUMN push_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN push_level text NOT NULL DEFAULT 'all' CHECK (push_level IN ('all', 'important'));
