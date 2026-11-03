// The production page keeps each shift's days in the "productionRecords" document:
// { "<date>": { date, target, total, updatedAt, machines: { "<machine>": { personId,
// personName, cans, result, waste, plusMinus, comment, commentBy, commentAt, edits } } } }.
//
// The page saves only the fields someone changed (applyProductionChanges), so two people
// working on the same day never overwrite each other's fields with what their page showed
// earlier. Senior operators change only machine waste, the plus/minus box and comments,
// today and yesterday; they may start a day, but never change its results.
//
// The server notes who last changed each field and when (edits: { <field>: { by, at } }),
// and who wrote each comment (commentBy, commentAt). Only admins and shift leaders see it;
// everyone else gets the records without it.
const { HttpError } = require("./auth");
const { canSeeCommentAuthors } = require("./permissions");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FIELDS = ["personId", "cans", "result", "waste", "plusMinus", "comment"];
const SENIOR_FIELDS = ["waste", "plusMinus", "comment"];
const MAX_COMMENT_LENGTH = 1000;
const MAX_MACHINES = 50;
const AUTHOR_FIELDS = ["commentBy", "commentAt", "commentByName"];
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isPlainObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const copy = value => JSON.parse(JSON.stringify(value ?? null));

// Today and yesterday in the workplace's time zone, so the days follow the calendar
// across a month or year end.
function wasteEditableDates(now = new Date(), timeZone = process.env.APP_TIME_ZONE || "Europe/Stockholm") {
  const [year, month, day] = now.toLocaleDateString("sv-SE", { timeZone }).split("-").map(Number);
  return [0, 1].map(daysBack => new Date(Date.UTC(year, month - 1, day - daysBack)).toISOString().slice(0, 10));
}

function nonNegative(value, message) {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new HttpError(400, message);
  return number;
}

// A field's value as it is stored.
function cleanField(field, value) {
  switch (field) {
    case "personId": return String(value ?? "").slice(0, 100);
    case "cans": {
      if (value === "" || value === null || value === undefined) return null;
      const cans = Number(value);
      if (!Number.isSafeInteger(cans) || cans < 0) throw new HttpError(400, "Ange antal dosor som ett heltal som är 0 eller mer.");
      return cans;
    }
    case "result": return nonNegative(value, "Ange resultatet som ett tal som är 0 eller mer.");
    case "comment": return String(value ?? "").trim().slice(0, MAX_COMMENT_LENGTH);
    default: return nonNegative(value, "Ange svinn som ett tal som är 0 eller mer.");
  }
}

// Stored values compared the way the page shows them: a missing number is 0, missing dosor none.
function sameField(field, first, second) {
  if (field === "personId" || field === "comment") return String(first ?? "") === String(second ?? "");
  if (field === "cans") return (first ?? null) === (second ?? null) || (first === "" && second === null) || (first === null && second === "");
  return (Number(first) || 0) === (Number(second) || 0);
}

const dayTotal = day => Object.values(day.machines || {}).reduce((sum, entry) => sum + (Number(entry?.result) || 0), 0);

// Applies the changed fields of one day to the stored records. `changes` is
// { machines: { <machine>: { <field>: value } }, defaults?, target? }. Fields that are not
// sent stay as stored. `defaults` has the same shape and fills only fields nothing is stored
// in yet, such as the operator the schedule puts on a machine, so two people starting the
// same day keep each other's values. A senior operator (seniorOnly) changes only waste,
// plus/minus and comments, today and yesterday. personNames maps person ids to names.
// Returns the new records, or null when nothing changed.
function applyProductionChanges(stored, { date, changes, userId, seniorOnly, editableDates, personNames, now = new Date() }) {
  if (!DATE_PATTERN.test(date) || !isPlainObject(changes) || !isPlainObject(changes.machines)) {
    throw new HttpError(400, "Ogiltig produktionsdata.");
  }
  if (seniorOnly && !editableDates.includes(date)) throw new HttpError(403, "Du kan bara ändra svinn och kommentarer för idag och igår.");
  if (seniorOnly && "target" in changes) throw new HttpError(403, "Endast skiftledare och admin kan ändra det dagliga målet.");
  if (seniorOnly && "defaults" in changes) throw new HttpError(403, "Som senior operatör kan du bara ändra svinn, plus-/minuslåda och kommentarer.");
  if ("defaults" in changes && !isPlainObject(changes.defaults)) throw new HttpError(400, "Ogiltig produktionsdata.");
  const machineChanges = Object.entries(changes.machines);
  const defaults = Object.entries(changes.defaults || {});
  if (machineChanges.length > MAX_MACHINES || defaults.length > MAX_MACHINES) throw new HttpError(400, "För många maskiner.");
  const records = isPlainObject(stored) ? copy(stored) : {};
  const day = isPlainObject(records[date]) ? records[date] : { date, machines: {} };
  if (!isPlainObject(day.machines)) day.machines = {};
  const at = now.toISOString();
  let changed = !isPlainObject(records[date]);

  for (const [machine, fields] of [...machineChanges, ...defaults]) {
    if (!machine || machine.length > 120 || UNSAFE_KEYS.has(machine) || !isPlainObject(fields)) throw new HttpError(400, "Ogiltig maskin.");
    for (const field of Object.keys(fields)) {
      if (!FIELDS.includes(field)) throw new HttpError(400, "Okänt fält.");
      if (seniorOnly && !SENIOR_FIELDS.includes(field)) {
        throw new HttpError(403, "Som senior operatör kan du bara ändra svinn, plus-/minuslåda och kommentarer.");
      }
    }
  }
  const apply = (machine, fields, onlyMissing) => {
    const entry = isPlainObject(day.machines[machine]) ? day.machines[machine] : {};
    day.machines[machine] = entry;
    for (const [field, raw] of Object.entries(fields)) {
      if (onlyMissing && field in entry) continue;
      const value = cleanField(field, raw);
      const differs = !sameField(field, entry[field], value);
      // A field that was never stored is stored, also when it is still empty.
      if (!differs && field in entry) continue;
      entry[field] = value;
      changed = true;
      if (!differs) continue;
      entry.edits = isPlainObject(entry.edits) ? entry.edits : {};
      entry.edits[field] = { by: userId, at };
      if (field === "personId") entry.personName = value ? personNames.get(value) ?? "" : "";
      if (field === "comment") {
        AUTHOR_FIELDS.forEach(name => delete entry[name]);
        if (value) Object.assign(entry, { commentBy: userId, commentAt: at });
      }
    }
  };
  machineChanges.forEach(([machine, fields]) => apply(machine, fields, false));
  defaults.forEach(([machine, fields]) => apply(machine, fields, true));
  if ("target" in changes) {
    const target = nonNegative(changes.target, "Ange målet som ett tal som är 0 eller mer.");
    if (day.target !== target) {
      day.target = target;
      changed = true;
    }
  }
  if (!changed) return null;
  day.date = date;
  day.total = dayTotal(day);
  day.updatedAt = at;
  records[date] = day;
  return records;
}

