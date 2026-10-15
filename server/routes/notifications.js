const express = require("express");
const { requireUser } = require("../auth");
const { serializeNotification, NOTIFICATION_PAGE_SIZE } = require("../notifications");

// Every user reads and clears only their own notes.
function notificationRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser);

  router.get("/", async (req, res) => {
    const [list, unread] = await Promise.all([
      pool.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC, id LIMIT $2", [req.user.id, NOTIFICATION_PAGE_SIZE]),
      pool.query("SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL", [req.user.id])
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
