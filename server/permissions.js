// Every rule about what each role may do lives in this file.
//
// The roles form a hierarchy (ROLE_LEVELS). Admins can do everything. Below
// them, a user manages only people in their own shift who rank strictly below
// them, and hands out only roles below their own. So nobody can change the
// details, login or role of someone at their own level or above.
//
// Admin        – everything.
// Skiftledare  – like admin, but changes only their own shift, sees other shifts'
//                schedules read-only, may add staff to their own shift and may
//                change shared machines and settings. Tests and assesses the
//                operators in their own shift: test results, competence and
//                assessments, for those people only. Makes operators in their
//                shift right hands, and right hands operators again. May not
//                change another shift leader's or an admin's details, delete
//                users or give anyone else a role.
// Höger hand   – the shift leader's assistant, who runs the shift when the leader
//                is away. Like a shift leader, but only in their own shift: sees and
//                changes only that shift's schedule, adds and manages operators
//                there, records production and uses the chat. May not change the
//                daily production target, shared machines or settings, and does
//                not look at other shifts' schedules.
// Operatör     – sees their own shift's schedule and break plan once an admin or
//                shift leader has shared that week, edits their own phone,
//                status and password. Their name and e-mail address are changed
//                only by an admin, shift leader or right hand.
//
// Anteckningar (notes): everyone has a private board. Admins, shift leaders and right
// hands also write group notes and choose exactly who sees each one: shift leaders and
// right hands people in their own shift, admins anyone. Nobody else sees a group note,
// admins included. Only the author changes a note's text, color and recipients; its
// priority mark is set by the author and, on a group note they can see, by an admin.

const ROLES = Object.freeze({ ADMIN: "admin", LEADER: "shift_leader", RIGHT_HAND: "right_hand", OPERATOR: "operator" });
const ROLE_VALUES = Object.values(ROLES);

// Higher numbers rank higher. A role added later only needs a level here.
const ROLE_LEVELS = Object.freeze({
  [ROLES.ADMIN]: 3,
  [ROLES.LEADER]: 2,
  [ROLES.RIGHT_HAND]: 1,
  [ROLES.OPERATOR]: 0
});
const roleLevel = role => ROLE_LEVELS[role] ?? -1;
// Staff without a login rank as operators.
const personLevel = person => person?.account ? roleLevel(person.account.role) : ROLE_LEVELS[ROLES.OPERATOR];
const rolesBelow = role => ROLE_VALUES.filter(other => roleLevel(other) < roleLevel(role));

const AVAILABILITY_VALUES = ["available", "unavailable", "off"];
// Statuses from before the three-status model, as their new status. Old backups and
// undo entries can still carry them.
const LEGACY_AVAILABILITY = Object.freeze({ sick: "unavailable", vab: "unavailable", vacation: "off" });

function normalizeAvailability(value) {
  if (AVAILABILITY_VALUES.includes(value)) return value;
  return LEGACY_AVAILABILITY[value] || null;
}

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

// Scopes once used for each user's own "Att göra" list (scope = "user:<user id>").
// Nothing may be stored there any more, so documents and history in them are refused.
const PERSONAL_SCOPE_PREFIX = "user:";
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
// Shift leaders and right hands manage the people in their own shift who rank below them.
const managesPerson = (user, person) => leadsShift(user, person?.shiftId) && personLevel(person) < roleLevel(user.role);

function documentCategory(scope, key) {
  if (typeof key !== "string" || typeof scope !== "string") return null;
  if (scope === "global") return Object.hasOwn(GLOBAL_DOCUMENTS, key) ? GLOBAL_DOCUMENTS[key] : null;
  if (personalScopeOwner(scope)) return null;
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
    default: return false;
  }
}

// Operators see a week's schedule and break plan only after it has been shared.
// Returns the week the document belongs to when the user needs that week shared, otherwise null.
function weekRequiringShare(user, scope, key) {
  if (isShiftManager(user) || documentCategory(scope, key) !== "shiftPlan") return null;
  return key.slice(key.indexOf(":") + 1);
}

// The daily production targets live in "productionSettings" next to the factory
// record. Right hands save that document when a day beats the record, but only
// admins and shift leaders may change the targets in it.
const DEFAULT_DAILY_TARGET = 160;

function canChangeProductionTarget(user) {
  return isAdminOrLeader(user);
}

const isPlainObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function targetChangeList(changes) {
  return Object.entries(isPlainObject(changes) ? changes : {})
    .filter(([date, target]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Number(target)) && Number(target) >= 0)
    .map(([date, target]) => [date, Number(target)])
    .sort(([first], [second]) => first.localeCompare(second));
}

