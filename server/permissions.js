// Every rule about what each role may do lives in this file.
//
// Admin        – everything.
// Skiftledare  – like admin, but changes only their own shift, sees other shifts'
//                schedules read-only, may add staff to their own shift and may
//                change shared machines and settings. May not delete users,
//                change roles, or edit competence, test results or assessments.
// Operatör     – sees their own shift's schedule and break plan, edits their own
//                profile (name, phone, status) and password.
//
// Personal documents ("Att göra") belong to one admin or shift leader, and only
// that user reads and writes them. Backups leave them out.

const ROLES = Object.freeze({ ADMIN: "admin", LEADER: "shift_leader", OPERATOR: "operator" });
const ROLE_VALUES = Object.values(ROLES);

const AVAILABILITY_VALUES = ["available", "sick", "vab", "vacation", "unavailable"];

const WEEK_KEY = "\\d{4}-\\d{2}-\\d{2}";

// Global documents (scope "global") and their category.
const GLOBAL_DOCUMENTS = Object.freeze({
  appSettings: "config",
  workItems: "config",
  departments: "config",
  productionSettings: "config",
  workItemTrash: "configPrivate",
  machineSkills: "competence",
  machineSkillUpdatedAt: "competence",
  machineRestrictions: "competence",
  machineSkillDetails: "competence",
  assessments: "sensitive",
  testResults: "sensitive",
  safetySnapshots: "sensitive"
});

// Documents that belong to one shift (scope = shift id).
const SHIFT_DOCUMENTS = [
  [new RegExp(`^(schedule|trainingLeaders|trainingLocations|extraPersonLocations|breakPlan):${WEEK_KEY}$`), "shiftPlan"],
  [new RegExp(`^schedulePriorityLines:${WEEK_KEY}$`), "shiftWork"],
  [/^(scheduleTemplates|productionRecords)$/, "shiftWork"]
];

// Documents that belong to one user (scope = "user:<user id>").
const PERSONAL_SCOPE_PREFIX = "user:";
const PERSONAL_DOCUMENTS = ["todos"];

const personalScope = userId => `${PERSONAL_SCOPE_PREFIX}${userId}`;
const personalScopeOwner = scope => scope.startsWith(PERSONAL_SCOPE_PREFIX) ? scope.slice(PERSONAL_SCOPE_PREFIX.length) : null;

const WEEKLY_SCHEDULE_PREFIXES = ["schedule", "trainingLeaders", "trainingLocations", "extraPersonLocations"];

const isAdmin = user => user?.role === ROLES.ADMIN;
const isLeader = user => user?.role === ROLES.LEADER;
const isAdminOrLeader = user => isAdmin(user) || isLeader(user);
const leadsShift = (user, shiftId) => isLeader(user) && Boolean(user.shiftId) && user.shiftId === shiftId;
const canEditShift = (user, shiftId) => isAdmin(user) || leadsShift(user, shiftId);
const ownsPersonalScope = (user, scope) => isAdminOrLeader(user) && Boolean(user.id) && personalScopeOwner(scope) === user.id;

function documentCategory(scope, key) {
  if (typeof key !== "string" || typeof scope !== "string") return null;
  if (scope === "global") return Object.hasOwn(GLOBAL_DOCUMENTS, key) ? GLOBAL_DOCUMENTS[key] : null;
  if (personalScopeOwner(scope)) return PERSONAL_DOCUMENTS.includes(key) ? "personal" : null;
  const match = SHIFT_DOCUMENTS.find(([pattern]) => pattern.test(key));
  return match ? match[1] : null;
}

function canReadDocument(user, scope, key) {
  switch (documentCategory(scope, key)) {
    case "config": return Boolean(user);
    case "configPrivate":
    case "competence": return isAdminOrLeader(user);
    case "sensitive": return isAdmin(user);
    // Shift leaders may look at every shift's schedule; operators only their own.
    case "shiftPlan": return isAdminOrLeader(user) || (Boolean(user?.shiftId) && user.shiftId === scope);
    case "shiftWork": return canEditShift(user, scope);
    case "personal": return ownsPersonalScope(user, scope);
    default: return false;
  }
}

function canWriteDocument(user, scope, key) {
  switch (documentCategory(scope, key)) {
    case "config":
    case "configPrivate": return isAdminOrLeader(user);
    case "competence":
    case "sensitive": return isAdmin(user);
    case "shiftPlan":
    case "shiftWork": return canEditShift(user, scope);
    case "personal": return ownsPersonalScope(user, scope);
    default: return false;
  }
}

// Audit events belong to global or a shift; personal lists have no history.
function canReadAuditScope(user, scope) {
  if (personalScopeOwner(scope) !== null) return false;
  return scope === "global" ? isAdminOrLeader(user) : canEditShift(user, scope);
}

// People and accounts.

function canSeeAllPeople(user) {
  return isAdminOrLeader(user);
}

function canCreatePerson(user, shiftId) {
  return isAdmin(user) || leadsShift(user, shiftId);
}

// Which fields of `person` the user may change. An empty list means none.
function editablePersonFields(user, person) {
  if (isAdmin(user)) return ["name", "company", "phone", "availability", "shiftId"];
  if (leadsShift(user, person.shiftId)) return ["name", "company", "phone", "availability"];
  if (user?.personId === person.id) return ["name", "phone", "availability"];
  return [];
}

// Operators may not mark themselves "unavailable"; only admins and shift leaders set that status.
const LEADER_ONLY_AVAILABILITY = ["unavailable"];

function canSetAvailability(user, availability) {
  return user?.role !== ROLES.OPERATOR || !LEADER_ONLY_AVAILABILITY.includes(availability);
}

function canDeletePerson(user) {
  return isAdmin(user);
}

function canCreateAccount(user, person, role) {
  if (isAdmin(user)) return true;
  return leadsShift(user, person.shiftId) && role === ROLES.OPERATOR;
}

function canResetPassword(user, person, account) {
  if (isAdmin(user)) return true;
  return leadsShift(user, person.shiftId) && account?.role === ROLES.OPERATOR;
}

function canChangeRole(user) {
  return isAdmin(user);
}

function canDeleteAccount(user) {
  return isAdmin(user);
}

module.exports = {
  ROLES,
  ROLE_VALUES,
  AVAILABILITY_VALUES,
  GLOBAL_DOCUMENTS,
  WEEKLY_SCHEDULE_PREFIXES,
  PERSONAL_SCOPE_PREFIX,
  personalScope,
  personalScopeOwner,
  isAdmin,
  isLeader,
  isAdminOrLeader,
  canEditShift,
  documentCategory,
  canReadDocument,
  canWriteDocument,
  canReadAuditScope,
  canSeeAllPeople,
  canCreatePerson,
  editablePersonFields,
  canDeletePerson,
  canCreateAccount,
  canResetPassword,
  canChangeRole,
  canDeleteAccount,
  canSetAvailability
};
