const crypto = require("node:crypto");
const { WEEKLY_SCHEDULE_PREFIXES } = require("./permissions");

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

const newId = () => crypto.randomUUID();

function serializePerson(row) {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    phone: row.phone,
    availability: row.availability,
    shiftId: row.shift_id,
    demo: row.demo,
    createdAt: row.created_at,
    account: row.username
      ? { username: row.username, role: row.role, lastLoginAt: row.last_login_at || null, mustChangePassword: Boolean(row.must_change_password) }
      : null
  };
}

const PERSON_SELECT = `
  SELECT p.*, u.username, u.role, u.last_login_at, u.must_change_password
    FROM people p
    LEFT JOIN users u ON u.person_id = p.id`;

async function getPersonById(db, id) {
  const { rows } = await db.query(`${PERSON_SELECT} WHERE p.id = $1`, [id]);
  return rows[0] ? serializePerson(rows[0]) : null;
}

async function readDocuments(db, scope, keys) {
  if (!keys.length) return {};
  const { rows } = await db.query(
    "SELECT key, value, version, updated_at FROM documents WHERE scope = $1 AND key = ANY($2::text[])",
    [scope, keys]
  );
  return Object.fromEntries(rows.map(row => [row.key, { value: row.value, version: row.version, updatedAt: row.updated_at }]));
}

// Saves a document if nobody else changed it since baseVersion was read.
// Returns null on a version conflict.
async function writeDocument(db, { scope, key, value, baseVersion, userId }) {
  const json = JSON.stringify(value ?? null);
  if (Buffer.byteLength(json) > MAX_DOCUMENT_BYTES) {
    const error = new Error("Document too large");
    error.status = 413;
    throw error;
  }
  if (!baseVersion) {
    const { rows } = await db.query(
      `INSERT INTO documents (scope, key, value, updated_by) VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (scope, key) DO NOTHING
       RETURNING version, updated_at`,
      [scope, key, json, userId]
    );
    return rows[0] ? { version: rows[0].version, updatedAt: rows[0].updated_at } : null;
  }
  const { rows } = await db.query(
    `UPDATE documents SET value = $3::jsonb, version = version + 1, updated_at = now(), updated_by = $4
      WHERE scope = $1 AND key = $2 AND version = $5
      RETURNING version, updated_at`,
    [scope, key, json, userId, baseVersion]
  );
  return rows[0] ? { version: rows[0].version, updatedAt: rows[0].updated_at } : null;
}

// Unconditional write used by server-side maintenance (rename, purge, import).
async function putDocument(db, scope, key, value, userId = null) {
  await db.query(
    `INSERT INTO documents (scope, key, value, updated_by) VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (scope, key) DO UPDATE
       SET value = EXCLUDED.value, version = documents.version + 1, updated_at = now(), updated_by = EXCLUDED.updated_by`,
    [scope, key, JSON.stringify(value ?? null), userId]
  );
}

// Loads documents FOR UPDATE, lets `change` edit them in place, and saves the ones it reports as changed.
async function updateDocumentsWhere(db, whereSql, params, change, userId) {
  const { rows } = await db.query(`SELECT scope, key, value FROM documents WHERE ${whereSql} FOR UPDATE`, params);
  let updated = 0;
  for (const row of rows) {
    if (change(row.value, row.key, row.scope)) {
      await putDocument(db, row.scope, row.key, row.value, userId);
      updated += 1;
    }
  }
  return updated;
}

const isPlainObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function clearPersonFromPlacements(placements, personId) {
  if (!isPlainObject(placements)) return false;
  let changed = false;
  Object.values(placements).forEach(days => {
    if (!isPlainObject(days)) return;
    Object.keys(days).forEach(day => {
      if (days[day] === personId) { days[day] = ""; changed = true; }
    });
  });
  return changed;
}

