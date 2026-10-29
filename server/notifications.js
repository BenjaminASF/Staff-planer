const { ROLES, isAdmin } = require("./permissions");
const { newId, isoWeekNumber, currentWeekKey } = require("./store");
const { queuePush, placementWeek, scheduleChangeRecipients, queueScheduleChange, queuePlacementChange } = require("./push");

// E-mails the operators in a shift that the week's schedule is ready.
// Operators without a login or e-mail address are skipped.
// Returns how many mails were sent and how many failed.
async function notifyScheduleShared({ pool, mailer, shiftId, weekKey, appUrl }) {
  if (!mailer?.configured) return { sent: 0, failed: 0, configured: false };
  const { rows } = await pool.query(
    `SELECT p.name, p.email, s.name AS shift_name
       FROM people p
       JOIN users u ON u.person_id = p.id
       LEFT JOIN shifts s ON s.id = p.shift_id
      WHERE p.shift_id = $1 AND u.role = $2 AND p.email <> ''`,
    [shiftId, ROLES.OPERATOR]
  );
  const week = isoWeekNumber(weekKey);
  const results = await Promise.allSettled(rows.map(row => mailer.send({
    to: row.email,
    subject: `Schemat för vecka ${week} finns nu`,
    text: [
      `Hej ${row.name}!`,
      "",
      `Schemat för vecka ${week}${row.shift_name ? ` (${row.shift_name})` : ""} finns nu i Staff Planner.`,
      "Logga in och kolla när du ska jobba och var du är placerad:",
      appUrl,
      "",
      "Det här mejlet skickades automatiskt. Svara inte på det."
    ].join("\n")
  })));
  const failed = results.filter(result => result.status === "rejected");
  failed.forEach(result => console.error("Schedule e-mail failed:", result.reason));
  return { sent: results.length - failed.length, failed: failed.length, configured: true };
}

// In-app notes ("notiser"). Notes older than 30 days are removed by the hourly cleanup.
const NOTIFICATION_PAGE_SIZE = 50;
// Logged events that are not changes, so nobody is told about them.
const NOT_A_CHANGE = new Set(["backup:Backup exporterad"]);

// Each note is also sent as a push notification to the user's devices (see push.js).
const PUSH_KINDS = Object.freeze({ noteShared: "note", noteAdded: "note", adminChange: "update" });

async function addNotifications(db, userIds, { kind, actorName = "", title = "", detail = "", noteId = null }) {
  const recipients = [...new Set(userIds)].filter(Boolean);
  if (!recipients.length) return 0;
  const added = [];
  for (const userId of recipients) {
    const id = newId();
    await db.query(
      "INSERT INTO notifications (id, user_id, kind, actor_name, title, detail, note_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, userId, kind, String(actorName).slice(0, 120), String(title).slice(0, 300), String(detail).slice(0, 500), noteId]
    );
    added.push({ userId, notificationId: id });
  }
  const pushKind = PUSH_KINDS[kind];
  if (pushKind) await queuePush(db, added, { kind: pushKind, key: pushKind === "note" ? `note:${noteId}` : pushKind });
  return recipients.length;
}

// When an admin changes something, the shift leaders it concerns get a short note:
// every shift leader for shared settings, only that shift's for a shift. Right hands
// and operators hear only about their own schedule (see notifyScheduleChange).
async function notifyAdminChange(db, { user, scope, type = "", title = "", detail = "" }) {
  if (!isAdmin(user) || !title || NOT_A_CHANGE.has(`${type}:${title}`)) return 0;
  const { rows } = await db.query(
    `SELECT u.id FROM users u JOIN people p ON p.id = u.person_id
      WHERE u.role = $1 AND u.id <> $2 AND ($3 = 'global' OR p.shift_id = $3)`,
    [ROLES.LEADER, user.id, scope]
  );
  return addNotifications(db, rows.map(row => row.id), { kind: "adminChange", actorName: user.name, title, detail });
}

// A note about the user's own schedule. While the note about the same thing (refKey) is
// unread, it is updated instead, so several changes in a row make one note and one alert.
async function addPersonalNotices(db, userIds, { kind, refKey, actorName = "", title = "", detail = "" }) {
  const recipients = [...new Set(userIds)].filter(Boolean);
  for (const userId of recipients) {
    await db.query(
      `INSERT INTO notifications (id, user_id, kind, actor_name, title, detail, ref_key) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, ref_key) WHERE read_at IS NULL
       DO UPDATE SET actor_name = EXCLUDED.actor_name, title = EXCLUDED.title, detail = EXCLUDED.detail, created_at = now()`,
      [newId(), userId, kind, String(actorName).slice(0, 120), String(title).slice(0, 300), String(detail).slice(0, 500), refKey]
    );
  }
  return recipients.length;
}

// A week's schedule, training, extra places or breaks were saved. Everyone whose own
// placement changed is told in the app and by push, apart from the person who made the change.
async function notifyScheduleChange(db, { user, scope, key, before, after }) {
  const week = placementWeek(key);
  if (!week || week < currentWeekKey()) return 0;
  const userIds = await scheduleChangeRecipients(db, { scope, key, week, before, after, actorId: user.id });
  if (!userIds.length) return 0;
  await addPersonalNotices(db, userIds, {
    kind: "scheduleChange", refKey: `schedule:${scope}:${week}`, actorName: user.name,
    title: `Ditt schema för vecka ${isoWeekNumber(week)} har ändrats`
  });
  await queueScheduleChange(db, { scope, week, userIds, actorId: user.id });
  return userIds.length;
}

// Someone was moved to another shift: they are told in the app and by push.
async function notifyPlacementChange(db, { user, personId }) {
  const { rows } = await db.query(
    "SELECT u.id, s.name AS shift_name FROM users u JOIN people p ON p.id = u.person_id LEFT JOIN shifts s ON s.id = p.shift_id WHERE u.person_id = $1 AND u.id <> $2",
    [personId, user.id]
  );
  await addPersonalNotices(db, rows.map(row => row.id), {
    kind: "placementChange", refKey: "placement", actorName: user.name,
    title: "Din placering har ändrats", detail: rows[0]?.shift_name ? `Nytt skift: ${rows[0].shift_name}` : "Inget skift"
  });
  return queuePlacementChange(db, { personId, actorId: user.id });
}

const serializeNotification = row => ({
  id: row.id,
  kind: row.kind,
  actorName: row.actor_name,
  title: row.title,
  detail: row.detail,
  noteId: row.note_id ?? null,
  read: Boolean(row.read_at),
  createdAt: row.created_at
});

module.exports = {
  notifyScheduleShared, isoWeekNumber, addNotifications, notifyAdminChange, notifyScheduleChange, notifyPlacementChange,
  serializeNotification,
  NOTIFICATION_PAGE_SIZE
};
