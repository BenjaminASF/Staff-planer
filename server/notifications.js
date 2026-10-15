const { ROLES, isAdmin, personalScopeOwner } = require("./permissions");
const { newId } = require("./store");

// ISO week number of a "YYYY-MM-DD" date.
function isoWeekNumber(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((thursday - firstThursday) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

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

async function addNotifications(db, userIds, { kind, actorName = "", title = "", detail = "" }) {
  const recipients = [...new Set(userIds)].filter(Boolean);
  if (!recipients.length) return 0;
  for (const userId of recipients) {
    await db.query(
      "INSERT INTO notifications (id, user_id, kind, actor_name, title, detail) VALUES ($1, $2, $3, $4, $5, $6)",
      [newId(), userId, kind, String(actorName).slice(0, 120), String(title).slice(0, 300), String(detail).slice(0, 500)]
    );
  }
  return recipients.length;
}

// When an admin changes something, the shift leaders and right hands it concerns
// get a short note: everyone for shared settings, only that shift's for a shift.
async function notifyAdminChange(db, { user, scope, type = "", title = "", detail = "" }) {
  if (!isAdmin(user) || !title || NOT_A_CHANGE.has(`${type}:${title}`)) return 0;
  const { rows } = await db.query(
    `SELECT u.id FROM users u JOIN people p ON p.id = u.person_id
      WHERE u.role = ANY($1::text[]) AND u.id <> $2 AND ($3 = 'global' OR p.shift_id = $3)`,
    [[ROLES.LEADER, ROLES.RIGHT_HAND], user.id, scope]
  );
  return addNotifications(db, rows.map(row => row.id), { kind: "adminChange", actorName: user.name, title, detail });
}

const sharedWithOf = item => Array.isArray(item?.sharedWith) ? item.sharedWith.filter(id => typeof id === "string") : [];

// Tells each user a to-do task was just shared with. Only users who have a list
// of their own can see shared tasks, so only they are told.
async function notifyTodosShared(db, { user, scope, before, after }) {
  if (personalScopeOwner(scope) !== user.id || !Array.isArray(after)) return 0;
  const earlier = new Map((Array.isArray(before) ? before : []).map(item => [item?.id, sharedWithOf(item)]));
  const shares = after.flatMap(item => {
    const previous = earlier.get(item?.id) || [];
    return sharedWithOf(item).filter(id => id !== user.id && !previous.includes(id)).map(id => ({ id, text: String(item.text || "") }));
  });
  if (!shares.length) return 0;
  const { rows } = await db.query("SELECT id FROM users WHERE id = ANY($1::text[]) AND role <> $2", [shares.map(share => share.id), ROLES.OPERATOR]);
  const valid = new Set(rows.map(row => row.id));
  let sent = 0;
  for (const share of shares.filter(share => valid.has(share.id))) {
    sent += await addNotifications(db, [share.id], { kind: "todoShared", actorName: user.name, title: share.text, detail: "" });
  }
  return sent;
}

const serializeNotification = row => ({
  id: row.id,
  kind: row.kind,
  actorName: row.actor_name,
  title: row.title,
  detail: row.detail,
  read: Boolean(row.read_at),
  createdAt: row.created_at
});

module.exports = {
  notifyScheduleShared, isoWeekNumber, addNotifications, notifyAdminChange, notifyTodosShared, serializeNotification,
  NOTIFICATION_PAGE_SIZE
};
