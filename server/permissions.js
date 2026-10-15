// Every rule about what each role may do lives in this file.
//
// Admin        – everything.
// Skiftledare  – like admin, but changes only their own shift, sees other shifts'
//                schedules read-only, may add staff to their own shift and may
//                change shared machines and settings. Tests and assesses the
//                operators in their own shift: test results, competence and
//                assessments, for those people only. May not change an admin's
//                details, delete users or change roles.
// Höger hand   – the shift leader's assistant, who runs the shift when the leader
//                is away. Like a shift leader, but only in their own shift: sees and
//                changes only that shift's schedule, adds and manages operators
//                there, records production and uses the chat. May not change the
//                daily production target, shared machines or settings, and does
//                not look at other shifts' schedules.
// Operatör     – sees their own shift's schedule and break plan once an admin or
//                shift leader has shared that week, edits their own profile
//                (name, phone, status) and password.
//
// Personal documents ("Att göra") belong to one user, and only that user reads
// and writes them. Every role except operators has a list, so roles added later
// get one too. The owner can share single tasks with chosen users, who then
// see those tasks read-only. Backups leave the lists out.

const ROLES = Object.freeze({ ADMIN: "admin", LEADER: "shift_leader", RIGHT_HAND: "right_hand", OPERATOR: "operator" });
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
  assessments: "evaluation",
  testResults: "evaluation",
  safetySnapshots: "sensitive"
});

// Documents that belong to one shift (scope = shift id).
const SHIFT_DOCUMENTS = [
  [new RegExp(`^(schedule|trainingLeaders|trainingLocations|extraPersonLocations|breakPlan):${WEEK_KEY}$`), "shiftPlan"],
  [new RegExp(`^schedulePriorityLines:${WEEK_KEY}$`), "shiftWork"],
  [new RegExp(`^scheduleShared:${WEEK_KEY}$`), "shiftShare"],
  [/^(scheduleTemplates|productionRecords)$/, "shiftWork"]
];

// Documents that belong to one user (scope = "user:<user id>").
const PERSONAL_SCOPE_PREFIX = "user:";
const PERSONAL_DOCUMENTS = ["todos"];

const personalScope = userId => `${PERSONAL_SCOPE_PREFIX}${userId}`;
const personalScopeOwner = scope => scope.startsWith(PERSONAL_SCOPE_PREFIX) ? scope.slice(PERSONAL_SCOPE_PREFIX.length) : null;

// Marks a shift's week as shared with its operators (scope = shift id).
const SHARED_FLAG_PREFIX = "scheduleShared";
const sharedFlagKey = weekKey => `${SHARED_FLAG_PREFIX}:${weekKey}`;

const WEEKLY_SCHEDULE_PREFIXES = ["schedule", "trainingLeaders", "trainingLocations", "extraPersonLocations"];

const isAdmin = user => user?.role === ROLES.ADMIN;
const isLeader = user => user?.role === ROLES.LEADER;
const isRightHand = user => user?.role === ROLES.RIGHT_HAND;
const isAdminOrLeader = user => isAdmin(user) || isLeader(user);
// Everyone who plans a shift: admins, shift leaders and their right hands.
const isShiftManager = user => isAdminOrLeader(user) || isRightHand(user);
// Shift leaders and right hands must belong to a shift.
const roleNeedsShift = role => role === ROLES.LEADER || role === ROLES.RIGHT_HAND;
const leadsShift = (user, shiftId) => (isLeader(user) || isRightHand(user)) && Boolean(user.shiftId) && user.shiftId === shiftId;
const canEditShift = (user, shiftId) => isAdmin(user) || leadsShift(user, shiftId);
const hasPersonalList = user => Boolean(user?.role) && user.role !== ROLES.OPERATOR;
const ownsPersonalScope = (user, scope) => hasPersonalList(user) && Boolean(user.id) && personalScopeOwner(scope) === user.id;

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
    case "configPrivate": return isAdminOrLeader(user);
    // Scheduling depends on competence, so everyone who plans a shift reads it.
    case "competence": return isShiftManager(user);
    // Shift leaders get only the entries for the people they evaluate (see evaluations.js).
    case "evaluation": return isAdminOrLeader(user);
    case "sensitive": return isAdmin(user);
    // Shift leaders may look at every shift's schedule; everyone else only their own.
    case "shiftPlan":
    case "shiftShare": return isAdminOrLeader(user) || (Boolean(user?.shiftId) && user.shiftId === scope);
    case "shiftWork": return canEditShift(user, scope);
    case "personal": return ownsPersonalScope(user, scope);
    default: return false;
  }
}

