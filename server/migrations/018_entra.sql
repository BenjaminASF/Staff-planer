-- Sign-in with Microsoft (Entra ID). entra_oid is the Microsoft account's object id,
-- stored at the first Microsoft sign-in so the link survives a changed e-mail address.
ALTER TABLE users ADD COLUMN entra_oid text;
CREATE UNIQUE INDEX users_entra_oid_idx ON users (entra_oid) WHERE entra_oid IS NOT NULL;

-- A session started with Microsoft does not ask for the temporary password to be replaced:
-- the person never needs it. Signing in with the password still does.
ALTER TABLE sessions ADD COLUMN via_microsoft boolean NOT NULL DEFAULT false;
