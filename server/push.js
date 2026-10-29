const webPush = require("web-push");
const { OPERATOR_ROLES, canReadDocument, canUseChat, sharedFlagKey, weekRequiringShare } = require("./permissions");
const { newId, readDocuments, currentWeekKey, isoWeekNumber, NOTE_VISIBLE_SQL, isPlainObject } = require("./store");

// Push notifications (Web Push) to phones and computers, also when Staff Planner is
// closed. They only add to the in-app notifications: whatever happens here, nothing
// else in the app is held up or fails.
//
// Events are written to push_outbox and sent from there in the background, so a save
// is never slowed down by the push services. Right before sending, the server checks
// again that the user may still see what the notice is about and that an admin has
// not turned push off for them. The text shown on the lock screen never contains
// names or message contents; the app shows the details after sign-in.

// What each kind of notice says and how often it may come.
//   delay:    seconds to wait, so a burst of changes becomes one notice
//   interval: at least this many seconds between two notices with the same key
const KINDS = Object.freeze({
  schedule: { delay: 120, url: "index.html", text: ref => `Ditt schema för vecka ${isoWeekNumber(ref.week)} har ändrats.` },
  share: { url: "index.html", text: ref => `Schemat för vecka ${isoWeekNumber(ref.week)} finns nu.` },
  placement: { url: "index.html", text: () => "Din placering har ändrats." },
  chat: { url: "index.html?chat=1", urgency: "high", text: () => "Du har fått ett privat meddelande." },
  chatAll: { interval: 300, url: "index.html?chat=1", text: () => "Det finns nya meddelanden i chatten." },
  note: { url: "anteckningar.html", text: () => "En anteckning har delats med dig." },
  update: { interval: 300, url: "index.html?notifications=1", text: () => "Det finns nya uppdateringar som berör dig." }
});

// Notices not sent within this time are dropped, so nobody gets old news later on.
const MAX_AGE_MS = 60 * 60 * 1000;
// How long the push service keeps trying to reach a phone that is off.
const TTL_SECONDS = 6 * 60 * 60;
const IDLE_CHECK_MS = 60 * 1000;
const BATCH_SIZE = 100;
const MAX_DEVICES_PER_USER = 20;
// A device that keeps failing is forgotten.
const MAX_FAILURES = 10;
const SENT_RETENTION_HOURS = 24;

// Subscriptions only ever point at the browsers' own push services, so the server
// cannot be made to send requests anywhere else.
const PUSH_HOSTS = [".googleapis.com", ".push.apple.com", ".push.services.mozilla.com", ".notify.windows.com"];
function isAllowedEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.some(host => url.hostname.endsWith(host) || `.${url.hostname}` === host);
  } catch {
    return false;
  }
}