// Removes every reference to a deleted person, in all shifts and weeks.
async function purgePersonFromDocuments(db, personId, userId) {
  await updateDocumentsWhere(db, "scope = 'global' AND key = 'assessments'", [], value => {
    if (!Array.isArray(value)) return false;
    const before = value.length;
    const kept = value.filter(item => item?.personId !== personId);
    value.splice(0, value.length, ...kept);
    return kept.length !== before;
  }, userId);
  await updateDocumentsWhere(
    db,
    "scope = 'global' AND key = ANY($1::text[])",
    [["testResults", "machineSkills", "machineSkillUpdatedAt", "machineRestrictions", "machineSkillDetails"]],
    value => {
      if (!isPlainObject(value) || !Object.hasOwn(value, personId)) return false;
      delete value[personId];
      return true;
    },
    userId
  );
  await updateDocumentsWhere(db, "scope <> 'global' AND (key LIKE 'schedule:%' OR key LIKE 'trainingLeaders:%')", [],
    value => clearPersonFromPlacements(value, personId), userId);
  await updateDocumentsWhere(db, "scope <> 'global' AND key LIKE 'breakPlan:%'", [], value => {
    if (!isPlainObject(value)) return false;
    let changed = false;
    Object.values(value).forEach(day => {
      ["groups", "workplaces"].forEach(field => {
        if (isPlainObject(day?.[field]) && Object.hasOwn(day[field], personId)) {
          delete day[field][personId];
          changed = true;
        }
      });
    });
    return changed;
  }, userId);
  await updateDocumentsWhere(db, "scope <> 'global' AND key = 'scheduleTemplates'", [], value => {
    if (!Array.isArray(value)) return false;
    let changed = false;
    value.forEach(template => {
      if (clearPersonFromPlacements(template?.schedule, personId)) changed = true;
      if (clearPersonFromPlacements(template?.trainingLeaders, personId)) changed = true;
    });
    return changed;
  }, userId);
}

