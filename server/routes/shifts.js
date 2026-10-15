const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { withTransaction } = require("../db");
const { isAdmin } = require("../permissions");
const { newId, serializeShift } = require("../store");
const { cleanText, cleanShiftColor, SHIFT_COLOR_LABELS } = require("../validation");

// A new shift named after a free color gets that color when none is chosen.
const COLORS_BY_NAME = Object.fromEntries(Object.entries(SHIFT_COLOR_LABELS).map(([color, label]) => [label.toLowerCase(), color]));

// The name of another shift that already has the color, or null.
async function colorOwner(db, color, exceptShiftId = "") {
  if (!color) return null;
  const { rows } = await db.query("SELECT name FROM shifts WHERE color = $1 AND id <> $2", [color, exceptShiftId]);
  return rows[0]?.name ?? null;
}

async function assertColorFree(db, color, exceptShiftId) {
  const owner = await colorOwner(db, color, exceptShiftId);
  if (owner !== null) throw new HttpError(409, `Färgen ${SHIFT_COLOR_LABELS[color].toLowerCase()} används redan av skiftet ${owner}. Välj en annan färg.`);
}

// Two admins picking the same color at once: the database lets only one through.
function rethrowColorTaken(error) {
  if (error.code === "23505" && error.constraint === "shifts_color_unique") {
    throw new HttpError(409, "Färgen används redan av ett annat skift. Välj en annan färg.");
  }
  throw error;
}

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
    let color = cleanShiftColor(req.body?.color);
    if (color) {
      await assertColorFree(pool, color);
    } else if (req.body?.color === undefined) {
      const named = COLORS_BY_NAME[name.toLowerCase()] || "";
      color = named && (await colorOwner(pool, named)) === null ? named : "";
    }
    const { rows } = await pool.query(
      `INSERT INTO shifts (id, name, color, sort_order)
       VALUES ($1, $2, $3, (SELECT COALESCE(max(sort_order), 0) + 1 FROM shifts))
       RETURNING *`,
      [newId(), name, color]
    ).catch(rethrowColorTaken);
    res.status(201).json({ shift: serializeShift(rows[0]) });
  });

  router.patch("/:id", async (req, res) => {
    requireAdmin(req);
    const name = cleanText(req.body?.name, 60);
    if (!name) throw new HttpError(400, "Ange ett namn på skiftet.");
    const color = req.body && "color" in req.body ? cleanShiftColor(req.body.color) : null;
    const sortOrder = Number.isInteger(req.body?.sortOrder) ? req.body.sortOrder : null;
    if (color) await assertColorFree(pool, color, req.params.id);
    const { rows } = await pool.query(
      "UPDATE shifts SET name = $2, color = COALESCE($3, color), sort_order = COALESCE($4, sort_order) WHERE id = $1 RETURNING *",
      [req.params.id, name, color, sortOrder]
    ).catch(rethrowColorTaken);
    if (!rows[0]) throw new HttpError(404, "Skiftet finns inte.");
    res.json({ shift: serializeShift(rows[0]) });
  });

  // People in the shift stay, without a shift. The shift's schedules are removed.
  router.delete("/:id", async (req, res) => {
    requireAdmin(req);
    await withTransaction(pool, async client => {
      const { rows } = await client.query(
        `SELECT count(*)::int AS count FROM users u JOIN people p ON p.id = u.person_id
          WHERE p.shift_id = $1 AND u.role IN ('shift_leader', 'right_hand')`,
        [req.params.id]
      );
      if (rows[0].count > 0) {
        throw new HttpError(400, "Skiftet har skiftledare eller höger hand. Flytta dem eller ändra deras roll innan skiftet tas bort.");
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
