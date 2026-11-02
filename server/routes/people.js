const express = require("express");
const { HttpError, hashPassword, normalizeUsername, validateUsername, validatePassword, requireUser } = require("../auth");
const { withTransaction } = require("../db");
const {
  ROLES, ROLE_VALUES, normalizeAvailability, isAdmin, roleNeedsShift, canSeeAllPeople, canCreatePerson, editablePersonFields,
  canDeletePerson, canCreateAccount, canResetPassword, canChangeRole, canChangeUsername, canDeleteAccount, canManagePush,
  isTemporary, canManageTemporaryAccounts, TEMPORARY_ROLES, FEATURE_VALUES
} = require("../permissions");
const {
  newId, serializePerson, PERSON_SELECT, getPersonById, purgePersonFromDocuments, deletePersonalDocuments,
  clearPersonFromShiftSchedules, addAuditEvent
} = require("../store");
const { availabilityLabel, cleanPersonFields, cleanText, cleanEmail } = require("../validation");
const { notifyAdminChange, notifyPlacementChange } = require("../notifications");

async function requirePerson(db, id) {
  const person = await getPersonById(db, id);
  if (!person) throw new HttpError(404, "Personen finns inte.");
  return person;
}

async function assertShiftExists(db, shiftId) {
  if (!shiftId) return;
  const { rows } = await db.query("SELECT 1 FROM shifts WHERE id = $1", [shiftId]);
  if (!rows.length) throw new HttpError(400, "Skiftet finns inte.");
}

async function countAdmins(db) {
  const { rows } = await db.query("SELECT count(*)::int AS count FROM users WHERE role = 'admin'");
  return rows[0].count;
}

function validateRole(role) {
  if (!ROLE_VALUES.includes(role)) throw new HttpError(400, "Okänd roll.");
}

// Temporary accounts last at most this long at a time; an admin can extend them.
const MAX_TEMPORARY_DAYS = 366;

// The end date of a temporary account, as a Date in the future.
function parseExpiresAt(value) {
  const date = new Date(typeof value === "string" || typeof value === "number" ? value : NaN);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, "Ange när det tillfälliga kontot ska sluta gälla.");
  if (date.getTime() <= Date.now()) throw new HttpError(400, "Slutdatumet måste ligga i framtiden.");
  if (date.getTime() > Date.now() + MAX_TEMPORARY_DAYS * 24 * 60 * 60 * 1000) {
    throw new HttpError(400, `Ett tillfälligt konto kan gälla högst ${MAX_TEMPORARY_DAYS} dagar i taget.`);
  }
  return date;
}

function parseFeatures(value) {
  if (!Array.isArray(value)) throw new HttpError(400, "Ogiltiga funktioner.");
  const unknown = value.filter(feature => !FEATURE_VALUES.includes(feature));
  if (unknown.length) throw new HttpError(400, "Okänd funktion.");
  return [...new Set(value)];
}

function validateTemporaryRole(role) {
  if (!TEMPORARY_ROLES.includes(role)) throw new HttpError(400, "Ett tillfälligt konto kan inte vara admin.");
}

