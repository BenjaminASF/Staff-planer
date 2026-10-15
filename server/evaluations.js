// Test results, competence and assessments are global documents that hold
// entries for every person. Shift leaders work only with the people they may
// evaluate: they read just those entries (test results and assessments), and
// what they save is merged into the stored document so everyone else's entries
// stay as they were.
const { ROLES, EVALUATED_BY_LEADERS } = require("./permissions");

// Objects keyed by person id.
const PERSON_KEYED = ["testResults", "machineSkills", "machineSkillUpdatedAt", "machineRestrictions", "machineSkillDetails"];
// Arrays of items with a personId.
const PERSON_LISTS = ["assessments"];

const isPersonScoped = key => PERSON_KEYED.includes(key) || PERSON_LISTS.includes(key);
const isPlainObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);

// The people a shift leader evaluates.
async function evaluatedPersonIds(db, user) {
  if (user?.role !== ROLES.LEADER || !user.shiftId) return new Set();
  const { rows } = await db.query(
    `SELECT p.id FROM people p LEFT JOIN users u ON u.person_id = p.id
      WHERE p.shift_id = $1 AND (u.role IS NULL OR u.role = ANY($2::text[]))`,
    [user.shiftId, EVALUATED_BY_LEADERS]
  );
  return new Set(rows.map(row => row.id));
}

// The document as the user may see it: only the entries for `personIds`.
function onlyFor(key, value, personIds) {
  if (PERSON_LISTS.includes(key)) return Array.isArray(value) ? value.filter(item => personIds.has(item?.personId)) : [];
  if (!isPlainObject(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([personId]) => personIds.has(personId)));
}

// Postgres does not keep key order in jsonb, so values are compared with sorted keys.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
const sameValue = (first, second) => JSON.stringify(canonical(first)) === JSON.stringify(canonical(second));

// Merges what the user saved into the stored document. Entries for other people
// may be left out or sent back unchanged, but never changed. Returns null when
// the save would change someone the user may not evaluate.
function mergeFor(key, stored, incoming, personIds) {
  if (PERSON_LISTS.includes(key)) {
    const storedItems = Array.isArray(stored) ? stored : [];
    const incomingItems = Array.isArray(incoming) ? incoming : [];
    const storedById = new Map(storedItems.map(item => [item?.id, item]));
    for (const item of incomingItems) {
      const before = storedById.get(item?.id);
      const touchesOthers = !personIds.has(item?.personId) || (before && !personIds.has(before.personId));
      if (touchesOthers && !(before && sameValue(before, item))) return null;
    }
    return [
      ...storedItems.filter(item => !personIds.has(item?.personId)),
      ...incomingItems.filter(item => personIds.has(item?.personId))
    ];
  }
  const storedValue = isPlainObject(stored) ? stored : {};
  const incomingValue = isPlainObject(incoming) ? incoming : {};
  for (const [personId, entry] of Object.entries(incomingValue)) {
    if (!personIds.has(personId) && !sameValue(entry, storedValue[personId])) return null;
  }
  return {
    ...Object.fromEntries(Object.entries(storedValue).filter(([personId]) => !personIds.has(personId))),
    ...Object.fromEntries(Object.entries(incomingValue).filter(([personId]) => personIds.has(personId)))
  };
}

module.exports = { isPersonScoped, evaluatedPersonIds, onlyFor, mergeFor };