// For whole-document saves (removing a day, restoring older pages): who changed each
// field and wrote each comment is kept for what did not change and set for what did.
// What the client sent about authors is ignored.
function stampCommentAuthors(stored, value, userId, now = new Date()) {
  if (!isPlainObject(value)) return value;
  const records = copy(value);
  const at = now.toISOString();
  for (const [date, day] of Object.entries(records)) {
    if (!isPlainObject(day?.machines)) continue;
    for (const [machine, entry] of Object.entries(day.machines)) {
      if (!isPlainObject(entry)) continue;
      const before = stored?.[date]?.machines?.[machine];
      const beforeEdits = isPlainObject(before?.edits) ? before.edits : {};
      const comment = String(entry.comment ?? "");
      AUTHOR_FIELDS.forEach(field => delete entry[field]);
      delete entry.edits;
      const edits = {};
      for (const field of FIELDS) {
        if (!isPlainObject(before) ? field in entry && !sameField(field, undefined, entry[field]) : !sameField(field, before[field], entry[field])) {
          edits[field] = { by: userId, at };
        } else if (isPlainObject(beforeEdits[field])) {
          edits[field] = { by: beforeEdits[field].by, at: beforeEdits[field].at };
        }
      }
      if (Object.keys(edits).length) entry.edits = edits;
      if (comment === String(before?.comment ?? "")) {
        if (before?.commentBy) Object.assign(entry, { commentBy: before.commentBy, commentAt: before.commentAt || null });
      } else if (comment.trim()) {
        Object.assign(entry, { commentBy: userId, commentAt: at });
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

const editsOf = entry => (isPlainObject(entry.edits) ? Object.values(entry.edits).filter(isPlainObject) : []);

// The records as the user may see them: with names for admins and shift leaders, without
// any trace of who changed what for everyone else.
async function recordsFor(db, user, value) {
  const records = copy(value);
  if (!canSeeCommentAuthors(user)) {
    eachEntry(records, entry => {
      AUTHOR_FIELDS.forEach(field => delete entry[field]);
      delete entry.edits;
    });
    return records;
  }
  const userIds = new Set();
  eachEntry(records, entry => {
    if (entry.commentBy) userIds.add(entry.commentBy);
    editsOf(entry).forEach(edit => { if (edit.by) userIds.add(edit.by); });
  });
  if (!userIds.size) return records;
  const { rows } = await db.query(
    "SELECT u.id, p.name FROM users u LEFT JOIN people p ON p.id = u.person_id WHERE u.id = ANY($1::text[])", [[...userIds]]
  );
  const names = new Map(rows.map(row => [row.id, row.name || ""]));
  const nameOf = id => names.get(id) || "Borttagen användare";
  eachEntry(records, entry => {
    if (entry.commentBy) entry.commentByName = nameOf(entry.commentBy);
    editsOf(entry).forEach(edit => { if (edit.by) edit.name = nameOf(edit.by); });
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

module.exports = { DATE_PATTERN, wasteEditableDates, applyProductionChanges, stampCommentAuthors, recordsFor, changeFor };