function canWriteDocument(user, scope, key) {
  switch (documentCategory(scope, key)) {
    // Right hands record production, which may set a new factory record.
    case "config": return isAdminOrLeader(user) || (isRightHand(user) && key === "productionSettings");
    case "configPrivate": return isAdminOrLeader(user);
    // Shift leaders change only the entries for the people they evaluate (see evaluations.js).
    case "competence":
    case "evaluation": return isAdminOrLeader(user);
    case "sensitive": return isAdmin(user);
    case "shiftPlan":
    case "shiftWork":
    case "shiftShare": return canEditShift(user, scope);
    case "personal": return ownsPersonalScope(user, scope);
    default: return false;
  }
}

// Operators see a week's schedule and break plan only after it has been shared.
// Returns the week the document belongs to when the user needs that week shared, otherwise null.
function weekRequiringShare(user, scope, key) {
  if (isShiftManager(user) || documentCategory(scope, key) !== "shiftPlan") return null;
  return key.slice(key.indexOf(":") + 1);
}

// The daily production target lives in "productionSettings" next to the factory
// record. Right hands save that document when a day beats the record, but only
// admins and shift leaders may change the target in it.
const DEFAULT_DAILY_TARGET = 160;

function canChangeProductionTarget(user) {
  return isAdminOrLeader(user);
}

function productionTargets(settings) {
  const changes = settings?.targetChanges && typeof settings.targetChanges === "object" ? settings.targetChanges : {};
  return JSON.stringify({
    dailyTarget: Number(settings?.dailyTarget) || DEFAULT_DAILY_TARGET,
    targetChanges: Object.entries(changes)
      .filter(([date, target]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Number(target)) && Number(target) >= 0)
      .map(([date, target]) => [date, Number(target)])
      .sort(([first], [second]) => first.localeCompare(second))
  });
}

function changesProductionTarget(before, after) {
  return productionTargets(before) !== productionTargets(after);
}

// Audit events belong to global or a shift; personal lists have no history.
function canReadAuditScope(user, scope) {
  if (personalScopeOwner(scope) !== null) return false;
  return scope === "global" ? isAdminOrLeader(user) : canEditShift(user, scope);
}

// People and accounts.

function canSeeAllPeople(user) {
  return isShiftManager(user);
}

function canCreatePerson(user, shiftId) {
  return isAdmin(user) || leadsShift(user, shiftId);
}

// Which fields of `person` the user may change. An empty list means none.
function editablePersonFields(user, person) {
  if (isAdmin(user)) return ["name", "company", "phone", "email", "availability", "shiftId"];
  // Shift leaders manage the staff in their shift, but never an admin's details.
  // Right hands manage the operators and the staff without a login.
  const managedRoles = isLeader(user) ? [ROLES.LEADER, ROLES.RIGHT_HAND, ROLES.OPERATOR] : [ROLES.OPERATOR];
  if (leadsShift(user, person.shiftId) && (!person.account || managedRoles.includes(person.account.role))) {
    return ["name", "company", "phone", "email", "availability"];
  }
  if (user?.personId === person.id) return ["name", "phone", "email", "availability"];
  return [];
}

// Test results, competence and assessments. Admins evaluate everyone. Shift
// leaders evaluate the operators in their own shift, and the right hands and
// staff without a login there, but never another shift leader or an admin.
const EVALUATED_BY_LEADERS = [ROLES.OPERATOR, ROLES.RIGHT_HAND];

function evaluatesEveryone(user) {
  return isAdmin(user);
}

function canEvaluatePerson(user, person) {
  if (isAdmin(user)) return true;
  return isLeader(user) && leadsShift(user, person.shiftId) && (!person.account || EVALUATED_BY_LEADERS.includes(person.account.role));
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

// The chat is shared by everyone who plans the shifts.
function canUseChat(user) {
  return isShiftManager(user);
}

// Authors remove their own chat messages; admins can remove any.
function canDeleteChatMessage(user, message) {
  return isAdmin(user) || (Boolean(message.user_id) && message.user_id === user?.id);
}

function canDeleteAccount(user) {
  return isAdmin(user);
}

module.exports = {
  canUseChat,
  canDeleteChatMessage,
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
  isRightHand,
  isAdminOrLeader,
  isShiftManager,
  hasPersonalList,
  roleNeedsShift,
  canEditShift,
  canChangeProductionTarget,
  EVALUATED_BY_LEADERS,
  evaluatesEveryone,
  canEvaluatePerson,
  changesProductionTarget,
  documentCategory,
  sharedFlagKey,
  weekRequiringShare,
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
