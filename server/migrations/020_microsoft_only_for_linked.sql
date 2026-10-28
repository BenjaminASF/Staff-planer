-- Users linked to a Microsoft account now sign in with Microsoft only. Their sessions from a
-- password sign-in end, so nobody stays signed in with a password that no longer works.
DELETE FROM sessions s
 USING users u
 WHERE s.user_id = u.id
   AND u.entra_oid IS NOT NULL
   AND NOT s.via_microsoft;
