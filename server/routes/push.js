const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { isAllowedEndpoint, saveSubscription, PUSH_LEVELS } = require("../push");
const { cleanText } = require("../validation");

const KEY_PATTERN = /^[A-Za-z0-9_-]{1,200}={0,2}$/;

function cleanSubscription(body) {
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const { p256dh, auth } = body?.keys || {};
  if (endpoint.length > 1000 || !isAllowedEndpoint(endpoint) || !KEY_PATTERN.test(p256dh || "") || !KEY_PATTERN.test(auth || "")) {
    throw new HttpError(400, "Enheten kunde inte registreras för pushnotiser.");
  }
  const replaces = typeof body.replaces === "string" && body.replaces.length <= 1000 ? body.replaces : null;
  return { endpoint, p256dh, auth, device: cleanText(body.device, 80), replaces };
}

async function isBlocked(pool, userId) {
  const { rows } = await pool.query("SELECT push_blocked FROM users WHERE id = $1", [userId]);
  return Boolean(rows[0]?.push_blocked);
}

// Each user turns push notifications on and off for themselves and their own devices only.
function pushRoutes({ pool, sender }) {
  const router = express.Router();

  // Without signing in: stops push on this device, for example before a shared phone is
  // handed over. Only the device itself knows its endpoint, and nothing can be added here.
  router.post("/disconnect", async (req, res) => {
    const endpoint = String(req.body?.endpoint || "");
    if (endpoint) await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
    res.json({ ok: true });
  });

  router.use(requireUser);

  router.get("/", async (req, res) => {
    const [user, devices] = await Promise.all([
      pool.query("SELECT push_blocked, push_enabled, push_level FROM users WHERE id = $1", [req.user.id]),
      pool.query("SELECT count(*)::int AS count FROM push_subscriptions WHERE user_id = $1", [req.user.id])
    ]);
    const settings = user.rows[0];
    res.json({
      available: Boolean(sender?.configured), publicKey: sender?.publicKey || "", blocked: settings.push_blocked,
      enabled: settings.push_enabled, level: settings.push_level, devices: devices.rows[0].count
    });
  });

  // The user's own choice: on or off (enabled), and all notices or only important ones
  // (level). It is saved on the account and lasts until they change it. While an admin
  // has push turned off, the user cannot turn it on.
  router.patch("/settings", async (req, res) => {
    const changes = {};
    if (req.body?.enabled !== undefined) {
      if (typeof req.body.enabled !== "boolean") throw new HttpError(400, "Ogiltigt värde för pushnotiser.");
      if (req.body.enabled && await isBlocked(pool, req.user.id)) throw new HttpError(403, "En administratör har stängt av pushnotiser för dig.");
      changes.push_enabled = req.body.enabled;
    }
    if (req.body?.level !== undefined) {
      if (!PUSH_LEVELS.includes(req.body.level)) throw new HttpError(400, "Okänd nivå för pushnotiser.");
      changes.push_level = req.body.level;
    }
    const sets = Object.keys(changes).map((column, index) => `${column} = $${index + 2}`);
    if (sets.length) await pool.query(`UPDATE users SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`, [req.user.id, ...Object.values(changes)]);
    // Notices waiting when push is turned off are never sent, also not after it is turned on again.
    if (changes.push_enabled === false) await pool.query("DELETE FROM push_outbox WHERE user_id = $1 AND sent_at IS NULL", [req.user.id]);
    const { rows } = await pool.query("SELECT push_enabled, push_level FROM users WHERE id = $1", [req.user.id]);
    res.json({ enabled: rows[0].push_enabled, level: rows[0].push_level });
  });

  // Turns push on for this device, or renews its subscription.
  router.post("/subscriptions", async (req, res) => {
    if (!sender?.configured) throw new HttpError(503, "Pushnotiser är inte aktiverade på servern.");
    const subscription = cleanSubscription(req.body);
    if (await isBlocked(pool, req.user.id)) throw new HttpError(403, "En administratör har stängt av pushnotiser för dig.");
    await saveSubscription(pool, req.user.id, subscription);
    res.status(201).json({ ok: true });
  });

  // Called when a page opens on a device with push on. A device that belongs to
  // someone else (a shared phone) is taken from them, and the page turns it off.
  router.post("/subscriptions/check", async (req, res) => {
    const endpoint = String(req.body?.endpoint || "");
    const { rows } = await pool.query("SELECT user_id FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
    if (rows[0] && rows[0].user_id !== req.user.id) await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
    res.json({ subscribed: rows[0]?.user_id === req.user.id });
  });

  // Turns push off for one device ({ endpoint }) or all of the user's devices ({ all: true }).
  router.delete("/subscriptions", async (req, res) => {
    if (req.body?.all === true) {
      await pool.query("DELETE FROM push_subscriptions WHERE user_id = $1", [req.user.id]);
    } else {
      await pool.query("DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2", [req.user.id, String(req.body?.endpoint || "")]);
    }
    res.json({ ok: true });
  });

  return router;
}

module.exports = { pushRoutes };
