const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { withTransaction } = require("../db");
const {
  isAdmin, normalizeAvailability, documentCategory, personalScope, PERSONAL_SCOPE_PREFIX, canReadDocument, canExportShiftBackup
} = require("../permissions");
const { putDocument, mergeIntoPersonalList, isPlainObject, serializeShift, addAuditEvent } = require("../store");
const { evaluatedPersonIds, onlyFor } = require("../evaluations");
const { cleanText, cleanEmail, SHIFT_COLORS } = require("../validation");

// Version 3 leaves personal lists out. Version 2 backups kept "Att göra" per shift.
const EXPORT_VERSION = 3;
const IMPORT_VERSIONS = [2, 3];
const NOT_PERSONAL_SQL = "scope NOT LIKE $1";
const PERSONAL_SCOPE_PATTERN = `${PERSONAL_SCOPE_PREFIX}%`;
// A backup of one shift holds only part of the shared documents, so it cannot be imported.
const SHIFT_BACKUP_KIND = "shift";

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) throw new HttpError(403, "Endast admin.");
  next();
}

// A backup with a broken address should still import; the address is dropped.
function validEmailOrEmpty(value) {
  try { return cleanEmail(value); } catch { return ""; }
}

async function upsertPerson(db, person, shiftId) {
  const name = cleanText(person?.name, 120);
  if (typeof person?.id !== "string" || !person.id || !name) return false;
  await db.query(
    `INSERT INTO people (id, name, company, phone, email, availability, shift_id, demo, created_at)
     VALUES ($1, $2, $3, $4, $9, $5, $6, $7, COALESCE($8::timestamptz, now()))
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, company = EXCLUDED.company, phone = EXCLUDED.phone,
       email = CASE WHEN $10::boolean THEN EXCLUDED.email ELSE people.email END,
       availability = EXCLUDED.availability, shift_id = EXCLUDED.shift_id, demo = EXCLUDED.demo, updated_at = now()`,
    [
      person.id.slice(0, 100),
      name,
      cleanText(person.company, 120),
      cleanText(person.phone, 40),
      normalizeAvailability(person.availability) || "available",
      shiftId,
      person.demo === true,
      typeof person.createdAt === "string" && !Number.isNaN(Date.parse(person.createdAt)) ? person.createdAt : null,
      validEmailOrEmpty(person.email),
      // Older backups have no e-mail; importing them keeps the addresses already saved.
      "email" in person
    ]
  );
  return true;
}

function adminRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser, requireAdmin);

  // Full backup of shifts, staff and app data. Passwords and personal lists
  // ("Att göra", which only their owner may read) are never exported.
  router.get("/export", async (req, res) => {
    const [shifts, people, documents] = await Promise.all([
      pool.query("SELECT id, name, color, sort_order FROM shifts ORDER BY sort_order"),
      pool.query("SELECT id, name, company, phone, email, availability, shift_id, demo, created_at FROM people ORDER BY name"),
      pool.query(`SELECT scope, key, value FROM documents WHERE ${NOT_PERSONAL_SQL} ORDER BY scope, key`, [PERSONAL_SCOPE_PATTERN])
    ]);
    res.setHeader("Content-Disposition", `attachment; filename="staff-planner-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json({
      app: "Staff Planner",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      shifts: shifts.rows.map(serializeShift),
      people: people.rows.map(serializePerson),
      documents: documents.rows
    });
  });

  // Restores a backup made by /export. Documents are replaced; shifts and people
  // are updated or added, but nobody is removed, so no one loses their login.
  // Personal lists are not in backups and are left as they are.
  router.post("/import", async (req, res) => {
    const payload = req.body;
    if (payload?.kind === SHIFT_BACKUP_KIND) {
      throw new HttpError(400, "Det här är en backup av ett enda skift. Den kan inte läsas in, eftersom den bara innehåller en del av datan.");
    }
    if (payload?.app !== "Staff Planner" || !IMPORT_VERSIONS.includes(payload.version)
      || !Array.isArray(payload.shifts) || !Array.isArray(payload.people) || !Array.isArray(payload.documents)) {
      throw new HttpError(400, "Filen är inte en giltig backup från den här versionen av Staff Planner.");
    }
    const shiftIds = new Set(payload.shifts.map(shift => shift?.id).filter(id => typeof id === "string" && id));
    const validDocs = payload.documents.filter(doc =>
      doc && typeof doc.scope === "string" && typeof doc.key === "string" && (doc.scope === "global" || shiftIds.has(doc.scope)));
    const documents = validDocs.filter(doc => documentCategory(doc.scope, doc.key));
    // Version 2 backups kept one to-do list per shift. Those items join the importing
    // admin's own list, in shift order, instead of being dropped.
    const shiftOrder = [...shiftIds];
    const oldTodos = payload.version === 2
      ? validDocs.filter(doc => doc.scope !== "global" && doc.key === "todos" && Array.isArray(doc.value))
        .sort((a, b) => shiftOrder.indexOf(a.scope) - shiftOrder.indexOf(b.scope))
        .flatMap(doc => doc.value)
      : [];
    // Each color belongs to one shift: if a backup gives several shifts the same color, the first keeps it.
    const importedColors = new Set();
    const importColor = shift => {
      // Backups from before shift colors keep the shift's current color.
      if (shift.color === "") return "";
      if (!SHIFT_COLORS.includes(shift.color)) return null;
      if (importedColors.has(shift.color)) return "";
      importedColors.add(shift.color);
      return shift.color;
    };
    await withTransaction(pool, async client => {
      const shiftColors = new Map(payload.shifts
        .filter(shift => shiftIds.has(shift?.id) && cleanText(shift?.name, 60))
        .map(shift => [shift, importColor(shift)]));
      // Colors the backup hands out are taken from the shifts that have them now, so they can move freely.
      await client.query("UPDATE shifts SET color = '' WHERE color = ANY($1::text[])", [[...importedColors]]);
      for (const shift of payload.shifts) {
        const name = cleanText(shift?.name, 60);
        if (!shiftIds.has(shift?.id) || !name) continue;
        const color = shiftColors.get(shift);
        await client.query(
          `INSERT INTO shifts (id, name, sort_order, color) VALUES ($1, $2, $3, COALESCE($4, ''))
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order,
             color = COALESCE($4, shifts.color)`,
          [shift.id, name, Number.isInteger(shift.sortOrder) ? shift.sortOrder : 0, color]
        );
      }
      for (const person of payload.people) {
        await upsertPerson(client, person, shiftIds.has(person?.shiftId) ? person.shiftId : null);
      }
      await client.query(`DELETE FROM documents WHERE ${NOT_PERSONAL_SQL}`, [PERSONAL_SCOPE_PATTERN]);
      for (const doc of documents) await putDocument(client, doc.scope, doc.key, doc.value, req.user.id);
      if (oldTodos.length) await mergeIntoPersonalList(client, req.user.id, "todos", oldTodos);
    });
    res.json({ ok: true, shifts: shiftIds.size, people: payload.people.length, documents: documents.length, todos: oldTodos.length });
  });

  // Moves data from the old single-device version. The browser decrypts the old
  // data with the old password and sends it here, already mapped to new keys.
  router.post("/import-legacy", async (req, res) => {
    const { shiftId, people, global, shift } = req.body || {};
    const { rows } = await pool.query("SELECT 1 FROM shifts WHERE id = $1", [String(shiftId || "")]);
    if (!rows.length) throw new HttpError(400, "Välj vilket skift den gamla datan ska höra till.");
    const globalDocs = Object.entries(isPlainObject(global) ? global : {}).filter(([key]) => documentCategory("global", key));
    const shiftDocs = Object.entries(isPlainObject(shift) ? shift : {}).filter(([key]) => documentCategory(shiftId, key));
    // The old version had one to-do list; its items join the importing admin's own list.
    const personalDocs = Object.entries(isPlainObject(shift) ? shift : {})
      .filter(([key, value]) => documentCategory(personalScope(req.user.id), key) && Array.isArray(value));
    const peopleList = Array.isArray(people) ? people : [];
    let importedPeople = 0;
    await withTransaction(pool, async client => {
      for (const person of peopleList) {
        if (await upsertPerson(client, person, shiftId)) importedPeople += 1;
      }
      for (const [key, value] of globalDocs) await putDocument(client, "global", key, value, req.user.id);
      for (const [key, value] of shiftDocs) await putDocument(client, shiftId, key, value, req.user.id);
      for (const [key, value] of personalDocs) await mergeIntoPersonalList(client, req.user.id, key, value);
    });
    res.json({ ok: true, people: importedPeople, documents: globalDocs.length + shiftDocs.length + personalDocs.length });
  });

  return router;
}

const serializePerson = row => ({
  id: row.id, name: row.name, company: row.company, phone: row.phone, email: row.email, availability: row.availability,
  shiftId: row.shift_id, demo: row.demo, createdAt: row.created_at
});

// A shift leader's backup of their own shift: the shift, its people and its documents.
// Shared settings are included; competence only for the shift's people, and test results
// and assessments only for the people the leader evaluates. Passwords, personal lists and
// other shifts are never in it.
function shiftBackupRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser);

  router.get("/shift", async (req, res) => {
    if (!canExportShiftBackup(req.user)) throw new HttpError(403, "Endast skiftledare kan exportera en backup av sitt skift.");
    const shiftId = req.user.shiftId;
    const [shift, people, documents, evaluated] = await Promise.all([
      pool.query("SELECT id, name, color, sort_order FROM shifts WHERE id = $1", [shiftId]),
      pool.query("SELECT id, name, company, phone, email, availability, shift_id, demo, created_at FROM people WHERE shift_id = $1 ORDER BY name", [shiftId]),
      pool.query("SELECT scope, key, value FROM documents WHERE scope = $1 OR scope = 'global' ORDER BY scope, key", [shiftId]),
      evaluatedPersonIds(pool, req.user)
    ]);
    if (!shift.rows[0]) throw new HttpError(404, "Skiftet finns inte.");
    const shiftPeople = new Set(people.rows.map(row => row.id));
    const readable = documents.rows.filter(doc => canReadDocument(req.user, doc.scope, doc.key)
      && documentCategory(doc.scope, doc.key) !== "configPrivate");
    const backup = readable.map(doc => {
      const category = documentCategory(doc.scope, doc.key);
      if (category === "competence") return { ...doc, value: onlyFor(doc.key, doc.value, shiftPeople) };
      if (category === "evaluation") return { ...doc, value: onlyFor(doc.key, doc.value, evaluated) };
      return doc;
    });
    const today = new Date().toISOString().slice(0, 10);
    await addAuditEvent(pool, { scope: shiftId, type: "backup", title: "Backup av skiftet exporterad", detail: today, userId: req.user.id });
    res.setHeader("Content-Disposition", `attachment; filename="staff-planner-skift-backup-${today}.json"`);
    res.json({
      app: "Staff Planner",
      version: EXPORT_VERSION,
      kind: SHIFT_BACKUP_KIND,
      shiftId,
      exportedAt: new Date().toISOString(),
      shifts: shift.rows.map(serializeShift),
      people: people.rows.map(serializePerson),
      documents: backup
    });
  });

  return router;
}

module.exports = { adminRoutes, shiftBackupRoutes };
