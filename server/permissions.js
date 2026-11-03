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
// Senior operatör – an operator in every way, who also opens the production page of
//                their own shift. There they record only machine waste, the plus/minus
//                box and comments, today and yesterday, also before anyone has
//                registered the day's results. They never change the results.
//                Admins hand the role out to anyone, shift leaders in their own shift.
// Operatör     – sees their own shift's schedule and break plan once an admin or
//                shift leader has shared that week, edits their own phone,
//                status and password. Their name and e-mail address are changed
//                only by an admin, shift leader or right hand.
//
// Anteckningar (notes): operators have no notes at all. Everyone else has a private
// board and writes group notes, choosing exactly who sees each one, one by one or a whole
// shift. Recipients may have any role but operator: admins and senior operators share
// with anyone in any shift, shift leaders and right hands with people in their own shift.
// A whole shift means everyone in it but operators, including people who join it later.
// Operators are kept off notes every time notes are read (noteAccessSql in store.js), so
// this holds after a role change too. Nobody else sees a group note, admins included. Only the author changes a note's text,
// color and recipients; everyone on a group note comments on it, and removes their own
// comments. The priority mark is set by the author and, on a group note they can see, by
// an admin.
//
// Produktion: who last changed each field and wrote each comment is saved with it. Only
// admins and shift leaders see who that was (see production.js).
//
// Tillfälliga konton (temporary accounts): hired staff an admin gives a login with an end
//                date. They sign in with username and password only, and get what their role
//                allows AND the functions (FEATURES) the admin ticked, never more: no
//                administration (accounts, roles, settings, backups, history), no sensitive
//                data (test results, competence, assessments, other people's contact details).
//                Only admins create, change, disable and delete them. The routes a temporary
//                account may call at all are listed in temporaryMayCall.
//
// Pushnotiser: every user turns push notifications on or off on their own devices.
// Only admins turn them off (and on again) for someone else; while off, that user
// gets none, whatever they chose themselves.

const ROLES = Object.freeze({
  ADMIN: "admin", LEADER: "shift_leader", RIGHT_HAND: "right_hand", SENIOR_OPERATOR: "senior_operator", OPERATOR: "operator"
});
const ROLE_VALUES = Object.values(ROLES);

// Higher numbers rank higher. A role added later only needs a level here.
const ROLE_LEVELS = Object.freeze({
  [ROLES.ADMIN]: 3,
  [ROLES.LEADER]: 2,
  [ROLES.RIGHT_HAND]: 1,
  // A senior operator ranks as an operator: they staff the machines and are managed like one.
  [ROLES.SENIOR_OPERATOR]: 0,
  [ROLES.OPERATOR]: 0
});
// The roles that see their schedule once it is shared and are told when it is.
const OPERATOR_ROLES = Object.freeze([ROLES.OPERATOR, ROLES.SENIOR_OPERATOR]);
// What a temporary account may be given on top of its role. Nothing is ticked by default.
const FEATURES = Object.freeze({ SCHEDULE: "schedule", BREAKS: "breaks", PRODUCTION: "production", NOTES: "notes", CHAT: "chat" });
const FEATURE_VALUES = Object.values(FEATURES);
// Any role but admin.
const TEMPORARY_ROLES = Object.freeze(ROLE_VALUES.filter(role => role !== ROLES.ADMIN));
const isTemporary = user => Boolean(user?.temporary);
// Regular accounts have every function their role allows.
const hasFeature = (user, feature) => !isTemporary(user) || (Array.isArray(user.features) && user.features.includes(feature));
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
// No document lives there any more; backups and shift data still leave them out.
const PERSONAL_SCOPE_PREFIX = "user:";
const personalScopeOwner = scope => scope.startsWith(PERSONAL_SCOPE_PREFIX) ? scope.slice(PERSONAL_SCOPE_PREFIX.length) : null;

// Marks a shift's week as shared with its operators (scope = shift id).
const SHARED_FLAG_PREFIX = "scheduleShared";
const sharedFlagKey = weekKey => `${SHARED_FLAG_PREFIX}:${weekKey}`;

