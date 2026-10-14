const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { withTransaction } = require("../db");
const { isAdmin } = require("../permissions");
const { newId } = require("../store");
const { cleanText } = require("../validation");

const serializeShift = row => ({ id: row.id, name: row.name, sortOrder: row.sort_order });

function requireAdmin(req) {
  if (!isAdmin(req.user)) throw new HttpError(403, "Endast admin kan hantera skift.");
}

function shiftRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser);

  router.get("/", async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM shifts ORDER BY sort_order, name");
    res.json({ shifts: rows.map(serializeShift) });
  });

  router.post("/", async (req, res) => {
    requireAdmin(req);
    const name = cleanText(req.body?.name, 60);
    if (!name) throw new HttpError(400, "Ange ett namn på skiftet.");
    const { rows } = await pool.query(
      `INSERT INTO shifts (id, name, sort_order)
       VALUES ($1, $2, (SELECT COALESCE(max(sort_order), 0) + 1 FROM shifts))
       RETURNING *`,
      [newId(), name]
    );
    res.status(201).json({ shift: serializeShift(rows[0]) });
  });

  router.patch("/:id", async (req, res) => {
    requireAdmin(req);
    const name = cleanText(req.body?.name, 60);
    if (!name) throw new HttpError(400, "Ange ett namn på skiftet.");
    const sortOrder = Number.isInteger(req.body?.sortOrder) ? req.body.sortOrder : null;
    const { rows } = await pool.query(
      "UPDATE shifts SET name = $2, sort_order = COALESCE($3, sort_order) WHERE id = $1 RETURNING *",
      [req.params.id, name, sortOrder]
    );
    if (!rows[0]) throw new HttpError(404, "Skiftet finns inte.");
    res.json({ shift: serializeShift(rows[0]) });
  });

  // People in the shift stay, without a shift. The shift's schedules are removed.
  router.delete("/:id", async (req, res) => {
    requireAdmin(req);
    await withTransaction(pool, async client => {
      const { rows } = await client.query(
        `SELECT count(*)::int AS count FROM users u JOIN people p ON p.id = u.person_id
          WHERE p.shift_id = $1 AND u.role = 'shift_leader'`,
        [req.params.id]
      );
      if (rows[0].count > 0) {
        throw new HttpError(400, "Skiftet har skiftledare. Flytta dem eller ändra deras roll innan skiftet tas bort.");
      }
      const result = await client.query("DELETE FROM shifts WHERE id = $1", [req.params.id]);
      if (!result.rowCount) throw new HttpError(404, "Skiftet finns inte.");
      await client.query("DELETE FROM documents WHERE scope = $1", [req.params.id]);
      await client.query("DELETE FROM audit_events WHERE scope = $1", [req.params.id]);
    });
    res.json({ ok: true });
  });

  return router;
}

module.exports = { shiftRoutes };