// Sends with the VAPID keys from the environment. Without them push is off and the
// rest of the app works as before.
function createPushSender({
  publicKey = process.env.VAPID_PUBLIC_KEY || "",
  privateKey = process.env.VAPID_PRIVATE_KEY || "",
  subject = process.env.VAPID_SUBJECT || (/^https:\/\//.test(process.env.APP_URL || "") ? process.env.APP_URL : "")
} = {}) {
  const vapidDetails = { subject, publicKey, privateKey };
  let configured = Boolean(publicKey && privateKey && subject);
  if (configured) {
    try {
      webPush.getVapidHeaders("https://fcm.googleapis.com", subject, publicKey, privateKey, "aes128gcm");
    } catch (error) {
      console.error("Pushnotiser är avstängda: VAPID-nycklarna eller VAPID_SUBJECT är ogiltiga.", error.message);
      configured = false;
    }
  }
  return {
    configured,
    publicKey: configured ? publicKey : "",
    send: (subscription, payload, options) => webPush.sendNotification(subscription, payload, { ...options, vapidDetails, timeout: 15_000 })
  };
}

// Inside a transaction a failed insert would otherwise abort the whole save.
async function withoutFailing(db, label, work) {
  const inTransaction = typeof db.release === "function";
  try {
    if (inTransaction) await db.query("SAVEPOINT push_queue");
    const result = await work();
    if (inTransaction) await db.query("RELEASE SAVEPOINT push_queue");
    return result;
  } catch (error) {
    if (inTransaction) await db.query("ROLLBACK TO SAVEPOINT push_queue").catch(() => {});
    console.error(`Pushnotis kunde inte köas (${label}):`, error);
    return 0;
  }
}

const wakers = new Set();

// Queues one notice per user. Users without a device, or turned off by an admin, are
// skipped right away. While a notice with the same key waits, no second one is added.
// targets: user ids, or { userId, notificationId, messageId }.
async function queuePush(db, targets, { kind, key = kind, ref = {}, exceptUserId = null }) {
  const config = KINDS[kind];
  const byUser = new Map();
  for (const target of targets) {
    const item = typeof target === "string" ? { userId: target } : target;
    if (item?.userId && item.userId !== exceptUserId && !byUser.has(item.userId)) byUser.set(item.userId, item);
  }
  if (!config || !byUser.size) return 0;
  const items = [...byUser.values()];
  const queued = await withoutFailing(db, kind, async () => (await db.query(
    `INSERT INTO push_outbox (user_id, kind, dedupe_key, ref, notification_id, message_id, send_after)
     SELECT u.id, $4, $5, $6::jsonb, t.notification_id, t.message_id,
            GREATEST(now() + make_interval(secs => $7),
                     COALESCE((SELECT max(o.sent_at) FROM push_outbox o
                                WHERE o.user_id = u.id AND o.dedupe_key = $5 AND o.sent_at IS NOT NULL), '-infinity') + make_interval(secs => $8))
       FROM unnest($1::text[], $2::text[], $3::bigint[]) AS t(user_id, notification_id, message_id)
       JOIN users u ON u.id = t.user_id
      WHERE NOT u.push_blocked AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = u.id)
     ON CONFLICT (user_id, dedupe_key) WHERE sent_at IS NULL DO NOTHING`,
    [
      items.map(item => item.userId), items.map(item => item.notificationId ?? null), items.map(item => item.messageId ?? null),
      kind, key, JSON.stringify(ref), config.delay || 0, config.interval || 0
    ]
  )).rowCount);
  if (queued) wakers.forEach(wake => wake(config.delay || 0));
  return queued;
}

// People whose own placements or breaks differ between two versions of a week's
// schedule document. Training places and extra people's places say where the person
// in the schedule's cell works, so `schedule` is needed for those.
function changedPeople(key, before, after, schedule) {
  const prefix = key.slice(0, key.indexOf(":"));
  const people = new Set();
  const cells = value => isPlainObject(value) ? Object.entries(value).filter(([, days]) => isPlainObject(days))
    .flatMap(([task, days]) => Object.entries(days).map(([day, cell]) => [task, day, cell])) : [];
  if (prefix === "schedule" || prefix === "trainingLeaders") {
    const places = value => {
      const byPerson = new Map();
      cells(value).forEach(([task, day, personId]) => {
        if (typeof personId !== "string" || !personId) return;
        byPerson.set(personId, [...(byPerson.get(personId) || []), `${task}|${day}`]);
      });
      return byPerson;
    };
    const [old, now] = [places(before), places(after)];
    new Set([...old.keys(), ...now.keys()]).forEach(personId => {
      if ((old.get(personId) || []).sort().join() !== (now.get(personId) || []).sort().join()) people.add(personId);
    });
  } else if (prefix === "trainingLocations" || prefix === "extraPersonLocations") {
    const old = new Map(cells(before).map(([task, day, place]) => [`${task}|${day}`, place || ""]));
    const now = new Map(cells(after).map(([task, day, place]) => [`${task}|${day}`, place || ""]));
    new Set([...old.keys(), ...now.keys()]).forEach(cell => {
      if (old.get(cell) === now.get(cell)) return;
      const [task, day] = cell.split("|");
      const personId = schedule?.[task]?.[day];
      if (typeof personId === "string" && personId) people.add(personId);
    });
  } else if (prefix === "breakPlan") {
    const days = new Set([...Object.keys(isPlainObject(before) ? before : {}), ...Object.keys(isPlainObject(after) ? after : {})]);
    days.forEach(day => {
      const [old, now] = [before?.[day] || {}, after?.[day] || {}];
      const perPerson = ["groups", "workplaces"];
      const shared = value => JSON.stringify(Object.entries(value).filter(([field]) => !perPerson.includes(field)).sort());
      const personIds = new Set(perPerson.flatMap(field => [...Object.keys(old[field] || {}), ...Object.keys(now[field] || {})]));
      // The day's break times changed: that concerns everyone who works that day.
      if (shared(old) !== shared(now)) {
        cells(schedule).forEach(([, cellDay, personId]) => { if (cellDay === day) personIds.add(personId); });
        personIds.forEach(personId => { if (typeof personId === "string" && personId) people.add(personId); });
        return;
      }
      personIds.forEach(personId => {
        if (perPerson.some(field => JSON.stringify(old[field]?.[personId] ?? null) !== JSON.stringify(now[field]?.[personId] ?? null))) people.add(personId);
      });
    });
  }
  return people;
}

const PLACEMENT_PREFIXES = ["schedule", "trainingLeaders", "trainingLocations", "extraPersonLocations", "breakPlan"];
const WEEK_KEY = /^\d{4}-\d{2}-\d{2}$/;
// The week of a document whose changes concern the people placed in it, else null.
function placementWeek(key) {
  const [prefix, week] = String(key).split(":");
  return PLACEMENT_PREFIXES.includes(prefix) && WEEK_KEY.test(week || "") ? week : null;
}

const loadUsers = async (db, where, params) => (await db.query(
  `SELECT u.id, u.role, u.push_blocked, p.shift_id FROM users u JOIN people p ON p.id = u.person_id WHERE ${where}`, params
)).rows.map(row => ({ id: row.id, role: row.role, shiftId: row.shift_id, pushBlocked: row.push_blocked }));

// Whether the user sees the shift's schedule for the week: operators only once it is shared.
async function seesWeek(db, user, scope, week, sharedCache = {}) {
  const key = `schedule:${week}`;
  if (!canReadDocument(user, scope, key)) return false;
  if (!weekRequiringShare(user, scope, key)) return true;
  sharedCache.value ??= (await readDocuments(db, scope, [sharedFlagKey(week)]))[sharedFlagKey(week)]?.value?.shared === true;
  return sharedCache.value;
}

// A week's schedule, training, extra places or breaks were saved. Returns the users whose
// own placement changed and who see the week, apart from the person who made the change.
async function scheduleChangeRecipients(db, { scope, key, week, before, after, actorId }) {
  const schedule = key.startsWith("schedule:") ? after : (await readDocuments(db, scope, [`schedule:${week}`]))[`schedule:${week}`]?.value;
  const personIds = [...changedPeople(key, before, after, schedule)];
  if (!personIds.length) return [];
  const users = await loadUsers(db, "u.person_id = ANY($1::text[]) AND u.id <> $2", [personIds, actorId]);
  const shared = {};
  const recipients = [];
  for (const user of users) if (await seesWeek(db, user, scope, week, shared)) recipients.push(user.id);
  return recipients;
}

// Tells the users from scheduleChangeRecipients that their schedule for the week changed.
async function queueScheduleChange(db, { scope, week, userIds, actorId }) {
  return withoutFailing(db, "schedule", () =>
    queuePush(db, userIds, { kind: "schedule", key: `schedule:${scope}:${week}`, ref: { scope, week }, exceptUserId: actorId }));
}

// A week was shared with the shift's operators.
async function queueScheduleShared(db, { scope, week, actorId }) {
  return withoutFailing(db, "share", async () => {
    const users = await loadUsers(db, "p.shift_id = $1 AND u.role = ANY($2::text[])", [scope, OPERATOR_ROLES]);
    return queuePush(db, users.map(user => user.id), { kind: "share", key: `share:${scope}:${week}`, ref: { scope, week }, exceptUserId: actorId });
  });
}

// A chat message: a private one is pushed right away, messages to everyone at most
// every five minutes. chatRoles are the roles that use the chat.
async function queueChatMessage(db, { messageId, recipientId, authorId, chatRoles }) {
  return withoutFailing(db, "chat", async () => {
    if (recipientId) return queuePush(db, [{ userId: recipientId, messageId }], { kind: "chat", key: `chat:${messageId}`, exceptUserId: authorId });
    const { rows } = await db.query("SELECT id FROM users WHERE role = ANY($1::text[]) AND id <> $2", [chatRoles, authorId]);
    return queuePush(db, rows.map(row => row.id), { kind: "chatAll", exceptUserId: authorId });
  });
}

// Someone was moved to another shift.
async function queuePlacementChange(db, { personId, actorId }) {
  return withoutFailing(db, "placement", async () => {
    const { rows } = await db.query("SELECT id FROM users WHERE person_id = $1", [personId]);
    return queuePush(db, rows.map(row => row.id), { kind: "placement", exceptUserId: actorId });
  });
}

// The newest chat message user $1 has read, counted as the chat's unread badge does.
const LAST_READ_CHAT = `COALESCE((SELECT last_read_id FROM chat_reads WHERE user_id = $1),
  (SELECT COALESCE(max(c.id), 0) FROM chat_messages c, users u WHERE u.id = $1 AND c.created_at < u.created_at))`;

// Checks, right before sending, that the notice still concerns the user.
async function stillRelevant(db, user, row) {
  switch (row.kind) {
    case "schedule":
    case "share":
      return row.ref.week >= currentWeekKey() && seesWeek(db, user, row.ref.scope, row.ref.week);
    case "placement":
      return true;
    case "chat": {
      if (!canUseChat(user) || !row.message_id) return false;
      const { rows } = await db.query(
        `SELECT 1 FROM chat_messages m WHERE m.id = $2 AND m.recipient_id = $1 AND m.id > ${LAST_READ_CHAT}`,
        [user.id, row.message_id]
      );
      return rows.length > 0;
    }
    case "chatAll": {
      if (!canUseChat(user)) return false;
      const { rows } = await db.query(
        `SELECT 1 FROM chat_messages m WHERE m.recipient_id IS NULL AND m.user_id IS DISTINCT FROM $1
            AND m.id > ${LAST_READ_CHAT} LIMIT 1`,
        [user.id]
      );
      return rows.length > 0;
    }
    case "note": {
      const { rows } = await db.query(
        `SELECT 1 FROM notifications x JOIN notes n ON n.id = x.note_id
          WHERE x.id = $3 AND x.user_id = $1 AND x.read_at IS NULL AND ${NOTE_VISIBLE_SQL}`,
        [user.id, user.shiftId, row.notification_id]
      );
      return rows.length > 0;
    }
    case "update": {
      const { rows } = await db.query(
        `SELECT 1 FROM notifications WHERE user_id = $1 AND kind = 'adminChange' AND read_at IS NULL
            AND (id = $2 OR created_at >= $3) LIMIT 1`,
        [user.id, row.notification_id, row.created_at]
      );
      return rows.length > 0;
    }
    default:
      return false;
  }
}

function payloadFor(row) {
  const config = KINDS[row.kind];
  return JSON.stringify({ title: "Staff Planner", body: config.text(row.ref), url: config.url, tag: row.kind });
}

// Sends what is due in the background: soon after something is queued, and once a
// minute in case the server restarted with notices waiting. Each notice is claimed
// before it is sent, so it goes out once even with several servers.
function createPushService({ pool, sender, autoStart = true }) {
  let timer = null;
  let dueAt = Infinity;
  let closed = false;
  let running = Promise.resolve();

  function schedule(delayMs) {
    if (closed || !sender?.configured || !autoStart) return;
    const at = Date.now() + Math.max(delayMs, 1000);
    if (timer && at >= dueAt) return;
    clearTimeout(timer);
    dueAt = at;
    timer = setTimeout(() => { timer = null; dueAt = Infinity; void flush(); }, at - Date.now());
    timer.unref?.();
  }

  const wake = delaySeconds => schedule(delaySeconds * 1000);

  async function deliver(row) {
    if (Date.now() - new Date(row.created_at).getTime() > MAX_AGE_MS) return;
    const [user] = await loadUsers(pool, "u.id = $1", [row.user_id]);
    if (!user || user.pushBlocked || !(await stillRelevant(pool, user, row))) return;
    const { rows: devices } = await pool.query("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1", [user.id]);
    const config = KINDS[row.kind];
    const payload = payloadFor(row);
    await Promise.all(devices.map(async device => {
      try {
        await sender.send({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload, {
          TTL: TTL_SECONDS, urgency: config.urgency || "normal", topic: row.kind
        });
        await pool.query("UPDATE push_subscriptions SET failures = 0, last_success_at = now() WHERE id = $1", [device.id]);
      } catch (error) {
        // 404 and 410: the device unsubscribed or the subscription expired.
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [device.id]);
          return;
        }
        console.warn(`Pushnotis kunde inte skickas (${error?.statusCode || error?.code || "fel"}).`);
        await pool.query("DELETE FROM push_subscriptions WHERE id = $1 AND failures + 1 >= $2", [device.id, MAX_FAILURES]);
        await pool.query("UPDATE push_subscriptions SET failures = failures + 1 WHERE id = $1", [device.id]);
      }
    }));
  }

  async function run() {
    if (!sender?.configured || closed) return;
    for (;;) {
      const { rows } = await pool.query(
        `UPDATE push_outbox SET sent_at = now()
          WHERE id IN (SELECT id FROM push_outbox WHERE sent_at IS NULL AND send_after <= now()
                        ORDER BY send_after LIMIT $1 FOR UPDATE SKIP LOCKED)
          RETURNING *`,
        [BATCH_SIZE]
      );
      for (const row of rows) {
        await deliver(row).catch(error => console.error("Pushnotis misslyckades:", error));
      }
      if (rows.length < BATCH_SIZE) break;
    }
    const { rows: [next] } = await pool.query("SELECT min(send_after) AS at FROM push_outbox WHERE sent_at IS NULL");
    schedule(next?.at ? Math.min(new Date(next.at).getTime() - Date.now(), IDLE_CHECK_MS) : IDLE_CHECK_MS);
  }

  // Runs one pass after any pass already under way.
  function flush() {
    running = running.then(run).catch(error => {
      console.error("Pushnotiser kunde inte skickas:", error);
      schedule(IDLE_CHECK_MS);
    });
    return running;
  }

  wakers.add(wake);
  schedule(0);

  return {
    flush,
    async close() {
      closed = true;
      wakers.delete(wake);
      clearTimeout(timer);
      await running;
    }
  };
}

