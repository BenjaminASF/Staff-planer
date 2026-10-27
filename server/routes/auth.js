const crypto = require("node:crypto");
const express = require("express");
const {
  HttpError, hashPassword, verifyPassword, getDummyHash, normalizeUsername, validateUsername,
  validatePassword, createSession, destroySession, requireUser, allowWithoutPasswordChange
} = require("../auth");
const { withTransaction } = require("../db");
const { ROLES, editablePersonFields } = require("../permissions");
const { newId, serializeShift, getPersonById, addAuditEvent } = require("../store");
const { availabilityLabel, cleanPersonFields, cleanPreferences } = require("../validation");
const { claimDevice } = require("../push");

function buildDismissedMessages(user) {
  return [...new Set([...(user.dismissedMessages || []), ...(user.sessionDismissedMessages || [])])];
}

async function buildMePayload(db, user) {
  const [person, shifts] = await Promise.all([
    getPersonById(db, user.personId),
    db.query("SELECT id, name, color, sort_order FROM shifts ORDER BY sort_order, name")
  ]);
  return {
    user: { id: user.id, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword },
    person,
    shifts: shifts.rows.map(serializeShift),
    dismissedMessages: buildDismissedMessages(user),
    preferences: user.preferences || {}
  };
}

const MESSAGE_ID_PATTERN = /^[a-z0-9:._-]{1,80}$/i;