// Monday of the current week as YYYY-MM-DD, in the workplace's time zone.
function currentWeekKey(timeZone = process.env.APP_TIME_ZONE || "Europe/Stockholm") {
  const [year, month, day] = new Date().toLocaleDateString("sv-SE", { timeZone }).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

// Takes someone who moved to another shift out of the old shift's schedules from
// this week on. Earlier weeks keep their history.
async function clearPersonFromShiftSchedules(db, personId, shiftId, userId) {
  const fromWeek = currentWeekKey();
  await updateDocumentsWhere(
    db,
    "scope = $1 AND (key LIKE 'schedule:%' OR key LIKE 'trainingLeaders:%') AND split_part(key, ':', 2) >= $2",
    [shiftId, fromWeek],
    value => clearPersonFromPlacements(value, personId),
    userId
  );
  await updateDocumentsWhere(db, "scope = $1 AND key LIKE 'breakPlan:%' AND split_part(key, ':', 2) >= $2", [shiftId, fromWeek], value => {
    if (!isPlainObject(value)) return false;
    let changed = false;
    Object.values(value).forEach(day => {
      ["groups", "workplaces"].forEach(field => {
        if (isPlainObject(day?.[field]) && Object.hasOwn(day[field], personId)) {
          delete day[field][personId];
          changed = true;
        }
      });
    });
    return changed;
  }, userId);
}

function renameKey(object, from, to) {
  if (!isPlainObject(object) || !Object.hasOwn(object, from)) return false;
  object[to] = object[from];
  delete object[from];
  return true;
}

function renameLocationValues(locations, from, to) {
  if (!isPlainObject(locations)) return false;
  let changed = false;
  Object.values(locations).forEach(days => {
    if (!isPlainObject(days)) return;
    Object.keys(days).forEach(day => {
      if (days[day] === from) { days[day] = to; changed = true; }
    });
  });
  return changed;
}

// Renames a machine/department everywhere it is referenced: competence, test results
// and every shift's schedules and templates.
async function renameWorkItemReferences(db, from, to, userId) {
  if (!from || !to || from === to) return;
  await updateDocumentsWhere(db, "scope = 'global' AND key = 'departments'", [], value => {
    if (!Array.isArray(value) || !value.includes(from)) return false;
    value.forEach((name, index) => { if (name === from) value[index] = to; });
    return true;
  }, userId);
  await updateDocumentsWhere(db, "scope = 'global' AND key = ANY($1::text[])", [["testResults", "machineSkillDetails"]], value => {
    if (!isPlainObject(value)) return false;
    let changed = false;
    Object.values(value).forEach(personValues => { if (renameKey(personValues, from, to)) changed = true; });
    return changed;
  }, userId);
  await updateDocumentsWhere(db, "scope = 'global' AND key = 'machineSkills'", [], value => {
    if (!isPlainObject(value)) return false;
    let changed = false;
    Object.keys(value).forEach(personId => {
      if (Array.isArray(value[personId]) && value[personId].includes(from)) {
        value[personId] = value[personId].map(name => name === from ? to : name);
        changed = true;
      }
    });
    return changed;
  }, userId);
  const weeklyPatterns = WEEKLY_SCHEDULE_PREFIXES.map(prefix => `${prefix}:%`);
  await updateDocumentsWhere(db, "scope <> 'global' AND key LIKE ANY($1::text[])", [weeklyPatterns], (value, key) => {
    let changed = renameKey(value, from, to);
    if (key.startsWith("trainingLocations:") && renameLocationValues(value, from, to)) changed = true;
    return changed;
  }, userId);
  await updateDocumentsWhere(db, "scope <> 'global' AND key = 'scheduleTemplates'", [], value => {
    if (!Array.isArray(value)) return false;
    let changed = false;
    value.forEach(template => {
      WEEKLY_SCHEDULE_PREFIXES.forEach(field => { if (renameKey(template?.[field], from, to)) changed = true; });
      if (renameLocationValues(template?.trainingLocations, from, to)) changed = true;
    });
    return changed;
  }, userId);
}

async function countWorkItemUsage(db, name) {
  const { rows } = await db.query(
    "SELECT value -> $1 AS days FROM documents WHERE scope <> 'global' AND key LIKE 'schedule:%' AND value ? $1",
    [name]
  );
  return rows.reduce((count, row) => count + Object.values(isPlainObject(row.days) ? row.days : {}).filter(Boolean).length, 0);
}

async function createSafetySnapshot(db, reason, userId) {
  const docs = await readDocuments(db, "global", ["workItems", "workItemTrash", "departments", "testResults", "machineSkills", "machineSkillDetails", "safetySnapshots"]);
  const value = key => docs[key]?.value;
  const snapshots = Array.isArray(value("safetySnapshots")) ? value("safetySnapshots") : [];
  snapshots.unshift({
    id: newId(),
    createdAt: new Date().toISOString(),
    reason: String(reason || "Säkerhetspunkt").slice(0, 200),
    data: {
      workItems: value("workItems") || [],
      trash: value("workItemTrash") || [],
      departments: value("departments") || [],
      results: value("testResults") || {},
      skills: value("machineSkills") || {},
      details: value("machineSkillDetails") || {}
    }
  });
  await putDocument(db, "global", "safetySnapshots", snapshots.slice(0, 5), userId);
}

async function addAuditEvent(db, { scope, type = "", title = "", detail = "", undo = null, userId = null }) {
  const id = newId();
  await db.query(
    "INSERT INTO audit_events (id, scope, type, title, detail, undo, user_id) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)",
    [id, scope, String(type).slice(0, 40), String(title).slice(0, 300), String(detail).slice(0, 500), undo === null ? null : JSON.stringify(undo), userId]
  );
  return id;
}

module.exports = {
  newId,
  serializePerson,
  PERSON_SELECT,
  getPersonById,
  readDocuments,
  writeDocument,
  putDocument,
  purgePersonFromDocuments,
  clearPersonFromShiftSchedules,
  currentWeekKey,
  renameWorkItemReferences,
  countWorkItemUsage,
  createSafetySnapshot,
  addAuditEvent,
  isPlainObject,
  MAX_DOCUMENT_BYTES
};