// Saves this device for the user. A device someone else had turned on becomes this
// user's, so a shared phone only gets the notices of whoever uses it now.
async function saveSubscription(db, userId, { endpoint, p256dh, auth, device, replaces }) {
  if (replaces && replaces !== endpoint) await db.query("DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2", [replaces, userId]);
  await db.query(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, device) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
       device = EXCLUDED.device, failures = 0,
       created_at = CASE WHEN push_subscriptions.user_id = EXCLUDED.user_id THEN push_subscriptions.created_at ELSE now() END`,
    [newId(), userId, endpoint, p256dh, auth, device]
  );
  await db.query(
    `DELETE FROM push_subscriptions WHERE user_id = $1 AND id NOT IN (
       SELECT id FROM push_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2)`,
    [userId, MAX_DEVICES_PER_USER]
  );
}

async function cleanupPush(db) {
  await db.query("DELETE FROM push_outbox WHERE sent_at < now() - make_interval(hours => $1)", [SENT_RETENTION_HOURS]);
  await db.query("DELETE FROM push_outbox WHERE sent_at IS NULL AND created_at < now() - make_interval(secs => $1)", [MAX_AGE_MS / 1000]);
}

module.exports = {
  KINDS, createPushSender, createPushService, queuePush, scheduleChangeRecipients, queueScheduleChange, queueScheduleShared, queueChatMessage, queuePlacementChange, changedPeople,
  placementWeek, isAllowedEndpoint, saveSubscription, cleanupPush, MAX_DEVICES_PER_USER
};
