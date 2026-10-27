const express = require("express");
const { HttpError, requireUser, createLoginLimiter } = require("../auth");
const { isAllowedEndpoint, saveSubscription, claimDevice, renewSubscription } = require("../push");
const { cleanText } = require("../validation");

const KEY_PATTERN = /^[A-Za-z0-9_-]{1,200}={0,2}$/;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

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

// Each user turns push notifications on and off for their own devices only.
function pushRoutes({ pool, sender, renewLimiter = createLoginLimiter({ maxFailures: 20, message: "För många försök. Vänta en stund." }) }) {
  const router = express.Router();

  // The service worker renews the device's subscription when the browser replaces it,
  // also while nobody is signed in. The device's secret key stands in for a session.
  router.post("/subscriptions/renew", async (req, res) => {
    if (!sender?.configured) throw new HttpError(503, "Pushnotiser är inte aktiverade på servern.");
    const ip = req.ip || "";
    renewLimiter.check(ip, "push-renew");
    const subscription = cleanSubscription(req.body);
    const secret = typeof req.body?.deviceSecret === "string" ? req.body.deviceSecret : "";
    if (!subscription.replaces || !SECRET_PATTERN.test(secret) || !(await renewSubscription(pool, { ...subscription, secret }))) {
      renewLimiter.fail(ip, "push-renew");
      throw new HttpError(404, "Enheten är inte längre registrerad för pushnotiser.");
    }
    res.json({ ok: true });
  });

  router.use(requireUser);

  router.get("/", async (req, res) => {
    const [blocked, devices] = await Promise.all([
      isBlocked(pool, req.user.id),
      pool.query("SELECT count(*)::int AS count FROM push_subscriptions WHERE user_id = $1", [req.user.id])
    ]);
    res.json({ available: Boolean(sender?.configured), publicKey: sender?.publicKey || "", blocked, devices: devices.rows[0].count });
  });

  // Turns push on for this device, or renews its subscription. The answer carries the
  // device's secret key, which the page keeps for the service worker.
  router.post("/subscriptions", async (req, res) => {
    if (!sender?.configured) throw new HttpError(503, "Pushnotiser är inte aktiverade på servern.");
    const subscription = cleanSubscription(req.body);
    if (await isBlocked(pool, req.user.id)) throw new HttpError(403, "En administratör har stängt av pushnotiser för dig.");
    const deviceSecret = await saveSubscription(pool, req.user.id, req.sessionTokenHash, subscription);
    res.status(201).json({ ok: true, deviceSecret });
  });

  // Called when a page opens on a device with push on. A device that belongs to
  // someone else (a shared phone), or whose 48 hours ran out, is removed and the page
  // turns it off. hasSecret: false when the page has no secret key for the device.
  router.post("/subscriptions/check", async (req, res) => {
    res.json(await claimDevice(pool, {
      userId: req.user.id, sessionHash: req.sessionTokenHash, endpoint: req.body?.endpoint, needsSecret: req.body?.hasSecret === false
    }));
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
