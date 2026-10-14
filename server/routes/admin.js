const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { withTransaction } = require("../db");
const { isAdmin, AVAILABILITY_VALUES, documentCategory, personalScope, personalScopeOwner } = require("../permissions");
const { putDocument, isPlainObject, serializeShift } = require("../store");
const { cleanText, SHIFT_COLORS } = require("../validation");

const EXPORT_VERSION = 2;

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) throw new HttpError(403, "Endast admin.");
  next();
}

async function upsertPerson(db, person, shiftId) {
  const name = cleanText(person?.name, 120);
  if (typeof person?.id !== "string" || !person.id || !name) return false;
  await db.query(
    `INSERT INTO people (id, name, company, phone, availability, shift_id, demo, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, now()))
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, company = EXCLUDED.company, phone = EXCLUDED.phone,
       availability = EXCLUDED.availability, shift_id = EXCLUDED.shift_id, demo = EXCLUDED.demo, updated_at = now()`,
    [
      person.id.slice(0, 100),
      name,
      cleanText(person.company, 120),
      cleanText(person.phone, 40),
      AVAILABILITY_VALUES.includes(person.availability) ? person.availability : "available",
      shiftId,
      person.demo === true,
      typeof person.createdAt === "string" && !Number.isNaN(Date.parse(person.createdAt)) ? person.createdAt : null
    ]
  );
  return true;
}

function adminRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser, requireAdmin);

  // Full backup of shifts, staff and app data. Passwords are never exported.
  router.get("/export", async (req, res) => {
    const [shifts, people, documents] = await Promise.all([
      pool.query("SELECT id, name, color, sort_order FROM shifts ORDER BY sort_order"),
      pool.query("SELECT id, name, company, phone, availability, shift_id, demo, created_at FROM people ORDER BY name"),
      pool.query("SELECT scope, key, value FROM documents ORDER BY scope, key")
    ]);
    res.setHeader("Content-Disposition", `attachment; filename="staff-planner-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json({
      app: "Staff Planner",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      shifts: shifts.rows.map(serializeShift),
      people: people.rows.map(row => ({
        id: row.id, name: row.name, company: row.company, phone: row.phone, availability: row.availability,
        shiftId: row.shift_id, demo: row.demo, createdAt: row.created_at
      })),
      documents: documents.rows
    });
  });

  // Restores a backup made by /export. Documents are replaced; shifts and people
  // are updated or added, but nobody is removed, so no one loses their login.
  router.post("/import", async (req, res) => {
    const payload = req.body;
    if (payload?.app !== "Staff Planner" || payload.version !== EXPORT_VERSION
      || !Array.isArray(payload.shifts) || !Array.isArray(payload.people) || !Array.isArray(payload.documents)) {
      throw new HttpError(400, "Filen är inte en giltig backup från den här versionen av Staff Planner.");
    }
    const shiftIds = new Set(payload.shifts.map(shift => shift?.id).filter(id => typeof id === "string" && id));
    // Personal lists are restored only for logins that still exist; passwords are not in backups.
    const userIds = new Set((await pool.query("SELECT id FROM users")).rows.map(row => row.id));
    const documents = payload.documents.filter(doc =>
      doc && typeof doc.scope === "string" && typeof doc.key === "string"
      && (doc.scope === "global" || shiftIds.has(doc.scope) || userIds.has(personalScopeOwner(doc.scope)))
      && documentCategory(doc.scope, doc.key));
    await withTransaction(pool, async client => {
      for (const shift of payload.shifts) {
        const name = cleanText(shift?.name, 60);
        if (!shiftIds.has(shift?.id) || !name) continue;
        // Backups from before shift colors keep the shift's current color.
        const color = SHIFT_COLORS.includes(shift.color) || shift.color === "" ? shift.color : null;
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
      await client.query("DELETE FROM documents");
      for (const doc of documents) await putDocument(client, doc.scope, doc.key, doc.value, req.user.id);
    });
    res.json({ ok: true, shifts: shiftIds.size, people: payload.people.length, documents: documents.length });
  });

  // Moves data from the old single-device version. The browser decrypts the old
  // data with the old password and sends it here, already mapped to new keys.
  router.post("/import-legacy", async (req, res) => {
    const { shiftId, people, global, shift } = req.body || {};
    const { rows } = await pool.query("SELECT 1 FROM shifts WHERE id = $1", [String(shiftId || "")]);
    if (!rows.length) throw new HttpError(400, "Välj vilket skift den gamla datan ska höra till.");
    const globalDocs = Object.entries(isPlainObject(global) ? global : {}).filter(([key]) => documentCategory("global", key));
    const shiftDocs = Object.entries(isPlainObject(shift) ? shift : {}).filter(([key]) => documentCategory(shiftId, key));
    // The old version had one to-do list; it becomes the importing admin's own list.
    const personalDocs = Object.entries(isPlainObject(shift) ? shift : {})
      .filter(([key]) => documentCategory(personalScope(req.user.id), key));
    const peopleList = Array.isArray(people) ? people : [];
    let importedPeople = 0;
    await withTransaction(pool, async client => {
      for (const person of peopleList) {
        if (await upsertPerson(client, person, shiftId)) importedPeople += 1;
      }
      for (const [key, value] of globalDocs) await putDocument(client, "global", key, value, req.user.id);
      for (const [key, value] of shiftDocs) await putDocument(client, shiftId, key, value, req.user.id);
      for (const [key, value] of personalDocs) await putDocument(client, personalScope(req.user.id), key, value, req.user.id);
    });
    res.json({ ok: true, people: importedPeople, documents: globalDocs.length + shiftDocs.length + personalDocs.length });
  });

  return router;
}

module.exports = { adminRoutes };
