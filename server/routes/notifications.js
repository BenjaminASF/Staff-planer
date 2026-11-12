const express = require("express");
const { requireUser } = require("../auth");
const { serializeNotification, NOTIFICATION_PAGE_SIZE } = require("../notifications");
const { NOTE_VISIBLE_SQL, WORK_ORDER_VISIBLE_SQL } = require("../store");

// A note about an anteckning or arbetsorder shows only while the user may still see it, for
// example not after they became an operator. $1 is the user's id, $2 their shift id.
const SHOWN = `user_id = $1 AND (note_id IS NULL OR EXISTS (SELECT 1 FROM notes n WHERE n.id = note_id AND ${NOTE_VISIBLE_SQL}))
  AND (work_order_id IS NULL OR EXISTS (SELECT 1 FROM work_orders w WHERE w.id = work_order_id AND ${WORK_ORDER_VISIBLE_SQL}))`;

// Every user reads and clears only their own notes.
function notificationRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser);

  router.get("/", async (req, res) => {
    const [list, unread] = await Promise.all([
      pool.query(`SELECT * FROM notifications WHERE ${SHOWN} ORDER BY created_at DESC, id LIMIT $3`, [req.user.id, req.user.shiftId || null, NOTIFICATION_PAGE_SIZE]),
      pool.query(`SELECT count(*)::int AS count FROM notifications WHERE ${SHOWN} AND read_at IS NULL`, [req.user.id, req.user.shiftId || null])
    ]);
    res.json({ notifications: list.rows.map(serializeNotification), unread: unread.rows[0].count });
  });

  // Marks all of the user's notes as read.
  router.post("/read", async (req, res) => {
    await pool.query("UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL", [req.user.id]);
    res.json({ ok: true });
  });

  router.delete("/", async (req, res) => {
    await pool.query("DELETE FROM notifications WHERE user_id = $1", [req.user.id]);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { notificationRoutes };
