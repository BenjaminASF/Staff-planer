const { ROLES } = require("./permissions");

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

module.exports = { notifyScheduleShared, isoWeekNumber };
