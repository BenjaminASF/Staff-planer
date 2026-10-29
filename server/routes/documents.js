const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { withTransaction } = require("../db");
const {
  isAdmin, isAdminOrLeader, documentCategory, canReadDocument, canWriteDocument, canReadAuditScope, personalScopeOwner,
  sharedFlagKey, weekRequiringShare, mayChangeProductionTargets, evaluatesEveryone
} = require("../permissions");
const { isPersonScoped, evaluatedPersonIds, onlyFor, mergeFor } = require("../evaluations");
const {
  readDocuments, writeDocument, renameWorkItemReferences, countWorkItemUsage, createSafetySnapshot,
  addAuditEvent
} = require("../store");
const { cleanText } = require("../validation");
const { notifyScheduleShared, notifyAdminChange, notifyScheduleChange } = require("../notifications");
const { placementWeek, queueScheduleShared } = require("../push");

// Personal scopes are not looked up: only their owner, who is signed in, gets
// past the permission check, and others must not learn which user ids exist.
async function assertScopeExists(db, scope) {
  if (scope === "global" || personalScopeOwner(scope)) return;
  const { rows } = await db.query("SELECT 1 FROM shifts WHERE id = $1", [scope]);
  if (!rows.length) throw new HttpError(404, "Skiftet finns inte.");
}

// Returns the week of a "scheduleShared:<week>" key, otherwise null.
function sharedWeekKey(key) {
  return key.startsWith("scheduleShared:") ? key.slice("scheduleShared:".length) : null;
}