// Each shift has its own targets in shiftTargets; targetChanges and dailyTarget are the
// history from when all shifts shared one target.
const sharedTargets = settings => JSON.stringify([
  Number(settings?.dailyTarget) || DEFAULT_DAILY_TARGET, targetChangeList(settings?.targetChanges)
]);
const shiftTargets = (settings, shiftId) =>
  JSON.stringify(targetChangeList(isPlainObject(settings?.shiftTargets) ? settings.shiftTargets[shiftId] : null));

// Whether the user may save "after" over "before": only admins change the shared history,
// and a shift leader changes only the targets of their own shift.
function mayChangeProductionTargets(user, before, after) {
  if (isAdmin(user)) return true;
  if (sharedTargets(before) !== sharedTargets(after)) return false;
  const shiftIds = new Set([before, after].flatMap(settings => Object.keys(isPlainObject(settings?.shiftTargets) ? settings.shiftTargets : {})));
  return [...shiftIds].every(shiftId => shiftTargets(before, shiftId) === shiftTargets(after, shiftId)
    || (canChangeProductionTarget(user) && canEditShift(user, shiftId)));
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
  if (managesPerson(user, person)) return ["name", "company", "phone", "email", "availability"];
  // Operators change only their phone and status; their name and e-mail are set by the shift's managers.
  if (user?.personId === person.id) return isShiftManager(user) ? ["name", "phone", "email", "availability"] : ["phone", "availability"];
  return [];
}

// Test results, competence and assessments. Admins evaluate everyone. Shift
// leaders evaluate the people they manage: the operators, right hands and staff
// without a login in their own shift.
const EVALUATED_BY_LEADERS = rolesBelow(ROLES.LEADER);

function evaluatesEveryone(user) {
  return isAdmin(user);
}

function canEvaluatePerson(user, person) {
  if (isAdmin(user)) return true;
  return isLeader(user) && managesPerson(user, person);
}

function canDeletePerson(user) {
  return isAdmin(user);
}

// The roles a user may hand out: admins any, everyone else only those below their own.
function assignableRoles(user) {
  if (isAdmin(user)) return [...ROLE_VALUES];
  return ROLE_VALUES.includes(user?.role) ? rolesBelow(user.role) : [];
}

function canCreateAccount(user, person, role) {
  if (isAdmin(user)) return true;
  return leadsShift(user, person.shiftId) && assignableRoles(user).includes(role);
}

function canResetPassword(user, person, account) {
  if (isAdmin(user)) return true;
  return Boolean(account) && managesPerson(user, { ...person, account });
}

// Shift leaders turn operators in their shift into right hands and back.
// Nobody changes the role of someone at their own level or above.
function canChangeRole(user, person, role) {
  if (isAdmin(user)) return true;
  if (!person?.account || person.id === user?.personId) return false;
  return managesPerson(user, person) && assignableRoles(user).includes(role);
}

function canChangeUsername(user) {
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

// Who may write group notes, and the shifts whose people they may share them with
// (null means every shift).
function canShareNotes(user) {
  return isShiftManager(user);
}

function noteShareShifts(user) {
  if (isAdmin(user)) return null;
  return canShareNotes(user) && user.shiftId ? [user.shiftId] : [];
}

function canEditNote(user, note) {
  return Boolean(user?.id) && note?.author_id === user.id;
}

// `note` must be one the user can see.
function canPrioritizeNote(user, note) {
  return canEditNote(user, note) || (note?.kind === "group" && isAdmin(user));
}

function canDeleteAccount(user) {
  return isAdmin(user);
}

// Shift leaders may download a backup of their own shift. Only admins export or import everything.
function canExportShiftBackup(user) {
  return isLeader(user) && Boolean(user.shiftId);
}

module.exports = {
  canUseChat,
  canDeleteChatMessage,
  ROLES,
  ROLE_VALUES,
  AVAILABILITY_VALUES,
  normalizeAvailability,
  GLOBAL_DOCUMENTS,
  WEEKLY_SCHEDULE_PREFIXES,
  PERSONAL_SCOPE_PREFIX,
  ROLE_LEVELS,
  roleLevel,
  assignableRoles,
  isAdmin,
  isLeader,
  isRightHand,
  isAdminOrLeader,
  isShiftManager,
  roleNeedsShift,
  canEditShift,
  canChangeProductionTarget,
  EVALUATED_BY_LEADERS,
  evaluatesEveryone,
  canEvaluatePerson,
  mayChangeProductionTargets,
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
  canChangeUsername,
  canDeleteAccount,
  canExportShiftBackup,
  canShareNotes,
  noteShareShifts,
  canEditNote,
  canPrioritizeNote
};
