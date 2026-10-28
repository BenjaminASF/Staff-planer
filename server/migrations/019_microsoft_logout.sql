-- The Microsoft account's login_hint claim, if the app registration sends it. Signing out
-- passes it to Microsoft so the person is signed out there without picking an account.
ALTER TABLE sessions ADD COLUMN microsoft_login_hint text;
