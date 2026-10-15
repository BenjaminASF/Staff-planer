const express = require("express");
const { HttpError, hashPassword, normalizeUsername, validateUsername, validatePassword, requireUser } = require("../auth");
const { withTransaction } = require("../db");
const {
  ROLES, ROLE_VALUES, AVAILABILITY_VALUES, isAdmin, roleNeedsShift, canSeeAllPeople, canCreatePerson, editablePersonFields,
  canDeletePerson, canCreateAccount, canResetPassword, canChangeRole, canChangeUsername, canDeleteAccount, canSetAvailability
} = require("../permissions");
const {
  newId, serializePerson, PERSON_SELECT, getPersonById, purgePersonFromDocuments, deletePersonalDocuments,
  clearPersonFromShiftSchedules, addAuditEvent
} = require("../store");
const { availabilityLabel, cleanPersonFields, cleanText, cleanEmail } = require("../validation");

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

async function insertAccount(db, person, { username: rawUsername, password, role }, mustChangePassword) {
  const username = normalizeUsername(rawUsername);
  validateUsername(username);
  validatePassword(password);
  validateRole(role);
  if (roleNeedsShift(role) && !person.shiftId) throw new HttpError(400, "En skiftledare eller höger hand måste tillhöra ett skift.");
  const { rows } = await db.query("SELECT 1 FROM users WHERE username = $1", [username]);
  if (rows.length) throw new HttpError(409, "Användarnamnet är redan upptaget.");
  await db.query(
    "INSERT INTO users (id, person_id, username, password_hash, role, must_change_password) VALUES ($1, $2, $3, $4, $5, $6)",
    [newId(), person.id, username, await hashPassword(password), role, mustChangePassword]
  );
}

function peopleRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser);

  // Admins, shift leaders and right hands get everyone. Operators get their own
  // record plus the names in their own shift, which is what the read-only schedule needs.
  router.get("/", async (req, res) => {
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
    const availability = AVAILABILITY_VALUES.includes(body.availability) ? body.availability : "available";
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
        await insertAccount(client, person, { ...account, role }, account.mustChangePassword !== false);
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
    if (changes.availability && changes.availability !== person.availability && !canSetAvailability(req.user, changes.availability)) {
      throw new HttpError(403, "Endast admin, skiftledare och höger hand kan ange statusen Inte tillgänglig.");
    }
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
      if (changes.availability && changes.availability !== person.availability && person.shiftId) {
        await addAuditEvent(client, {
          scope: person.shiftId,
          type: "availability",
          title: `${changes.name || person.name}: ${availabilityLabel(changes.availability)}`,
          detail: "Tillgänglighet uppdaterad",
          undo: { action: "availability", personId: person.id, value: person.availability },
          userId: req.user.id
        });
      }
    });
    res.json({ person: await getPersonById(pool, person.id) });
  });

  // Deleting people (and with them their login) is reserved for admins.
  router.delete("/:id", async (req, res) => {
    if (!canDeletePerson(req.user)) throw new HttpError(403, "Endast admin kan ta bort personal och användare.");
    const person = await requirePerson(pool, req.params.id);
    if (person.id === req.user.personId) throw new HttpError(400, "Du kan inte ta bort dig själv.");
    await withTransaction(pool, async client => {
      if (person.account?.role === ROLES.ADMIN && await countAdmins(client) <= 1) {
        throw new HttpError(400, "Det måste finnas minst en admin.");
      }
      await purgePersonFromDocuments(client, person.id, req.user.id);
      await deletePersonalDocuments(client, person.id);
      await client.query("DELETE FROM people WHERE id = $1", [person.id]);
      await addAuditEvent(client, {
        scope: person.shiftId || "global",
        type: "person",
        title: `${person.name} borttagen`,
        detail: "Personal och kopplade uppgifter raderades",
        userId: req.user.id
      });
    });
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
    await withTransaction(pool, client => insertAccount(client, person, { ...body, role }, body.mustChangePassword !== false));
    res.status(201).json({ person: await getPersonById(pool, person.id) });
  });

  router.patch("/:id/account", async (req, res) => {
    const person = await requirePerson(pool, req.params.id);
    if (!person.account) throw new HttpError(404, "Personen har ingen inloggning.");
    const body = req.body || {};
    await withTransaction(pool, async client => {
      if ("role" in body && body.role !== person.account.role) {
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
      if ("password" in body) {
        if (!canResetPassword(req.user, person, person.account)) {
          throw new HttpError(403, "Du kan bara återställa lösenord för personal under din egen nivå i ditt eget skift.");
        }
        validatePassword(body.password);
        // A reset password is temporary: the person chooses a new one at next login.
        await client.query(
          "UPDATE users SET password_hash = $2, must_change_password = true, updated_at = now() WHERE person_id = $1",
          [person.id, await hashPassword(body.password)]
        );
        await client.query("DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE person_id = $1)", [person.id]);
      }
    });
    res.json({ person: await getPersonById(pool, person.id) });
  });

  // Removes the login but keeps the person in the staff list.
  router.delete("/:id/account", async (req, res) => {
    if (!canDeleteAccount(req.user)) throw new HttpError(403, "Endast admin kan ta bort användare.");
    const person = await requirePerson(pool, req.params.id);
    if (!person.account) throw new HttpError(404, "Personen har ingen inloggning.");
    if (person.id === req.user.personId) throw new HttpError(400, "Du kan inte ta bort din egen inloggning.");
    await withTransaction(pool, async client => {
      if (person.account.role === ROLES.ADMIN && await countAdmins(client) <= 1) {
        throw new HttpError(400, "Det måste finnas minst en admin.");
      }
      await deletePersonalDocuments(client, person.id);
      await client.query("DELETE FROM users WHERE person_id = $1", [person.id]);
    });
    res.json({ person: await getPersonById(pool, person.id) });
  });

  return router;
}

module.exports = { peopleRoutes };