// account.temporary makes a temporary account (admins only): it ends at account.expiresAt,
// reaches only account.features and keeps the password the admin chose until its user
// changes it, if they want to.
async function insertAccount(db, person, account, mustChangePassword, creator) {
  const { username: rawUsername, password, role } = account;
  const temporary = account.temporary === true;
  const username = normalizeUsername(rawUsername);
  validateUsername(username);
  validatePassword(password);
  validateRole(role);
  if (temporary) {
    if (!canManageTemporaryAccounts(creator)) throw new HttpError(403, "Endast admin kan skapa tillfälliga konton.");
    validateTemporaryRole(role);
  }
  if (roleNeedsShift(role) && !person.shiftId) throw new HttpError(400, "En skiftledare eller höger hand måste tillhöra ett skift.");
  const expiresAt = temporary ? parseExpiresAt(account.expiresAt) : null;
  const features = temporary ? parseFeatures(account.features ?? []) : [];
  const { rows } = await db.query("SELECT 1 FROM users WHERE username = $1", [username]);
  if (rows.length) throw new HttpError(409, "Användarnamnet är redan upptaget.");
  await db.query(
    `INSERT INTO users (id, person_id, username, password_hash, role, must_change_password, temporary, expires_at, features, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [newId(), person.id, username, await hashPassword(password), role, temporary ? false : mustChangePassword,
      temporary, expiresAt, features, temporary ? creator.id : null]
  );
  if (temporary) {
    await addAuditEvent(db, {
      scope: person.shiftId || "global",
      type: "temporaryAccount",
      title: `Tillfälligt konto skapat: ${username}`,
      detail: `Gäller till ${formatEnd(expiresAt)}`,
      userId: creator.id
    });
  }
}

const formatEnd = date => new Date(date).toLocaleString("sv-SE", {
  timeZone: process.env.APP_TIME_ZONE || "Europe/Stockholm", dateStyle: "short", timeStyle: "short"
});

// What a temporary account sees of the staff: its own record, and the people in its own shift
// without contact details or logins, which is what the schedule and break plan need.
async function peopleForTemporary(db, user) {
  const own = await getPersonById(db, user.personId);
  if (!user.shiftId) return [own];
  const { rows } = await db.query(`${PERSON_SELECT} WHERE p.shift_id = $1 AND p.id <> $2 ORDER BY lower(p.name)`, [user.shiftId, user.personId]);
  return [own, ...rows.map(serializePerson).map(person => ({
    ...person, phone: "", email: "", account: person.account ? { role: person.account.role } : null
  }))];
}

async function accountUserId(db, personId) {
  const { rows } = await db.query("SELECT id FROM users WHERE person_id = $1", [personId]);
  return rows[0]?.id || null;
}

// End date, disabled and functions of a temporary account (admins only, checked by the caller).
// Every request reads them afresh (see loadUser), so a change applies at once. Returns whether
// the account's open pages must reconnect: it was disabled (its sessions end) or its functions changed.
async function updateTemporaryAccount(db, person, body, admin) {
  const changes = [];
  const sets = [];
  const params = [person.id];
  const set = (sql, value) => { params.push(value); sets.push(`${sql} = $${params.length}`); };
  if ("expiresAt" in body) {
    const expiresAt = parseExpiresAt(body.expiresAt);
    set("expires_at", expiresAt);
    changes.push(`Gäller till ${formatEnd(expiresAt)}`);
  }
  if ("features" in body) set("features", parseFeatures(body.features));
  let endsSessions = false;
  if ("disabled" in body && body.disabled !== person.account.disabled) {
    if (typeof body.disabled !== "boolean") throw new HttpError(400, "Ogiltigt värde för inaktivering.");
    sets.push(`disabled_at = ${body.disabled ? "now()" : "NULL"}`);
    changes.push(body.disabled ? "Inaktiverat" : "Aktiverat igen");
    endsSessions = body.disabled;
  }
  if (!sets.length) return false;
  const featuresChanged = "features" in body
    && [...parseFeatures(body.features)].sort().join() !== [...person.account.features].sort().join();
  await db.query(`UPDATE users SET ${sets.join(", ")}, updated_at = now() WHERE person_id = $1`, params);
  if (endsSessions) await db.query("DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE person_id = $1)", [person.id]);
  // Sessions never outlive the account, also after it is shortened.
  await db.query(
    "UPDATE sessions SET expires_at = LEAST(expires_at, (SELECT expires_at FROM users WHERE person_id = $1)) WHERE user_id = (SELECT id FROM users WHERE person_id = $1)",
    [person.id]
  );
  if (changes.length) {
    await addAuditEvent(db, {
      scope: person.shiftId || "global", type: "temporaryAccount",
      title: `Tillfälligt konto ändrat: ${person.account.username}`, detail: changes.join(" · "), userId: admin.id
    });
  }
  return endsSessions || featuresChanged;
}

function peopleRoutes({ pool, realtime }) {
  const router = express.Router();
  router.use(requireUser);

  // Admins, shift leaders and right hands get everyone. Operators get their own
  // record plus the names in their own shift, which is what the read-only schedule needs.
  router.get("/", async (req, res) => {
    if (isTemporary(req.user)) return res.json({ people: await peopleForTemporary(pool, req.user) });
    if (canSeeAllPeople(req.user)) {
      const { rows } = await pool.query(`${PERSON_SELECT} ORDER BY lower(p.name)`);
      return res.json({ people: rows.map(serializePerson) });
    }
    const own = await getPersonById(pool, req.user.personId);
    const { rows } = req.user.shiftId
      ? await pool.query("SELECT id, name, shift_id FROM people WHERE shift_id = $1 AND id <> $2 ORDER BY lower(name)", [req.user.shiftId, req.user.personId])
      : { rows: [] };
    const roster = rows.map(row => ({ id: row.id, name: row.name, shiftId: row.shift_id, limited: true }));
    res.json({ people: [own, ...roster] });
  });

  router.post("/", async (req, res) => {
    const body = req.body || {};
    const shiftId = body.shiftId ? String(body.shiftId) : (isAdmin(req.user) ? null : req.user.shiftId);
    if (!canCreatePerson(req.user, shiftId)) throw new HttpError(403, "Du kan bara lägga till personal i ditt eget skift.");
    const name = cleanText(body.name, 120);
    if (!name) throw new HttpError(400, "Ange ett namn.");
    const availability = normalizeAvailability(body.availability) || "available";
    const account = body.account && typeof body.account === "object" ? body.account : null;
    const id = await withTransaction(pool, async client => {
      await assertShiftExists(client, shiftId);
      const personId = newId();
      await client.query(
        "INSERT INTO people (id, name, company, phone, email, availability, shift_id, demo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [personId, name, cleanText(body.company, 120), cleanText(body.phone, 40), cleanEmail(body.email), availability, shiftId, body.demo === true]
      );
      if (account) {
        const role = account.role || ROLES.OPERATOR;
        const person = { id: personId, shiftId };
        if (!canCreateAccount(req.user, person, role)) throw new HttpError(403, "Du kan bara skapa konton med en roll under din egen, i ditt eget skift.");
        await insertAccount(client, person, { ...account, role }, account.mustChangePassword !== false, req.user);
      }
      return personId;
    });
    res.status(201).json({ person: await getPersonById(pool, id) });
  });

  router.patch("/:id", async (req, res) => {
    const person = await requirePerson(pool, req.params.id);
    const allowed = editablePersonFields(req.user, person);
    if (!allowed.length) throw new HttpError(403, "Du har inte behörighet att ändra den här personen.");
    const changes = cleanPersonFields(req.body || {}, allowed);
    if (!Object.keys(changes).length) return res.json({ person });
    await withTransaction(pool, async client => {
      if ("shift_id" in changes) {
        await assertShiftExists(client, changes.shift_id);
        if (!changes.shift_id && roleNeedsShift(person.account?.role)) {
          throw new HttpError(400, "En skiftledare eller höger hand måste tillhöra ett skift. Byt roll först.");
        }
      }
      const sets = Object.keys(changes).map((column, index) => `${column} = $${index + 2}`);
      await client.query(`UPDATE people SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`, [person.id, ...Object.values(changes)]);
      if ("shift_id" in changes && person.shiftId && changes.shift_id !== person.shiftId) {
        await clearPersonFromShiftSchedules(client, person.id, person.shiftId, req.user.id);
      }
      if ("shift_id" in changes && changes.shift_id !== person.shiftId && person.account) {
        await notifyPlacementChange(client, { user: req.user, personId: person.id });
      }
      if (changes.availability && changes.availability !== person.availability && person.shiftId) {
        const event = {
          scope: person.shiftId,
          type: "availability",
          title: `${changes.name || person.name}: ${availabilityLabel(changes.availability)}`,
          detail: "Tillgänglighet uppdaterad"
        };
        await addAuditEvent(client, { ...event, undo: { action: "availability", personId: person.id, value: person.availability }, userId: req.user.id });
        await notifyAdminChange(client, { user: req.user, ...event });
      }
    });
    res.json({ person: await getPersonById(pool, person.id) });
  });

  // Deleting people (and with them their login) is reserved for admins.
  router.delete("/:id", async (req, res) => {
    if (!canDeletePerson(req.user)) throw new HttpError(403, "Endast admin kan ta bort personal och användare.");
    const person = await requirePerson(pool, req.params.id);
    if (person.id === req.user.personId) throw new HttpError(400, "Du kan inte ta bort dig själv.");
    const userId = await accountUserId(pool, person.id);
    await withTransaction(pool, async client => {
      if (person.account?.role === ROLES.ADMIN && await countAdmins(client) <= 1) {
        throw new HttpError(400, "Det måste finnas minst en admin.");
      }
      await purgePersonFromDocuments(client, person.id, req.user.id);
      await deletePersonalDocuments(client, person.id);
      await client.query("DELETE FROM people WHERE id = $1", [person.id]);
      const event = {
        scope: person.shiftId || "global",
        type: "person",
        title: `${person.name} borttagen`,
        detail: "Personal och kopplade uppgifter raderades"
      };
      await addAuditEvent(client, { ...event, userId: req.user.id });
      await notifyAdminChange(client, { user: req.user, ...event });
    });
    realtime?.disconnectUser(userId);
    res.json({ ok: true });
  });

  router.post("/:id/account", async (req, res) => {
    const person = await requirePerson(pool, req.params.id);
    if (person.account) throw new HttpError(409, "Personen har redan en inloggning.");
    const body = req.body || {};
    const role = body.role || ROLES.OPERATOR;
    if (!canCreateAccount(req.user, person, role)) {
      throw new HttpError(403, "Du kan bara skapa konton med en roll under din egen, för personal i ditt eget skift.");
    }
    await withTransaction(pool, client => insertAccount(client, person, { ...body, role }, body.mustChangePassword !== false, req.user));
    res.status(201).json({ person: await getPersonById(pool, person.id) });
  });

  router.patch("/:id/account", async (req, res) => {
    const person = await requirePerson(pool, req.params.id);
    if (!person.account) throw new HttpError(404, "Personen har ingen inloggning.");
    const body = req.body || {};
    const temporary = Boolean(person.account.temporary);
    // Only admins change a temporary account, in any way.
    if (temporary && !canManageTemporaryAccounts(req.user)) throw new HttpError(403, "Endast admin kan ändra tillfälliga konton.");
    if (!temporary && ["expiresAt", "disabled", "features"].some(field => field in body)) {
      throw new HttpError(400, "Bara tillfälliga konton har slutdatum, inaktivering och funktioner.");
    }
    let endsSessions = false;
    await withTransaction(pool, async client => {
      if (temporary && "role" in body) validateTemporaryRole(body.role);
      if (temporary) endsSessions = await updateTemporaryAccount(client, person, body, req.user);
      if ("role" in body && body.role !== person.account.role) {
        endsSessions = endsSessions || temporary;
        if (!canChangeRole(req.user, person, body.role)) {
          throw new HttpError(403, "Du kan bara ge eller ta bort roller som ligger under din egen, för personal i ditt eget skift.");
        }
        validateRole(body.role);
        if (person.account.role === ROLES.ADMIN && await countAdmins(client) <= 1) {
          throw new HttpError(400, "Det måste finnas minst en admin.");
        }
        if (roleNeedsShift(body.role) && !person.shiftId) throw new HttpError(400, "En skiftledare eller höger hand måste tillhöra ett skift.");
        await client.query("UPDATE users SET role = $2, updated_at = now() WHERE person_id = $1", [person.id, body.role]);
      }
      if ("username" in body && normalizeUsername(body.username) !== person.account.username) {
        if (!canChangeUsername(req.user)) throw new HttpError(403, "Endast admin kan byta användarnamn.");
        const username = normalizeUsername(body.username);
        validateUsername(username);
        const { rows } = await client.query("SELECT 1 FROM users WHERE username = $1", [username]);
        if (rows.length) throw new HttpError(409, "Användarnamnet är redan upptaget.");
        await client.query("UPDATE users SET username = $2, updated_at = now() WHERE person_id = $1", [person.id, username]);
      }
      // Only admins turn push notifications off (or on again) for someone else.
      if ("pushBlocked" in body && body.pushBlocked !== person.account.pushBlocked) {
        if (!canManagePush(req.user)) throw new HttpError(403, "Endast admin kan stänga av eller slå på pushnotiser för en användare.");
        if (typeof body.pushBlocked !== "boolean") throw new HttpError(400, "Ogiltigt värde för pushnotiser.");
        await client.query("UPDATE users SET push_blocked = $2, updated_at = now() WHERE person_id = $1", [person.id, body.pushBlocked]);
        if (body.pushBlocked) {
          await client.query("DELETE FROM push_outbox WHERE sent_at IS NULL AND user_id = (SELECT id FROM users WHERE person_id = $1)", [person.id]);
        }
      }
      // Unlinks the Microsoft account, for example one linked through a wrong e-mail address.
      // The next sign-in with Microsoft links by e-mail address again.
      if (body.microsoftLinked === false && person.account.microsoftLinked) {
        if (!canResetPassword(req.user, person, person.account)) {
          throw new HttpError(403, "Du kan bara koppla bort Microsoft för personal under din egen nivå i ditt eget skift.");
        }
        await client.query("UPDATE users SET entra_oid = NULL, updated_at = now() WHERE person_id = $1", [person.id]);
        await client.query("DELETE FROM sessions WHERE via_microsoft AND user_id = (SELECT id FROM users WHERE person_id = $1)", [person.id]);
      }
      if ("password" in body) {
        if (!canResetPassword(req.user, person, person.account)) {
          throw new HttpError(403, "Du kan bara återställa lösenord för personal under din egen nivå i ditt eget skift.");
        }
        validatePassword(body.password);
        // A reset password is temporary: the person chooses a new one at next login. Temporary
        // accounts keep the one the admin chose until they change it themselves, if they want to.
        await client.query(
          "UPDATE users SET password_hash = $2, must_change_password = NOT temporary, updated_at = now() WHERE person_id = $1",
          [person.id, await hashPassword(body.password)]
        );
        await client.query("DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE person_id = $1)", [person.id]);
        endsSessions = true;
      }
    });
    if (endsSessions) realtime?.disconnectUser(await accountUserId(pool, person.id));
    res.json({ person: await getPersonById(pool, person.id) });
  });

  // Removes the login but keeps the person in the staff list.
  router.delete("/:id/account", async (req, res) => {
    if (!canDeleteAccount(req.user)) throw new HttpError(403, "Endast admin kan ta bort användare.");
    const person = await requirePerson(pool, req.params.id);
    if (!person.account) throw new HttpError(404, "Personen har ingen inloggning.");
    if (person.id === req.user.personId) throw new HttpError(400, "Du kan inte ta bort din egen inloggning.");
    const userId = await accountUserId(pool, person.id);
    await withTransaction(pool, async client => {
      if (person.account.role === ROLES.ADMIN && await countAdmins(client) <= 1) {
        throw new HttpError(400, "Det måste finnas minst en admin.");
      }
      await deletePersonalDocuments(client, person.id);
      await client.query("DELETE FROM users WHERE person_id = $1", [person.id]);
      if (person.account.temporary) {
        await addAuditEvent(client, {
          scope: person.shiftId || "global", type: "temporaryAccount", title: `Tillfälligt konto borttaget: ${person.account.username}`, userId: req.user.id
        });
      }
    });
    realtime?.disconnectUser(userId);
    res.json({ person: await getPersonById(pool, person.id) });
  });

  return router;
}

module.exports = { peopleRoutes };
