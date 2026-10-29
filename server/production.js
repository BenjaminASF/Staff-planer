// The production page keeps each shift's days in the "productionRecords" document:
// { "<date>": { date, target, total, updatedAt, machines: { "<machine>": { personId,
// personName, cans, result, waste, plusMinus, comment, commentBy, commentAt } } } }.
//
// Senior operators record only machine waste, the plus/minus box and comments, on days
// a manager has started, today and yesterday. What they save is merged into the stored
// document, so nothing else changes.
//
// The server notes who wrote each comment (commentBy, commentAt). Only admins and shift
// leaders see it; everyone else gets the records without it.
const { HttpError } = require("./auth");
const { canSeeCommentAuthors } = require("./permissions");

const WASTE_FIELDS = ["waste", "plusMinus"];
const MAX_COMMENT_LENGTH = 1000;
const AUTHOR_FIELDS = ["commentBy", "commentAt", "commentByName"];

const isPlainObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const copy = value => JSON.parse(JSON.stringify(value ?? null));

// Today and yesterday in the workplace's time zone, so the days follow the calendar
// across a month or year end.
function wasteEditableDates(now = new Date(), timeZone = process.env.APP_TIME_ZONE || "Europe/Stockholm") {
  const [year, month, day] = now.toLocaleDateString("sv-SE", { timeZone }).split("-").map(Number);
  return [0, 1].map(daysBack => new Date(Date.UTC(year, month - 1, day - daysBack)).toISOString().slice(0, 10));
}

function cleanKilos(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const kilos = Number(value);
  if (!Number.isFinite(kilos) || kilos < 0) throw new HttpError(400, "Ange svinn som ett tal som är 0 eller mer.");
  return kilos;
}

// What a senior operator saved, merged into the stored records: only waste, plus/minus and
// comments of machines on days already started, and only today and yesterday. Days left
// out keep what is stored. Throws when the save would change anything else.
function mergeWasteChanges(stored, incoming, editableDates, now = new Date()) {
  if (!isPlainObject(incoming)) throw new HttpError(400, "Ogiltig produktionsdata.");
  const records = isPlainObject(stored) ? copy(stored) : {};
  for (const [date, incomingDay] of Object.entries(incoming)) {
    const day = records[date];
    if (!isPlainObject(day)) throw new HttpError(403, "Dagen är inte påbörjad. Skiftledaren eller höger hand registrerar dagen först.");
    if (!isPlainObject(incomingDay?.machines) || !isPlainObject(day.machines)) continue;
    let changed = false;
    for (const [machine, entry] of Object.entries(day.machines)) {
      const incomingEntry = incomingDay.machines[machine];
      if (!isPlainObject(entry) || !isPlainObject(incomingEntry)) continue;
      for (const field of WASTE_FIELDS) {
        if (!(field in incomingEntry)) continue;
        const kilos = cleanKilos(incomingEntry[field]);
        if (kilos === (Number(entry[field]) || 0)) continue;
        entry[field] = kilos;
        changed = true;
      }
      if ("comment" in incomingEntry) {
        const comment = String(incomingEntry.comment ?? "").trim().slice(0, MAX_COMMENT_LENGTH);
        if (comment !== String(entry.comment ?? "")) {
          entry.comment = comment;
          changed = true;
        }
      }
    }
    if (!changed) continue;
    if (!editableDates.includes(date)) throw new HttpError(403, "Du kan bara ändra svinn och kommentarer för idag och igår.");
    day.updatedAt = now.toISOString();
  }
  return records;
}

// Notes who wrote each comment. A comment that did not change keeps its author, so
// someone who saves the day without seeing the authors does not remove them. What the
// client sent about authors is ignored.
function stampCommentAuthors(stored, value, userId, now = new Date()) {
  if (!isPlainObject(value)) return value;
  const records = copy(value);
  for (const [date, day] of Object.entries(records)) {
    if (!isPlainObject(day?.machines)) continue;
    for (const [machine, entry] of Object.entries(day.machines)) {
      if (!isPlainObject(entry)) continue;
      const before = stored?.[date]?.machines?.[machine];
      const comment = String(entry.comment ?? "");
      AUTHOR_FIELDS.forEach(field => delete entry[field]);
      if (comment === String(before?.comment ?? "")) {
        if (before?.commentBy) Object.assign(entry, { commentBy: before.commentBy, commentAt: before.commentAt || null });
      } else if (comment.trim()) {
        Object.assign(entry, { commentBy: userId, commentAt: now.toISOString() });
      }
    }
  }
  return records;
}

function eachEntry(records, visit) {
  if (!isPlainObject(records)) return;
  Object.values(records).forEach(day => {
    if (isPlainObject(day?.machines)) Object.values(day.machines).forEach(entry => { if (isPlainObject(entry)) visit(entry); });
  });
}

// The records as the user may see them: with the authors' names for admins and shift
// leaders, without any trace of who wrote a comment for everyone else.
async function recordsFor(db, user, value) {
  const records = copy(value);
  if (!canSeeCommentAuthors(user)) {
    eachEntry(records, entry => AUTHOR_FIELDS.forEach(field => delete entry[field]));
    return records;
  }
  const userIds = new Set();
  eachEntry(records, entry => { if (entry.commentBy) userIds.add(entry.commentBy); });
  if (!userIds.size) return records;
  const { rows } = await db.query(
    "SELECT u.id, p.name FROM users u LEFT JOIN people p ON p.id = u.person_id WHERE u.id = ANY($1::text[])", [[...userIds]]
  );
  const names = new Map(rows.map(row => [row.id, row.name || ""]));
  eachEntry(records, entry => {
    if (entry.commentBy) entry.commentByName = names.get(entry.commentBy) || "Borttagen användare";
  });
  return records;
}

// Realtime changes say who saved a document. For production records that could tell
// who wrote a comment, so only admins and shift leaders get it.
function changeFor(user, change) {
  if (change.type !== "document" || change.key !== "productionRecords" || canSeeCommentAuthors(user)) return change;
  const { by, ...rest } = change;
  return rest;
}

module.exports = { wasteEditableDates, mergeWasteChanges, stampCommentAuthors, recordsFor, changeFor };
