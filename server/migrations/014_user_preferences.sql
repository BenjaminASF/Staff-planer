-- Personal settings (theme, automatic sign-out, tips, sounds, schedule view). They
-- belong to one login, so every user keeps their own on every device.
ALTER TABLE users ADD COLUMN preferences jsonb NOT NULL DEFAULT '{}';
