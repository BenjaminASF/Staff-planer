const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { withTransaction } = require("../db");
const { isAdminOrLeader, documentCategory, canReadDocument, canWriteDocument, canReadAuditScope } = require("../permissions");
const {
  readDocuments, writeDocument, renameWorkItemReferences, countWorkItemUsage, createSafetySnapshot, addAuditEvent
} = require("../store");
const { cleanText } = require("../validation");

async function assertScopeExists(db, scope) {
  if (scope === "global") return;
  const { rows } = await db.query("SELECT 1 FROM shifts WHERE id = $1", [scope]);
  if (!rows.length) throw new HttpError(404, "Skiftet finns inte.");
}

function documentRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser);

  // GET /api/documents?scope=global&keys=appSettings,workItems
  // Keys the user may not read are listed in `forbidden` instead of failing the request.
  router.get("/documents", async (req, res) => {
    const scope = String(req.query.scope || "");
    const keys = [...new Set(String(req.query.keys || "").split(",").map(key => key.trim()).filter(Boolean))].slice(0, 100);
    await assertScopeExists(pool, scope);
    const readable = keys.filter(key => canReadDocument(req.user, scope, key));
    const forbidden = keys.filter(key => !readable.includes(key));
    res.json({ documents: await readDocuments(pool, scope, readable), forbidden });
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
    let saved;
    try {
      saved = await writeDocument(pool, { scope, key, value: req.body.value, baseVersion, userId: req.user.id });
    } catch (error) {
      if (error.status === 413) throw new HttpError(413, "Datan är för stor för att sparas.");
      throw error;
    }
    if (!saved) {
      const current = (await readDocuments(pool, scope, [key]))[key] || null;
      throw new HttpError(409, "Någon annan har ändrat samma sak samtidigt. Sidan uppdateras med den senaste versionen.", { current });
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
