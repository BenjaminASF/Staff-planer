const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { withTransaction } = require("../db");
const { isAdmin } = require("../permissions");
const { newId, serializeShift } = require("../store");
const { cleanText, cleanShiftColor } = require("../validation");

// A new shift named after a color gets that color when none is chosen.
const COLORS_BY_NAME = { "röd": "red", "blå": "blue", "gul": "yellow" };

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
    const color = cleanShiftColor(req.body?.color) || COLORS_BY_NAME[name.toLowerCase()] || "";
    const { rows } = await pool.query(
      `INSERT INTO shifts (id, name, color, sort_order)
       VALUES ($1, $2, $3, (SELECT COALESCE(max(sort_order), 0) + 1 FROM shifts))
       RETURNING *`,
      [newId(), name, color]
    );
    res.status(201).json({ shift: serializeShift(rows[0]) });
  });

  router.patch("/:id", async (req, res) => {
    requireAdmin(req);
    const name = cleanText(req.body?.name, 60);
    if (!name) throw new HttpError(400, "Ange ett namn på skiftet.");
    const color = req.body && "color" in req.body ? cleanShiftColor(req.body.color) : null;
    const sortOrder = Number.isInteger(req.body?.sortOrder) ? req.body.sortOrder : null;
    const { rows } = await pool.query(
      "UPDATE shifts SET name = $2, color = COALESCE($3, color), sort_order = COALESCE($4, sort_order) WHERE id = $1 RETURNING *",
      [req.params.id, name, color, sortOrder]
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