function authRoutes({ pool, setupCode, loginLimiter }) {
  const router = express.Router();

  router.get("/health", async (req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  });

  router.get("/setup", async (req, res) => {
    const { rows } = await pool.query("SELECT EXISTS (SELECT 1 FROM users) AS has_users");
    res.json({ needsSetup: !rows[0].has_users, setupCodeConfigured: Boolean(setupCode) });
  });

  // Creates the first admin account. Only possible while there are no users,
  // and only with the SETUP_CODE configured on the server.
  router.post("/setup", async (req, res) => {
    if (!setupCode) throw new HttpError(503, "Servern saknar SETUP_CODE. Lägg till variabeln i Railway och starta om.");
    const { setupCode: givenCode, name, username: rawUsername, password } = req.body || {};
    const expected = Buffer.from(String(setupCode));
    const given = Buffer.from(String(givenCode || ""));
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
      throw new HttpError(403, "Fel installationskod.");
    }
    const username = normalizeUsername(rawUsername);
    validateUsername(username);
    validatePassword(password);
    const personName = String(name || "").trim().slice(0, 120);
    if (!personName) throw new HttpError(400, "Ange ditt namn.");
    const passwordHash = await hashPassword(password);
    const user = await withTransaction(pool, async client => {
      await client.query("LOCK TABLE users IN EXCLUSIVE MODE");
      const { rows } = await client.query("SELECT EXISTS (SELECT 1 FROM users) AS has_users");
      if (rows[0].has_users) throw new HttpError(409, "Systemet är redan installerat. Logga in i stället.");
      const personId = newId();
      const id = newId();
      await client.query("INSERT INTO people (id, name) VALUES ($1, $2)", [personId, personName]);
      await client.query(
        "INSERT INTO users (id, person_id, username, password_hash, role) VALUES ($1, $2, $3, $4, $5)",
        [id, personId, username, passwordHash, ROLES.ADMIN]
      );
      return { id, username, role: ROLES.ADMIN, mustChangePassword: false, personId };
    });
    await createSession(pool, req, res, user.id);
    res.status(201).json(await buildMePayload(pool, user));
  });

  router.post("/login", async (req, res) => {
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || "");
    const ip = req.ip || "";
    loginLimiter.check(ip, username);
    const { rows } = await pool.query(
      "SELECT id, username, password_hash, role, must_change_password, person_id, dismissed_messages, preferences FROM users WHERE username = $1",
      [username]
    );
    const row = rows[0];
    const valid = await verifyPassword(password, row ? row.password_hash : await getDummyHash());
    if (!row || !valid) {
      loginLimiter.fail(ip, username);
      throw new HttpError(401, "Fel användarnamn eller lösenord.");
    }
    loginLimiter.reset(ip, username);
    await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [row.id]);
    await pool.query("DELETE FROM sessions WHERE expires_at < now()");
    const sessionHash = await createSession(pool, req, res, row.id);
    // The page sends this device's push subscription, if it has one: see claimDevice.
    await claimDevice(pool, { userId: row.id, sessionHash, endpoint: req.body?.pushEndpoint });
    res.json(await buildMePayload(pool, {
      id: row.id, username: row.username, role: row.role, mustChangePassword: row.must_change_password, personId: row.person_id,
      dismissedMessages: row.dismissed_messages, preferences: row.preferences
    }));
  });

  router.post("/logout", async (req, res) => {
    await destroySession(pool, req, res);
    res.json({ ok: true });
  });

  router.get("/me", allowWithoutPasswordChange, requireUser, async (req, res) => {
    res.json(await buildMePayload(pool, req.user));
  });

  // Own profile: phone and status for every role; name and e-mail only for shift managers (see permissions.js).
  router.patch("/me", requireUser, async (req, res) => {
    const person = await getPersonById(pool, req.user.personId);
    const allowed = editablePersonFields(req.user, person).filter(field => ["name", "phone", "email", "availability"].includes(field));
    const changes = cleanPersonFields(req.body || {}, allowed);
    if (!Object.keys(changes).length) return res.json(await buildMePayload(pool, req.user));
    await withTransaction(pool, async client => {
      const sets = Object.keys(changes).map((column, index) => `${column} = $${index + 2}`);
      await client.query(`UPDATE people SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`, [person.id, ...Object.values(changes)]);
      if (changes.availability && changes.availability !== person.availability && person.shiftId) {
        await addAuditEvent(client, {
          scope: person.shiftId,
          type: "availability",
          title: `${changes.name || person.name}: ${availabilityLabel(changes.availability)}`,
          detail: "Ändrad av personen själv",
          undo: { action: "availability", personId: person.id, value: person.availability },
          userId: req.user.id
        });
      }
    });
    res.json(await buildMePayload(pool, req.user));
  });

  router.post("/me/password", allowWithoutPasswordChange, requireUser, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    if (!rows[0] || !(await verifyPassword(String(currentPassword || ""), rows[0].password_hash))) {
      throw new HttpError(400, "Nuvarande lösenord är fel.");
    }
    validatePassword(newPassword);
    if (newPassword === currentPassword) throw new HttpError(400, "Välj ett nytt lösenord som skiljer sig från det gamla.");
    const passwordHash = await hashPassword(newPassword);
    const devices = await withTransaction(pool, async client => {
      await client.query(
        "UPDATE users SET password_hash = $2, must_change_password = false, updated_at = now() WHERE id = $1",
        [req.user.id, passwordHash]
      );
      // Sign out other devices; this one gets a fresh session below, and keeps push on.
      const { rows } = await client.query("SELECT id FROM push_subscriptions WHERE session_hash = $1", [req.sessionTokenHash]);
      await client.query("DELETE FROM sessions WHERE user_id = $1", [req.user.id]);
      return rows.map(device => device.id);
    });
    const sessionHash = await createSession(pool, req, res, req.user.id, req.user.sessionDismissedMessages);
    await pool.query("UPDATE push_subscriptions SET session_hash = $2, signed_out_at = NULL WHERE id = ANY($1::text[])", [devices, sessionHash]);
    res.json(await buildMePayload(pool, { ...req.user, mustChangePassword: false }));
  });

  // Hides an info message for this user: permanently, or until the next login.
  router.post("/me/dismissed-messages", requireUser, async (req, res) => {
    const id = String(req.body?.id || "");
    if (!MESSAGE_ID_PATTERN.test(id)) throw new HttpError(400, "Ogiltigt meddelande.");
    const append = "dismissed_messages = CASE WHEN $2 = ANY(dismissed_messages) THEN dismissed_messages ELSE array_append(dismissed_messages, $2) END";
    if (req.body?.permanent === true) {
      await pool.query(`UPDATE users SET ${append} WHERE id = $1`, [req.user.id, id]);
      req.user.dismissedMessages = [...req.user.dismissedMessages, id];
    } else {
      await pool.query(`UPDATE sessions SET ${append} WHERE token_hash = $1`, [req.sessionTokenHash, id]);
      req.user.sessionDismissedMessages = [...req.user.sessionDismissedMessages, id];
    }
    res.json({ dismissedMessages: buildDismissedMessages(req.user) });
  });

  // Own settings: theme, automatic sign-out and the like. They are stored on the login,
  // so they follow the user to every device and never change anyone else's.
  router.patch("/me/preferences", requireUser, async (req, res) => {
    const { set, remove } = cleanPreferences(req.body);
    const { rows } = await pool.query(
      "UPDATE users SET preferences = (preferences - $3::text[]) || $2::jsonb WHERE id = $1 RETURNING preferences",
      [req.user.id, JSON.stringify(set), remove]
    );
    res.json({ preferences: rows[0].preferences });
  });

  return router;
}

module.exports = { authRoutes, buildMePayload };