const WEEKLY_SCHEDULE_PREFIXES = ["schedule", "trainingLeaders", "trainingLocations", "extraPersonLocations"];

const isAdmin = user => user?.role === ROLES.ADMIN;
const isLeader = user => user?.role === ROLES.LEADER;
const isRightHand = user => user?.role === ROLES.RIGHT_HAND;
const isSeniorOperator = user => user?.role === ROLES.SENIOR_OPERATOR;
const isAdminOrLeader = user => isAdmin(user) || isLeader(user);
// Everyone who plans a shift: admins, shift leaders and their right hands.
const isShiftManager = user => isAdminOrLeader(user) || isRightHand(user);
// Shift leaders and right hands must belong to a shift.
const roleNeedsShift = role => role === ROLES.LEADER || role === ROLES.RIGHT_HAND;
const leadsShift = (user, shiftId) => (isLeader(user) || isRightHand(user)) && Boolean(user.shiftId) && user.shiftId === shiftId;
const canEditShift = (user, shiftId) => isAdmin(user) || leadsShift(user, shiftId);
// Shift leaders and right hands manage the people in their own shift who rank below them.
// Temporary accounts manage nobody. (Hired staff with a temporary account are managed like
// anyone else in the shift, but only admins change the account itself.)
const managesPerson = (user, person) => !isTemporary(user) && leadsShift(user, person?.shiftId) && personLevel(person) < roleLevel(user.role);
// Senior operators read and write their own shift's production records (only some fields, see production.js).
const isProductionRecords = (scope, key) => scope !== "global" && key === "productionRecords";
const recordsWasteFor = (user, scope, key) =>
  isSeniorOperator(user) && isProductionRecords(scope, key) && Boolean(user.shiftId) && user.shiftId === scope;

// The function a document belongs to, for temporary accounts. null: the document is not part
// of any function a temporary account can be given (it may still be readable, see below).
function documentFeature(scope, key) {
  const category = documentCategory(scope, key);
  if (category === "shiftPlan") return key.startsWith("breakPlan:") ? FEATURES.BREAKS : FEATURES.SCHEDULE;
  if (category === "shiftShare") return FEATURES.SCHEDULE;
  if (category === "shiftWork") return key === "productionRecords" ? FEATURES.PRODUCTION : FEATURES.SCHEDULE;
  if (category === "config" && key === "productionSettings") return FEATURES.PRODUCTION;
  return null;
}

// Whether a temporary account's functions cover the document. Shared settings (machines,
// work places) are read by every page; nothing sensitive or administrative ever is.
function temporaryMayUseDocument(user, scope, key, write) {
  // Only their own shift, also for roles that may look at other shifts.
  if (scope !== "global" && scope !== user.shiftId) return false;
  const category = documentCategory(scope, key);
  if (!["config", "shiftPlan", "shiftShare", "shiftWork"].includes(category)) return false;
  const feature = documentFeature(scope, key);
  if (!feature) return !write && category === "config";
  return hasFeature(user, feature);
}

function documentCategory(scope, key) {
  if (typeof key !== "string" || typeof scope !== "string") return null;
  if (scope === "global") return Object.hasOwn(GLOBAL_DOCUMENTS, key) ? GLOBAL_DOCUMENTS[key] : null;
  if (personalScopeOwner(scope)) return null;
  const match = SHIFT_DOCUMENTS.find(([pattern]) => pattern.test(key));
  return match ? match[1] : null;
}

function canReadDocument(user, scope, key) {
  if (isTemporary(user) && !temporaryMayUseDocument(user, scope, key, false)) return false;
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
    case "shiftWork": return canEditShift(user, scope) || recordsWasteFor(user, scope, key);
    default: return false;
  }
}