function documentRoutes({ pool, mailer, appUrl }) {
  const router = express.Router();
  router.use(requireUser);

  // GET /api/documents?scope=global&keys=appSettings,workItems
  // Keys the user may not read are listed in `forbidden` instead of failing the request.
  // Schedule documents for a week that has not been shared yet are listed in `unshared`
  // and left out for operators.
  router.get("/documents", async (req, res) => {
    const scope = String(req.query.scope || "");
    const keys = [...new Set(String(req.query.keys || "").split(",").map(key => key.trim()).filter(Boolean))].slice(0, 100);
    await assertScopeExists(pool, scope);
    let readable = keys.filter(key => canReadDocument(req.user, scope, key));
    const forbidden = keys.filter(key => !readable.includes(key));
    const weeks = [...new Set(readable.map(key => weekRequiringShare(req.user, scope, key)).filter(Boolean))];
    let unshared = [];
    if (weeks.length) {
      const flags = await readDocuments(pool, scope, weeks.map(sharedFlagKey));
      const isShared = week => flags[sharedFlagKey(week)]?.value?.shared === true;
      unshared = readable.filter(key => {
        const week = weekRequiringShare(req.user, scope, key);
        return week && !isShared(week);
      });
      readable = readable.filter(key => !unshared.includes(key));
    }
    const documents = await readDocuments(pool, scope, readable);
    // Shift leaders see test results and assessments only for the people they evaluate.
    const evaluations = Object.keys(documents).filter(key => documentCategory(scope, key) === "evaluation");
    if (evaluations.length && !evaluatesEveryone(req.user)) {
      const personIds = await evaluatedPersonIds(pool, req.user);
      evaluations.forEach(key => { documents[key].value = onlyFor(key, documents[key].value, personIds); });
    }
    res.json({ documents, forbidden, unshared });
  });

  // Saves one document. baseVersion is the version the client last read (0 if it did not exist).
  router.put("/documents/:scope/:key", async (req, res) => {
    const { scope, key } = req.params;
    if (!documentCategory(scope, key)) throw new HttpError(400, "Okänd datatyp.");
    if (!canWriteDocument(req.user, scope, key)) {
      throw new HttpError(403, "Du har inte behörighet att ändra det här. Du kan bara ändra ditt eget skift.");
    }
    await assertScopeExists(pool, scope);
    if (!req.body || !("value" in req.body)) throw new HttpError(400, "Värde saknas.");
    const baseVersion = Number(req.body.baseVersion) || 0;
    if (scope === "global" && key === "productionSettings" && !isAdmin(req.user)) {
      const current = (await readDocuments(pool, scope, [key]))[key]?.value;
      if (!mayChangeProductionTargets(req.user, current, req.body.value)) {
        throw new HttpError(403, "Endast admin och skiftets skiftledare kan ändra skiftets dagliga mål.");
      }
    }
    let { value } = req.body;
    if (scope === "global" && isPersonScoped(key) && !evaluatesEveryone(req.user)) {
      const [personIds, stored] = await Promise.all([evaluatedPersonIds(pool, req.user), readDocuments(pool, scope, [key])]);
      value = mergeFor(key, stored[key]?.value, value, personIds);
      if (!value) throw new HttpError(403, "Du kan bara testa och bedöma operatörerna i ditt eget skift.");
    }
    const sharedWeek = sharedWeekKey(key);
    // The version before this save: whether the week was shared, or whose placements change.
    const previous = sharedWeek || placementWeek(key) ? (await readDocuments(pool, scope, [key]))[key]?.value : undefined;
    const wasShared = sharedWeek ? previous?.shared === true : false;
    let saved;
    try {
      saved = await writeDocument(pool, { scope, key, value, baseVersion, userId: req.user.id });
    } catch (error) {
      if (error.status === 413) throw new HttpError(413, "Datan är för stor för att sparas.");
      throw error;
    }
    if (!saved) {
      const current = (await readDocuments(pool, scope, [key]))[key] || null;
      if (current && documentCategory(scope, key) === "evaluation" && !evaluatesEveryone(req.user)) {
        current.value = onlyFor(key, current.value, await evaluatedPersonIds(pool, req.user));
      }
      throw new HttpError(409, "Någon annan har ändrat samma sak samtidigt. Sidan uppdateras med den senaste versionen.", { current });
    }
    // Sharing a week tells the shift's operators by e-mail and push. Saving it again while shared does not.
    if (sharedWeek && !wasShared && req.body.value?.shared === true) {
      saved.notified = await notifyScheduleShared({
        pool, mailer, shiftId: scope, weekKey: sharedWeek, appUrl: appUrl || `${req.protocol}://${req.get("host")}`
      });
      await queueScheduleShared(pool, { scope, week: sharedWeek, actorId: req.user.id });
    }
    if (placementWeek(key)) {
      await notifyScheduleChange(pool, { user: req.user, scope, key, before: previous, after: value })
        .catch(error => console.error("Schedule change notification failed:", error));
    }
    res.json(saved);
  });

  // GET /api/audit?scopes=global,<shiftId>&since=<ISO date>
  router.get("/audit", async (req, res) => {
    const scopes = String(req.query.scopes || "").split(",").map(scope => scope.trim()).filter(Boolean)
      .filter(scope => canReadAuditScope(req.user, scope));
    const since = new Date(String(req.query.since || ""));
    const sinceDate = Number.isNaN(since.getTime()) ? new Date(Date.now() - 24 * 60 * 60 * 1000) : since;
    if (!scopes.length) return res.json({ events: [] });
    const { rows } = await pool.query(
      `SELECT a.*, p.name AS user_name FROM audit_events a
         LEFT JOIN users u ON u.id = a.user_id
         LEFT JOIN people p ON p.id = u.person_id
        WHERE a.scope = ANY($1::text[]) AND a.created_at >= $2
        ORDER BY a.created_at DESC LIMIT 500`,
      [scopes, sinceDate]
    );
    res.json({
      events: rows.map(row => ({
        id: row.id, scope: row.scope, type: row.type, title: row.title, detail: row.detail,
        undo: row.undo, createdAt: row.created_at, userName: row.user_name || ""
      }))
    });
  });

  router.post("/audit", async (req, res) => {
    const scope = String(req.body?.scope || "");
    if (!canReadAuditScope(req.user, scope)) throw new HttpError(403, "Du kan inte logga ändringar här.");
    await assertScopeExists(pool, scope);
    const undo = req.body?.undo && typeof req.body.undo === "object" ? req.body.undo : null;
    const id = await addAuditEvent(pool, {
      scope,
      type: cleanText(req.body?.type, 40),
      title: cleanText(req.body?.title, 300),
      detail: cleanText(req.body?.detail, 500),
      undo,
      userId: req.user.id
    });
    await notifyAdminChange(pool, { user: req.user, scope, type: cleanText(req.body?.type, 40), title: cleanText(req.body?.title, 300), detail: cleanText(req.body?.detail, 500) })
      .catch(error => console.error("Admin change notification failed:", error));
    res.status(201).json({ id });
  });

  // Marks an event as restored so its undo button disappears.
  router.delete("/audit/:id/undo", async (req, res) => {
    const { rows } = await pool.query("SELECT scope FROM audit_events WHERE id = $1", [req.params.id]);
    if (!rows[0] || !canReadAuditScope(req.user, rows[0].scope)) throw new HttpError(404, "Händelsen finns inte.");
    await pool.query("UPDATE audit_events SET undo = NULL WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  });

  // Machines and departments are shared by all shifts, so renaming one has to
  // update every shift's schedules. That runs on the server in one transaction.
  router.get("/work-items/usage", async (req, res) => {
    if (!isAdminOrLeader(req.user)) throw new HttpError(403, "Behörighet saknas.");
    res.json({ count: await countWorkItemUsage(pool, String(req.query.name || "")) });
  });

  router.post("/work-items/rename", async (req, res) => {
    if (!isAdminOrLeader(req.user)) throw new HttpError(403, "Behörighet saknas.");
    const from = cleanText(req.body?.from, 120);
    const to = cleanText(req.body?.to, 120);
    if (!from || !to) throw new HttpError(400, "Ange både gammalt och nytt namn.");
    await withTransaction(pool, client => renameWorkItemReferences(client, from, to, req.user.id));
    res.json({ ok: true });
  });

  router.post("/work-items/snapshot", async (req, res) => {
    if (!isAdminOrLeader(req.user)) throw new HttpError(403, "Behörighet saknas.");
    await withTransaction(pool, client => createSafetySnapshot(client, req.body?.reason, req.user.id));
    res.status(201).json({ ok: true });
  });

  return router;
}

module.exports = { documentRoutes };