function canWriteDocument(user, scope, key) {
  if (isTemporary(user) && !temporaryMayUseDocument(user, scope, key, true)) return false;
  switch (documentCategory(scope, key)) {
    // Right hands record production, which may set a new factory record.
    case "config": return isAdminOrLeader(user) || (isRightHand(user) && key === "productionSettings");
    case "configPrivate": return isAdminOrLeader(user);
    // Shift leaders change only the entries for the people they evaluate (see evaluations.js).
    case "competence":
    case "evaluation": return isAdminOrLeader(user);
    case "sensitive": return isAdmin(user);
    case "shiftWork": return canEditShift(user, scope) || recordsWasteFor(user, scope, key);
    case "shiftPlan":
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
  return isAdminOrLeader(user) && !isTemporary(user);
}

// Whether the user may save the production records of the shift only as a senior operator:
// some fields, on some days.
function recordsOnlyWaste(user, scope, key) {
  return recordsWasteFor(user, scope, key) && !canEditShift(user, scope);
}

// Only admins and shift leaders see who wrote a comment on the production page.
function canSeeCommentAuthors(user) {
  return isAdminOrLeader(user) && !isTemporary(user);
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
  if (personalScopeOwner(scope) !== null || isTemporary(user)) return false;
  return scope === "global" ? isAdminOrLeader(user) : canEditShift(user, scope);
}

// People and accounts.

// Temporary accounts get their own shift without contact details (see routes/people.js).
function canSeeAllPeople(user) {
  return isShiftManager(user) && !isTemporary(user);
}

function canCreatePerson(user, shiftId) {
  return isAdmin(user) || (!isTemporary(user) && leadsShift(user, shiftId));
}

// Which fields of `person` the user may change. An empty list means none.
function editablePersonFields(user, person) {
  if (isAdmin(user)) return ["name", "company", "phone", "email", "availability", "shiftId"];
  if (managesPerson(user, person)) return ["name", "company", "phone", "email", "availability"];
  // Operators change only their phone and status; their name and e-mail are set by the shift's managers.
  if (user?.personId === person.id) return isShiftManager(user) && !isTemporary(user) ? ["name", "phone", "email", "availability"] : ["phone", "availability"];
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
// Senior operators open the production page, so only admins and shift leaders make them.
function assignableRoles(user) {
  if (isAdmin(user)) return [...ROLE_VALUES];
  if (!ROLE_VALUES.includes(user?.role)) return [];
  return rolesBelow(user.role).filter(role => role !== ROLES.SENIOR_OPERATOR || isLeader(user));
}

function canCreateAccount(user, person, role) {
  if (isAdmin(user)) return true;
  return !isTemporary(user) && leadsShift(user, person.shiftId) && assignableRoles(user).includes(role);
}

function canResetPassword(user, person, account) {
  if (isAdmin(user)) return true;
  return Boolean(account) && !account.temporary && managesPerson(user, { ...person, account });
}

// Shift leaders turn operators in their shift into right hands or senior operators and back.
// Nobody changes the role of someone at their own level or above, nor takes away a role
// they may not hand out.
function canChangeRole(user, person, role) {
  if (isAdmin(user)) return true;
  if (!person?.account || person.account.temporary || person.id === user?.personId) return false;
  const roles = assignableRoles(user);
  return managesPerson(user, person) && roles.includes(role) && roles.includes(person.account.role);
}

function canChangeUsername(user) {
  return isAdmin(user);
}

// The chat is shared by everyone who plans the shifts, and by senior operators.
const CHAT_ROLES = Object.freeze([ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND, ROLES.SENIOR_OPERATOR]);

function canUseChat(user) {
  return CHAT_ROLES.includes(user?.role) && hasFeature(user, FEATURES.CHAT);
}

// Authors remove their own chat messages; admins can remove any.
function canDeleteChatMessage(user, message) {
  return isAdmin(user) || (Boolean(message.user_id) && message.user_id === user?.id);
}

// Operators have no notes at all: no page, no board, no shared notes.
function canUseNotes(user) {
  return Boolean(user?.id) && ROLE_VALUES.includes(user.role) && user.role !== ROLES.OPERATOR && hasFeature(user, FEATURES.NOTES);
}

// Who may write group notes, and the shifts whose people they may share them with
// (null means every shift).
function canShareNotes(user) {
  return canUseNotes(user);
}

function noteShareShifts(user) {
  if (isAdmin(user) || user?.role === ROLES.SENIOR_OPERATOR) return null;
  return canShareNotes(user) && user.shiftId ? [user.shiftId] : [];
}

// The roles a user may put on their group notes: everyone with notes, so every role but operator.
const NOTE_RECIPIENT_ROLES = Object.freeze(ROLE_VALUES.filter(role => role !== ROLES.OPERATOR));
function noteRecipientRoles(user) {
  return canShareNotes(user) ? [...NOTE_RECIPIENT_ROLES] : [];
}

function canEditNote(user, note) {
  return Boolean(user?.id) && note?.author_id === user.id;
}

// `note` must be one the user can see.
function canPrioritizeNote(user, note) {
  return canEditNote(user, note) || (note?.kind === "group" && isAdmin(user));
}

// `note` must be a group note the user can see.
function canCommentNote(user, note) {
  return canUseNotes(user) && note?.kind === "group";
}

function canDeleteNoteComment(user, comment) {
  return Boolean(user?.id) && comment?.author_id === user.id;
}

function canManagePush(user) {
  return isAdmin(user);
}

function canDeleteAccount(user) {
  return isAdmin(user);
}

// Shift leaders may download a backup of their own shift. Only admins export or import everything.
function canExportShiftBackup(user) {
  return isLeader(user) && !isTemporary(user) && Boolean(user.shiftId);
}

// Temporary accounts: only admins create and change them.
function canManageTemporaryAccounts(user) {
  return isAdmin(user);
}

// The API routes a temporary account may call at all, whatever its role. Everything else
// (administration, accounts, backups, history, shared machines) answers 403. The routes
// themselves still check the role and the functions (see canReadDocument and friends).
const TEMPORARY_ROUTES = [
  ["GET", /^\/(health|setup|me|events|shifts|people|documents|push)$/],
  ["POST", /^\/(login|login\/temporary|logout|me\/password|me\/dismissed-messages)$/],
  ["PATCH", /^\/me(\/preferences)?$/],
  // Their own phone and status; editablePersonFields decides what else.
  ["PATCH", /^\/people\/[^/]+$/],
  ["PUT", /^\/documents\/[^/]+\/[^/]+$/],
  ["PATCH", /^\/production\/[^/]+\/\d{4}-\d{2}-\d{2}$/, FEATURES.PRODUCTION],
  ["*", /^\/notifications(\/read)?$/],
  ["*", /^\/push\/subscriptions(\/check)?$/],
  ["*", /^\/notes(\/.*)?$/, FEATURES.NOTES],
  ["*", /^\/chat(\/.*)?$/, FEATURES.CHAT]
];

function temporaryMayCall(user, method, path) {
  return TEMPORARY_ROUTES.some(([allowedMethod, pattern, feature]) =>
    (allowedMethod === "*" || allowedMethod === method || (allowedMethod === "GET" && method === "HEAD"))
    && pattern.test(path) && (!feature || hasFeature(user, feature)));
}

module.exports = {
  FEATURES,
  FEATURE_VALUES,
  TEMPORARY_ROLES,
  isTemporary,
  hasFeature,
  canManageTemporaryAccounts,
  temporaryMayCall,
  CHAT_ROLES,
  canUseChat,
  canDeleteChatMessage,
  ROLES,
  ROLE_VALUES,
  OPERATOR_ROLES,
  AVAILABILITY_VALUES,
  normalizeAvailability,
  GLOBAL_DOCUMENTS,
  WEEKLY_SCHEDULE_PREFIXES,
  PERSONAL_SCOPE_PREFIX,
  personalScopeOwner,
  ROLE_LEVELS,
  roleLevel,
  assignableRoles,
  isAdmin,
  isLeader,
  isRightHand,
  isSeniorOperator,
  isAdminOrLeader,
  isShiftManager,
  roleNeedsShift,
  canEditShift,
  canChangeProductionTarget,
  recordsOnlyWaste,
  canSeeCommentAuthors,
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
  canManagePush,
  canExportShiftBackup,
  canUseNotes,
  canShareNotes,
  noteShareShifts,
  noteRecipientRoles,
  canCommentNote,
  canDeleteNoteComment,
  canEditNote,
  canPrioritizeNote
};
