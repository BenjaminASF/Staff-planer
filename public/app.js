const DEFAULT_TASKS = [
  "GD1",
  "GD2",
  "GD3",
  "GD4",
  "Logimark",
  "ETIKETTO",
  "miniLogimark",
  "Packa L1",
  "Packa L2/3",
  "Packa L4",
  "Extra person 1",
  "Extra person 2",
  "Utbildning 1",
  "Utbildning 2"
];
let TASKS = [...DEFAULT_TASKS];
let customWorkItems = [];

const ALL_DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"];
let DAYS = [...ALL_DAYS];
const DEFAULT_DEPARTMENTS = ["GD", "ETIKETTO", "Logimark", "Packa"];
let BREAK_LINE_WORKPLACES = {
  GD1: ["GD1", "ETIKETTO", "Packa L1"],
  GD2: ["GD2", "Logimark", "Packa L2/3"],
  GD3: ["GD3", "Logimark", "Packa L2/3"],
  GD4: ["GD4", "miniLogimark", "Packa L4"]
};
let BREAK_LINE_LABELS = {
  GD1: "Linje 1",
  GD2: "Linje 2",
  GD3: "Linje 3",
  GD4: "Linje 4"
};
let BREAK_WORKPLACE_DISPLAY_ORDER = [
  "GD1", "GD2", "GD3", "GD4",
  "Logimark", "ETIKETTO", "miniLogimark",
  "Packa L1", "Packa L2/3", "Packa L4"
];
let EXTRA_PERSON_ASSIGNMENTS = [
  "Lock & dosor",
  "GD-rummet",
  "ETIKETT-rummet",
  "Hjälp till på packavdelningen"
];
const BREAK_EXTRA_ASSIGNMENT_PRIORITY = ["GD-rummet", "Lock & dosor", "ETIKETT-rummet"];

const BASIC_ASSESSMENT_ITEMS = [
  "Punktlig och pålitlig",
  "Kan arbeta i skift (dag/kväll)",
  "Följer hygienregler, klädregler och säkerhetsrutiner",
  "Närvaro och frånvarohantering",
  "Accepterar och följer instruktioner",
  "Uppträder professionellt"
];

const PERFORMANCE_ASSESSMENT_ITEMS = [
  "Kvalitetsmedvetenhet och noggrannhet",
  "Följer GMP, interna regler och hanterar produkt korrekt",
  "Förståelse för arbetsmoment och instruktioner",
  "Arbetstempo och uthållighet",
  "Självständighet och ansvar",
  "Tar feedback och utvecklas i arbetet",
  "Samarbete och kommunikation",
  "Attityd till arbete, regler och skiftarbete"
];

// Key names used by the old single-device version, where everything was stored
// encrypted in this browser. Only used to move that data to the server.
const LEGACY_STORAGE_KEYS = {
  salt: "app_salt",
  check: "app_check",
  people: "staff_people_enc"
};
const LEGACY_GLOBAL_DOCUMENTS = {
  staff_app_settings_enc: "appSettings",
  staff_work_items_enc: "workItems",
  staff_work_item_trash_enc: "workItemTrash",
  staff_departments_enc: "departments",
  staff_production_settings_enc: "productionSettings",
  staff_machine_skills_enc: "machineSkills",
  staff_machine_skill_updated_at_enc: "machineSkillUpdatedAt",
  staff_machine_restrictions_enc: "machineRestrictions",
  staff_machine_skill_details_enc: "machineSkillDetails",
  staff_assessments_enc: "assessments",
  staff_test_results_enc: "testResults"
};
const LEGACY_SHIFT_DOCUMENTS = {
  staff_schedule_templates_enc: "scheduleTemplates",
  staff_todos_enc: "todos",
  staff_production_records_enc: "productionRecords"
};
// Weekly keys keep their ":YYYY-MM-DD" suffix.
const LEGACY_WEEKLY_DOCUMENTS = {
  staff_schedule_enc: "schedule",
  staff_training_leaders_enc: "trainingLeaders",
  staff_training_locations_enc: "trainingLocations",
  staff_extra_person_locations_enc: "extraPersonLocations",
  staff_break_plan_enc: "breakPlan",
  staff_schedule_priority_lines_enc: "schedulePriorityLines"
};

const TRAINING_REMINDER_DISMISSED_KEY = "staff_training_reminder_dismissed_day";
const ACTIVE_SHIFT_KEY = "staff_active_shift";
const SIGNED_IN_HINT_KEY = "staff_signed_in";
const ADMIN_LANDED_KEY = "staff_admin_landed";
const SELECTED_WEEK_KEY = "staff_selected_week";
const COMPETENCY_SHIFT_KEY = "staff_competency_shift";
const DEFAULT_APP_SETTINGS = {
  workDays: [...ALL_DAYS],
  autoLockMinutes: 30,
  onboardingComplete: false,
  showTips: true,
  organizationName: "",
  feedbackEmail: "",
  productionMachines: ["GD1", "GD2", "GD3", "GD4"],
  extraAssignments: ["GD-rummet", "Lock & dosor", "ETIKETT-rummet", "Hjälp till på packavdelningen"],
  breakLines: [
    { id: "GD1", label: "Linje 1", workplaces: ["GD1", "ETIKETTO", "Packa L1"] },
    { id: "GD2", label: "Linje 2", workplaces: ["GD2", "Logimark", "Packa L2/3"] },
    { id: "GD3", label: "Linje 3", workplaces: ["GD3", "Logimark", "Packa L2/3"] },
    { id: "GD4", label: "Linje 4", workplaces: ["GD4", "miniLogimark", "Packa L4"] }
  ]
};
let appSettings = { ...DEFAULT_APP_SETTINGS };

const ROLES = { ADMIN: "admin", LEADER: "shift_leader", RIGHT_HAND: "right_hand", OPERATOR: "operator" };
const ROLE_LABELS = { admin: "Admin", shift_leader: "Skiftledare", right_hand: "Höger hand", operator: "Operatör" };
// The role hierarchy, as on the server: higher numbers rank higher.
const ROLE_LEVELS = { admin: 3, shift_leader: 2, right_hand: 1, operator: 0 };
// Pages each role may open. The server enforces the same rules (server/permissions.js);
// this only decides what is shown.
const PAGE_ACCESS = {
  "dashboard.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND],
  "index.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND, ROLES.OPERATOR],
  "produktion.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND],
  "rast.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND, ROLES.OPERATOR],
  "personal.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND],
  "anvandare.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND],
  "testresultat.html": [ROLES.ADMIN, ROLES.LEADER],
  "maskiner.html": [ROLES.ADMIN, ROLES.LEADER],
  "bedomning.html": [ROLES.ADMIN, ROLES.LEADER],
  "todo.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND, ROLES.OPERATOR],
  "add.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND],
  "installningar.html": [ROLES.ADMIN, ROLES.LEADER],
  "profil.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND, ROLES.OPERATOR],
  "hjalp.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND, ROLES.OPERATOR]
};
// Shift leaders may look at other shifts here, read-only. Everywhere else they work in their own shift.
const SHIFT_BROWSING_PAGES = ["index.html", "rast.html"];
const MIN_PASSWORD_LENGTH = 8;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let currentUser = null;
let currentPerson = null;
let shifts = [];
let addMessageTimeoutId = null;
function getDefaultBreakDay() {
  const weekday = new Date().getDay();
  const today = weekday >= 1 && weekday <= 5 ? ALL_DAYS[weekday - 1] : "";
  return DAYS.includes(today) ? today : DAYS[0];
}

function resetBreakPlannerToToday() {
  selectedBreakDay = getDefaultBreakDay();
}

let selectedBreakDay = getDefaultBreakDay();
let selectedAssessmentPersonId = "";
let selectedTestPersonId = "";
let selectedProductionDate = formatDateKey(new Date());
let selectedCompetencyPersonId = "";
let assessmentFormOpen = false;
let editingAssessmentId = "";
let autoLockTimeoutId = null;
const scheduleUndoStack = [];
const scheduleRedoStack = [];
let scheduleHistoryWeek = "";
const scheduleFilters = { company: "", availability: "all", skill: "" };
let scheduleAdvancedToolsOpen = false;

function showAppToast(text, type = "success") {
  let toast = document.getElementById("appToast");
  if (!toast) { toast = document.createElement("div"); toast.id = "appToast"; toast.className = "app-toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast); }
  toast.textContent = text;
  toast.className = `app-toast ${type} visible`;
  clearTimeout(showAppToast.timeoutId);
  showAppToast.timeoutId = setTimeout(() => toast.classList.remove("visible"), 3200);
}

function resetScheduleHistory() {
  scheduleUndoStack.length = 0;
  scheduleRedoStack.length = 0;
  scheduleHistoryWeek = getSelectedWeekKey();
}

function recordScheduleHistory(schedule, trainingLeaders = {}, trainingLocations = {}, extraPersonLocations = {}) {
  if (scheduleHistoryWeek !== getSelectedWeekKey()) resetScheduleHistory();
  scheduleUndoStack.push(structuredClone({ schedule, trainingLeaders, trainingLocations, extraPersonLocations }));
  if (scheduleUndoStack.length > 30) scheduleUndoStack.shift();
  scheduleRedoStack.length = 0;
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function formatDateKey(date) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate())
  ].join("-");
}

function getActualStartOfWeek() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);

  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

function getPreviousWeekStart() {
  const previous = getActualStartOfWeek();
  previous.setDate(previous.getDate() - 7);
  return previous;
}

function isViewingCurrentWeek() {
  return getSelectedWeekKey() === formatDateKey(getActualStartOfWeek());
}

function isViewingPreviousWeek() {
  return getSelectedWeekKey() === formatDateKey(getPreviousWeekStart());
}

function getStartOfWeek() {
  const stored = sessionStorage.getItem(SELECTED_WEEK_KEY);
  if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
    const [year, month, day] = stored.split("-").map(Number);
    const selected = new Date(year, month - 1, day);
    selected.setHours(0, 0, 0, 0);
    const selectedKey = formatDateKey(selected);
    const previousKey = formatDateKey(getPreviousWeekStart());
    if (!Number.isNaN(selected.getTime()) && selectedKey >= previousKey) return selected;
  }

  return getActualStartOfWeek();
}

function getSelectedWeekKey() {
  return formatDateKey(getStartOfWeek());
}

function getDatesForWeek() {
  const monday = getStartOfWeek();

  return DAYS.map(day => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + ALL_DAYS.indexOf(day));
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
}

function formatWeekRange() {
  const monday = getStartOfWeek();
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const formatter = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" });
  return `${formatter.format(monday)} – ${formatter.format(friday)} ${friday.getFullYear()}`;
}

async function changeSelectedWeek(dayOffset) {
  const selected = getStartOfWeek();
  selected.setDate(selected.getDate() + dayOffset);
  const selectedKey = formatDateKey(selected);
  const previousKey = formatDateKey(getPreviousWeekStart());
  if (selectedKey < previousKey) return;
  sessionStorage.setItem(SELECTED_WEEK_KEY, selectedKey);
  renderWeekNavigation();
  await renderSchedule();
  await renderBreakPlanner();
}

function renderWeekNavigation() {
  const header = document.querySelector(".main .header");
  const hasWeeklyView = document.getElementById("scheduleGrid") || document.getElementById("breakPlanner");
  if (!header || !hasWeeklyView) return;

  let navigation = document.getElementById("weekNavigation");
  if (!navigation) {
    navigation = document.createElement("div");
    navigation.id = "weekNavigation";
    navigation.className = "week-navigation";
    header.appendChild(navigation);
  }

  navigation.innerHTML = "";
  const previous = document.createElement("button");
  const current = document.createElement("button");
  const next = document.createElement("button");
  const range = document.createElement("div");
  previous.type = current.type = next.type = "button";
  previous.textContent = "← Föregående";
  current.textContent = "Denna vecka";
  next.textContent = "Nästa →";
  range.className = "week-range";
  const viewingCurrentWeek = isViewingCurrentWeek();
  const viewingPreviousWeek = isViewingPreviousWeek();
  range.innerHTML = `<span>${viewingCurrentWeek ? "Denna vecka" : viewingPreviousWeek ? "Förra veckan" : "Kommande vecka"}</span><strong>${formatWeekRange()}</strong>`;
  previous.disabled = viewingPreviousWeek;
  next.disabled = false;
  previous.addEventListener("click", () => changeSelectedWeek(-7));
  current.addEventListener("click", async () => {
    sessionStorage.setItem(SELECTED_WEEK_KEY, formatDateKey(getActualStartOfWeek()));
    renderWeekNavigation();
    await renderSchedule();
    await renderBreakPlanner();
  });
  next.addEventListener("click", () => changeSelectedWeek(7));
  navigation.append(previous, range, current, next);
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Roles and shifts.

const hasRole = (...roles) => Boolean(currentUser) && roles.includes(currentUser.role);
const isAdmin = () => hasRole(ROLES.ADMIN);
const isShiftLeader = () => hasRole(ROLES.LEADER);
const isRightHand = () => hasRole(ROLES.RIGHT_HAND);
const isOperator = () => hasRole(ROLES.OPERATOR);
// Everyone who plans a shift. A right hand plans only their own shift.
const canManageStaff = () => hasRole(ROLES.ADMIN, ROLES.LEADER, ROLES.RIGHT_HAND);
// Machines, departments and settings are shared by all shifts.
const canChangeSharedSettings = () => hasRole(ROLES.ADMIN, ROLES.LEADER);
const canChangeProductionTarget = () => hasRole(ROLES.ADMIN, ROLES.LEADER);
// Admins test and assess everyone; shift leaders the operators in their own shift.
const canEvaluate = () => hasRole(ROLES.ADMIN, ROLES.LEADER);
const EVALUATED_BY_LEADERS = [ROLES.OPERATOR, ROLES.RIGHT_HAND];

function getCurrentPage() {
  return location.pathname.split("/").pop() || "index.html";
}

function canOpenPage(page) {
  return (PAGE_ACCESS[page] || []).includes(currentUser?.role);
}

function getOwnShiftId() {
  return currentPerson?.shiftId || "";
}

function getShiftName(shiftId) {
  return shifts.find(shift => shift.id === shiftId)?.name || "";
}

// Colors a shift can be marked with. The emoji stands in for the color in <option> lists.
// Each color belongs to at most one shift.
const SHIFT_COLORS = [
  ["red", "Röd", "🔴"], ["blue", "Blå", "🔵"], ["yellow", "Gul", "🟡"], ["green", "Grön", "🟢"],
  ["purple", "Lila", "🟣"], ["orange", "Orange", "🟠"], ["brown", "Brun", "🟤"]
];

function getShiftColor(shiftId) {
  return shifts.find(shift => shift.id === shiftId)?.color || "";
}

function shiftColorDot(shiftId) {
  const color = getShiftColor(shiftId);
  return color ? `<span class="shift-dot shift-color-${color}" aria-hidden="true"></span>` : "";
}

function shiftOptionLabel(shift) {
  const emoji = SHIFT_COLORS.find(([value]) => value === shift.color)?.[2];
  return emoji ? `${emoji} ${shift.name}` : shift.name;
}

// Colors no shift has yet, apart from the given one.
function freeShiftColors(exceptShiftId = "") {
  const taken = new Set(shifts.filter(shift => shift.id !== exceptShiftId).map(shift => shift.color).filter(Boolean));
  return SHIFT_COLORS.filter(([value]) => !taken.has(value));
}

// The colors a shift may switch to: its own and the free ones.
function shiftColorOptions(shift) {
  const selected = shift.color || "";
  return `<option value=""${selected ? "" : " selected"}>Ingen färg</option>${freeShiftColors(shift.id).map(([value, label, emoji]) => `<option value="${value}"${value === selected ? " selected" : ""}>${emoji} ${label}</option>`).join("")}`;
}

// The free colors for a new shift as swatches. The first free color is chosen from the start.
function newShiftColorChoices() {
  const free = freeShiftColors();
  const choice = (value, label, checked) => `<label class="shift-color-choice"><input type="radio" name="color" value="${value}"${checked ? " checked" : ""} />${value ? `<span class="shift-dot shift-color-${value}" aria-hidden="true"></span>` : '<span class="shift-dot" aria-hidden="true"></span>'}<span>${label}</span></label>`;
  return `<fieldset class="shift-color-choices"><legend>Färg</legend>
    ${free.map(([value, label], index) => choice(value, label, index === 0)).join("")}${choice("", "Ingen färg", !free.length)}
    <small>${free.length ? "Färger som redan används av ett annat skift visas inte." : "Alla färger används redan av andra skift. Ta bort färgen från ett skift för att kunna välja den här."}</small>
  </fieldset>`;
}

function canBrowseShifts() {
  return isAdmin() || (isShiftLeader() && SHIFT_BROWSING_PAGES.includes(getCurrentPage()));
}

// The shift whose schedule, break plan and other shift data this page shows.
function getShiftScope() {
  if (!currentUser) return "";
  const ownShiftId = shifts.some(shift => shift.id === getOwnShiftId()) ? getOwnShiftId() : "";
  if (!canBrowseShifts()) return ownShiftId;
  const stored = sessionStorage.getItem(ACTIVE_SHIFT_KEY);
  if (stored && shifts.some(shift => shift.id === stored)) return stored;
  return ownShiftId || shifts[0]?.id || "";
}

function canEditShift(shiftId) {
  return Boolean(shiftId) && (isAdmin() || ((isShiftLeader() || isRightHand()) && shiftId === getOwnShiftId()));
}

function canEditActiveShift() {
  return canEditShift(getShiftScope());
}

const roleLevel = role => ROLE_LEVELS[role] ?? -1;
// Staff without a login rank as operators.
const personLevel = person => person?.account ? roleLevel(person.account.role) : ROLE_LEVELS.operator;

// Shift leaders and right hands manage the people in their own shift who rank below them.
function canEditPerson(person) {
  if (!person || !currentUser) return false;
  if (isAdmin()) return true;
  if (!isShiftLeader() && !isRightHand()) return false;
  if (!person.shiftId || person.shiftId !== getOwnShiftId()) return false;
  return personLevel(person) < roleLevel(currentUser.role);
}

// Admins hand out any role; everyone else only the roles below their own.
function assignableRoles() {
  if (isAdmin()) return [ROLES.OPERATOR, ROLES.RIGHT_HAND, ROLES.LEADER, ROLES.ADMIN];
  return [ROLES.OPERATOR, ROLES.RIGHT_HAND, ROLES.LEADER].filter(role => roleLevel(role) < roleLevel(currentUser?.role));
}

function canChangeRoleOf(person) {
  if (!person?.account || person.id === currentPerson?.id) return false;
  return isAdmin() || (canEditPerson(person) && assignableRoles().length > 1);
}

// Server API.

class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let sessionLostHandled = false;
function handleSessionLost() {
  if (sessionLostHandled) return;
  sessionLostHandled = true;
  sessionStorage.removeItem(SIGNED_IN_HINT_KEY);
  location.reload();
}

// Requests cut off by leaving the page are not errors worth showing.
let pageIsUnloading = false;
window.addEventListener("beforeunload", () => { pageIsUnloading = true; });

async function apiRequest(method, path, body) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "StaffPlanner" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    if (pageIsUnloading) return new Promise(() => {});
    throw new ApiError(0, "Ingen kontakt med servern. Kontrollera anslutningen och försök igen.");
  }
  const data = await response.json().catch(() => null);
  if (response.ok) return data;
  // A signed-in page whose session ended (logged out elsewhere, password reset) starts over.
  if (currentUser && (response.status === 401 || data?.code === "password_change_required")) handleSessionLost();
  throw new ApiError(response.status, data?.error || "Något gick fel. Försök igen.", data);
}

// Server documents, cached for the life of the page. Reads started in the same
// tick are sent as one request per scope ("global", a shift id or "user:<id>").
const documentCache = new Map();
const documentBatches = new Map();
const documentSaveQueues = new Map();
const documentsBeingSaved = new Set();
const documentCacheKey = (scope, key) => `${scope}|${key}`;

function loadDocument(scope, key) {
  const cached = documentCache.get(documentCacheKey(scope, key));
  if (cached) return Promise.resolve(cached);
  let batch = documentBatches.get(scope);
  if (!batch) {
    batch = { keys: new Set(), waiters: [] };
    documentBatches.set(scope, batch);
    setTimeout(() => void flushDocumentBatch(scope), 0);
  }
  batch.keys.add(key);
  return new Promise((resolve, reject) => batch.waiters.push({ key, resolve, reject }));
}

async function flushDocumentBatch(scope) {
  const batch = documentBatches.get(scope);
  documentBatches.delete(scope);
  const keys = [...batch.keys];
  try {
    for (let index = 0; index < keys.length; index += 50) {
      const chunk = keys.slice(index, index + 50);
      const data = await apiRequest("GET", `/documents?scope=${encodeURIComponent(scope)}&keys=${chunk.map(encodeURIComponent).join(",")}`);
      chunk.forEach(key => {
        const cacheKey = documentCacheKey(scope, key);
        if (documentCache.has(cacheKey)) return;
        const doc = data.documents[key];
        documentCache.set(cacheKey, doc
          ? { value: doc.value, version: doc.version, updatedAt: doc.updatedAt }
          : { value: undefined, version: 0, updatedAt: null, forbidden: data.forbidden.includes(key) });
      });
    }
    batch.waiters.forEach(waiter => waiter.resolve(documentCache.get(documentCacheKey(scope, waiter.key))));
  } catch (error) {
    batch.waiters.forEach(waiter => waiter.reject(error));
  }
}

async function getDocument(scope, key, fallback) {
  if (!scope || !currentUser) return fallback;
  const entry = await loadDocument(scope, key);
  return entry.value === undefined ? fallback : structuredClone(entry.value);
}

function getDocumentUpdatedAt(scope, key) {
  return documentCache.get(documentCacheKey(scope, key))?.updatedAt || null;
}

let conflictRefreshTimeoutId = null;

// Saves are queued per document so each one is sent with the version the
// previous save produced. A conflict means someone else saved in between.
function saveDocument(scope, key, value) {
  if (!scope) return Promise.reject(new ApiError(400, "Inget skift är valt. Be en admin att lägga dig i ett skift."));
  const cacheKey = documentCacheKey(scope, key);
  const snapshot = structuredClone(value);
  const previous = documentSaveQueues.get(cacheKey) || Promise.resolve();
  const save = previous.catch(() => {}).then(async () => {
    const entry = await loadDocument(scope, key);
    documentCache.set(cacheKey, { ...entry, value: snapshot });
    documentsBeingSaved.add(cacheKey);
    try {
      const saved = await apiRequest("PUT", `/documents/${encodeURIComponent(scope)}/${encodeURIComponent(key)}`, {
        value: snapshot,
        baseVersion: entry.version || 0
      });
      documentCache.set(cacheKey, { value: snapshot, version: saved.version, updatedAt: saved.updatedAt });
      return saved;
    } catch (error) {
      const current = error.data?.current;
      if (error.status === 409 && current) {
        documentCache.set(cacheKey, { value: current.value, version: current.version, updatedAt: current.updatedAt });
      } else {
        documentCache.delete(cacheKey);
      }
      if (error.status === 409) {
        clearTimeout(conflictRefreshTimeoutId);
        conflictRefreshTimeoutId = setTimeout(() => void reloadSharedData(), 400);
      }
      throw error;
    } finally {
      documentsBeingSaved.delete(cacheKey);
      recheckDeferredLiveChange(scope, key);
    }
  });
  documentSaveQueues.set(cacheKey, save);
  return save;
}

const getGlobalDocument = (key, fallback) => getDocument("global", key, fallback);
const saveGlobalDocument = (key, value) => saveDocument("global", key, value);
const getShiftDocument = (key, fallback) => getDocument(getShiftScope(), key, fallback);
const saveShiftDocument = (key, value) => saveDocument(getShiftScope(), key, value);
const getWeekDocumentKey = base => `${base}:${getSelectedWeekKey()}`;

function invalidateCachedData() {
  documentCache.clear();
  peopleCache = null;
}

function createEmptySchedule() {
  return Object.fromEntries(
    TASKS.map(task => [
      task,
      Object.fromEntries(DAYS.map(day => [day, ""]))
    ])
  );
}

function normalizeTaskPlacements(placements, activeTasks) {
  // Keep paused rows and hidden workdays when another placement is edited.
  const stored = placements && typeof placements === "object" && !Array.isArray(placements) ? placements : {};
  return Object.fromEntries([...new Set([...activeTasks, ...Object.keys(stored)])].map(task => [
    task,
    Object.fromEntries(ALL_DAYS.map(day => [day, typeof stored[task]?.[day] === "string" ? stored[task][day] : ""]))
  ]));
}

function normalizeSchedule(schedule) {
  return normalizeTaskPlacements(schedule, TASKS);
}

function createEmptyTrainingLeaders() {
  return Object.fromEntries(
    TASKS.filter(isTrainingTaskName).map(task => [
      task,
      Object.fromEntries(DAYS.map(day => [day, ""]))
    ])
  );
}

function normalizeTrainingLeaders(trainingLeaders) {
  return normalizeTaskPlacements(trainingLeaders, TASKS.filter(isTrainingTaskName));
}

function createEmptyTrainingLocations() {
  return Object.fromEntries(
    TASKS.filter(isTrainingTaskName).map(task => [
      task,
      Object.fromEntries(DAYS.map(day => [day, ""]))
    ])
  );
}

function normalizeTrainingLocations(trainingLocations) {
  return normalizeTaskPlacements(trainingLocations, TASKS.filter(isTrainingTaskName));
}

function createEmptyExtraPersonLocations() {
  return Object.fromEntries(
    TASKS.filter(isExtraPersonTask).map(task => [
      task,
      Object.fromEntries(DAYS.map(day => [day, ""]))
    ])
  );
}

function normalizeExtraPersonLocations(locations) {
  return normalizeTaskPlacements(locations, TASKS.filter(isExtraPersonTask));
}

function createEmptyBreakPlan(days = DAYS) {
  return Object.fromEntries(days.map(day => [day, {
    mode: "together",
    togetherStart: "",
    togetherSecondStart: "",
    group1Break1: "",
    group1Break2: "",
    group2Break1: "",
    group2Break2: "",
    priorityLines: [],
    groups: {},
    workplaces: {}
  }]));
}

function normalizeBreakPlan(breakPlan) {
  const normalized = createEmptyBreakPlan(ALL_DAYS);

  ALL_DAYS.forEach(day => {
    const stored = breakPlan?.[day] ?? {};
    normalized[day] = {
      ...normalized[day],
      ...stored,
      mode: ["together", "together_split", "split", "split_hour"].includes(stored.mode)
        ? stored.mode
        : "together",
      priorityLines: Array.isArray(stored.priorityLines)
        ? stored.priorityLines.filter(line => Object.hasOwn(BREAK_LINE_WORKPLACES, line))
        : Object.hasOwn(BREAK_LINE_WORKPLACES, stored.priorityLine)
          ? [stored.priorityLine]
          : [],
      groups: stored.groups && typeof stored.groups === "object" ? stored.groups : {},
      workplaces: stored.workplaces && typeof stored.workplaces === "object"
        ? stored.workplaces
        : {}
    };
  });

  return normalized;
}

function getAssignedPeopleForDay(schedule, day, excludedTask = "") {
  const assignedPeople = new Set();

  TASKS.forEach(task => {
    if (task === excludedTask) return;

    const personId = schedule?.[task]?.[day];
    if (personId) {
      assignedPeople.add(personId);
    }
  });

  return assignedPeople;
}

function getTrainingLeadersForDay(trainingLeaders, day, excludedTask = "") {
  const leaders = new Set();

  TASKS.filter(isTrainingTaskName).forEach(task => {
    if (task === excludedTask) return;
    const personId = trainingLeaders?.[task]?.[day];
    if (personId) leaders.add(personId);
  });

  return leaders;
}

function getTaskDepartment(task) {
  const customItem = customWorkItems.find(item => item.name === task);
  if (customItem?.showInCompetency) return customItem.name;
  if (/^GD\d+$/i.test(task)) return "GD";
  if (task === "ETIKETTO") return "ETIKETTO";
  if (task === "Logimark" || task === "miniLogimark") return "Logimark";
  if (task.startsWith("Packa")) return "Packa";
  return "";
}

async function createFairWeeklySchedule(priorityLines) {
  const [people, skills, restrictions, currentSchedule, trainingLeaders, trainingLocations, currentExtraLocations] = await Promise.all([
    getPeople(),
    getMachineSkills(),
    getMachineRestrictions(),
    getSchedule(),
    getTrainingLeaders(),
    getTrainingLocations(),
    getExtraPersonLocations()
  ]);
  const availablePeople = people.filter(
    person => getPersonAvailability(person) === "available"
  );
  const requestedTasks = priorityLines.flatMap(choice =>
    Object.hasOwn(BREAK_LINE_WORKPLACES, choice) ? BREAK_LINE_WORKPLACES[choice] : [choice]
  );
  const productionTasks = [...new Set(
    requestedTasks.filter(task => TASKS.includes(task) && !isTrainingTaskName(task) && !isExtraPersonTask(task))
  )];
  const ignoredTasks = [...new Set(requestedTasks.filter(task => !TASKS.includes(task)))];
  if (!productionTasks.length) {
    return { ok: false, message: "Välj minst en linje som ska köras först." };
  }
  const eligiblePeople = availablePeople.filter(person => {
    const personSkills = Array.isArray(skills[person.id]) ? skills[person.id] : [];
    return personSkills.length > 0;
  });

  if (!eligiblePeople.length) {
    return {
      ok: false,
      message: "Ingen tillgänglig person har registrerad kompetens ännu."
    };
  }

  const schedule = normalizeSchedule(currentSchedule);
  TASKS.filter(task => !isTrainingTaskName(task)).forEach(task => {
    DAYS.forEach(day => {
      schedule[task][day] = "";
    });
  });

  const stats = Object.fromEntries(eligiblePeople.map((person, index) => [
    person.id,
    {
      total: 0,
      byTask: {},
      byDepartment: {},
      lastTask: "",
      lastDepartment: "",
      order: index
    }
  ]));
  const extraStats = Object.fromEntries(availablePeople.map((person, index) => [
    person.id,
    { total: 0, order: index }
  ]));
  const extraPersonLocations = normalizeExtraPersonLocations(currentExtraLocations);
  TASKS.filter(isExtraPersonTask).forEach(task => DAYS.forEach(day => { extraPersonLocations[task][day] = ""; }));
  let assignmentCount = 0;
  let unfilledCount = 0;

  DAYS.forEach((day, dayIndex) => {
    const assignedToday = new Set();
    TASKS.filter(isTrainingTaskName).forEach(task => {
      const personId = schedule[task]?.[day];
      if (personId) {
        assignedToday.add(personId);
        if (stats[personId]) stats[personId].total += 1;
        if (extraStats[personId]) extraStats[personId].total += 1;
      }
      const leaderId = trainingLeaders?.[task]?.[day];
      if (leaderId) {
        assignedToday.add(leaderId);
        if (extraStats[leaderId]) extraStats[leaderId].total += 1;
      }
    });

    const tasksForDay = productionTasks;

    tasksForDay.forEach((task, taskIndex) => {
      const reservedForTraining = TASKS.filter(isTrainingTaskName)
        .some(item => schedule?.[item]?.[day] && trainingLocations?.[item]?.[day] === task);
      if (reservedForTraining) return;

      const department = getTaskDepartment(task);
      const configuredSkills = customWorkItems.find(item => item.name === task)?.requiredSkills || [];
      const candidates = eligiblePeople
        .filter(person => {
          if (assignedToday.has(person.id)) return false;
          const personSkills = Array.isArray(skills[person.id]) ? skills[person.id] : [];
          if (!personSkills.includes(department)) return false;
          if (!configuredSkills.every(requiredSkill => personSkills.includes(requiredSkill))) return false;
          const personRestrictions = Array.isArray(restrictions[person.id])
            ? restrictions[person.id]
            : [];
          return !(department === "GD" && personRestrictions.includes("GD"));
        })
        .sort((first, second) => {
          const firstStats = stats[first.id];
          const secondStats = stats[second.id];
          const score = personStats => (
            personStats.total * 1000 +
            (personStats.lastTask === task ? 300 : 0) +
            (personStats.lastDepartment === department ? 100 : 0) +
            (personStats.byTask[task] || 0) * 20 +
            (personStats.byDepartment[department] || 0) * 5 +
            ((personStats.order - dayIndex - taskIndex + eligiblePeople.length * 4)
              % eligiblePeople.length)
          );
          return score(firstStats) - score(secondStats);
        });

      const selectedPerson = candidates[0];
      if (!selectedPerson) {
        unfilledCount += 1;
        return;
      }

      schedule[task] ??= {};
      schedule[task][day] = selectedPerson.id;
      assignedToday.add(selectedPerson.id);
      const personStats = stats[selectedPerson.id];
      personStats.total += 1;
      personStats.byTask[task] = (personStats.byTask[task] || 0) + 1;
      personStats.byDepartment[department] =
        (personStats.byDepartment[department] || 0) + 1;
      personStats.lastTask = task;
      personStats.lastDepartment = department;
      if (extraStats[selectedPerson.id]) extraStats[selectedPerson.id].total += 1;
      assignmentCount += 1;
    });

    TASKS.filter(isExtraPersonTask).map((task, index) => ({
      task, assignment: task === "Extra person 1" ? "GD-rummet"
        : task === "Extra person 2" ? "Lock & dosor" : EXTRA_PERSON_ASSIGNMENTS[index] || ""
    })).forEach(({ task, assignment }, extraIndex) => {
      if (!EXTRA_PERSON_ASSIGNMENTS.includes(assignment)) {
        assignment = EXTRA_PERSON_ASSIGNMENTS[extraIndex] || EXTRA_PERSON_ASSIGNMENTS[0] || "";
      }
      const selectedPerson = availablePeople
        .filter(person => {
          if (assignedToday.has(person.id)) return false;
          const personRestrictions = Array.isArray(restrictions[person.id])
            ? restrictions[person.id]
            : [];
          return assignment !== "GD-rummet" || !personRestrictions.includes("GD");
        })
        .sort((first, second) => {
          const firstStats = extraStats[first.id];
          const secondStats = extraStats[second.id];
          return firstStats.total - secondStats.total ||
            ((firstStats.order - dayIndex - extraIndex + availablePeople.length * 3) % availablePeople.length) -
            ((secondStats.order - dayIndex - extraIndex + availablePeople.length * 3) % availablePeople.length);
        })[0];
      if (!selectedPerson) return;
      schedule[task] ??= {};
      extraPersonLocations[task] ??= {};
      schedule[task][day] = selectedPerson.id;
      extraPersonLocations[task][day] = assignment;
      assignedToday.add(selectedPerson.id);
      extraStats[selectedPerson.id].total += 1;
      assignmentCount += 1;
    });
  });

  return {
    ok: true,
    schedule,
    trainingLocations,
    extraPersonLocations,
    assignmentCount,
    unfilledCount,
    message: `${unfilledCount
      ? `Schemat skapades med ${assignmentCount} placeringar. ${unfilledCount} platser saknar behörig personal.`
      : `Veckoschemat är klart med ${assignmentCount} rättvist fördelade placeringar.`}${ignoredTasks.length
      ? ` Kontrollerades inte: ${ignoredTasks.join(", ")}. De saknas bland aktiva schemarader.`
      : ""}`
  };
}

function manageDialogFocus(modal, onEscape) {
  const previousFocus = document.activeElement;
  const previousOverflow = document.body.style.overflow;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.tabIndex = -1;
  const heading = modal.querySelector("h2, h3");
  if (heading) {
    if (!heading.id) heading.id = `dialog-${makeId()}`;
    modal.setAttribute("aria-labelledby", heading.id);
  }
  const focusable = () => [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')]
    .filter(element => !element.hidden && element.getClientRects().length);
  const handleKey = event => {
    if (event.key === "Escape" && onEscape) { event.preventDefault(); onEscape(); return; }
    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) { event.preventDefault(); modal.focus(); return; }
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === modal)) {
      event.preventDefault(); first.focus();
    }
  };
  document.body.style.overflow = "hidden";
  modal.addEventListener("keydown", handleKey);
  (focusable()[0] || modal).focus();
  return () => {
    modal.removeEventListener("keydown", handleKey);
    document.body.style.overflow = previousOverflow;
    if (previousFocus?.isConnected) previousFocus.focus();
  };
}

function showSchedulePreview(result, people, options = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const modal = document.createElement("section");
    modal.className = "schedule-preview-modal";
    const nameById = Object.fromEntries(people.map(person => [person.id, person.name]));
    const dates = getDatesForWeek();
    const isShareView = options.mode === "share";
    const isShared = Boolean(options.shared);
    const previewTasks = isShareView ? TASKS : TASKS.filter(task => !isTrainingTaskName(task));
    const rows = previewTasks.map(task => `
      <div class="preview-task">${escapeHtml(task)}</div>
      ${DAYS.map(day => {
        if (isShareView && isTrainingTaskName(task)) {
          const trainee = nameById[result.schedule?.[task]?.[day]] || "—";
          const leader = nameById[result.trainingLeaders?.[task]?.[day]] || "—";
          const location = result.trainingLocations?.[task]?.[day] || "—";
          if (trainee === "—") return "<div>—</div>";
          return `<div class="preview-training-details"><strong>${escapeHtml(trainee)}</strong><small><b>Handledare</b>${escapeHtml(leader)}</small><small><b>Plats</b>${escapeHtml(location)}</small></div>`;
        }
        const trainingTask = TASKS.filter(isTrainingTaskName)
          .find(item => result.schedule?.[item]?.[day] && result.trainingLocations?.[item]?.[day] === task);
        const value = trainingTask ? "Utbildning" : nameById[result.schedule[task]?.[day]] || "—";
        if (isExtraPersonTask(task) && value !== "—") {
          const assignment = result.extraPersonLocations?.[task]?.[day] || "Ingen uppgift vald";
          return `<div class="preview-extra-person"><strong>${escapeHtml(value)}</strong><small>${escapeHtml(assignment)}</small></div>`;
        }
        return `<div${trainingTask ? ' class="preview-training"' : ""}>${escapeHtml(value)}</div>`;
      }).join("")}
    `).join("");
    modal.innerHTML = `
      <div class="preview-heading"><div><small>${isShareView ? (isShared ? "DELAT MED OPERATÖRERNA" : "DELA SCHEMA") : "FÖRHANDSVISNING"}</small><h3>Veckoschema</h3><p>${escapeHtml(result.message)}</p></div><button type="button" class="preview-close" aria-label="Stäng">×</button></div>
      <div class="schedule-preview-grid"><div class="preview-task preview-header">Uppgift</div>${DAYS.map((day, index) => `<div class="preview-header"><strong>${escapeHtml(day)}</strong><small>${escapeHtml(dates[index])}</small></div>`).join("")}${rows}</div>
      <div class="preview-actions">${isShareView
        ? isShared
          ? '<button type="button" class="btn preview-unshare">Sluta dela</button><button type="button" class="btn primary preview-cancel">Stäng</button>'
          : '<button type="button" class="btn preview-cancel">Avbryt</button><button type="button" class="btn primary preview-save">Dela schema</button>'
        : '<button type="button" class="btn preview-cancel">Avbryt</button><button type="button" class="btn primary preview-save">Spara schema</button>'}</div>
    `;
    modal.style.setProperty("--schedule-day-count", String(DAYS.length));
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    let cleanupFocus;
    const close = accepted => { overlay.remove(); cleanupFocus?.(); resolve(accepted); };
    cleanupFocus = manageDialogFocus(modal, () => close(false));
    modal.querySelector(".preview-close").addEventListener("click", () => close(false));
    modal.querySelector(".preview-cancel")?.addEventListener("click", () => close(false));
    modal.querySelector(".preview-save")?.addEventListener("click", () => close(isShareView ? "share" : true));
    modal.querySelector(".preview-unshare")?.addEventListener("click", () => close("unshare"));
    overlay.addEventListener("click", event => { if (event.target === overlay) close(false); });
  });
}

function setupAutoSchedule() {
  const button = document.getElementById("autoScheduleBtn");
  const message = document.getElementById("autoScheduleMessage");
  if (!button || button.dataset.bound === "true") return;

  button.dataset.bound = "true";
  let creating = false;
  button.addEventListener("click", async () => {
    if (creating || button.disabled) return;
    creating = true;
    const weekKey = getSelectedWeekKey();
    button.disabled = true;
    button.textContent = "Skapar schema…";
    if (message) {
      message.textContent = "Kompetenser och tillgänglighet kontrolleras…";
      message.className = "auto-schedule-message";
    }

    try {
      const priorityLines = await getSchedulePriorityLines();
      const result = await createFairWeeklySchedule(priorityLines);
      if (message) {
        message.textContent = result.message;
        message.className = `auto-schedule-message ${result.ok ? "success" : "error"}`;
      }
      if (result.ok) {
        const previousState = await getScheduleState();
        if (getSelectedWeekKey() !== weekKey) {
          showAppToast("Veckan ändrades. Skapa schemat igen för den valda veckan.", "error");
          return;
        }
        recordScheduleHistory(previousState.schedule, previousState.trainingLeaders, previousState.trainingLocations, previousState.extraPersonLocations);
        await Promise.all([
          saveSchedule(result.schedule),
          saveExtraPersonLocations(result.extraPersonLocations)
        ]);
        await addAuditEvent("schedule", "Veckoschema skapat", `${result.assignmentCount} placeringar för ${formatWeekRange()}`);
        await renderSchedule();
        await renderBreakPlanner();
        if (message) message.textContent = `${result.message} Schemat har sparats. Du kan ändra placeringarna direkt i tabellen.`;
      }
    } catch (error) {
      console.error(error);
      if (message) {
        const technicalReason = error instanceof Error && error.message ? ` (${error.message})` : "";
        message.textContent = `Det gick inte att skapa schemat${technicalReason}.`;
        message.className = "auto-schedule-message error";
      }
    } finally {
      creating = false;
      button.textContent = "Skapa veckoschema";
      const root = document.getElementById("scheduleGrid");
      if (root) await renderSchedulePrioritySelector(root);
    }
  });
}

function fromBase64(base64) {
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

async function deriveAesKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decryptJson(payload, key) {
  const iv = fromBase64(payload.iv);
  const data = fromBase64(payload.data);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);

  return JSON.parse(decoder.decode(plaintext));
}

function bindOnce(element, eventName, handler) {
  if (!element || element.dataset.bound === "true") return;

  element.dataset.bound = "true";
  let pending = false;
  element.addEventListener(eventName, event => {
    if (pending) { event.preventDefault(); return; }
    const controls = element.matches("form") ? [...element.querySelectorAll('button[type="submit"], button:not([type])')]
      : element.matches("button") && eventName === "click" ? [element] : [];
    const previousDisabled = controls.map(control => control.disabled);
    try {
      const result = handler(event);
      if (result && typeof result.then === "function") {
        pending = true;
        controls.forEach(control => { control.disabled = true; });
        result.catch(error => {
          console.error("Action failed:", error);
          showAppToast(error instanceof ApiError ? error.message : "Ändringen kunde inte sparas. Försök igen.", "error");
        }).finally(() => {
          pending = false;
          controls.forEach((control, index) => { control.disabled = previousDisabled[index]; });
        });
      }
    } catch (error) {
      console.error("Action failed:", error);
      showAppToast("Åtgärden kunde inte slutföras. Försök igen.", "error");
    }
  });
}

function setAuthenticatedView(isAuthenticated) {
  document.body.classList.toggle("app-authenticated", isAuthenticated);
}

function finishInitialViewSetup() {
  document.body.classList.remove("app-booting");
}

function showAuthMessage(text, isError = true) {
  const authMessage = document.getElementById("authMessage");
  if (!authMessage) return;

  authMessage.textContent = text;
  authMessage.classList.remove("hidden");
  authMessage.classList.toggle("error", isError);
  authMessage.classList.toggle("success", !isError);
}

function clearAuthMessage() {
  const authMessage = document.getElementById("authMessage");
  if (!authMessage) return;

  authMessage.textContent = "";
  authMessage.classList.add("hidden");
  authMessage.classList.remove("error", "success");
}

// Staff. Admins and shift leaders get everyone; operators get their own record
// and the names of the people in their shift.
let peopleCache = null;

async function getAllPeople() {
  if (!currentUser) return [];
  peopleCache ??= apiRequest("GET", "/people").then(data => data.people).catch(error => {
    peopleCache = null;
    throw error;
  });
  return structuredClone(await peopleCache);
}

// The people in the shift this page shows. These are the people who can be scheduled.
async function getPeople() {
  const shiftId = getShiftScope();
  if (!shiftId) return [];
  return (await getAllPeople()).filter(person => person.shiftId === shiftId);
}

// The people on the test, competence and assessment pages. Shift leaders get the
// operators in their own shift, plus its right hands and staff without a login.
async function getEvaluatedPeople() {
  const people = await getPeople();
  if (isAdmin()) return people;
  if (!isShiftLeader()) return [];
  return people.filter(person => !person.account || EVALUATED_BY_LEADERS.includes(person.account.role));
}

async function createPerson(data) {
  const { person } = await apiRequest("POST", "/people", data);
  peopleCache = null;
  return person;
}

async function updatePerson(id, changes) {
  const { person } = await apiRequest("PATCH", `/people/${encodeURIComponent(id)}`, changes);
  if (person.id === currentPerson?.id) currentPerson = person;
  peopleCache = null;
  return person;
}

async function deletePersonRecord(id) {
  await apiRequest("DELETE", `/people/${encodeURIComponent(id)}`);
  peopleCache = null;
}

// Statuses from before the three-status model, as their new status.
const LEGACY_AVAILABILITY = { sick: "unavailable", vab: "unavailable", vacation: "off" };

function getPersonAvailability(person) {
  const status = LEGACY_AVAILABILITY[person?.availability] || person?.availability;
  return ["unavailable", "off"].includes(status) ? status : "available";
}

function getAvailabilityLabel(status) {
  status = LEGACY_AVAILABILITY[status] || status;
  if (status === "unavailable") return "Ej tillgänglig";
  if (status === "off") return "Ledig";
  return "Tillgänglig";
}

function getUnavailableMessage(person) {
  const status = getPersonAvailability(person);
  if (status === "unavailable") return `${person.name} är inte tillgänglig för arbete och kan inte schemaläggas.`;
  if (status === "off") return `${person.name} är ledig och kan inte schemaläggas.`;
  return "";
}

function renderAvailabilitySummary(scheduleRoot, people) {
  const card = scheduleRoot.parentElement;
  if (!card) return;

  let summary = card.querySelector(".availability-summary");
  if (!summary) {
    summary = document.createElement("section");
    summary.className = "availability-summary";
    card.insertBefore(summary, scheduleRoot);
  }

  const unavailablePeople = people.filter(
    person => getPersonAvailability(person) !== "available"
  );
  summary.innerHTML = "";

  const heading = document.createElement("div");
  heading.className = "availability-summary-heading";
  const headingText = document.createElement("div");
  const title = document.createElement("strong");
  const subtitle = document.createElement("span");
  const count = document.createElement("span");
  title.textContent = "Frånvaro";
  subtitle.textContent = unavailablePeople.length
    ? "Dessa personer kan inte schemaläggas"
    : "Alla är tillgängliga";
  count.className = `availability-count${unavailablePeople.length ? " has-absence" : ""}`;
  count.textContent = String(unavailablePeople.length);
  headingText.append(title, subtitle);
  heading.append(headingText, count);
  summary.appendChild(heading);

  if (!unavailablePeople.length) {
    const allAvailable = document.createElement("div");
    allAvailable.className = "availability-all-clear";
    allAvailable.innerHTML = "<span>✓</span> Ingen registrerad frånvaro";
    summary.appendChild(allAvailable);
    return;
  }

  const chips = document.createElement("div");
  chips.className = "availability-chips";
  unavailablePeople.forEach(person => {
    const status = getPersonAvailability(person);
    const chip = document.createElement("div");
    const dot = document.createElement("span");
    const text = document.createElement("span");
    const label = document.createElement("small");
    chip.className = `availability-chip availability-chip-${status}`;
    chip.title = getUnavailableMessage(person);
    dot.className = "availability-chip-dot";
    text.textContent = person.name;
    label.textContent = getAvailabilityLabel(status);
    chip.append(dot, text, label);
    chips.appendChild(chip);
  });
  summary.appendChild(chips);
}

function renderTrainingScheduleSummary(scheduleRoot, people, schedule, trainingLocations) {
  const card = scheduleRoot.parentElement;
  if (!card) return;

  const entries = [];
  TASKS.filter(isTrainingTaskName).forEach(task => {
    DAYS.forEach(day => {
      const personId = schedule?.[task]?.[day];
      const person = people.find(item => item.id === personId);
      if (!person) return;
      entries.push({
        person,
        day,
        task,
        location: trainingLocations?.[task]?.[day] || "Plats ej vald"
      });
    });
  });

  let summary = card.querySelector(".training-schedule-summary");
  if (!entries.length) {
    summary?.remove();
    return;
  }

  const groupedEntries = [...entries.reduce((groups, entry) => {
    const group = groups.get(entry.person.id) || { person: entry.person, sessions: [] };
    group.sessions.push(entry);
    groups.set(entry.person.id, group);
    return groups;
  }, new Map()).values()];

  if (!summary) {
    summary = document.createElement("section");
    summary.className = "training-schedule-summary";
    card.insertBefore(summary, scheduleRoot);
  }
  summary.innerHTML = "";

  const heading = document.createElement("div");
  heading.className = "training-schedule-heading";
  heading.innerHTML = `<div><strong>Utbildning denna vecka</strong><span>Personer och planerade utbildningsdagar</span></div><b>${groupedEntries.length}</b>`;
  const list = document.createElement("div");
  list.className = "training-schedule-list";

  groupedEntries.forEach(({ person, sessions }) => {
    const item = document.createElement("div");
    const info = document.createElement("div");
    const dayLabel = document.createElement("small");
    const name = document.createElement("strong");
    const locationLabel = document.createElement("span");
    const uniqueDays = [...new Set(sessions.map(session => session.day))];
    const uniqueLocations = [...new Set(sessions.map(session => session.location))];
    const dayText = uniqueDays.map(day => day.slice(0, 3)).join(" · ");
    const locationText = uniqueLocations.length === 1
      ? `Utbildning · ${uniqueLocations[0]}`
      : sessions.map(session => `${session.day.slice(0, 3)}: ${session.location}`).join(" · ");
    item.className = "training-schedule-person";
    item.title = `${person.name} har utbildning ${uniqueDays.join(", ")}`;
    dayLabel.textContent = person.name;
    name.textContent = dayText;
    locationLabel.textContent = locationText;
    info.append(name, locationLabel);
    item.append(dayLabel, info);
    list.appendChild(item);
  });

  summary.append(heading, list);
}

function renderUnassignedPeopleSummary(scheduleRoot, people, schedule, trainingLeaders) {
  const card = scheduleRoot.parentElement;
  if (!card) return;
  let summary = card.querySelector(".unassigned-summary");
  if (!summary) {
    summary = document.createElement("section");
    summary.className = "unassigned-summary";
    card.insertBefore(summary, scheduleRoot);
  }
  const availablePeople = people.filter(person => getPersonAvailability(person) === "available");
  const days = DAYS.map(day => {
    const occupied = getAssignedPeopleForDay(schedule, day);
    getTrainingLeadersForDay(trainingLeaders, day).forEach(personId => occupied.add(personId));
    return { day, people: availablePeople.filter(person => !occupied.has(person.id)) };
  });
  const total = days.reduce((sum, entry) => sum + entry.people.length, 0);
  summary.classList.toggle("all-clear", total === 0);
  summary.innerHTML = `
    <div class="unassigned-summary-heading">
      <div><strong>Personal utan placering</strong><span>Personer som är tillgängliga men ännu inte har någon uppgift.</span></div>
      <b>${total}</b>
    </div>
    <div class="unassigned-days">
      ${days.map(entry => `
        <article class="${entry.people.length ? "has-unassigned" : ""}">
          <div><strong>${escapeHtml(entry.day)}</strong><span>${entry.people.length ? `${entry.people.length} utan plats` : "Alla placerade"}</span></div>
          <p>${entry.people.length ? entry.people.map(person => escapeHtml(person.name)).join(" · ") : "✓"}</p>
        </article>
      `).join("")}
    </div>`;
}

// Admins and shift leaders are signed out after a period of inactivity, like the
// old app locked itself. Operators mostly use their own phones and stay signed in.
// The last activity is shared between tabs so an idle tab does not sign out an active one.
const LAST_ACTIVITY_KEY = "staff-planner-last-activity";
let lastActivityWrite = 0;

function markUserActive(force = false) {
  const now = Date.now();
  if (!force && now - lastActivityWrite < 15000) return;
  lastActivityWrite = now;
  try { localStorage.setItem(LAST_ACTIVITY_KEY, String(now)); } catch { /* Private mode: fall back to this tab only. */ }
}

function getLastActivity() {
  try { return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || lastActivityWrite; } catch { return lastActivityWrite; }
}

function setupAutoLock() {
  clearTimeout(autoLockTimeoutId);
  const minutes = Number(appSettings.autoLockMinutes);
  if (!minutes || !canManageStaff()) return;
  const limit = minutes * 60 * 1000;
  if (document.body.dataset.autoLockBound !== "true") {
    document.body.dataset.autoLockBound = "true";
    ["pointerdown", "keydown", "touchstart"].forEach(eventName => document.addEventListener(eventName, () => markUserActive(), { passive: true }));
  }
  markUserActive(true);
  const check = () => {
    const idle = Date.now() - getLastActivity();
    if (idle >= limit) {
      void signOut("Du loggades ut automatiskt efter inaktivitet.");
      return;
    }
    autoLockTimeoutId = setTimeout(check, limit - idle + 1000);
  };
  autoLockTimeoutId = setTimeout(check, limit);
}

function normalizeStringList(values, fallback = []) {
  const unique = new Map();
  (Array.isArray(values) ? values : fallback).forEach(value => {
    if (typeof value !== "string" || !value.trim()) return;
    const trimmed = value.trim();
    const key = trimmed.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, trimmed);
  });
  return [...unique.values()];
}

function normalizeAppSettings(settings) {
  const next = { ...DEFAULT_APP_SETTINGS, ...(settings || {}) };
  next.productionMachines = normalizeStringList(next.productionMachines, DEFAULT_APP_SETTINGS.productionMachines);
  if (!next.productionMachines.length) next.productionMachines = [...DEFAULT_APP_SETTINGS.productionMachines];
  next.extraAssignments = normalizeStringList(next.extraAssignments, DEFAULT_APP_SETTINGS.extraAssignments);
  next.workDays = ALL_DAYS.filter(day => Array.isArray(next.workDays) && next.workDays.includes(day));
  if (!next.workDays.length) next.workDays = [...ALL_DAYS];
  const minutes = Number(next.autoLockMinutes);
  next.autoLockMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : DEFAULT_APP_SETTINGS.autoLockMinutes;
  const lines = Array.isArray(next.breakLines) ? next.breakLines : DEFAULT_APP_SETTINGS.breakLines;
  const seenIds = new Set();
  next.breakLines = lines.flatMap(line => {
    if (!line || typeof line.id !== "string" || typeof line.label !== "string") return [];
    const id = line.id.trim();
    const label = line.label.trim();
    const workplaces = normalizeStringList(line.workplaces);
    if (!id || !label || !workplaces.length || seenIds.has(id.toLocaleLowerCase())) return [];
    seenIds.add(id.toLocaleLowerCase());
    return [{ id, label, workplaces }];
  });
  if (!next.breakLines.length) next.breakLines = structuredClone(DEFAULT_APP_SETTINGS.breakLines);
  return next;
}

function applyAppSettings(settings) {
  appSettings = normalizeAppSettings(settings);
  DAYS = [...appSettings.workDays];
  EXTRA_PERSON_ASSIGNMENTS = [...appSettings.extraAssignments];
  BREAK_LINE_WORKPLACES = Object.fromEntries(appSettings.breakLines.map(line => [line.id, line.workplaces]));
  BREAK_LINE_LABELS = Object.fromEntries(appSettings.breakLines.map(line => [line.id, line.label]));
  BREAK_WORKPLACE_DISPLAY_ORDER = [...new Set(appSettings.breakLines.flatMap(line => line.workplaces))];
}

async function saveAppSettings(nextSettings) {
  const normalized = normalizeAppSettings(nextSettings);
  await saveGlobalDocument("appSettings", normalized);
  applyAppSettings(normalized);
}

// Operators see a week's schedule and break plan only after an admin or shift
// leader has shared it. Sharing is for admins and shift leaders only.
async function getScheduleShare() {
  const share = await getShiftDocument(getWeekDocumentKey("scheduleShared"), null);
  return share?.shared === true ? share : null;
}

// Resolves with the server's reply; `notified` tells how many operators were e-mailed.
async function saveScheduleShare(shared) {
  return saveShiftDocument(getWeekDocumentKey("scheduleShared"), shared
    ? { shared: true, sharedAt: new Date().toISOString(), sharedBy: currentPerson?.name || "" }
    : { shared: false });
}

async function updateShareScheduleButton() {
  const button = document.getElementById("shareScheduleBtn");
  if (!button) return;
  button.classList.toggle("hidden", !canEditActiveShift());
  if (!canEditActiveShift()) return;
  const shared = Boolean(await getScheduleShare());
  button.classList.toggle("is-shared", shared);
  button.textContent = shared ? "Schemat är delat" : "Dela schema";
  button.title = shared ? "Operatörerna ser veckans schema och rastplan" : "Operatörerna ser inte veckans schema förrän det delas";
}

function setupShareSchedule() {
  const button = document.getElementById("shareScheduleBtn");
  if (!button) return;
  if (isOperator()) {
    button.remove();
    return;
  }
  if (button.dataset.bound === "true") return;
  button.dataset.bound = "true";
  button.addEventListener("click", async () => {
    if (!canEditActiveShift()) return;
    button.disabled = true;
    try {
      const [schedule, trainingLeaders, trainingLocations, extraPersonLocations, people, share] = await Promise.all([
        getSchedule(),
        getTrainingLeaders(),
        getTrainingLocations(),
        getExtraPersonLocations(),
        getPeople(),
        getScheduleShare()
      ]);
      const assignmentCount = TASKS.reduce((total, task) =>
        total + DAYS.filter(day => Boolean(schedule?.[task]?.[day])).length, 0);
      const sharedText = share?.sharedAt
        ? ` · delat ${new Date(share.sharedAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}${share.sharedBy ? ` av ${share.sharedBy}` : ""}`
        : "";
      const choice = await showSchedulePreview({
        schedule,
        trainingLeaders,
        trainingLocations,
        extraPersonLocations,
        message: `${formatWeekRange()} · ${assignmentCount} placeringar${sharedText}`
      }, people, { mode: "share", shared: Boolean(share) });
      if (choice !== "share" && choice !== "unshare") return;
      const saved = await saveScheduleShare(choice === "share");
      await addAuditEvent("schedule", choice === "share" ? "Schemat delat" : "Schemat delas inte längre", formatWeekRange());
      showAppToast(choice === "share" ? `Schemat är delat med operatörerna.${describeShareMail(saved?.notified)}` : "Operatörerna ser inte längre veckans schema.",
        saved?.notified?.failed ? "error" : undefined);
    } catch (error) {
      showAppToast(error.message || "Det gick inte att dela schemat.", "error");
    } finally {
      button.disabled = false;
      await updateShareScheduleButton();
    }
  });
}

function describeShareMail(notified) {
  if (!notified?.configured) return "";
  const failed = notified.failed ? ` ${notified.failed} mejl gick inte att skicka.` : "";
  if (!notified.sent) return notified.failed ? failed : " Ingen operatör i skiftet har en e-postadress.";
  return ` ${notified.sent} ${notified.sent === 1 ? "operatör" : "operatörer"} fick ett mejl.${failed}`;
}

function renderUnsharedScheduleNotice(root) {
  root.parentElement?.querySelectorAll(".my-week-summary, .training-schedule-summary").forEach(element => element.remove());
  root.classList.add("schedule-readonly");
  root.innerHTML = `<div class="empty-state schedule-unshared-notice"><strong>Schemat för ${escapeHtml(formatWeekRange())} är inte delat än</strong><p>Det visas här när skiftledaren har delat det.</p></div>`;
}

function isExtraPersonTaskName(task) {
  return /^extra\s+person(?:\s+\d+)?$/i.test(String(task || "").trim());
}

function isExtraPersonTask(task) {
  return isExtraPersonTaskName(task) ||
    customWorkItems.some(item => item.enabled && item.name === task && item.type === "extra");
}

function isTrainingTaskName(task) {
  return task.includes("Utbildning") ||
    customWorkItems.some(item => item.enabled && item.name === task && item.type === "training");
}

function getProductionWorkplaces() {
  return TASKS.filter(task => !isTrainingTaskName(task) && !isExtraPersonTask(task));
}

function applyCustomWorkItems(items) {
  customWorkItems = Array.isArray(items)
    ? items.filter(item => item && typeof item.name === "string" && item.name.trim()).map(item => ({
      ...item,
      id: item.id || makeId(),
      enabled: item.enabled !== false,
      showInTestResults: item.showInTestResults ?? Boolean(item.showInCompetency),
      type: isExtraPersonTaskName(item.name) ? "extra"
        : ["machine", "department", "training", "extra"].includes(item.type) ? item.type : "machine",
      staffCount: Math.max(1, Number(item.staffCount) || 1),
      requiredSkills: Array.isArray(item.requiredSkills) ? item.requiredSkills.filter(Boolean) : [],
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
    }))
    : [];
  TASKS = [...DEFAULT_TASKS];
  customWorkItems.filter(item => item.enabled && item.showInSchema).forEach(item => {
    const existingIndex = TASKS.findIndex(task => task.toLocaleLowerCase() === item.name.toLocaleLowerCase());
    if (existingIndex !== -1) return;
    const afterIndex = TASKS.indexOf(item.after);
    const firstTrainingIndex = TASKS.findIndex(isTrainingTaskName);
    const insertIndex = afterIndex !== -1
      ? afterIndex + 1
      : firstTrainingIndex === -1 ? TASKS.length : firstTrainingIndex;
    TASKS.splice(insertIndex, 0, item.name);
  });
}

// Both reads start in the same tick, so they go out in one /documents request.
// Settings are applied first, as before.
async function loadSharedSettings() {
  const [settings, items] = await Promise.all([getGlobalDocument("appSettings", {}), getGlobalDocument("workItems", [])]);
  applyAppSettings(settings);
  applyCustomWorkItems(Array.isArray(items) ? items : []);
}

async function saveCustomWorkItems(items) {
  applyCustomWorkItems(items);
  await saveGlobalDocument("workItems", customWorkItems);
}

async function getWorkItemTrash() {
  if (!canChangeSharedSettings()) return [];
  const items = await getGlobalDocument("workItemTrash", []);
  return Array.isArray(items) ? items : [];
}

async function saveWorkItemTrash(items) {
  await saveGlobalDocument("workItemTrash", Array.isArray(items) ? items : []);
}

// The server copies the data, including competence and test results that shift
// leaders may not read themselves.
async function createWorkItemSafetySnapshot(reason) {
  await apiRequest("POST", "/work-items/snapshot", { reason });
  documentCache.delete(documentCacheKey("global", "safetySnapshots"));
}

async function renderSchedulePrioritySelector(scheduleRoot) {
  const card = scheduleRoot.parentElement;
  if (!card) return;
  const selectedLines = await getSchedulePriorityLines();
  const isEditableWeek = !isViewingPreviousWeek();
  const autoScheduleButton = document.getElementById("autoScheduleBtn");
  if (autoScheduleButton) {
    autoScheduleButton.disabled = !isEditableWeek || selectedLines.length === 0;
    autoScheduleButton.title = !isEditableWeek
      ? "Förra veckans schema är skrivskyddat"
      : selectedLines.length ? "" : "Välj minst en linje först";
  }
  let panel = card.querySelector(".schedule-priority-panel");
  if (!panel) {
    panel = document.createElement("section");
    panel.className = "schedule-priority-panel";
    card.insertBefore(panel, card.querySelector(".schedule-tools") || scheduleRoot);
  }
  const choices = [
    ...Object.entries(BREAK_LINE_LABELS).map(([value, label]) => ({ value, label, detail: (BREAK_LINE_WORKPLACES[value] || []).filter(task => TASKS.includes(task)).join(" · ") })),
    ...customWorkItems.filter(item => item.enabled && item.showInSchema && item.autoSchedule).map(item => ({ value: item.name, label: item.name, detail: "Egen maskin / uppgift" }))
  ];
  panel.innerHTML = `
    <div class="schedule-priority-heading">
      <div><strong>Vilka linjer ska köras?</strong><small>Välj linjer innan du skapar veckoschemat. Kopplade stationer tas med automatiskt.</small></div>
      <span>${selectedLines.length} valda</span>
    </div>
    <div class="break-priority-options">
      ${choices.map(choice => `
        <label class="break-priority-option">
          <input type="checkbox" value="${escapeHtml(choice.value)}"${selectedLines.includes(choice.value) ? " checked" : ""} />
          <span><strong>${escapeHtml(choice.label)}</strong>${choice.detail ? `<small>${escapeHtml(choice.detail)}</small>` : ""}</span>
        </label>
      `).join("")}
    </div>
  `;
  panel.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.disabled = !isEditableWeek;
    checkbox.addEventListener("change", async () => {
      const currentLines = await getSchedulePriorityLines();
      const nextLines = checkbox.checked
        ? [...new Set([...currentLines, checkbox.value])]
        : currentLines.filter(line => line !== checkbox.value);
      await saveSchedulePriorityLines(nextLines);
      await renderSchedulePrioritySelector(scheduleRoot);
    });
  });
}

const isPlainObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);

async function getAssessments() {
  if (!canEvaluate()) return [];
  const assessments = await getGlobalDocument("assessments", []);
  return Array.isArray(assessments) ? assessments : [];
}

async function saveAssessments(assessments) {
  await saveGlobalDocument("assessments", assessments);
}

async function getDepartments() {
  const departments = await getGlobalDocument("departments", null);
  if (!Array.isArray(departments)) {
    if (canChangeSharedSettings()) await saveDepartments(DEFAULT_DEPARTMENTS);
    return [...DEFAULT_DEPARTMENTS];
  }
  return departments;
}

async function saveDepartments(departments) {
  await saveGlobalDocument("departments", departments);
}

async function getDepartmentsFor(destination) {
  const departments = await getDepartments();
  return departments.filter(name => {
    const item = customWorkItems.find(entry => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    return !item || (item.enabled && item[destination]);
  });
}

// Test results and assessments are visible to admins, and to shift leaders for
// the people they evaluate (the server leaves everyone else out).
async function getTestResults() {
  if (!canEvaluate()) return {};
  const results = await getGlobalDocument("testResults", {});
  return isPlainObject(results) ? results : {};
}

async function saveTestResults(results) {
  await saveGlobalDocument("testResults", results);
}

// Competence is read by shift leaders and right hands too, since scheduling depends on it.
async function getCompetenceDocument(key) {
  if (!canManageStaff()) return {};
  const value = await getGlobalDocument(key, {});
  return isPlainObject(value) ? value : {};
}

const getMachineSkills = () => getCompetenceDocument("machineSkills");
const saveMachineSkills = skills => saveGlobalDocument("machineSkills", skills);
const getMachineSkillUpdatedAt = () => getCompetenceDocument("machineSkillUpdatedAt");
const saveMachineSkillUpdatedAt = timestamps => saveGlobalDocument("machineSkillUpdatedAt", timestamps);
const getMachineRestrictions = () => getCompetenceDocument("machineRestrictions");
const saveMachineRestrictions = restrictions => saveGlobalDocument("machineRestrictions", restrictions);
const getMachineSkillDetails = () => getCompetenceDocument("machineSkillDetails");
const saveMachineSkillDetails = details => saveGlobalDocument("machineSkillDetails", details);

// Production is kept for the current month. Last month's days stay until the 10th,
// then they are removed (the server does the same for shifts nobody opens).
function getProductionRetentionStart(today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth() - (today.getDate() >= 10 ? 0 : 1), 1);
  return formatDateKey(start);
}

async function getProductionRecords(scope = getShiftScope()) {
  if (!canEditShift(scope)) return {};
  const records = await getDocument(scope, "productionRecords", {});
  if (!isPlainObject(records)) return {};
  const start = getProductionRetentionStart();
  return Object.fromEntries(Object.entries(records).filter(([date]) => date >= start));
}

async function saveProductionRecords(records, scope = getShiftScope()) {
  await saveDocument(scope, "productionRecords", records);
}

// recordDate is the day that set the factory record and recordPrevious the record it beat,
// so a typing mistake on that day can be corrected without leaving a false record behind.
// Each shift has its own daily target: shiftTargets maps a shift id to the first day of
// each of its targets ("2026-10-15": 180). targetChanges holds the changes made while all
// shifts shared one target and dailyTarget the target before them; they stay for history.
const parseTargetChanges = changes => Object.fromEntries(Object.entries(isPlainObject(changes) ? changes : {})
  .filter(([date, target]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Number(target)) && Number(target) >= 0)
  .map(([date, target]) => [date, Number(target)]));

async function getProductionSettings() {
  const settings = await getGlobalDocument("productionSettings", {});
  const shiftTargets = Object.fromEntries(Object.entries(isPlainObject(settings?.shiftTargets) ? settings.shiftTargets : {})
    .map(([shiftId, changes]) => [shiftId, parseTargetChanges(changes)]));
  return {
    dailyTarget: Number(settings?.dailyTarget) || 160,
    targetChanges: parseTargetChanges(settings?.targetChanges),
    shiftTargets,
    factoryRecord: Number(settings?.factoryRecord) || 0,
    recordDate: typeof settings?.recordDate === "string" ? settings.recordDate : "",
    recordPrevious: Number(settings?.recordPrevious) || 0
  };
}

async function saveProductionSettings(settings) {
  await saveGlobalDocument("productionSettings", settings);
}

const latestTargetChange = (changes, date) => Object.keys(changes || {}).filter(day => day <= date).sort().pop();

// A shift's target on a day: its own latest change made from that day or earlier, else the
// shared target that applied then. Days before any change keep the target they were saved with.
function getProductionTarget(settings, shiftId, date, record) {
  const own = settings.shiftTargets[shiftId];
  const ownFrom = latestTargetChange(own, date);
  if (ownFrom) return own[ownFrom];
  const sharedFrom = latestTargetChange(settings.targetChanges, date);
  if (sharedFrom) return settings.targetChanges[sharedFrom];
  return Number(record?.target ?? settings.dailyTarget);
}

// A new target applies to its shift from its day onwards, replacing that shift's later changes.
// Earlier days and the other shifts keep theirs.
function setProductionTargetFrom(settings, shiftId, date, target) {
  const kept = Object.entries(settings.shiftTargets[shiftId] || {}).filter(([day]) => day < date);
  return { ...settings, shiftTargets: { ...settings.shiftTargets, [shiftId]: Object.fromEntries([...kept, [date, target]]) } };
}

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// Today's changes in the current shift and in shared settings.
async function getAuditLog() {
  if (!canManageStaff()) return [];
  const scopes = ["global", getShiftScope()].filter(scope => scope && (scope === "global" || canEditShift(scope)));
  const data = await apiRequest("GET", `/audit?scopes=${scopes.map(encodeURIComponent).join(",")}&since=${encodeURIComponent(getStartOfToday().toISOString())}`);
  return data.events;
}

// Settings and machines are shared by all shifts; everything else belongs to the current shift.
const GLOBAL_AUDIT_TYPES = new Set(["settings", "department", "backup"]);

async function addAuditEvent(type, title, detail = "", undo = null) {
  if (!canManageStaff()) return;
  const scope = GLOBAL_AUDIT_TYPES.has(type) || !canEditActiveShift() ? "global" : getShiftScope();
  try {
    await apiRequest("POST", "/audit", { scope, type, title, detail, undo });
  } catch (error) {
    // The change itself is saved; a missing log line must not show as a failure.
    console.warn("Could not log the change:", error);
  }
  void renderDashboard();
}

async function applyAuditUndo(event) {
  const undo = event?.undo;
  if (!undo || !confirm(`Återställ ändringen: ${event.title}?`)) return;
  if (undo.action === "availability") {
    await updatePerson(undo.personId, { availability: undo.value });
  } else if (undo.action === "test") {
    const results = await getTestResults(); results[undo.personId] ??= {};
    if (undo.value === "" || undo.value === undefined) delete results[undo.personId][undo.department];
    else results[undo.personId][undo.department] = undo.value;
    await saveTestResults(results);
  } else if (undo.action === "skill") {
    const skills = await getMachineSkills(); const set = new Set(skills[undo.personId] || []);
    if (undo.enabled) set.add(undo.department); else set.delete(undo.department);
    skills[undo.personId] = [...set]; await saveMachineSkills(skills);
    if (undo.department === "GD" && undo.enabled) {
      const restrictions = await getMachineRestrictions();
      restrictions[undo.personId] = (restrictions[undo.personId] || []).filter(item => item !== "GD");
      await saveMachineRestrictions(restrictions);
    }
  } else if (undo.action === "restriction") {
    const restrictions = await getMachineRestrictions(); const set = new Set(restrictions[undo.personId] || []);
    if (undo.enabled) set.add("GD"); else set.delete("GD");
    restrictions[undo.personId] = [...set]; await saveMachineRestrictions(restrictions);
    if (undo.enabled) {
      const skills = await getMachineSkills();
      skills[undo.personId] = (skills[undo.personId] || []).filter(item => item !== "GD");
      await saveMachineSkills(skills);
    }
  }
  await apiRequest("DELETE", `/audit/${encodeURIComponent(event.id)}/undo`);
  await addAuditEvent("restore", `${event.title} återställd`, "Tidigare värde återställt");
  await refreshAppViews();
}

// Weekly schedule data for the current shift and selected week.

async function getSchedule() {
  const schedule = await getShiftDocument(getWeekDocumentKey("schedule"), null);
  return schedule ? normalizeSchedule(schedule) : createEmptySchedule();
}

async function saveSchedule(schedule) {
  await saveShiftDocument(getWeekDocumentKey("schedule"), normalizeSchedule(schedule));
}

async function getTrainingLeaders() {
  const trainingLeaders = await getShiftDocument(getWeekDocumentKey("trainingLeaders"), null);
  return trainingLeaders ? normalizeTrainingLeaders(trainingLeaders) : createEmptyTrainingLeaders();
}

async function saveTrainingLeaders(trainingLeaders) {
  await saveShiftDocument(getWeekDocumentKey("trainingLeaders"), normalizeTrainingLeaders(trainingLeaders));
}

async function getTrainingLocations() {
  const locations = await getShiftDocument(getWeekDocumentKey("trainingLocations"), null);
  return locations ? normalizeTrainingLocations(locations) : createEmptyTrainingLocations();
}

async function saveTrainingLocations(trainingLocations) {
  await saveShiftDocument(getWeekDocumentKey("trainingLocations"), normalizeTrainingLocations(trainingLocations));
}

async function getExtraPersonLocations() {
  const locations = await getShiftDocument(getWeekDocumentKey("extraPersonLocations"), null);
  return locations ? normalizeExtraPersonLocations(locations) : createEmptyExtraPersonLocations();
}

async function saveExtraPersonLocations(locations) {
  await saveShiftDocument(getWeekDocumentKey("extraPersonLocations"), normalizeExtraPersonLocations(locations));
}

async function getBreakPlan() {
  const breakPlan = await getShiftDocument(getWeekDocumentKey("breakPlan"), null);
  return breakPlan ? normalizeBreakPlan(breakPlan) : createEmptyBreakPlan();
}

async function saveBreakPlan(breakPlan) {
  await saveShiftDocument(getWeekDocumentKey("breakPlan"), normalizeBreakPlan(breakPlan));
}

function getValidPriorityLineChoices() {
  return new Set([
    ...Object.keys(BREAK_LINE_WORKPLACES),
    ...customWorkItems.filter(item => item.enabled && item.showInSchema && item.autoSchedule).map(item => item.name)
  ]);
}

async function getSchedulePriorityLines() {
  if (!canEditActiveShift()) return [];
  const lines = await getShiftDocument(getWeekDocumentKey("schedulePriorityLines"), []);
  const validChoices = getValidPriorityLineChoices();
  return Array.isArray(lines) ? lines.filter(line => validChoices.has(line)) : [];
}

async function saveSchedulePriorityLines(lines) {
  const validChoices = getValidPriorityLineChoices();
  const normalized = Array.isArray(lines) ? lines.filter(line => validChoices.has(line)) : [];
  await saveShiftDocument(getWeekDocumentKey("schedulePriorityLines"), normalized);
}

async function getScheduleTemplates() {
  if (!canEditActiveShift()) return [];
  const templates = await getShiftDocument("scheduleTemplates", []);
  return Array.isArray(templates) ? templates : [];
}

async function saveScheduleTemplates(templates) {
  await saveShiftDocument("scheduleTemplates", templates);
}

// "Att göra" is personal: every user has their own list, which nobody else sees.
// A task's `sharedWith` lists the user ids it is shared with; they see it read-only.
const getPersonalScope = () => currentUser ? `user:${currentUser.id}` : "";

async function getTodos() {
  if (!currentUser) return [];
  const todos = await getDocument(getPersonalScope(), "todos", []);
  return Array.isArray(todos) ? todos : [];
}

async function saveTodos(todos) {
  await saveDocument(getPersonalScope(), "todos", todos);
}

function getTodoWeekKey(dateValue = new Date()) {
  const date = new Date(dateValue);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);
  return formatDateKey(monday);
}

function getTodoDayKey(dateValue = new Date()) {
  return formatDateKey(new Date(dateValue));
}

async function renderTodoList() {
  const list = document.getElementById("todoList");
  const count = document.getElementById("todoCount");
  const notice = document.getElementById("todoNotice");
  if (!list) return;
  void renderSharedTodos();

  const currentWeek = getTodoWeekKey();
  const currentDay = getTodoDayKey();
  const storedTodos = await getTodos();
  const todos = storedTodos
    .map(todo => ({
      ...todo,
      createdWeek: todo.createdWeek || getTodoWeekKey(todo.createdAt || new Date()),
      completedDay: todo.completedAt
        ? (todo.completedDay || getTodoDayKey(todo.completedAt))
        : ""
    }))
    .filter(todo => !todo.completedAt || todo.completedDay === currentDay);
  if (todos.length !== storedTodos.length || todos.some((todo, index) =>
    todo.createdWeek !== storedTodos[index]?.createdWeek ||
    todo.completedDay !== (storedTodos[index]?.completedDay || "")
  )) {
    await saveTodos(todos);
  }

  const remaining = todos.filter(todo => !todo.completedAt);
  const overdue = remaining.filter(todo => todo.createdWeek < currentWeek);
  list.innerHTML = "";
  if (count) count.textContent = `${remaining.length} ${remaining.length === 1 ? "uppgift kvar" : "uppgifter kvar"}`;
  if (notice) {
    notice.classList.toggle("hidden", overdue.length === 0);
    notice.textContent = overdue.length === 1
      ? "Du har 1 uppgift från förra veckan som inte är klar."
      : `Du har ${overdue.length} uppgifter från tidigare veckor som inte är klara.`;
  }

  if (!todos.length) {
    list.innerHTML = '<div class="todo-empty"><strong>Allt är klart!</strong><span>Lägg till en ny uppgift ovan.</span></div>';
    return;
  }

  const recipients = await getTodoRecipients();
  todos.forEach(todo => {
    const item = document.createElement("div");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");
    const isComplete = Boolean(todo.completedAt);
    const isOverdue = !isComplete && todo.createdWeek < currentWeek;
    item.className = `todo-item${isComplete ? " is-complete" : ""}${isOverdue ? " is-overdue" : ""}`;
    label.className = "todo-item-main";
    checkbox.type = "checkbox";
    checkbox.checked = isComplete;
    checkbox.setAttribute("aria-label", `Markera ${todo.text} som klar`);
    text.textContent = todo.text;
    label.append(checkbox, text);
    item.append(label);
    if (isOverdue) {
      const overdueLabel = document.createElement("small");
      overdueLabel.textContent = "Inte klar från förra veckan";
      item.append(overdueLabel);
    }
    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.className = "btn todo-share-button";
    shareButton.textContent = "Dela";
    shareButton.setAttribute("aria-label", `Dela ${todo.text}`);
    shareButton.setAttribute("aria-expanded", "false");
    shareButton.addEventListener("click", () => toggleTodoSharePanel(item, shareButton, todo, recipients));
    item.append(shareButton);
    const sharedNames = getTodoSharedWith(todo).map(id => recipients.find(recipient => recipient.id === id)?.name).filter(Boolean);
    if (sharedNames.length) {
      const sharedLabel = document.createElement("p");
      sharedLabel.className = "todo-shared-with";
      sharedLabel.textContent = `Delad med ${sharedNames.join(", ")}`;
      item.append(sharedLabel);
    }
    checkbox.addEventListener("change", async () => {
      todo.completedAt = checkbox.checked ? new Date().toISOString() : "";
      todo.completedWeek = checkbox.checked ? currentWeek : "";
      todo.completedDay = checkbox.checked ? currentDay : "";
      await saveTodos(todos);
      await renderTodoList();
    });
    list.appendChild(item);
  });
}

const getTodoSharedWith = todo => Array.isArray(todo.sharedWith) ? todo.sharedWith.filter(id => typeof id === "string") : [];

// The users a task can be shared with: everyone else who has a list of their own.
async function getTodoRecipients() {
  try {
    return (await apiRequest("GET", "/todos/recipients")).recipients || [];
  } catch (error) {
    console.warn("Could not load who tasks can be shared with:", error);
    return [];
  }
}

// Picks exactly who one task is shared with. Saved into the latest list so
// tasks added meanwhile on another device are kept.
function toggleTodoSharePanel(item, button, todo, recipients) {
  const open = item.querySelector(".todo-share-panel");
  if (open) {
    open.remove();
    button.setAttribute("aria-expanded", "false");
    return;
  }
  const selected = new Set(getTodoSharedWith(todo));
  const panel = document.createElement("form");
  panel.className = "todo-share-panel";
  panel.innerHTML = recipients.length
    ? `<fieldset><legend>Dela med</legend>${recipients.map(recipient => `<label><input type="checkbox" value="${escapeHtml(recipient.id)}"${selected.has(recipient.id) ? " checked" : ""} /> ${escapeHtml(recipient.name)}</label>`).join("")}</fieldset>
      <p class="todo-share-hint">Bara de du väljer ser uppgiften. De kan inte ändra den.</p>
      <div class="todo-share-actions"><button class="btn" type="button" data-share-cancel>Avbryt</button><button class="btn primary" type="submit">Spara</button></div>`
    : '<p class="todo-share-hint">Det finns ingen att dela med ännu.</p><div class="todo-share-actions"><button class="btn" type="button" data-share-cancel>Stäng</button></div>';
  panel.querySelector("[data-share-cancel]").addEventListener("click", () => {
    panel.remove();
    button.setAttribute("aria-expanded", "false");
    button.focus();
  });
  panel.addEventListener("submit", async event => {
    event.preventDefault();
    const sharedWith = [...panel.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
    const todos = await getTodos();
    const stored = todos.find(entry => entry.id === todo.id);
    if (!stored) return renderTodoList();
    if (sharedWith.length) stored.sharedWith = sharedWith;
    else delete stored.sharedWith;
    await saveTodos(todos);
    showAppToast(sharedWith.length ? "Uppgiften är delad." : "Uppgiften delas inte längre.");
    await renderTodoList();
  });
  item.append(panel);
  button.setAttribute("aria-expanded", "true");
  panel.querySelector("input, button")?.focus();
}

// Tasks others have shared with me, grouped by owner. Read-only.
async function renderSharedTodos() {
  const list = document.getElementById("sharedTodoList");
  if (!list) return;
  const count = document.getElementById("sharedTodoCount");
  let items;
  try {
    items = (await apiRequest("GET", "/todos/shared")).items || [];
  } catch (error) {
    console.warn("Could not load shared tasks:", error);
    return;
  }
  const currentDay = getTodoDayKey();
  const visible = items.filter(item => !item.completedAt || (item.completedDay || getTodoDayKey(item.completedAt)) === currentDay);
  const remaining = visible.filter(item => !item.completedAt).length;
  if (count) count.textContent = `${remaining} ${remaining === 1 ? "uppgift kvar" : "uppgifter kvar"}`;
  if (!visible.length) {
    list.innerHTML = '<div class="todo-empty"><span>Ingen har delat någon uppgift med dig.</span></div>';
    return;
  }
  const owners = [...new Map(visible.map(item => [item.ownerId, item.ownerName])).entries()];
  list.innerHTML = owners.map(([ownerId, ownerName]) => `<div class="todo-shared-owner"><h4>Från ${escapeHtml(ownerName)}</h4>${visible
    .filter(item => item.ownerId === ownerId)
    .map(item => `<div class="todo-item is-shared${item.completedAt ? " is-complete" : ""}"><span class="todo-shared-state" aria-hidden="true">${item.completedAt ? "✓" : "○"}</span><span>${escapeHtml(item.text)}</span>${item.completedAt ? '<small class="todo-shared-done">Klar</small>' : ""}</div>`)
    .join("")}</div>`).join("");
}

function setupTodoPage() {
  const form = document.getElementById("todoForm");
  const input = document.getElementById("todoInput");
  if (!form || !input || form.dataset.bound === "true") return;
  form.dataset.bound = "true";
  const scheduleEndOfDayCleanup = () => {
    const now = new Date();
    const nextDay = new Date(now);
    nextDay.setHours(24, 0, 1, 0);
    window.setTimeout(async () => {
      await renderTodoList();
      scheduleEndOfDayCleanup();
    }, nextDay.getTime() - now.getTime());
  };
  scheduleEndOfDayCleanup();
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    const todos = await getTodos();
    todos.push({
      id: makeId(),
      text,
      createdAt: new Date().toISOString(),
      createdWeek: getTodoWeekKey(),
      completedAt: "",
      completedWeek: "",
      completedDay: ""
    });
    await saveTodos(todos);
    form.reset();
    await renderTodoList();
    input.focus();
  });
}

function enhanceAppShell() {
  const main = document.querySelector(".main");
  const appShell = document.getElementById("appShell");
  if (main && !main.id) main.id = "mainContent";

  if (main && !document.querySelector(".skip-link")) {
    const skipLink = document.createElement("a");
    skipLink.className = "skip-link";
    skipLink.href = "#mainContent";
    skipLink.textContent = "Hoppa till innehållet";
    document.body.prepend(skipLink);
  }

  const currentPage = location.pathname.split("/").pop() || "index.html";
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement("link"); manifest.rel = "manifest"; manifest.href = "manifest.webmanifest"; document.head.appendChild(manifest);
  }
  setupRoleNavigation();
  const pageTips = {
    "dashboard.html": "Här finns senaste status och dagens ändringar för skiftet.",
    "anvandare.html": "Klicka på Hantera för att ändra uppgifter eller lösenord. Skiftledare ser bara sitt eget skift; roller, användarnamn och borttagning hanteras av admin.",
    "personal.html": "Sätt status Tillgänglig, Ej tillgänglig eller Ledig; schemat visar statusen direkt.",
    "add.html": "Pausa en arbetsplats när den inte används. Då bevaras historiken och den kan aktiveras igen.",
    "maskiner.html": "Registrerad kompetens används för att varna och hjälpa autoschemat.",
    "testresultat.html": "Sök fram en person och registrera resultaten per maskin eller avdelning.",
    "bedomning.html": "Spara återkommande bedömningar för att se utveckling över tid.",
    "todo.html": "Uppgifter som inte blir klara följer med som påminnelser till nästa vecka.",
    "produktion.html": "Allt du skriver sparas automatiskt. Förra månadens dagar tas bort den 10:e.",
    "rast.html": "Kontrollera att alla valda linjer täcks innan rastplanen används.",
    "installningar.html": "Inställningarna gäller alla skift och sparas när du trycker Spara.",
    "profil.html": "Ändra din status här om du är sjuk eller borta, så ser skiftledaren det direkt."
  };
  const header = main?.querySelector(".header");
  if (!appSettings.showTips) main?.querySelector(".page-tip")?.remove();
  if (appSettings.showTips && header && pageTips[currentPage] && !main.querySelector(".page-tip")) {
    header.insertAdjacentHTML("afterend", `<aside class="page-tip"><span>Tips</span><p>${escapeHtml(pageTips[currentPage])}</p><button type="button" aria-label="Dölj tips">×</button></aside>`);
    main.querySelector(".page-tip button").addEventListener("click", event => event.currentTarget.parentElement.remove());
  }
  if (appShell) {
    let footer = appShell.querySelector(":scope > footer");
    if (!footer) {
      footer = document.createElement("footer");
      appShell.appendChild(footer);
    }
    footer.className = "app-footer";
    footer.removeAttribute("style");
    footer.textContent = `© ${new Date().getFullYear()} Mizzar — Staff Planner`;
  }
}

// The menu, account box and shift notice for the signed-in user's role. Runs before
// the app shell is shown, so the full menu in the page's HTML is never visible to a
// role that should not see it, and admins never see the sidebar before the top bar.
// Needs only what GET /me returns.
function setupRoleNavigation() {
  const currentPage = getCurrentPage();
  const nav = document.querySelector(".nav");
  if (nav && !nav.querySelector('[href="installningar.html"]')) {
    nav.insertAdjacentHTML("beforeend", '<a class="nav-link" href="profil.html">Min profil</a><a class="nav-link" href="installningar.html">Inställningar</a><a class="nav-link" href="hjalp.html">Hjälp</a>');
  }
  if (nav && !nav.querySelector('[href="anvandare.html"]')) {
    nav.querySelector('[href="installningar.html"]')?.insertAdjacentHTML("beforebegin", '<a class="nav-link" href="anvandare.html">Användare</a>');
  }
  nav?.querySelectorAll(".nav-link").forEach(link => {
    if (!canOpenPage(link.getAttribute("href"))) link.remove();
  });
  renderSidebarAccount();
  setupAdminTopbar();
  renderShiftNotice();
  document.querySelectorAll(".nav-link").forEach(link => {
    const isCurrent = link.getAttribute("href") === currentPage;
    link.classList.toggle("active", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  setupMobileNavigation();
}

function renderSidebarAccount() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar || !currentUser) return;
  let box = document.getElementById("sidebarAccount");
  if (!box) {
    box = document.createElement("div");
    box.id = "sidebarAccount";
    box.className = "sidebar-account";
    const logout = document.getElementById("logoutBtn");
    if (logout) logout.before(box);
    else sidebar.appendChild(box);
  }
  const scope = getShiftScope();
  const shiftControl = canBrowseShifts() && shifts.length
    ? `<label class="sidebar-shift"><span>Visar skift</span><select id="shiftSwitcher">${shifts.map(shift => `<option value="${escapeHtml(shift.id)}"${shift.id === scope ? " selected" : ""}>${escapeHtml(shiftOptionLabel(shift))}${shift.id === getOwnShiftId() ? " (ditt)" : ""}</option>`).join("")}</select></label>`
    : `<div class="sidebar-shift"><span>Skift</span><strong>${shiftColorDot(scope)}${escapeHtml(getShiftName(scope) || "Inget skift")}</strong></div>`;
  box.innerHTML = `<a class="sidebar-user" href="profil.html"><strong>${escapeHtml(currentPerson?.name || currentUser.username)}</strong><small>${escapeHtml(ROLE_LABELS[currentUser.role] || "")}</small></a>${shiftControl}`;
  box.querySelector("#shiftSwitcher")?.addEventListener("change", event => {
    sessionStorage.setItem(ACTIVE_SHIFT_KEY, event.target.value);
    location.reload();
  });
}

// Tells the user which shift a schedule page shows and whether they can change it.
function renderShiftNotice() {
  const header = document.querySelector(".main .header");
  const showsShift = document.getElementById("scheduleGrid") || document.getElementById("breakPlanner");
  document.getElementById("shiftNotice")?.remove();
  if (!header || !showsShift || !currentUser) return;
  const scope = getShiftScope();
  const notice = document.createElement("p");
  notice.id = "shiftNotice";
  notice.className = "shift-notice";
  if (!scope) {
    notice.classList.add("is-warning");
    notice.textContent = isAdmin()
      ? "Det finns inga skift ännu. Skapa skift under Inställningar."
      : "Du tillhör inget skift ännu. Be en admin att lägga till dig i ett skift.";
  } else if (canEditShift(scope)) {
    if (getShiftColor(scope)) notice.classList.add(`shift-color-${getShiftColor(scope)}`);
    notice.innerHTML = `${shiftColorDot(scope)}<strong>${escapeHtml(getShiftName(scope))}</strong>`;
  } else {
    notice.classList.add("is-readonly");
    notice.innerHTML = `${shiftColorDot(scope)}<strong>${escapeHtml(getShiftName(scope))}</strong> · Endast läsning${isShiftLeader() ? " – du kan bara ändra ditt eget skift" : ""}`;
  }
  header.querySelector("h2")?.after(notice);
}

// "Min profil": everyone edits their own phone, status and password. Operators see their
// name and e-mail read-only; an admin, shift leader or right hand changes those.
async function renderProfilePage() {
  const root = document.getElementById("profilePage");
  if (!root || !currentUser || !currentPerson) return;
  const person = currentPerson;
  const availability = getPersonAvailability(person);
  // Operators only see their name and e-mail; there is no field to type in.
  const lockedDetails = isOperator();
  const readOnlyDetail = (label, value, hint) => `<div class="profile-readonly"><span>${label}</span><strong>${value ? escapeHtml(value) : "Ej angiven"}</strong><small>${hint}</small></div>`;
  root.innerHTML = `
    <form id="profileForm" class="card settings-card profile-card">
      <div><h3>Mina uppgifter</h3><p>Användarnamn <strong>${escapeHtml(currentUser.username)}</strong> · ${escapeHtml(ROLE_LABELS[currentUser.role] || "")} · Skift: ${shiftColorDot(person.shiftId)}${escapeHtml(getShiftName(person.shiftId) || "inget skift")}</p></div>
      ${lockedDetails
        ? readOnlyDetail("Namn", person.name, "Be din skiftledare om du vill ändra namnet.")
        : `<label>Namn<input name="name" value="${escapeHtml(person.name)}" maxlength="120" required autocomplete="name" /></label>`}
      <label>Telefon<input name="phone" type="tel" value="${escapeHtml(person.phone || "")}" maxlength="40" autocomplete="tel" /></label>
      ${lockedDetails
        ? readOnlyDetail("E-post", person.email, "Du får ett mejl när veckans schema finns. Be din skiftledare om du vill ändra adressen.")
        : `<label>E-post<input name="email" type="email" value="${escapeHtml(person.email || "")}" maxlength="200" autocomplete="email" /><small>Du får ett mejl när veckans schema finns.</small></label>`}
      <label>Status<select name="availability" class="person-availability person-availability-${availability}">${availabilityOptionsFor(availability).map(([value, label]) => `<option value="${value}"${value === availability ? " selected" : ""}>${label}</option>`).join("")}</select><small>Är du sjuk eller borta? Ändra här så ser skiftledaren det direkt.</small></label>
      <div class="settings-actions"><span id="profileMessage" class="inline-message" aria-live="polite"></span><button class="btn primary" type="submit">Spara</button></div>
    </form>
    <form id="profilePasswordForm" class="card settings-card">
      <div><h3>Byt lösenord</h3><p>Du loggas ut från dina andra enheter när lösenordet byts.</p></div>
      <label>Nuvarande lösenord<input name="currentPassword" type="password" autocomplete="current-password" required /></label>
      <label>Nytt lösenord<input name="newPassword" type="password" minlength="${MIN_PASSWORD_LENGTH}" autocomplete="new-password" required /><small>Minst ${MIN_PASSWORD_LENGTH} tecken.</small></label>
      <label>Bekräfta nytt lösenord<input name="confirm" type="password" minlength="${MIN_PASSWORD_LENGTH}" autocomplete="new-password" required /></label>
      <div class="settings-actions"><span id="passwordChangeMessage" class="inline-message" aria-live="polite"></span><button class="btn primary" type="submit">Spara nytt lösenord</button></div>
    </form>
    <section class="card settings-card">
      <div><h3>Ljudnotiser</h3><p>Ett kort ljud spelas när någon annan ${canManageStaff() ? "skickar ett meddelande i chatten eller " : ""}ändrar schemat eller rastplanen för ditt skift, utan att du behöver ladda om sidan. Valet gäller den här enheten och sparas direkt. Webbläsaren spelar bara ljud efter att du har klickat någonstans på sidan.</p></div>
      <label class="settings-switch"><input id="soundNotificationsSetting" type="checkbox"${soundNotificationsEnabled() ? " checked" : ""} /><span>Spela ljud vid ${canManageStaff() ? "nya meddelanden och " : ""}schemaändringar</span></label>
      <div class="settings-actions"><button id="testSoundBtn" class="btn" type="button">Testa ljudet</button></div>
    </section>`;
  root.querySelector("#soundNotificationsSetting").addEventListener("change", event => {
    setSoundNotificationsEnabled(event.target.checked);
    if (event.target.checked) playTones("schedule");
  });
  root.querySelector("#testSoundBtn").addEventListener("click", () => {
    playTones("schedule");
    if (canManageStaff()) setTimeout(() => playTones("message"), 700);
  });

  const profileForm = root.querySelector("#profileForm");
  const profileMessage = root.querySelector("#profileMessage");
  profileForm.elements.availability.addEventListener("change", event => {
    event.target.className = `person-availability person-availability-${event.target.value}`;
  });
  bindOnce(profileForm, "submit", async event => {
    event.preventDefault();
    const changes = {
      phone: profileForm.elements.phone.value.trim(),
      availability: profileForm.elements.availability.value
    };
    if (!lockedDetails) {
      changes.name = profileForm.elements.name.value.trim();
      changes.email = profileForm.elements.email.value.trim();
    }
    try {
      const me = await apiRequest("PATCH", "/me", changes);
      currentPerson = me.person;
      peopleCache = null;
      profileMessage.textContent = "Dina uppgifter har sparats.";
      profileMessage.className = "inline-message success";
      renderSidebarAccount();
    } catch (error) {
      profileMessage.textContent = error instanceof ApiError ? error.message : "Det gick inte att spara.";
      profileMessage.className = "inline-message error";
    }
  });

  const passwordForm = root.querySelector("#profilePasswordForm");
  const passwordMessage = root.querySelector("#passwordChangeMessage");
  bindOnce(passwordForm, "submit", async event => {
    event.preventDefault();
    try {
      checkNewPassword(passwordForm.elements.newPassword.value, passwordForm.elements.confirm.value);
      await apiRequest("POST", "/me/password", {
        currentPassword: passwordForm.elements.currentPassword.value,
        newPassword: passwordForm.elements.newPassword.value
      });
      passwordForm.reset();
      passwordMessage.textContent = "Lösenordet har bytts.";
      passwordMessage.className = "inline-message success";
    } catch (error) {
      passwordMessage.textContent = error instanceof ApiError ? error.message : "Det gick inte att byta lösenord.";
      passwordMessage.className = "inline-message error";
    }
  });
}

async function renderSettings() {
  const root = document.getElementById("settingsPage");
  if (!root) return;
  const snapshots = isAdmin() ? await getGlobalDocument("safetySnapshots", []) || [] : [];
  const hasLegacyData = isAdmin() && Boolean(readLegacyLocalData());
  root.innerHTML = `
    <form id="generalSettingsForm" class="card settings-card">
      <div><h3>Allmänt</h3><p>Grundinställningar som gäller alla skift.</p></div>
      <label>Arbetsplatsens namn<input id="organizationNameSetting" value="${escapeHtml(appSettings.organizationName || "")}" placeholder="Företag eller avdelning" /></label>
      <fieldset><legend>Arbetsdagar</legend><div class="settings-day-grid">${ALL_DAYS.map(day => `<label><input type="checkbox" name="workDay" value="${day}"${DAYS.includes(day) ? " checked" : ""} /> ${day}</label>`).join("")}</div></fieldset>
      <label>Automatisk utloggning för admin, skiftledare och höger hand<select id="autoLockSetting"><option value="5">Efter 5 minuter</option><option value="15">Efter 15 minuter</option><option value="30">Efter 30 minuter</option><option value="60">Efter 1 timme</option><option value="0">Aldrig</option></select></label>
      <label>E-post för feedback<input id="feedbackEmailSetting" type="email" value="${escapeHtml(appSettings.feedbackEmail || "")}" placeholder="namn@foretag.se" /></label>
      <label>Maskiner i produktion<input id="productionMachinesSetting" value="${escapeHtml(appSettings.productionMachines.join(", "))}" /><small>Separera med kommatecken.</small></label>
      <label>Uppgifter för extra person<textarea id="extraAssignmentsSetting" rows="3">${escapeHtml(appSettings.extraAssignments.join("\n"))}</textarea><small>En uppgift per rad.</small></label>
      <label>Rastlinjer<textarea id="breakLinesSetting" rows="5">${escapeHtml(appSettings.breakLines.map(line => `${line.id} | ${line.label} | ${line.workplaces.join(", ")}`).join("\n"))}</textarea><small>Format: ID | Visningsnamn | arbetsplatser separerade med kommatecken.</small></label>
      <label class="settings-switch"><input id="showTipsSetting" type="checkbox"${appSettings.showTips ? " checked" : ""} /><span>Visa tips och hjälptexter</span></label>
      <div class="settings-actions"><span id="settingsMessage" class="inline-message" aria-live="polite"></span><button class="btn primary" type="submit">Spara inställningar</button></div>
    </form>
    <section class="card settings-card"><div><h3>Utseende</h3><p>${window.staffTheme?.supported ? "Välj ljust eller mörkt läge. Valet gäller den här enheten och sparas direkt." : "Mörkt läge stöds inte i den här webbläsaren. Uppdatera webbläsaren för att använda det."}</p></div>${window.staffTheme?.supported ? `<fieldset><legend>Tema</legend><div class="settings-theme-grid">${[["light", "Ljust"], ["dark", "Mörkt"], ["system", "Följ enhetens inställning"]].map(([value, label]) => `<label><input type="radio" name="themePreference" value="${value}"${window.staffTheme.getPreference() === value ? " checked" : ""} /> ${label}</label>`).join("")}</div></fieldset>` : ""}</section>
    <section class="card settings-card"><div><h3>Maskiner, avdelningar och uppgifter</h3><p>Lägg till, redigera, pausa och ordna arbetsplatser från en samlad vy. De gäller alla skift.</p></div><div class="settings-actions">${isAdmin() ? '<button id="removeDemoDataBtn" class="btn danger" type="button">Ta bort testdata</button>' : ""}<a class="btn primary settings-link" href="add.html#workItemForm">Öppna hanteraren</a></div></section>
    ${isAdmin() ? `
    <section class="card settings-card" id="shiftSettings"><div><h3>Skift</h3><p>Varje skift har ett eget veckoschema. Personal och skiftledare kopplas till ett skift under Personal.</p></div>
      <div class="shift-settings-list">${shifts.map(shift => `<article>${shiftColorDot(shift.id) || '<span class="shift-dot" aria-hidden="true"></span>'}<input value="${escapeHtml(shift.name)}" aria-label="Namn på skiftet ${escapeHtml(shift.name)}" data-shift-name="${escapeHtml(shift.id)}" maxlength="60" /><select aria-label="Färg på skiftet ${escapeHtml(shift.name)}" data-shift-color="${escapeHtml(shift.id)}">${shiftColorOptions(shift)}</select><button class="btn" type="button" data-rename-shift="${escapeHtml(shift.id)}">Spara</button><button class="btn danger" type="button" data-delete-shift="${escapeHtml(shift.id)}">Ta bort</button></article>`).join("") || '<div class="empty-state">Inga skift ännu. Lägg till det första nedan.</div>'}</div>
      <form id="addShiftForm" class="shift-settings-add"><input name="name" placeholder="Nytt skift, t.ex. Grön" maxlength="60" required aria-label="Namn på nytt skift" /><button class="btn primary" type="submit">+ Lägg till skift</button>${newShiftColorChoices()}</form>
    </section>
    <section class="card settings-card"><div><h3>Säkerhet och historik</h3><p>${snapshots.length} säkerhetspunkter för arbetsplatser finns sparade. Exportera en backup av all data på servern innan större förändringar. Lösenord ingår aldrig i backupen.</p></div>
      <div class="settings-actions"><button id="exportDataBtn" class="btn" type="button">Exportera backup</button><button id="importDataBtn" class="btn" type="button">Importera backup</button><input id="importDataInput" type="file" accept="application/json,.json" hidden></div>
      <h4>Säkerhetspunkter för arbetsplatser</h4><div id="snapshotList" class="snapshot-list">${snapshots.map(item => `<article><div><strong>${escapeHtml(item.reason)}</strong><small>${new Date(item.createdAt).toLocaleString("sv-SE")}</small></div><button class="btn" type="button" data-restore-snapshot="${escapeHtml(item.id)}">Återställ</button></article>`).join("") || '<div class="empty-state">Inga säkerhetspunkter ännu.</div>'}</div>
    </section>
    <section class="card settings-card"><div><h3>Flytta data från den gamla versionen</h3><p>Den gamla versionen sparade allt krypterat i en webbläsare. ${hasLegacyData ? "Det finns gammal data på den här enheten." : "Ingen gammal data hittades på den här enheten."} Du kan också läsa in en backupfil som exporterats från den gamla versionen via Importera backup ovan.</p></div>
      ${hasLegacyData ? '<div class="settings-actions"><button id="importLegacyLocalBtn" class="btn primary" type="button">Flytta in data från den här enheten</button></div>' : ""}
    </section>` : ""}`;
  root.querySelector("#autoLockSetting").value = String(appSettings.autoLockMinutes);
  root.querySelectorAll('[name="themePreference"]').forEach(input => input.addEventListener("change", () => {
    if (input.checked) window.staffTheme.setPreference(input.value);
  }));
  bindOnce(root.querySelector("#generalSettingsForm"), "submit", async event => {
    event.preventDefault();
    const workDays = [...root.querySelectorAll('[name="workDay"]:checked')].map(input => input.value);
    if (!workDays.length) { root.querySelector("#settingsMessage").textContent = "Välj minst en arbetsdag."; root.querySelector("#settingsMessage").className = "inline-message error"; return; }
    const productionMachines = root.querySelector("#productionMachinesSetting").value.split(",").map(value => value.trim()).filter(Boolean);
    const extraAssignments = root.querySelector("#extraAssignmentsSetting").value.split("\n").map(value => value.trim()).filter(Boolean);
    const breakLines = root.querySelector("#breakLinesSetting").value.split("\n").map(value => { const [id, label, workplaces = ""] = value.split("|").map(part => part.trim()); return { id, label: label || id, workplaces: workplaces.split(",").map(part => part.trim()).filter(Boolean) }; }).filter(line => line.id && line.workplaces.length);
    if (!productionMachines.length || !breakLines.length) { root.querySelector("#settingsMessage").textContent = "Produktion och rastlinjer får inte vara tomma."; root.querySelector("#settingsMessage").className = "inline-message error"; return; }
    await saveAppSettings({ ...appSettings, workDays, productionMachines, extraAssignments, breakLines, organizationName: root.querySelector("#organizationNameSetting").value.trim(), autoLockMinutes: Number(root.querySelector("#autoLockSetting").value), feedbackEmail: root.querySelector("#feedbackEmailSetting").value.trim(), showTips: root.querySelector("#showTipsSetting").checked });
    root.querySelector("#settingsMessage").textContent = "Inställningarna har sparats.";
    root.querySelector("#settingsMessage").className = "inline-message success";
    await addAuditEvent("settings", "Inställningar uppdaterade", appSettings.organizationName);
    setupAutoLock();
    enhanceAppShell();
  });
  bindOnce(root.querySelector("#removeDemoDataBtn"), "click", async () => {
    const demoPeople = (await getAllPeople()).filter(person => person.demo);
    if (!demoPeople.length) return showAppToast("Det finns ingen testdata att ta bort.", "error");
    if (!confirm(`Ta bort ${demoPeople.length} testpersoner?`)) return;
    for (const person of demoPeople) await deletePersonRecord(person.id);
    showAppToast(`${demoPeople.length} testpersoner togs bort.`);
  });
  if (!isAdmin()) return;

  const addShiftForm = root.querySelector("#addShiftForm");
  // A name like "Grön" picks that color, if it is free.
  bindOnce(addShiftForm.elements.name, "input", event => {
    const named = SHIFT_COLORS.find(([, label]) => label.toLowerCase() === event.target.value.trim().toLowerCase())?.[0];
    const radio = named && addShiftForm.querySelector(`input[name="color"][value="${named}"]`);
    if (radio) radio.checked = true;
  });
  bindOnce(addShiftForm, "submit", async event => {
    event.preventDefault();
    const name = event.currentTarget.elements.name.value.trim();
    if (!name) return;
    const color = event.currentTarget.querySelector('input[name="color"]:checked')?.value || "";
    const { shift } = await apiRequest("POST", "/shifts", { name, color });
    shifts = [...shifts, shift];
    if (!getShiftScope()) sessionStorage.setItem(ACTIVE_SHIFT_KEY, shift.id);
    showAppToast(`Skiftet ${shift.name} har lagts till.`);
    await renderSettings();
    renderSidebarAccount();
  });
  root.querySelectorAll("[data-rename-shift]").forEach(button => bindOnce(button, "click", async () => {
    const id = button.dataset.renameShift;
    const name = root.querySelector(`[data-shift-name="${CSS.escape(id)}"]`).value.trim();
    const color = root.querySelector(`[data-shift-color="${CSS.escape(id)}"]`).value;
    if (!name) return showAppToast("Skiftet måste ha ett namn.", "error");
    const { shift } = await apiRequest("PATCH", `/shifts/${encodeURIComponent(id)}`, { name, color });
    shifts = shifts.map(item => item.id === shift.id ? shift : item);
    showAppToast("Skiftet har sparats.");
    await renderSettings();
    renderSidebarAccount();
  }));
  root.querySelectorAll("[data-delete-shift]").forEach(button => bindOnce(button, "click", async () => {
    const shift = shifts.find(item => item.id === button.dataset.deleteShift);
    if (!shift || !confirm(`Ta bort skiftet ${shift.name}? Skiftets scheman, rastplaner och att göra-listor raderas. Personalen finns kvar men saknar skift tills du väljer ett nytt.`)) return;
    await apiRequest("DELETE", `/shifts/${encodeURIComponent(shift.id)}`);
    shifts = shifts.filter(item => item.id !== shift.id);
    if (sessionStorage.getItem(ACTIVE_SHIFT_KEY) === shift.id) sessionStorage.removeItem(ACTIVE_SHIFT_KEY);
    peopleCache = null;
    showAppToast(`Skiftet ${shift.name} har tagits bort.`);
    await renderSettings();
    renderSidebarAccount();
  }));
  setupDataTools();
  bindOnce(root.querySelector("#importLegacyLocalBtn"), "click", async () => {
    const data = readLegacyLocalData();
    if (!data) return showAppToast("Ingen gammal data hittades på den här enheten.", "error");
    await openLegacyImportDialog(data, "local");
  });
  root.querySelectorAll("[data-restore-snapshot]").forEach(button => button.addEventListener("click", async () => {
    const snapshot = snapshots.find(item => item.id === button.dataset.restoreSnapshot);
    if (!snapshot || !confirm(`Återställ säkerhetspunkten "${snapshot.reason}"?`)) return;
    await createWorkItemSafetySnapshot("Före återställning");
    await Promise.all([saveCustomWorkItems(snapshot.data.workItems || []), saveWorkItemTrash(snapshot.data.trash || []), saveDepartments(snapshot.data.departments || []), saveTestResults(snapshot.data.results || {}), saveMachineSkills(snapshot.data.skills || {}), saveMachineSkillDetails(snapshot.data.details || {})]);
    await addAuditEvent("backup", "Säkerhetspunkt återställd", snapshot.reason);
    location.reload();
  }));
}

function renderHelpPage() {
  const root = document.getElementById("helpPage");
  if (!root) return;
  const steps = isOperator()
    ? [
      ["Se ditt schema", "Under Schema ser du ditt skifts veckoschema. Dina egna placeringar är markerade."],
      ["Rast", "Under Rast ser du dagens rastgrupper och tider."],
      ["Ledig eller borta?", "Öppna Min profil och ändra din status till Ledig. Skiftledaren ser ändringen direkt."],
      ["Att göra", "Under Att göra har du en egen lista som bara du ser. Vill du visa en uppgift för någon väljer du Dela och bockar i vem."],
      ["Lösenord", "Byt lösenord under Min profil. Har du glömt det, be din skiftledare om ett tillfälligt."]
    ]
    : [
      ["Lägg till personal", "Öppna Lägg till, registrera namn, företag och skift. Skapa en inloggning om personen ska kunna se schemat själv."],
      ["Bygg arbetsplatser", "Lägg till maskiner, avdelningar, utbildningar och extraplatser. De gäller alla skift och kan pausas och ordnas."],
      ["Skapa schema", "Välj personer i listorna. Du kan också kopiera en dag eller använda en sparad veckomall."],
      ["Kontrollera varningar", "Röda rutor saknar bemanning. Inaktiva eller obehöriga personer visar orsaken direkt."],
      ["Roller", "Rollerna har nivåer: Admin, Skiftledare, Höger hand och Operatör. Admin kan allt. Skiftledare sköter sitt eget skift, testar och bedömer operatörerna och kan göra en operatör till Höger hand eller ta bort rollen igen. Höger hand hjälper skiftledaren i det egna skiftet men ändrar inte det dagliga målet. Ingen kan ändra uppgifter eller roll för någon på samma eller högre nivå. Allas att göra-listor är privata."],
      ["Installera", "I webbläsarens meny kan appen installeras på datorn eller mobilen."]
    ];
  root.innerHTML = `<section class="card help-intro"><div><h3>Kom igång</h3><p>All data sparas på servern, så alla ser samma schema från sina egna enheter.</p></div><a class="btn primary" href="${canChangeSharedSettings() ? "installningar.html" : "profil.html"}">${canChangeSharedSettings() ? "Öppna inställningar" : "Öppna min profil"}</a></section><div class="help-grid">${steps.map(([title, text], index) => `<article class="card"><span>${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("")}</div><section class="card help-feedback"><div><h3>Förslag eller problem?</h3><p>Skicka feedback till den adress som angetts i Inställningar.</p></div>${appSettings.feedbackEmail ? `<a class="btn" href="mailto:${escapeHtml(appSettings.feedbackEmail)}?subject=Staff%20Planner%20feedback">Skicka feedback</a>` : isOperator() ? "" : '<a class="btn" href="installningar.html">Ange feedbackadress</a>'}</section>`;
}

// First sign-in of the first admin: name the workplace, create shifts and add staff.
async function setupOnboarding() {
  if (!isAdmin() || appSettings.onboardingComplete || !document.getElementById("appShell") || document.getElementById("onboardingModal")) return;
  const overlay = document.createElement("div");
  overlay.id = "onboardingModal";
  overlay.className = "modal-overlay onboarding-overlay";
  overlay.innerHTML = `<section class="onboarding-modal"><span class="onboarding-kicker">Välkommen</span><h2>Gör Staff Planner redo</h2><p>Några små val räcker. Allt kan ändras senare i Inställningar.</p><form id="onboardingForm"><label>Arbetsplatsens namn<input id="onboardingOrganization" placeholder="Företag eller avdelning" /></label><fieldset><legend>Arbetsdagar</legend><div class="settings-day-grid">${ALL_DAYS.map(day => `<label><input type="checkbox" name="onboardingDay" value="${day}" checked /> ${day}</label>`).join("")}</div></fieldset>${shifts.length ? "" : '<label>Skift, separerade med kommatecken<input id="onboardingShifts" value="Dag, Kväll" /></label>'}<label>Personal i ${shifts.length ? escapeHtml(shifts[0].name) : "första skiftet"}, en person per rad<textarea id="onboardingPeople" rows="5" placeholder="Anna Andersson&#10;Erik Svensson"></textarea></label><label class="settings-switch"><input id="onboardingDemo" type="checkbox" /><span>Lägg till tre tydligt märkta testpersoner</span></label><div class="onboarding-actions"><button id="skipOnboarding" class="btn" type="button">Hoppa över</button><button class="btn primary" type="submit">Spara och börja</button></div></form></section>`;
  document.body.appendChild(overlay);
  const cleanupFocus = manageDialogFocus(overlay.querySelector(".onboarding-modal"));
  const complete = async extra => { await saveAppSettings({ ...appSettings, onboardingComplete: true, ...extra }); overlay.remove(); cleanupFocus(); showAppToast("Grundinställningen är klar."); };
  bindOnce(overlay.querySelector("#skipOnboarding"), "click", () => complete({}));
  bindOnce(overlay.querySelector("#onboardingForm"), "submit", async event => {
    event.preventDefault();
    const workDays = [...overlay.querySelectorAll('[name="onboardingDay"]:checked')].map(input => input.value);
    if (!workDays.length) return showAppToast("Välj minst en arbetsdag.", "error");
    const shiftNames = (overlay.querySelector("#onboardingShifts")?.value || "").split(",").map(value => value.trim()).filter(Boolean);
    for (const name of shiftNames) {
      const { shift } = await apiRequest("POST", "/shifts", { name });
      shifts = [...shifts, shift];
    }
    const firstShiftId = shifts[0]?.id || null;
    const names = overlay.querySelector("#onboardingPeople").value.split("\n").map(value => value.trim()).filter(Boolean);
    for (const name of names) await createPerson({ name, shiftId: firstShiftId });
    if (overlay.querySelector("#onboardingDemo").checked) {
      for (const name of ["Testperson Anna", "Testperson Erik", "Testperson Sara"]) {
        await createPerson({ name, company: "TESTDATA", demo: true, shiftId: firstShiftId });
      }
    }
    await complete({ workDays, organizationName: overlay.querySelector("#onboardingOrganization").value.trim() });
    location.reload();
  });
}

function formatBreakEnd(start, durationMinutes) {
  if (!start) return "Välj tid";

  const [hours, minutes] = start.split(":").map(Number);
  const total = hours * 60 + minutes + durationMinutes;
  return `${padNumber(Math.floor(total / 60) % 24)}:${padNumber(total % 60)}`;
}

function getScheduledPeopleForDay(schedule, people, day) {
  const scheduledIds = new Set();
  TASKS.forEach(task => {
    const personId = schedule?.[task]?.[day];
    if (personId) scheduledIds.add(personId);
  });
  return people.filter(person => scheduledIds.has(person.id));
}

function getScheduledWorkplaceByPerson(schedule, day) {
  const workplaces = {};
  getProductionWorkplaces().forEach(task => {
    const personId = schedule?.[task]?.[day];
    if (personId && !workplaces[personId]) workplaces[personId] = task;
  });
  return workplaces;
}

function canCoverBreakWorkplace(personId, workplace, skills, restrictions) {
  const department = getTaskDepartment(workplace);
  const personSkills = Array.isArray(skills[personId]) ? skills[personId] : [];
  const personRestrictions = Array.isArray(restrictions[personId])
    ? restrictions[personId]
    : [];
  return personSkills.includes(department) &&
    !(department === "GD" && personRestrictions.includes("GD"));
}

function getRequiredBreakWorkplaces(priorityLines) {
  return [...new Set(
    priorityLines.flatMap(line => BREAK_LINE_WORKPLACES[line] || [])
  )];
}

function compareBreakWorkplaces(firstWorkplace, secondWorkplace) {
  const firstIndex = BREAK_WORKPLACE_DISPLAY_ORDER.indexOf(firstWorkplace);
  const secondIndex = BREAK_WORKPLACE_DISPLAY_ORDER.indexOf(secondWorkplace);
  const normalizedFirstIndex = firstIndex === -1
    ? BREAK_WORKPLACE_DISPLAY_ORDER.length
    : firstIndex;
  const normalizedSecondIndex = secondIndex === -1
    ? BREAK_WORKPLACE_DISPLAY_ORDER.length
    : secondIndex;
  return normalizedFirstIndex - normalizedSecondIndex ||
    String(firstWorkplace || "").localeCompare(String(secondWorkplace || ""), "sv");
}

function createAutomaticBreakGroups(
  scheduledPeople,
  schedule,
  day,
  skills,
  restrictions,
  priorityLines
) {
  const groups = {};
  const workplaces = {};
  const scheduledWorkplaces = getScheduledWorkplaceByPerson(schedule, day);
  const unusedPeople = new Map(scheduledPeople.map((person, index) => [person.id, { person, index }]));
  const missing = [];
  const requiredWorkplaces = getRequiredBreakWorkplaces(priorityLines);
  requiredWorkplaces.forEach(workplace => {
    [1, 2].forEach(groupNumber => {
      const candidates = [...unusedPeople.values()]
        .filter(({ person }) => canCoverBreakWorkplace(person.id, workplace, skills, restrictions))
        .sort((first, second) => {
          const firstExact = scheduledWorkplaces[first.person.id] === workplace ? 0 : 1;
          const secondExact = scheduledWorkplaces[second.person.id] === workplace ? 0 : 1;
          const firstSkills = requiredWorkplaces.filter(requiredWorkplace =>
            canCoverBreakWorkplace(first.person.id, requiredWorkplace, skills, restrictions)
          ).length;
          const secondSkills = requiredWorkplaces.filter(requiredWorkplace =>
            canCoverBreakWorkplace(second.person.id, requiredWorkplace, skills, restrictions)
          ).length;
          return firstExact - secondExact || firstSkills - secondSkills || first.index - second.index;
        });
      const selected = candidates[0];
      if (!selected) {
        missing.push(`Grupp ${groupNumber}: ${workplace}`);
        return;
      }
      groups[selected.person.id] = groupNumber;
      workplaces[selected.person.id] = workplace;
      unusedPeople.delete(selected.person.id);
    });
  });

  const extraPeople = [];
  const extraCandidatePool = new Map();
  unusedPeople.forEach(value => extraCandidatePool.set(value.person.id, value));
  unusedPeople.clear();

  while (extraCandidatePool.size) {
    const group1Count = Object.values(groups).filter(group => group === 1).length;
    const group2Count = Object.values(groups).filter(group => group === 2).length;
    const groupNumber = group1Count <= group2Count ? 1 : 2;
    const groupAssignments = new Set(Object.entries(groups)
      .filter(([, group]) => group === groupNumber)
      .map(([personId]) => workplaces[personId])
      .filter(assignment => EXTRA_PERSON_ASSIGNMENTS.includes(assignment)));
    let assignment = BREAK_EXTRA_ASSIGNMENT_PRIORITY.find(value => EXTRA_PERSON_ASSIGNMENTS.includes(value) && !groupAssignments.has(value)) || "";
    let candidate = [...extraCandidatePool.values()].find(({ person }) => {
      if (assignment !== "GD-rummet") return true;
      const personRestrictions = Array.isArray(restrictions[person.id]) ? restrictions[person.id] : [];
      return !personRestrictions.includes("GD");
    });
    if (!candidate && assignment === "GD-rummet") {
      assignment = BREAK_EXTRA_ASSIGNMENT_PRIORITY.find(value => EXTRA_PERSON_ASSIGNMENTS.includes(value) && value !== "GD-rummet" && !groupAssignments.has(value)) || "";
      candidate = [...extraCandidatePool.values()][0];
    }
    if (!candidate) break;
    groups[candidate.person.id] = groupNumber;
    if (assignment) workplaces[candidate.person.id] = assignment;
    else extraPeople.push(candidate.person);
    extraCandidatePool.delete(candidate.person.id);
  }

  return { groups, workplaces, missing, extraPeople };
}

function makeTimeField(labelText, value, duration, onChange) {
  const field = document.createElement("label");
  const title = document.createElement("span");
  const input = document.createElement("select");
  const end = document.createElement("span");

  field.className = "break-time-field";
  title.textContent = `${labelText} · ${duration} min`;
  input.className = "break-time-select";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "--:--";
  input.appendChild(emptyOption);

  for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += 30) {
    const option = document.createElement("option");
    const time = `${padNumber(Math.floor(totalMinutes / 60))}:${padNumber(totalMinutes % 60)}`;
    option.value = time;
    option.textContent = time;
    input.appendChild(option);
  }

  input.value = value;
  end.className = "break-end-time";
  end.textContent = value ? `Slut ${formatBreakEnd(value, duration)}` : "Välj starttid";
  input.addEventListener("change", async () => {
    end.textContent = input.value
      ? `Slut ${formatBreakEnd(input.value, duration)}`
      : "Välj starttid";
    await onChange(input.value);
  });
  field.append(title, input, end);
  return field;
}

async function renderBreakPlanner() {
  const root = document.getElementById("breakPlanner");
  if (root && isOperator() && !(await getScheduleShare())) {
    root.innerHTML = `<div class="empty-state schedule-unshared-notice"><strong>Rastplanen för ${escapeHtml(formatWeekRange())} är inte delad än</strong><p>Den visas här när skiftledaren har delat schemat.</p></div>`;
    return;
  }
  await renderBreakPlannerContent();
  if (canEditActiveShift()) return;
  // Operators and other shifts' leaders can switch days but not change anything.
  root?.querySelector(".break-auto-groups-btn")?.remove();
  root?.querySelectorAll("select, input, textarea, button:not(.break-day-tab)").forEach(control => { control.disabled = true; });
  root?.classList.add("break-readonly");
}

async function renderBreakPlannerContent() {
  const root = document.getElementById("breakPlanner");
  if (!root) return;

  const people = await getPeople();
  const schedule = await getSchedule();
  const breakPlan = await getBreakPlan();
  const dayPlan = breakPlan[selectedBreakDay];
  const scheduledPeople = getScheduledPeopleForDay(schedule, people, selectedBreakDay);

  root.innerHTML = "";

  const dayTabs = document.createElement("div");
  dayTabs.className = "break-day-tabs";
  DAYS.forEach(day => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `break-day-tab${day === selectedBreakDay ? " active" : ""}`;
    button.textContent = day;
    button.addEventListener("click", () => {
      selectedBreakDay = day;
      renderBreakPlanner();
    });
    dayTabs.appendChild(button);
  });

  const controls = document.createElement("div");
  const modeLabel = document.createElement("label");
  const modeSelect = document.createElement("select");
  controls.className = "break-controls";
  modeLabel.className = "break-mode-field";
  modeLabel.innerHTML = "<span>Rastupplägg</span>";
  modeSelect.className = "schedule-select";
  modeSelect.innerHTML = `
    <option value="together">Gemensam rast · 60 minuter</option>
    <option value="together_split">Gemensamt · 2 × 30 minuter</option>
    <option value="split">Två grupper · 2 × 30 minuter</option>
    <option value="split_hour">Två grupper · 60 minuter</option>
  `;
  modeSelect.value = dayPlan.mode;
  modeSelect.addEventListener("change", async () => {
    const previousMode = dayPlan.mode;
    dayPlan.mode = modeSelect.value;
    const enteredGroupMode = ["split", "split_hour"].includes(dayPlan.mode) &&
      !["split", "split_hour"].includes(previousMode);
    if (enteredGroupMode) dayPlan.priorityLines = [];
    await saveBreakPlan(breakPlan);
    await renderBreakPlanner();
  });
  modeLabel.appendChild(modeSelect);
  controls.appendChild(modeLabel);

  root.append(dayTabs, controls);

  if (dayPlan.mode === "together" || dayPlan.mode === "together_split") {
    const panel = document.createElement("div");
    panel.className = "break-group-panel together";
    const isSplitTogether = dayPlan.mode === "together_split";
    panel.innerHTML = `<div class="break-group-title"><strong>Hela gruppen</strong><span>${isSplitTogether ? "2 × 30 min" : "60 min"}</span></div>`;

    if (isSplitTogether) {
      panel.appendChild(makeTimeField("Rast 1", dayPlan.togetherStart, 30, async value => {
        dayPlan.togetherStart = value;
        await saveBreakPlan(breakPlan);
      }));
      panel.appendChild(makeTimeField("Rast 2", dayPlan.togetherSecondStart, 30, async value => {
        dayPlan.togetherSecondStart = value;
        await saveBreakPlan(breakPlan);
      }));
    } else {
      panel.appendChild(makeTimeField("Starttid", dayPlan.togetherStart, 60, async value => {
        dayPlan.togetherStart = value;
        await saveBreakPlan(breakPlan);
      }));
    }

    root.appendChild(panel);
    return;
  }

  const priorityPanel = document.createElement("section");
  const priorityHeading = document.createElement("div");
  const priorityOptions = document.createElement("div");
  priorityPanel.className = "break-priority-panel";
  priorityHeading.className = "break-priority-heading";
  priorityHeading.innerHTML = `
    <strong>Vilka linjer har prioritet?</strong>
    <small>Välj en eller flera linjer. Kopplade stationer bemannas först i båda grupperna.</small>
    <small class="break-extra-priority-note">Därefter placeras extra personal i varje grupp: GD-rummet → Lock & dosor → ETIKETT-rummet.</small>
  `;
  priorityOptions.className = "break-priority-options";
  Object.entries(BREAK_LINE_LABELS).forEach(([line, label]) => {
    const option = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");
    option.className = "break-priority-option";
    checkbox.type = "checkbox";
    checkbox.value = line;
    checkbox.checked = dayPlan.priorityLines.includes(line);
    text.textContent = label;
    checkbox.addEventListener("change", async () => {
      dayPlan.priorityLines = checkbox.checked
        ? [...new Set([...dayPlan.priorityLines, line])]
        : dayPlan.priorityLines.filter(selectedLine => selectedLine !== line);
      dayPlan.distributionNotice = "";
      dayPlan.distributionNoticeType = "";
      await saveBreakPlan(breakPlan);
      await renderBreakPlanner();
    });
    option.append(checkbox, text);
    priorityOptions.appendChild(option);
  });
  priorityPanel.append(priorityHeading, priorityOptions);
  root.appendChild(priorityPanel);

  const assignment = document.createElement("section");
  const assignmentHeading = document.createElement("div");
  const assignmentList = document.createElement("div");
  assignment.className = "break-assignment";
  assignmentHeading.className = "break-assignment-heading";
  assignmentHeading.innerHTML = `
    <div>
      <h4>Fördela personal</h4>
      <p>Välj grupp för varje person som arbetar den här dagen.</p>
    </div>
    <div class="break-assignment-actions">
      <span>${scheduledPeople.length} personer</span>
      <button type="button" class="btn primary break-auto-groups-btn">Skapa två grupper</button>
    </div>
  `;
  assignmentList.className = "break-assignment-list";

  const autoGroupsButton = assignmentHeading.querySelector(".break-auto-groups-btn");
  autoGroupsButton.disabled = !scheduledPeople.length || !dayPlan.priorityLines.length;
  if (!dayPlan.priorityLines.length) autoGroupsButton.title = "Välj minst en linje först";
  autoGroupsButton.addEventListener("click", async () => {
    autoGroupsButton.disabled = true;
    autoGroupsButton.textContent = "Skapar grupper…";
    const [skills, restrictions] = await Promise.all([
      getMachineSkills(),
      getMachineRestrictions()
    ]);
    const result = createAutomaticBreakGroups(
      scheduledPeople,
      schedule,
      selectedBreakDay,
      skills,
      restrictions,
      dayPlan.priorityLines
    );
    const selectedLineNames = dayPlan.priorityLines
      .map(line => BREAK_LINE_LABELS[line])
      .join(", ");
    dayPlan.groups = result.groups;
    dayPlan.workplaces = result.workplaces;
    const needsAdjustment = result.missing.length || result.extraPeople.length;
    const extraSummary = result.extraPeople.length
      ? ` ${result.extraPeople.length} ${result.extraPeople.length === 1 ? "extra person saknar" : "extra personer saknar"} arbetsplats.`
      : "";
    dayPlan.distributionNoticeType = needsAdjustment ? "warning" : "success";
    dayPlan.distributionNotice = needsAdjustment
      ? `Fördelningen behöver justeras.${extraSummary} Se detaljer under respektive grupp.`
      : `Två kompletta grupper för ${selectedLineNames} och deras kopplade stationer har skapats.`;
    await saveBreakPlan(breakPlan);
    await renderBreakPlanner();
  });

  assignment.appendChild(assignmentHeading);
  if (dayPlan.distributionNotice) {
    const notice = document.createElement("p");
    const requiredWorkplaces = getRequiredBreakWorkplaces(dayPlan.priorityLines || []);
    const missingCount = [1, 2].reduce((total, groupNumber) => {
      const occupied = new Set(scheduledPeople
        .filter(person => dayPlan.groups[person.id] === groupNumber)
        .map(person => dayPlan.workplaces[person.id])
        .filter(Boolean));
      return total + requiredWorkplaces.filter(workplace => !occupied.has(workplace)).length;
    }, 0);
    const extraCount = scheduledPeople.filter(person =>
      dayPlan.groups[person.id] && !dayPlan.workplaces[person.id]
    ).length;
    const needsAdjustment = missingCount || extraCount;
    const extraSummary = extraCount
      ? ` ${extraCount} ${extraCount === 1 ? "extra person saknar" : "extra personer saknar"} arbetsplats.`
      : "";
    notice.className = `break-distribution-notice ${needsAdjustment ? "warning" : "success"}`;
    notice.textContent = needsAdjustment
      ? `Fördelningen behöver justeras.${extraSummary} Se detaljer under respektive grupp.`
      : "Fördelningen är komplett. Du kan fortfarande redigera grupperna manuellt.";
    assignment.appendChild(notice);
  }

  scheduledPeople.forEach(person => {
    const row = document.createElement("div");
    const personInfo = document.createElement("div");
    const name = document.createElement("strong");
    const selections = document.createElement("div");
    const workplaceSelect = document.createElement("select");
    const groupSelect = document.createElement("select");
    row.className = "break-assignment-row";
    personInfo.className = "break-person-info";
    name.textContent = person.name;
    personInfo.appendChild(name);
    selections.className = "break-person-selections";

    const selectedGroup = dayPlan.groups[person.id];
    const usedWorkplaces = new Set(
      scheduledPeople
        .filter(other => other.id !== person.id && dayPlan.groups[other.id] === selectedGroup)
        .map(other => dayPlan.workplaces[other.id])
        .filter(Boolean)
    );

    workplaceSelect.className = "break-workplace-select";
    workplaceSelect.innerHTML = selectedGroup
      ? "<option value=\"\">Välj maskin / avdelning</option>"
      : "<option value=\"\">Välj grupp först</option>";
    workplaceSelect.disabled = selectedGroup !== 1 && selectedGroup !== 2;
    const savedWorkplace = dayPlan.workplaces[person.id];
    [...new Set([...getProductionWorkplaces(), ...EXTRA_PERSON_ASSIGNMENTS, ...(savedWorkplace ? [savedWorkplace] : [])])].forEach(task => {
      if (usedWorkplaces.has(task) && dayPlan.workplaces[person.id] !== task) return;

      const option = document.createElement("option");
      option.value = task;
      option.textContent = task;
      workplaceSelect.appendChild(option);
    });
    workplaceSelect.value = dayPlan.workplaces[person.id] ?? "";
    workplaceSelect.addEventListener("change", async () => {
      if (workplaceSelect.value) {
        dayPlan.workplaces[person.id] = workplaceSelect.value;
      } else {
        delete dayPlan.workplaces[person.id];
      }
      await saveBreakPlan(breakPlan);
      await renderBreakPlanner();
    });

    groupSelect.className = "break-person-group-select";
    groupSelect.innerHTML = `
      <option value="">Välj grupp</option>
      <option value="1">Grupp 1</option>
      <option value="2">Grupp 2</option>
    `;
    groupSelect.value = dayPlan.groups[person.id] ?? "";
    groupSelect.addEventListener("change", async () => {
      if (groupSelect.value) {
        const newGroup = Number(groupSelect.value);
        const selectedWorkplace = dayPlan.workplaces[person.id];
        const workplaceIsUsed = scheduledPeople.some(other =>
          other.id !== person.id &&
          dayPlan.groups[other.id] === newGroup &&
          dayPlan.workplaces[other.id] === selectedWorkplace
        );

        dayPlan.groups[person.id] = newGroup;
        if (selectedWorkplace && workplaceIsUsed) {
          delete dayPlan.workplaces[person.id];
        }
      } else {
        delete dayPlan.groups[person.id];
        delete dayPlan.workplaces[person.id];
      }
      await saveBreakPlan(breakPlan);
      await renderBreakPlanner();
    });
    selections.append(groupSelect, workplaceSelect);
    row.append(personInfo, selections);
    assignmentList.appendChild(row);
  });

  if (!scheduledPeople.length) {
    assignmentList.innerHTML = "<p class=\"break-empty\">Ingen personal är schemalagd den här dagen.</p>";
  }

  assignment.appendChild(assignmentList);
  root.appendChild(assignment);

  const groupsGrid = document.createElement("div");
  groupsGrid.className = "break-groups-grid";
  [1, 2].forEach(groupNumber => {
    const panel = document.createElement("div");
    const title = document.createElement("div");
    const isHourlySplit = dayPlan.mode === "split_hour";
    panel.className = `break-group-panel group-${groupNumber}`;
    title.className = "break-group-title";
    title.innerHTML = `<strong>Grupp ${groupNumber}</strong><span>${isHourlySplit ? "60 min" : "2 × 30 min"}</span>`;
    panel.appendChild(title);

    const groupPeople = scheduledPeople
      .filter(person => dayPlan.groups[person.id] === groupNumber)
      .sort((first, second) => {
        const firstWorkplace = dayPlan.workplaces[first.id] || "";
        const secondWorkplace = dayPlan.workplaces[second.id] || "";
        if (!firstWorkplace && secondWorkplace) return 1;
        if (firstWorkplace && !secondWorkplace) return -1;
        return compareBreakWorkplaces(firstWorkplace, secondWorkplace) ||
          first.name.localeCompare(second.name, "sv");
      });
    const members = document.createElement("div");
    members.className = "break-group-summary";

    if (groupPeople.length) {
      groupPeople.forEach(person => {
        const member = document.createElement("div");
        const memberName = document.createElement("strong");
        const memberWorkplace = document.createElement("span");
        member.className = "break-group-person";
        memberName.textContent = person.name;
        memberWorkplace.textContent = dayPlan.workplaces[person.id] || "Extra · ingen arbetsplats";
        member.append(memberName, memberWorkplace);
        members.appendChild(member);
      });
    } else {
      members.innerHTML = "<p class=\"break-empty\">Ingen person vald</p>";
    }

    panel.appendChild(members);

    const requiredWorkplaces = getRequiredBreakWorkplaces(dayPlan.priorityLines || []);
    const occupiedWorkplaces = new Set(
      groupPeople.map(person => dayPlan.workplaces[person.id]).filter(Boolean)
    );
    const missingWorkplaces = requiredWorkplaces
      .filter(workplace => !occupiedWorkplaces.has(workplace))
      .sort(compareBreakWorkplaces);
    if (missingWorkplaces.length) {
      const shortage = document.createElement("div");
      const shortageTitle = document.createElement("strong");
      const shortageList = document.createElement("span");
      shortage.className = "break-group-shortage";
      shortageTitle.textContent = "Saknas i gruppen";
      shortageList.textContent = missingWorkplaces.join(", ");
      shortage.append(shortageTitle, shortageList);
      panel.appendChild(shortage);
    } else if (requiredWorkplaces.length) {
      const complete = document.createElement("div");
      complete.className = "break-group-complete";
      complete.textContent = "Alla valda maskiner och avdelningar är bemannade";
      panel.appendChild(complete);
    }

    panel.appendChild(makeTimeField(isHourlySplit ? "Starttid" : "Rast 1", dayPlan[`group${groupNumber}Break1`], isHourlySplit ? 60 : 30, async value => {
      dayPlan[`group${groupNumber}Break1`] = value;
      await saveBreakPlan(breakPlan);
      await renderBreakPlanner();
    }));
    if (!isHourlySplit) {
      panel.appendChild(makeTimeField("Rast 2", dayPlan[`group${groupNumber}Break2`], 30, async value => {
        dayPlan[`group${groupNumber}Break2`] = value;
        await saveBreakPlan(breakPlan);
        await renderBreakPlanner();
      }));
    }
    groupsGrid.appendChild(panel);
  });
  root.appendChild(groupsGrid);
}

function getAssessmentAverage(assessment) {
  const scores = Object.values(assessment.ratings || {})
    .map(item => Number(item.score))
    .filter(score => score >= 1 && score <= 5);
  if (!scores.length) return "—";
  return (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1);
}

function assessmentHasProblems(assessment) {
  if (!assessment) return false;
  const hasFailedRequirement = Object.values(assessment.basic || {})
    .some(item => item.answer === "Nej");
  const hasLowScore = Object.values(assessment.ratings || {})
    .some(item => {
      const score = Number(item.score);
      return score > 0 && score <= 2;
    });
  const hasNegativeDecision = assessment.classification?.startsWith("D") ||
    assessment.recommendation === "Rekommenderas ej";
  return hasFailedRequirement || hasLowScore || hasNegativeDecision;
}

function assessmentHasImproved(current, previous) {
  if (!current || !previous) return false;
  let improved = false;
  let declined = false;

  PERFORMANCE_ASSESSMENT_ITEMS.forEach((_, index) => {
    const currentScore = Number(current.ratings?.[index]?.score);
    const previousScore = Number(previous.ratings?.[index]?.score);
    if (!currentScore || !previousScore) return;
    if (currentScore > previousScore) improved = true;
    if (currentScore < previousScore && currentScore <= 2) declined = true;
  });
  BASIC_ASSESSMENT_ITEMS.forEach((_, index) => {
    const currentAnswer = current.basic?.[index]?.answer;
    const previousAnswer = previous.basic?.[index]?.answer;
    if (previousAnswer === "Nej" && currentAnswer === "Ja") improved = true;
    if (previousAnswer === "Ja" && currentAnswer === "Nej") declined = true;
  });

  const currentAverage = Number(getAssessmentAverage(current));
  const previousAverage = Number(getAssessmentAverage(previous));
  if (Number.isFinite(currentAverage) && Number.isFinite(previousAverage)) {
    if (currentAverage - previousAverage >= 0.15) improved = true;
    if (previousAverage - currentAverage >= 0.15) declined = true;
  }
  if (current.classification?.startsWith("D") || current.recommendation === "Rekommenderas ej") {
    declined = true;
  }
  return improved && !declined;
}

function getPersonAssessmentStatus(personAssessments) {
  if (!personAssessments.length) {
    return { className: "status-none", label: "Ingen bedömning" };
  }

  const chronological = [...personAssessments].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)) || String(a.createdAt).localeCompare(String(b.createdAt))
  );
  const latest = chronological[chronological.length - 1];
  const previous = chronological.length > 1 ? chronological[chronological.length - 2] : null;
  const latestHasProblems = assessmentHasProblems(latest);
  const previousHadProblems = assessmentHasProblems(previous);
  const hasImproved = assessmentHasImproved(latest, previous);

  if (previousHadProblems && hasImproved) {
    return { className: "status-ready", label: "Har förbättrats" };
  }
  if (latestHasProblems || (previousHadProblems && !hasImproved)) {
    return { className: "status-problem", label: "Behöver uppföljning" };
  }

  if (personAssessments.length === 1) {
    return { className: "status-one", label: "1 bedömning" };
  }
  return { className: "status-ready", label: `${personAssessments.length} bedömningar` };
}

function buildAssessmentSummary(assessment, previousAssessment = null) {
  const averageText = getAssessmentAverage(assessment);
  const average = Number(averageText);
  const strengths = [];
  const development = [];
  const unmetRequirements = [];

  PERFORMANCE_ASSESSMENT_ITEMS.forEach((item, index) => {
    const score = Number(assessment.ratings?.[index]?.score);
    if (score >= 4) strengths.push(item);
    if (score > 0 && score <= 2) development.push(item);
  });
  BASIC_ASSESSMENT_ITEMS.forEach((item, index) => {
    if (assessment.basic?.[index]?.answer === "Nej") unmetRequirements.push(item);
  });

  let level = "Det finns inte tillräckligt med poäng för en helhetsbild ännu.";
  if (Number.isFinite(average)) {
    if (average >= 4.3) level = `Mycket stark prestation med ett snitt på ${averageText} av 5.`;
    else if (average >= 3.5) level = `Stabil och bra prestation med ett snitt på ${averageText} av 5.`;
    else if (average >= 2.7) level = `Godkänd nivå med ett snitt på ${averageText} av 5, med tydliga utvecklingsmöjligheter.`;
    else level = `Prestationen behöver stöd och uppföljning; snittet är ${averageText} av 5.`;
  }

  const summary = {
    level,
    strengths,
    development,
    unmetRequirements,
    comparison: null
  };
  if (!previousAssessment) return summary;

  const improved = [];
  const unchangedNeeds = [];
  const declined = [];
  PERFORMANCE_ASSESSMENT_ITEMS.forEach((item, index) => {
    const current = Number(assessment.ratings?.[index]?.score);
    const previous = Number(previousAssessment.ratings?.[index]?.score);
    if (!current || !previous) return;
    if (current > previous) improved.push(`${item} (${previous}→${current})`);
    else if (current < previous) declined.push(`${item} (${previous}→${current})`);
    else if (current <= 3) unchangedNeeds.push(`${item} (${current}/5)`);
  });

  BASIC_ASSESSMENT_ITEMS.forEach((item, index) => {
    const current = assessment.basic?.[index]?.answer;
    const previous = previousAssessment.basic?.[index]?.answer;
    if (previous === "Nej" && current === "Ja") improved.push(`${item} (Nej→Ja)`);
    else if (previous === "Ja" && current === "Nej") declined.push(`${item} (Ja→Nej)`);
    else if (previous === "Nej" && current === "Nej") unchangedNeeds.push(`${item} (fortsatt Nej)`);
  });

  const previousAverage = Number(getAssessmentAverage(previousAssessment));
  let trend = "Snittutvecklingen kan inte jämföras ännu.";
  if (Number.isFinite(average) && Number.isFinite(previousAverage)) {
    const difference = average - previousAverage;
    if (difference >= 0.15) trend = `Snittet har förbättrats från ${previousAverage.toFixed(1)} till ${average.toFixed(1)}.`;
    else if (difference <= -0.15) trend = `Snittet har minskat från ${previousAverage.toFixed(1)} till ${average.toFixed(1)}.`;
    else trend = `Snittet är i stort sett oförändrat (${previousAverage.toFixed(1)}→${average.toFixed(1)}).`;
  }
  summary.comparison = { trend, improved, unchangedNeeds, declined };
  return summary;
}

function renderSummaryList(title, items, emptyText, className) {
  return `
    <div class="assessment-summary-column ${className}">
      <strong>${title}</strong>
      ${items.length
        ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        : `<p>${emptyText}</p>`}
    </div>
  `;
}

function renderAssessmentRecord(assessment, previousAssessment = null, assessmentNumber = 1, onEdit = null) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const content = document.createElement("div");
  const basicRows = BASIC_ASSESSMENT_ITEMS.map((item, index) => {
    const result = assessment.basic?.[index] || {};
    return `<li><span>${escapeHtml(item)}</span><strong>${escapeHtml(result.answer || "Ej bedömt")}</strong>${result.comment ? `<small>${escapeHtml(result.comment)}</small>` : ""}</li>`;
  }).join("");
  const ratingRows = PERFORMANCE_ASSESSMENT_ITEMS.map((item, index) => {
    const result = assessment.ratings?.[index] || {};
    return `<li><span>${escapeHtml(item)}</span><strong>${escapeHtml(result.score || "—")}/5</strong>${result.comment ? `<small>${escapeHtml(result.comment)}</small>` : ""}</li>`;
  }).join("");
  const automaticSummary = buildAssessmentSummary(assessment, previousAssessment);
  const comparisonHtml = automaticSummary.comparison
    ? `
      <div class="assessment-progress-summary">
        <h5>Utveckling sedan föregående bedömning</h5>
        <p class="assessment-trend">${escapeHtml(automaticSummary.comparison.trend)}</p>
        <div class="assessment-summary-grid">
          ${renderSummaryList("Förbättrats", automaticSummary.comparison.improved, "Inga tydliga förbättringar registrerade ännu.", "positive")}
          ${renderSummaryList("Inte förbättrats", automaticSummary.comparison.unchangedNeeds, "Inga kvarstående svagheter i jämförbara punkter.", "neutral")}
          ${renderSummaryList("Försämrats", automaticSummary.comparison.declined, "Ingen försämring registrerad.", "negative")}
        </div>
      </div>
    `
    : "";

  details.className = "assessment-record";
  summary.innerHTML = `
    <div><strong>${escapeHtml(assessment.date || "Utan datum")}</strong><span>${escapeHtml(assessment.period || "Ingen period")}</span></div>
    <div class="assessment-record-score"><span>Snitt</span><strong>${getAssessmentAverage(assessment)}</strong></div>
  `;
  content.className = "assessment-record-content";
  content.innerHTML = `
    <div class="assessment-record-actions"><button class="btn" type="button" data-action="edit-assessment">Redigera</button></div>
    <div class="assessment-auto-summary">
      <div class="assessment-auto-summary-heading"><div><span>Automatisk sammanfattning</span><h5>Bedömning ${assessmentNumber}</h5></div><strong>${getAssessmentAverage(assessment)}/5</strong></div>
      <p class="assessment-level-text">${escapeHtml(automaticSummary.level)}</p>
      <div class="assessment-summary-grid">
        ${renderSummaryList("Styrkor", automaticSummary.strengths, "Inga styrkor med betyg 4–5 registrerade.", "positive")}
        ${renderSummaryList("Behöver utvecklas", automaticSummary.development, "Inga områden med betyg 1–2 registrerade.", "neutral")}
        ${renderSummaryList("Grundkrav: Nej", automaticSummary.unmetRequirements, "Alla besvarade grundkrav är godkända.", "negative")}
      </div>
      ${comparisonHtml}
    </div>
    <div class="assessment-facts">
      <span><small>Skift / avdelning</small><strong>${escapeHtml(assessment.shiftDepartment || "—")}</strong></span>
      <span><small>Skiftledare</small><strong>${escapeHtml(assessment.leader || "—")}</strong></span>
      <span><small>Arbetade pass</small><strong>${escapeHtml(assessment.totalShifts || "—")}</strong></span>
      <span><small>Frånvaro</small><strong>${escapeHtml(assessment.absence || "—")}</strong></span>
    </div>
    <h5>Grundkrav</h5><ul class="assessment-results">${basicRows}</ul>
    <h5>Arbetsutförande</h5><ul class="assessment-results">${ratingRows}</ul>
    <div class="assessment-notes">
      <div><small>Styrkor</small><p>${escapeHtml(assessment.strengths || "—")}</p></div>
      <div><small>Utvecklingsområden</small><p>${escapeHtml(assessment.development || "—")}</p></div>
      <div><small>Motivering</small><p>${escapeHtml(assessment.motivation || "—")}</p></div>
    </div>
    <div class="assessment-decision">
      <span><small>Heltid i skiftet</small><strong>${escapeHtml(assessment.fullTime || "—")}</strong></span>
      <span><small>Potential</small><strong>${escapeHtml(assessment.potential || "—")}</strong></span>
      <span><small>Rekommendation</small><strong>${escapeHtml(assessment.recommendation || "—")}</strong></span>
      <span><small>Intern klassning</small><strong>${escapeHtml(assessment.classification || "—")}</strong></span>
    </div>
  `;
  content.querySelector('[data-action="edit-assessment"]')?.addEventListener("click", event => {
    event.preventDefault();
    if (onEdit) onEdit();
  });
  details.append(summary, content);
  return details;
}

function createAssessmentForm(person, onCancel, assessment = null) {
  const form = document.createElement("form");
  const today = formatDateKey(new Date());
  const isEditing = Boolean(assessment);
  form.className = "assessment-form";
  form.innerHTML = `
    <div class="assessment-form-heading">
      <div><span>${isEditing ? "Redigera bedömning" : "Ny bedömning"}</span><h3>${escapeHtml(person.name)}</h3></div>
      <button class="btn" type="button" id="cancelAssessment">Avbryt</button>
    </div>

    <section class="assessment-section">
      <div class="assessment-section-title"><span>1</span><div><h4>Grunduppgifter</h4><p>Period och arbetsinformation</p></div></div>
      <div class="assessment-form-grid">
        <label>Medarbetare<input name="employeeName" value="${escapeHtml(person.name)}" readonly /></label>
        <label>Datum<input type="date" name="date" value="${today}" required /></label>
        <label>Bedömningsperiod<select name="period"><option value="">Välj period</option><option>Efter 1 månad</option><option>Efter 3 månader</option><option>Efter 6 månader</option></select></label>
        <label>Skift / avdelning<input name="shiftDepartment" placeholder="Exempel: Dag / Packa" /></label>
        <label>Skiftledare<input name="leader" placeholder="Namn" /></label>
        <label>Antal arbetade pass<input name="totalShifts" type="number" min="0" placeholder="0" /></label>
        <label>Frånvaro / orsak<input name="absence" placeholder="Antal och eventuell orsak" /></label>
      </div>
    </section>

    <section class="assessment-section">
      <div class="assessment-section-title"><span>2</span><div><h4>Grundkrav</h4><p>Markera Ja eller Nej och lägg till kommentar vid behov</p></div></div>
      <div class="assessment-basic-list">
        ${BASIC_ASSESSMENT_ITEMS.map((item, index) => `
          <div class="assessment-basic-row">
            <strong>${escapeHtml(item)}</strong>
            <select name="basicAnswer${index}"><option value="">Ej bedömt</option><option>Ja</option><option>Nej</option></select>
            <input name="basicComment${index}" placeholder="Kommentar (valfri)" />
          </div>
        `).join("")}
      </div>
    </section>

    <section class="assessment-section">
      <div class="assessment-section-title"><span>3</span><div><h4>Arbetsutförande och beteende</h4><p>1 = Bristfällig · 3 = Godkänd · 5 = Mycket bra</p></div></div>
      <div class="assessment-rating-list">
        ${PERFORMANCE_ASSESSMENT_ITEMS.map((item, index) => `
          <div class="assessment-rating-row">
            <strong>${escapeHtml(item)}</strong>
            <div class="rating-options">
              ${[1, 2, 3, 4, 5].map(score => `<label><input type="radio" name="rating${index}" value="${score}" /><span>${score}</span></label>`).join("")}
            </div>
            <input name="ratingComment${index}" placeholder="Kommentar (valfri)" />
          </div>
        `).join("")}
      </div>
    </section>

    <section class="assessment-section">
      <div class="assessment-section-title"><span>4</span><div><h4>Sammanfattning</h4><p>Styrkor, utveckling och rekommendation</p></div></div>
      <div class="assessment-text-grid">
        <label>Styrkor<textarea name="strengths" rows="3" placeholder="Vad fungerar särskilt bra?"></textarea></label>
        <label>Utvecklingsområden / stöd<textarea name="development" rows="3" placeholder="Vad behöver utvecklas?"></textarea></label>
      </div>
      <div class="assessment-form-grid">
        <label>Heltid i ditt skift?<select name="fullTime"><option value="">Välj</option><option>Ja, utan tvekan</option><option>Ja, med viss upplärning</option><option>Osäker</option><option>Nej</option></select></label>
        <label>Potential för fast anställning<select name="potential"><option value="">Välj</option><option>Hög</option><option>Medel</option><option>Låg</option></select></label>
        <label>Rekommendation<select name="recommendation"><option value="">Välj</option><option>Rekommenderas för fortsatt anställning</option><option>Förlängd prövotid</option><option>Fortsatt bemanning</option><option>Rekommenderas ej</option></select></label>
        <label>Intern klassning<select name="classification"><option value="">Välj</option><option>A – Rekryteringsbar direkt</option><option>B – Bra resurs, utvecklingsbar</option><option>C – Fungerar men ej rekrytering</option><option>D – Ej lämplig</option></select></label>
      </div>
      <label>Motivering<textarea name="motivation" rows="3" placeholder="Samlad motivering"></textarea></label>
    </section>

    <div class="assessment-submit-bar"><span>Bedömningen sparas säkert i personens historik.</span><button class="btn primary" type="submit">${isEditing ? "Spara ändringar" : "Spara bedömning"}</button></div>
  `;

  if (assessment) {
    const setValue = (name, value) => {
      const field = form.elements.namedItem(name);
      if (field) field.value = value ?? "";
    };
    ["date", "period", "shiftDepartment", "leader", "totalShifts", "absence", "strengths", "development",
      "fullTime", "potential", "recommendation", "classification", "motivation"]
      .forEach(name => setValue(name, assessment[name]));
    BASIC_ASSESSMENT_ITEMS.forEach((_, index) => {
      setValue(`basicAnswer${index}`, assessment.basic?.[index]?.answer);
      setValue(`basicComment${index}`, assessment.basic?.[index]?.comment);
    });
    PERFORMANCE_ASSESSMENT_ITEMS.forEach((_, index) => {
      setValue(`rating${index}`, assessment.ratings?.[index]?.score);
      setValue(`ratingComment${index}`, assessment.ratings?.[index]?.comment);
    });
  }

  form.querySelector("#cancelAssessment").addEventListener("click", onCancel);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(form);
    const assessments = await getAssessments();
    const basic = {};
    const ratings = {};
    BASIC_ASSESSMENT_ITEMS.forEach((_, index) => {
      basic[index] = { answer: data.get(`basicAnswer${index}`), comment: data.get(`basicComment${index}`).trim() };
    });
    PERFORMANCE_ASSESSMENT_ITEMS.forEach((_, index) => {
      ratings[index] = { score: data.get(`rating${index}`) || "", comment: data.get(`ratingComment${index}`).trim() };
    });
    const savedAssessment = {
      id: assessment?.id || makeId(), personId: person.id, employeeName: person.name,
      createdAt: assessment?.createdAt || new Date().toISOString(), updatedAt: isEditing ? new Date().toISOString() : undefined,
      date: data.get("date"), period: data.get("period"), shiftDepartment: data.get("shiftDepartment").trim(),
      leader: data.get("leader").trim(), totalShifts: data.get("totalShifts"), absence: data.get("absence").trim(),
      basic, ratings, strengths: data.get("strengths").trim(), development: data.get("development").trim(),
      fullTime: data.get("fullTime"), potential: data.get("potential"), recommendation: data.get("recommendation"),
      classification: data.get("classification"), motivation: data.get("motivation").trim()
    };
    if (isEditing) {
      const assessmentIndex = assessments.findIndex(item => item.id === assessment.id);
      if (assessmentIndex === -1) return;
      assessments[assessmentIndex] = savedAssessment;
    } else {
      assessments.push(savedAssessment);
    }
    await saveAssessments(assessments);
    await addAuditEvent("assessment", `${person.name}: bedömning ${isEditing ? "uppdaterad" : "sparad"}`, data.get("date"));
    assessmentFormOpen = false;
    editingAssessmentId = "";
    await renderAssessments();
  });
  return form;
}

async function renderAssessments() {
  const root = document.getElementById("assessmentPage");
  if (!root) return;
  const people = await getEvaluatedPeople();
  const assessments = await getAssessments();
  if (!selectedAssessmentPersonId && people.length) selectedAssessmentPersonId = people[0].id;
  const selectedPerson = people.find(person => person.id === selectedAssessmentPersonId);

  root.innerHTML = "";
  const peoplePanel = document.createElement("aside");
  const peopleList = document.createElement("div");
  peoplePanel.className = "assessment-people-panel card";
  peoplePanel.innerHTML = `
    <div class="assessment-panel-heading"><div><h3>Medarbetare</h3><p>${people.length} personer</p></div></div>
    <div class="assessment-status-legend">
      <span class="status-none">Ej bedömd</span>
      <span class="status-one">En gång</span>
      <span class="status-ready">2+ gånger</span>
      <span class="status-problem">Följ upp</span>
    </div>
  `;
  peopleList.className = "assessment-people-list";
  people.forEach(person => {
    const personAssessments = assessments.filter(item => item.personId === person.id);
    const status = getPersonAssessmentStatus(personAssessments);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `assessment-person-button ${status.className}${person.id === selectedAssessmentPersonId ? " active" : ""}`;
    button.innerHTML = `<span>${escapeHtml(person.name)}</span><small>${escapeHtml(status.label)}</small>`;
    button.addEventListener("click", async () => {
      selectedAssessmentPersonId = person.id;
      assessmentFormOpen = false;
      editingAssessmentId = "";
      await renderAssessments();
    });
    peopleList.appendChild(button);
  });
  if (!people.length) peopleList.innerHTML = "<p class=\"assessment-empty\">Lägg till personal först.</p>";
  peoplePanel.appendChild(peopleList);

  const content = document.createElement("section");
  content.className = "assessment-content card";
  if (!selectedPerson) {
    content.innerHTML = "<div class=\"assessment-empty-state\"><strong>Välj en medarbetare</strong><p>Personens bedömningar visas här.</p></div>";
  } else if (assessmentFormOpen) {
    const assessmentToEdit = assessments.find(item => item.id === editingAssessmentId && item.personId === selectedPerson.id) || null;
    content.appendChild(createAssessmentForm(selectedPerson, async () => {
      assessmentFormOpen = false;
      editingAssessmentId = "";
      await renderAssessments();
    }, assessmentToEdit));
  } else {
    const personAssessments = assessments
      .filter(item => item.personId === selectedPerson.id)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));
    const heading = document.createElement("div");
    const records = document.createElement("div");
    heading.className = "assessment-content-heading";
    heading.innerHTML = `<div><span>Bedömningshistorik</span><h3>${escapeHtml(selectedPerson.name)}</h3><p>${escapeHtml(selectedPerson.company || "")}</p></div>`;
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "btn primary";
    addButton.textContent = "+ Ny bedömning";
    addButton.addEventListener("click", async () => {
      assessmentFormOpen = true;
      editingAssessmentId = "";
      await renderAssessments();
    });
    heading.appendChild(addButton);
    records.className = "assessment-records";
    const chronologicalAssessments = [...personAssessments].sort((a, b) =>
      String(a.date).localeCompare(String(b.date)) || String(a.createdAt).localeCompare(String(b.createdAt))
    );
    personAssessments.forEach((assessment, displayIndex) => {
      const chronologicalIndex = chronologicalAssessments.findIndex(item => item.id === assessment.id);
      const previousAssessment = chronologicalIndex > 0
        ? chronologicalAssessments[chronologicalIndex - 1]
        : null;
      const record = renderAssessmentRecord(
        assessment,
        previousAssessment,
        chronologicalIndex + 1,
        async () => {
          editingAssessmentId = assessment.id;
          assessmentFormOpen = true;
          await renderAssessments();
        }
      );
      if (displayIndex === 0) record.open = true;
      records.appendChild(record);
    });
    if (!personAssessments.length) records.innerHTML = "<div class=\"assessment-empty-state\"><strong>Ingen bedömning ännu</strong><p>Skapa den första bedömningen för medarbetaren.</p></div>";
    content.append(heading, records);
  }
  root.append(peoplePanel, content);
}

function makeCell(text, className = "") {
  const div = document.createElement("div");
  div.className = `cell ${className}`.trim();
  div.textContent = text;
  return div;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return map[character];
  });
}

async function getScheduleState() {
  const [schedule, trainingLeaders, trainingLocations, extraPersonLocations] = await Promise.all([
    getSchedule(), getTrainingLeaders(), getTrainingLocations(), getExtraPersonLocations()
  ]);
  return { schedule, trainingLeaders, trainingLocations, extraPersonLocations };
}

async function saveScheduleState(state) {
  await Promise.all([
    saveSchedule(state.schedule),
    saveTrainingLeaders(state.trainingLeaders || {}),
    saveTrainingLocations(state.trainingLocations || {}),
    saveExtraPersonLocations(state.extraPersonLocations || {})
  ]);
}

function copyScheduleDay(state, from, to) {
  const next = structuredClone(state);
  ["schedule", "trainingLeaders", "trainingLocations", "extraPersonLocations"].forEach(key => {
    Object.values(next[key] || {}).forEach(row => { row[to] = row[from] || ""; });
  });
  return next;
}

async function renderScheduleTools(schedule, people = [], skills = {}, placementDetails = null) {
  const root = document.getElementById("scheduleGrid");
  const card = root?.parentElement;
  if (!card) return;
  if (scheduleHistoryWeek !== getSelectedWeekKey()) resetScheduleHistory();
  const state = placementDetails ? { schedule, ...placementDetails } : await getScheduleState();
  const remember = () => recordScheduleHistory(state.schedule, state.trainingLeaders, state.trainingLocations, state.extraPersonLocations);
  let tools = card.querySelector(".schedule-tools");
  if (!tools) { tools = document.createElement("div"); tools.className = "schedule-tools"; card.insertBefore(tools, root); }
  const templates = await getScheduleTemplates();
  const updatedAt = getDocumentUpdatedAt(getShiftScope(), getWeekDocumentKey("schedule"));
  const companies = [...new Set(people.map(person => person.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, "sv"));
  const knownSkills = [...new Set(Object.values(skills).flat().filter(Boolean))].sort((a, b) => a.localeCompare(b, "sv"));
  tools.innerHTML = `<div class="schedule-filter-tools"><label>Företag<select id="scheduleCompanyFilter"><option value="">Alla</option>${companies.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}</select></label><label>Status<select id="scheduleAvailabilityFilter"><option value="all">Alla</option><option value="available">Tillgänglig</option><option value="unavailable">Ej tillgänglig</option><option value="off">Ledig</option></select></label><label>Kompetens<select id="scheduleSkillFilter"><option value="">Alla</option>${knownSkills.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}</select></label></div><div class="schedule-copy-tools"><label>Från<select id="copyDayFrom">${DAYS.map(day => `<option>${day}</option>`).join("")}</select></label><label>Till<select id="copyDayTo">${DAYS.map((day, index) => `<option${index === 1 ? " selected" : ""}>${day}</option>`).join("")}</select></label><button id="copyScheduleDay" class="btn" type="button">Kopiera dag</button></div><div class="schedule-template-tools"><select id="scheduleTemplateSelect"><option value="">Välj mall</option>${templates.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select><button id="saveScheduleTemplate" class="btn" type="button">Spara veckan som mall</button><button id="applyScheduleTemplate" class="btn" type="button">Använd mall</button></div><div class="schedule-history-tools"><button id="undoSchedule" class="btn" type="button"${scheduleUndoStack.length ? "" : " disabled"}>↶ Ångra</button><button id="redoSchedule" class="btn" type="button"${scheduleRedoStack.length ? "" : " disabled"}>↷ Gör om</button><span class="schedule-save-state">✓ ${updatedAt ? `Sparat ${new Date(updatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}` : "Redo att spara"}</span></div>`;
  tools.querySelector("#scheduleCompanyFilter").value = scheduleFilters.company;
  tools.querySelector("#scheduleAvailabilityFilter").value = scheduleFilters.availability;
  tools.querySelector("#scheduleSkillFilter").value = scheduleFilters.skill;
  const filterTools = tools.querySelector(".schedule-filter-tools");
  const filterLabels = filterTools.querySelectorAll("label");
  filterLabels[0].firstChild.textContent = "Företag";
  filterLabels[1].firstChild.textContent = "Närvaro";
  filterLabels[2].firstChild.textContent = "Kan arbeta på";
  filterTools.insertAdjacentHTML("afterbegin", '<div class="schedule-tools-heading"><strong>Vilka personer vill du se?</strong><small>Valet ändrar namnen som visas i maskinernas listor nedanför.</small></div>');
  const clearFiltersButton = document.createElement("button");
  clearFiltersButton.type = "button";
  clearFiltersButton.className = "btn schedule-clear-filters";
  clearFiltersButton.textContent = "Visa alla";
  clearFiltersButton.addEventListener("click", async () => {
    scheduleFilters.company = "";
    scheduleFilters.availability = "all";
    scheduleFilters.skill = "";
    await renderSchedule();
  });
  filterTools.appendChild(clearFiltersButton);
  const advancedToggle = document.createElement("button");
  advancedToggle.type = "button";
  advancedToggle.className = "btn schedule-advanced-toggle";
  advancedToggle.setAttribute("aria-expanded", String(scheduleAdvancedToolsOpen));
  advancedToggle.textContent = scheduleAdvancedToolsOpen ? "Dölj fler verktyg" : "Visa fler verktyg";
  advancedToggle.addEventListener("click", async () => {
    scheduleAdvancedToolsOpen = !scheduleAdvancedToolsOpen;
    await renderScheduleTools(schedule, people, skills);
  });
  filterTools.insertAdjacentElement("afterend", advancedToggle);
  tools.classList.toggle("show-advanced", scheduleAdvancedToolsOpen);
  tools.querySelector(".schedule-copy-tools").insertAdjacentHTML("afterbegin", '<div class="schedule-tools-heading"><strong>Kopiera en dag</strong><small>Kopierar alla placeringar från en dag till en annan.</small></div>');
  tools.querySelector(".schedule-template-tools").insertAdjacentHTML("afterbegin", '<div class="schedule-tools-heading"><strong>Veckomallar</strong><small>Spara eller återanvänd ett färdigt veckoschema.</small></div>');
  [["#scheduleCompanyFilter", "company"], ["#scheduleAvailabilityFilter", "availability"], ["#scheduleSkillFilter", "skill"]].forEach(([selector, key]) => tools.querySelector(selector).addEventListener("change", async event => { scheduleFilters[key] = event.target.value; await renderSchedule(); }));
  bindOnce(tools.querySelector("#copyScheduleDay"), "click", async () => {
    const from = tools.querySelector("#copyDayFrom").value, to = tools.querySelector("#copyDayTo").value;
    if (from === to) return showAppToast("Välj två olika dagar.", "error");
    remember();
    await saveScheduleState(copyScheduleDay(state, from, to));
    showAppToast(`${from} kopierades till ${to}.`);
    await renderSchedule();
    await renderBreakPlanner();
  });
  bindOnce(tools.querySelector("#saveScheduleTemplate"), "click", async () => {
    const name = window.prompt("Namn på mallen:", `Veckomall ${templates.length + 1}`)?.trim();
    if (!name) return;
    await saveScheduleTemplates([...templates, { id: makeId(), name, createdAt: new Date().toISOString(), ...structuredClone(state) }]);
    showAppToast("Veckomallen har sparats."); await renderScheduleTools(schedule, people, skills, placementDetails);
  });
  bindOnce(tools.querySelector("#applyScheduleTemplate"), "click", async () => {
    const template = templates.find(item => item.id === tools.querySelector("#scheduleTemplateSelect").value);
    if (!template) return showAppToast("Välj en mall först.", "error");
    remember();
    await saveScheduleState({
      schedule: normalizeSchedule(template.schedule),
      trainingLeaders: template.trainingLeaders ?? state.trainingLeaders,
      trainingLocations: template.trainingLocations ?? state.trainingLocations,
      extraPersonLocations: template.extraPersonLocations ?? state.extraPersonLocations
    });
    showAppToast("Veckomallen har lagts in."); await renderSchedule(); await renderBreakPlanner();
  });
  bindOnce(tools.querySelector("#undoSchedule"), "click", async () => {
    const previous = scheduleUndoStack.pop(); if (!previous) return;
    scheduleRedoStack.push(structuredClone(state)); await saveScheduleState(previous); showAppToast("Senaste schemaändringen ångrades."); await renderSchedule(); await renderBreakPlanner();
  });
  bindOnce(tools.querySelector("#redoSchedule"), "click", async () => {
    const next = scheduleRedoStack.pop(); if (!next) return;
    scheduleUndoStack.push(structuredClone(state)); await saveScheduleState(next); showAppToast("Schemaändringen gjordes om."); await renderSchedule(); await renderBreakPlanner();
  });
}

const SCHEDULE_VIEW_KEY = "staff_schedule_view";
let selectedScheduleDay = "";
let selectedScheduleDayWeek = "";

function getScheduleView() {
  try {
    const stored = localStorage.getItem(SCHEDULE_VIEW_KEY);
    if (stored === "day" || stored === "week") return stored;
  } catch { /* Private mode: use the default below. */ }
  return window.matchMedia?.("(max-width: 640px)").matches ? "day" : "week";
}

function setScheduleView(view) {
  try { localStorage.setItem(SCHEDULE_VIEW_KEY, view); } catch { /* Private mode: keep it for this render only. */ }
}

function getTodayScheduleDay() {
  if (!isViewingCurrentWeek()) return "";
  const today = ALL_DAYS[new Date().getDay() - 1] || "";
  return DAYS.includes(today) ? today : "";
}

function getSelectedScheduleDay() {
  const week = getSelectedWeekKey();
  if (selectedScheduleDayWeek !== week || !DAYS.includes(selectedScheduleDay)) {
    selectedScheduleDayWeek = week;
    selectedScheduleDay = getTodayScheduleDay() || DAYS[0] || "";
  }
  return selectedScheduleDay;
}

function formatScheduleName(personId, nameById, ownId, tag = "strong") {
  const name = escapeHtml(nameById[personId] || "—");
  if (ownId && personId === ownId) return `<${tag} class="mine-name">${name}<span class="mine-badge">Du</span></${tag}>`;
  return `<${tag}>${name}</${tag}>`;
}

// Content of one task/day slot, shared by the week grid and the day list.
function describeReadOnlySlot(task, day, { nameById, ownId, schedule, trainingLeaders, trainingLocations, extraPersonLocations }) {
  const personId = schedule?.[task]?.[day] || "";
  const lines = [];
  const involved = [personId];
  if (isTrainingTaskName(task)) {
    if (personId) {
      const leaderId = trainingLeaders?.[task]?.[day] || "";
      involved.push(leaderId);
      lines.push(formatScheduleName(personId, nameById, ownId));
      lines.push(`<small>Handledare: ${leaderId ? formatScheduleName(leaderId, nameById, ownId, "span") : "—"}</small>`);
      lines.push(`<small>Plats: ${escapeHtml(trainingLocations?.[task]?.[day] || "—")}</small>`);
    }
  } else {
    const training = TASKS.filter(isTrainingTaskName)
      .find(item => schedule?.[item]?.[day] && trainingLocations?.[item]?.[day] === task);
    if (training) {
      involved.push(schedule[training][day]);
      lines.push(`<strong>Utbildning</strong><small>${formatScheduleName(schedule[training][day], nameById, ownId, "span")}</small>`);
    } else if (personId) {
      lines.push(formatScheduleName(personId, nameById, ownId));
      if (isExtraPersonTask(task)) lines.push(`<small>${escapeHtml(extraPersonLocations?.[task]?.[day] || "Ingen uppgift vald")}</small>`);
    }
  }
  return { html: lines.join(""), mine: Boolean(ownId) && involved.includes(ownId) };
}

function renderScheduleViewBar(root, view, selectedDay, rerender) {
  const card = root.parentElement;
  card?.querySelector(".schedule-view-bar")?.remove();
  if (!card) return;
  const dates = getDatesForWeek();
  const today = getTodayScheduleDay();
  const bar = document.createElement("div");
  bar.className = "schedule-view-bar";
  bar.innerHTML = `
    <div class="schedule-view-toggle" role="group" aria-label="Visa schema för">
      <button type="button" data-view="day" aria-pressed="${view === "day"}">Dag</button>
      <button type="button" data-view="week" aria-pressed="${view === "week"}">Vecka</button>
    </div>
    <div class="schedule-day-picker${view === "day" ? "" : " hidden"}" role="group" aria-label="Välj dag">
      ${DAYS.map((day, index) => `<button type="button" data-day="${escapeHtml(day)}" aria-pressed="${day === selectedDay}" class="${day === today ? "is-today" : ""}"><span>${escapeHtml(day.slice(0, 3))}</span><small>${escapeHtml(dates[index])}</small></button>`).join("")}
    </div>`;
  bar.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
    setScheduleView(button.dataset.view);
    rerender();
  }));
  bar.querySelectorAll("[data-day]").forEach(button => button.addEventListener("click", () => {
    selectedScheduleDay = button.dataset.day;
    rerender();
  }));
  card.insertBefore(bar, root);
}

// Read-only week for operators and for shift leaders looking at another shift.
function renderReadOnlySchedule(root, data) {
  const { people, schedule, trainingLocations } = data;
  const card = root.parentElement;
  document.getElementById("autoScheduleBtn")?.classList.add("hidden");
  document.getElementById("autoScheduleMessage")?.classList.add("hidden");
  card?.querySelectorAll(".schedule-tools, .schedule-priority-panel, .availability-summary, .unassigned-summary, .schedule-history-notice").forEach(element => element.remove());
  renderTrainingScheduleSummary(root, people, schedule, trainingLocations);

  const rerender = () => renderReadOnlySchedule(root, data);
  const view = getScheduleView();
  const selectedDay = getSelectedScheduleDay();
  renderMyWeekSummary(root, data, day => {
    selectedScheduleDay = day;
    setScheduleView("day");
    rerender();
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  renderScheduleViewBar(root, view, selectedDay, rerender);

  const context = {
    ...data,
    nameById: Object.fromEntries(people.map(person => [person.id, person.name])),
    ownId: currentPerson?.id || ""
  };
  root.classList.add("schedule-readonly");
  root.classList.toggle("schedule-day-view", view === "day");
  root.innerHTML = "";

  if (view === "day") {
    const dates = getDatesForWeek();
    const slots = TASKS.map(task => ({ task, ...describeReadOnlySlot(task, selectedDay, context) }));
    const mine = slots.filter(slot => slot.mine);
    const heading = document.createElement("div");
    heading.className = "day-view-heading";
    heading.innerHTML = `<strong>${escapeHtml(selectedDay)}</strong><small>${escapeHtml(dates[DAYS.indexOf(selectedDay)] || "")}</small>`;
    root.appendChild(heading);
    if (context.ownId) {
      const own = document.createElement("div");
      own.className = `day-view-own${mine.length ? " is-mine" : ""}`;
      own.innerHTML = mine.length
        ? `<small>Du jobbar här</small><strong>${mine.map(slot => escapeHtml(slot.task)).join(", ")}</strong>`
        : "<small>Din placering</small><strong>Ingen placering den här dagen</strong>";
      root.appendChild(own);
    }
    slots.forEach(slot => {
      const row = document.createElement("div");
      const typeClass = isTrainingTaskName(slot.task) ? " utbildning" : isExtraPersonTask(slot.task) ? " extra-person-cell" : "";
      row.className = `day-view-row${typeClass}${slot.mine ? " is-mine" : ""}`;
      row.innerHTML = `<span class="day-view-task">${escapeHtml(slot.task)}</span><div class="day-view-people">${slot.html || '<span class="readonly-empty">—</span>'}</div>`;
      root.appendChild(row);
    });
    return;
  }

  const dates = getDatesForWeek();
  const today = getTodayScheduleDay();
  root.appendChild(makeCell("Uppgift", "header task"));
  DAYS.forEach((day, index) => {
    const header = document.createElement("div");
    header.className = `cell header day-header${day === today ? " is-today" : ""}`;
    header.innerHTML = `<span class="day-name-full">${day}</span><span class="day-name-short">${day.slice(0, 2)}</span><small>${dates[index]}</small>`;
    root.appendChild(header);
  });

  TASKS.forEach(task => {
    const isTrainingTask = isTrainingTaskName(task);
    const isExtraTask = isExtraPersonTask(task);
    const taskCell = makeCell("", isTrainingTask ? "task utbildning" : isExtraTask ? "task extra-person-task" : "task");
    taskCell.innerHTML = `<span>${escapeHtml(task)}</span>`;
    root.appendChild(taskCell);

    DAYS.forEach(day => {
      const cell = document.createElement("div");
      cell.className = isTrainingTask ? "cell utbildning readonly-cell" : isExtraTask ? "cell extra-person-cell readonly-cell" : "cell readonly-cell";
      const slot = describeReadOnlySlot(task, day, context);
      cell.innerHTML = slot.html || '<span class="readonly-empty">—</span>';
      if (slot.mine) {
        cell.classList.add("is-mine");
        cell.title = "Du";
      }
      root.appendChild(cell);
    });
  });
}

// "Min vecka": where the signed-in person works each day.
function renderMyWeekSummary(root, { schedule, trainingLeaders, trainingLocations, extraPersonLocations }, onSelectDay = null) {
  const card = root.parentElement;
  card?.querySelector(".my-week-summary")?.remove();
  const ownId = currentPerson?.id;
  if (!card || !ownId || currentPerson.shiftId !== getShiftScope()) return;
  const dates = getDatesForWeek();
  const today = getTodayScheduleDay();
  const days = DAYS.map((day, index) => {
    const task = TASKS.find(item => schedule?.[item]?.[day] === ownId);
    const leading = TASKS.filter(isTrainingTaskName).find(item => trainingLeaders?.[item]?.[day] === ownId);
    let text = "Ingen placering";
    if (task && isTrainingTaskName(task)) text = `Utbildning · ${trainingLocations?.[task]?.[day] || "plats ej vald"}`;
    else if (task && isExtraPersonTask(task)) text = `${task} · ${extraPersonLocations?.[task]?.[day] || "uppgift ej vald"}`;
    else if (task) text = task;
    else if (leading) text = `Handledare · ${trainingLocations?.[leading]?.[day] || leading}`;
    return { day, date: dates[index], text, placed: Boolean(task || leading) };
  });
  const tag = onSelectDay ? "button" : "article";
  const summary = document.createElement("section");
  summary.className = "my-week-summary";
  summary.innerHTML = `<div class="my-week-heading"><strong>Min vecka</strong><span>${escapeHtml(currentPerson.name)}</span></div><div class="my-week-days">${days.map(entry => `<${tag} ${tag === "button" ? `type="button" data-day="${escapeHtml(entry.day)}" ` : ""}class="${entry.placed ? "is-placed" : ""}${entry.day === today ? " is-today" : ""}"><small>${escapeHtml(entry.day)} ${escapeHtml(entry.date)}${entry.day === today ? " · Idag" : ""}</small><strong>${escapeHtml(entry.text)}</strong></${tag}>`).join("")}</div>`;
  if (onSelectDay) summary.querySelectorAll("[data-day]").forEach(button => button.addEventListener("click", () => onSelectDay(button.dataset.day)));
  card.insertBefore(summary, card.firstChild);
}

async function renderSchedule() {
  const root = document.getElementById("scheduleGrid");
  if (!root) return;
  root.style.setProperty("--schedule-day-count", String(DAYS.length));
  if (!Array.isArray(TASKS) || !TASKS.length) applyCustomWorkItems(customWorkItems);

  const [people, schedule, trainingLeaders, trainingLocations, extraPersonLocations, skills, restrictions] =
    await Promise.all([
      getPeople(),
      getSchedule(),
      getTrainingLeaders(),
      getTrainingLocations(),
      getExtraPersonLocations(),
      getMachineSkills(),
      getMachineRestrictions()
    ]);
  const dates = getDatesForWeek();
  void updateShareScheduleButton();
  root.classList.remove("schedule-readonly", "schedule-day-view", "schedule-edit-day");
  root.parentElement?.querySelectorAll(".schedule-view-bar, .my-week-summary").forEach(element => element.remove());

  if (isOperator() && !(await getScheduleShare())) {
    document.getElementById("autoScheduleBtn")?.classList.add("hidden");
    renderUnsharedScheduleNotice(root);
    return;
  }

  if (!canEditActiveShift()) {
    renderReadOnlySchedule(root, { people, schedule, trainingLeaders, trainingLocations, extraPersonLocations });
    return;
  }
  await renderScheduleTools(schedule, people, skills, { trainingLeaders, trainingLocations, extraPersonLocations });

  renderAvailabilitySummary(root, people);
  renderUnassignedPeopleSummary(root, people, schedule, trainingLeaders);
  renderTrainingScheduleSummary(root, people, schedule, trainingLocations);
  await renderSchedulePrioritySelector(root);

  const view = getScheduleView();
  const selectedDay = getSelectedScheduleDay();
  const visibleDays = view === "day" ? [selectedDay] : DAYS;
  const today = getTodayScheduleDay();
  renderScheduleViewBar(root, view, selectedDay, () => void renderSchedule());
  root.style.setProperty("--schedule-day-count", String(visibleDays.length));
  root.classList.toggle("schedule-edit-day", view === "day");
  root.innerHTML = "";
  root.appendChild(makeCell("Uppgift", "header task"));

  visibleDays.forEach(day => {
    const index = DAYS.indexOf(day);
    const header = document.createElement("div");
    header.className = `cell header day-header${day === today ? " is-today" : ""}`;
    header.innerHTML = `
      <span class="day-name-full">${day}</span>
      <span class="day-name-short">${day.slice(0, 2)}</span>
      <small>${dates[index]}</small>
    `;
    root.appendChild(header);
  });

  TASKS.forEach(task => {
    const workItem = customWorkItems.find(item => item.enabled && item.name === task);
    const requiredStaff = Math.max(1, Number(workItem?.staffCount) || 1);
    const isTrainingTask = isTrainingTaskName(task);
    const isExtraTask = isExtraPersonTask(task);
    const trainingVariantClass = task === "Utbildning 1"
      ? "utbildning-1"
      : task === "Utbildning 2"
        ? "utbildning-2"
        : "";
    const taskClassName = isTrainingTask
      ? `task utbildning ${trainingVariantClass}`
      : isExtraTask ? "task extra-person-task" : "task";

    const taskCell = makeCell("", taskClassName);
    taskCell.innerHTML = `<span>${escapeHtml(task)}</span>${requiredStaff > 1 ? `<small class="required-staff-badge">${requiredStaff} personer behövs</small>` : ""}`;
    root.appendChild(taskCell);

    visibleDays.forEach(day => {
      const cell = document.createElement("div");
      const select = document.createElement("select");
      const emptyOption = document.createElement("option");
      const assignedPeople = getAssignedPeopleForDay(schedule, day, task);
      const dayTrainingLeaders = getTrainingLeadersForDay(trainingLeaders, day);
      const selectedPersonId = schedule[task]?.[day] ?? "";
      const trainingReservation = !isTrainingTask
        ? TASKS.filter(isTrainingTaskName).map(trainingTask => ({
            trainingTask,
            person: people.find(person => person.id === schedule?.[trainingTask]?.[day]),
            location: trainingLocations?.[trainingTask]?.[day]
          })).find(entry => entry.person && entry.location === task)
        : null;

      cell.className = isTrainingTask
        ? `cell utbildning ${trainingVariantClass}`
        : isExtraTask ? "cell extra-person-cell" : "cell";
      cell.dataset.task = task;
      cell.dataset.day = day;
      if (trainingReservation) {
        cell.classList.add("schedule-training-cell");
        cell.title = `${trainingReservation.person.name} har utbildning på ${task} ${day}`;
      } else if (!selectedPersonId && !isTrainingTask && !isExtraTask) {
        cell.classList.add("schedule-shortage");
        cell.title = `${task} saknar bemanning ${day}`;
      } else if (requiredStaff > 1 && selectedPersonId) {
        cell.classList.add("schedule-shortage");
        cell.title = `${task} behöver ${requiredStaff} personer; nuvarande schema har en plats`;
      }
      select.className = "schedule-select";
      select.setAttribute("aria-label", `Person för ${task} ${day}`);

      if (isTrainingTask) {
        select.setAttribute("aria-label", `Person under utbildning för ${task} ${day}`);
      }

      emptyOption.value = "";
      emptyOption.textContent = isTrainingTask ? "Välj person" : "-- Välj --";
      select.appendChild(emptyOption);

      if (trainingReservation) {
        const trainingOption = document.createElement("option");
        trainingOption.value = "__training__";
        trainingOption.textContent = `Utbildning · ${trainingReservation.person.name}`;
        trainingOption.selected = true;
        select.appendChild(trainingOption);
        select.disabled = true;
        select.classList.add("schedule-training-reserved");
        select.title = `${trainingReservation.person.name} har utbildning på ${task}`;
      }

      people.forEach(person => {
        if (trainingReservation) return;
        if (person.id !== selectedPersonId) {
          if (scheduleFilters.company && person.company !== scheduleFilters.company) return;
          if (scheduleFilters.availability !== "all" && getPersonAvailability(person) !== scheduleFilters.availability) return;
          if (scheduleFilters.skill && !(skills[person.id] || []).includes(scheduleFilters.skill)) return;
        }
        if (assignedPeople.has(person.id) && person.id !== selectedPersonId) {
          return;
        }

        if (!isTrainingTask && dayTrainingLeaders.has(person.id) && person.id !== selectedPersonId) {
          return;
        }

        const availability = getPersonAvailability(person);
        if (
          isExtraTask && person.id !== selectedPersonId &&
          extraPersonLocations[task]?.[day] === "GD-rummet" &&
          Array.isArray(restrictions[person.id]) &&
          restrictions[person.id].includes("GD")
        ) return;
        let eligibilityLabel = availability === "available" ? "" : getUnavailableMessage(person);
        if (isExtraTask && extraPersonLocations[task]?.[day] === "GD-rummet" && restrictions[person.id]?.includes("GD")) {
          eligibilityLabel = "Får inte GD";
        }
        if (!isTrainingTask && !isExtraTask) {
          const department = getTaskDepartment(task);
          const personSkills = Array.isArray(skills[person.id]) ? skills[person.id] : [];
          const personRestrictions = Array.isArray(restrictions[person.id])
            ? restrictions[person.id]
            : [];
          const isRestricted = department === "GD" && personRestrictions.includes("GD");
          const isEligible = (!department || personSkills.includes(department)) &&
            (workItem?.requiredSkills || []).every(requiredSkill => personSkills.includes(requiredSkill)) && !isRestricted;
          if (!isEligible) {
            eligibilityLabel = isRestricted ? "Får inte GD" : "Kompetens saknas";
          }
        }

        const option = document.createElement("option");
        option.value = person.id;
        option.textContent = eligibilityLabel
          ? `${person.name} — ${eligibilityLabel}`
          : person.name;
        option.selected = selectedPersonId === person.id;
        option.disabled = Boolean(eligibilityLabel && eligibilityLabel !== "Kompetens saknas");
        if (eligibilityLabel) {
          option.className = eligibilityLabel === "Får inte GD"
            ? "schedule-option-restricted"
            : "schedule-option-missing-skill";
          option.title = eligibilityLabel;
        }
        select.appendChild(option);
      });

      const scheduledPerson = people.find(person => person.id === selectedPersonId);
      const scheduledAvailability = getPersonAvailability(scheduledPerson);
      if (scheduledPerson && scheduledAvailability !== "available") {
        select.classList.add(`schedule-person-${scheduledAvailability}`);
        select.title = getUnavailableMessage(scheduledPerson);
      }

      select.addEventListener("change", async () => {
        const selectedId = select.value;
        const assignedElsewhere = getAssignedPeopleForDay(schedule, day, task);
        const selectedPerson = people.find(person => person.id === selectedId);

        if (selectedPerson && getPersonAvailability(selectedPerson) !== "available") {
          showAppToast(getUnavailableMessage(selectedPerson), "error");
          await renderSchedule();
          return;
        }

        if (selectedId && assignedElsewhere.has(selectedId)) {
          showAppToast("Den här personen är redan schemalagd i en annan avdelning samma dag.", "error");
          await renderSchedule();
          return;
        }

        if (!isTrainingTask && selectedId && getTrainingLeadersForDay(trainingLeaders, day).has(selectedId)) {
          showAppToast("Den här personen är vald som handledare och kan inte samtidigt arbeta på en maskin.", "error");
          await renderSchedule();
          return;
        }

        recordScheduleHistory(schedule, trainingLeaders, trainingLocations, extraPersonLocations);
        schedule[task] ??= {};
        schedule[task][day] = selectedId;

        if (
          isTrainingTask &&
          (!selectedId || trainingLeaders[task]?.[day] === selectedId)
        ) {
          trainingLeaders[task][day] = "";
          await saveTrainingLeaders(trainingLeaders);
        }

        if (isTrainingTask && !selectedId && trainingLocations[task]?.[day]) {
          trainingLocations[task][day] = "";
          await saveTrainingLocations(trainingLocations);
        }

        if (isExtraTask && !selectedId && extraPersonLocations[task]?.[day]) {
          extraPersonLocations[task][day] = "";
          await saveExtraPersonLocations(extraPersonLocations);
        }

        await saveSchedule(schedule);
        await addAuditEvent("schedule", `${task} · ${day}`, selectedPerson ? `${selectedPerson.name} schemalagd` : "Placering rensad");
        await renderSchedule();
        await renderBreakPlanner();
      });

      if (isTrainingTask) {
        const personLabel = document.createElement("label");
        personLabel.className = "training-field-label";
        personLabel.innerHTML = "<span>1</span> Person";
        cell.append(personLabel, select);
      } else if (isExtraTask) {
        const personLabel = document.createElement("label");
        personLabel.className = "training-field-label";
        personLabel.innerHTML = "<span>1</span> Person";
        cell.append(personLabel, select);
      } else {
        cell.appendChild(select);
      }

      if (isExtraTask) {
        const locationLabel = document.createElement("label");
        const locationSelect = document.createElement("select");
        const emptyLocationOption = document.createElement("option");
        locationLabel.className = "training-field-label";
        locationLabel.innerHTML = "<span>2</span> Uppgift";
        locationSelect.className = "schedule-select extra-person-location-select";
        locationSelect.setAttribute("aria-label", `Uppgift för ${task} ${day}`);
        locationSelect.disabled = !selectedPersonId;
        emptyLocationOption.value = "";
        emptyLocationOption.textContent = "Välj uppgift";
        locationSelect.appendChild(emptyLocationOption);
        const savedLocation = extraPersonLocations[task]?.[day] || "";
        const locationOptions = [...new Set([...EXTRA_PERSON_ASSIGNMENTS, ...(savedLocation ? [savedLocation] : [])])];
        locationOptions.forEach(location => {
          const option = document.createElement("option");
          option.value = location;
          option.textContent = EXTRA_PERSON_ASSIGNMENTS.includes(location) ? location : `${location} (borttagen)`;
          option.selected = extraPersonLocations[task]?.[day] === location;
          locationSelect.appendChild(option);
        });
        locationSelect.addEventListener("change", async () => {
          const selectedRestrictions = Array.isArray(restrictions[selectedPersonId])
            ? restrictions[selectedPersonId]
            : [];
          if (locationSelect.value === "GD-rummet" && selectedRestrictions.includes("GD")) {
            showAppToast("Den valda personen får inte arbeta på GD och kan därför inte placeras i GD-rummet.", "error");
            locationSelect.value = extraPersonLocations[task]?.[day] || "";
            return;
          }
          recordScheduleHistory(schedule, trainingLeaders, trainingLocations, extraPersonLocations);
          extraPersonLocations[task] ??= {};
          extraPersonLocations[task][day] = locationSelect.value;
          await saveExtraPersonLocations(extraPersonLocations);
          await addAuditEvent("schedule", `${task} · ${day}`, locationSelect.value ? `Uppgift: ${locationSelect.value}` : "Uppgift rensad");
          await renderSchedule();
        });
        cell.append(locationLabel, locationSelect);
      }

      if (isTrainingTask) {
        const leaderLabel = document.createElement("label");
        const leaderSelect = document.createElement("select");
        const emptyLeaderOption = document.createElement("option");
        const selectedLeaderId = trainingLeaders[task]?.[day] ?? "";
        const assignedPeopleForLeader = getAssignedPeopleForDay(schedule, day);
        const otherTrainingLeaders = getTrainingLeadersForDay(trainingLeaders, day, task);
        const locationLabel = document.createElement("label");
        const locationSelect = document.createElement("select");
        const emptyLocationOption = document.createElement("option");
        const selectedLocation = trainingLocations[task]?.[day] ?? "";

        cell.classList.add("training-cell");
        leaderLabel.className = "training-field-label";
        leaderLabel.innerHTML = "<span>2</span> Handledare";
        leaderSelect.className = "schedule-select training-leader-select";
        leaderSelect.setAttribute("aria-label", `Handledare för ${task} ${day}`);
        leaderSelect.disabled = !selectedPersonId;
        emptyLeaderOption.value = "";
        emptyLeaderOption.textContent = "Välj handledare";
        leaderSelect.appendChild(emptyLeaderOption);

        people.forEach(person => {
          if (person.id === selectedPersonId) return;
          if (assignedPeopleForLeader.has(person.id) && person.id !== selectedLeaderId) return;
          if (otherTrainingLeaders.has(person.id) && person.id !== selectedLeaderId) return;

          const availability = getPersonAvailability(person);
          if (availability !== "available") return;

          const option = document.createElement("option");
          option.value = person.id;
          option.textContent = person.name;
          option.selected = selectedLeaderId === person.id;
          leaderSelect.appendChild(option);
        });

        const selectedLeader = people.find(person => person.id === selectedLeaderId);
        const leaderAvailability = getPersonAvailability(selectedLeader);
        if (selectedLeader && leaderAvailability !== "available") {
          leaderSelect.classList.add(`schedule-person-${leaderAvailability}`);
          leaderSelect.title = getUnavailableMessage(selectedLeader);
        }

        leaderSelect.addEventListener("change", async () => {
          const leaderId = leaderSelect.value;
          if (leaderId && getAssignedPeopleForDay(schedule, day).has(leaderId)) {
            showAppToast("Den här personen arbetar redan på en maskin eller avdelning den här dagen.", "error");
            await renderSchedule();
            return;
          }
          if (leaderId && getTrainingLeadersForDay(trainingLeaders, day, task).has(leaderId)) {
            showAppToast("Den här personen är redan handledare för en annan utbildning den här dagen.", "error");
            await renderSchedule();
            return;
          }
          recordScheduleHistory(schedule, trainingLeaders, trainingLocations, extraPersonLocations);
          trainingLeaders[task] ??= {};
          trainingLeaders[task][day] = leaderId;
          await saveTrainingLeaders(trainingLeaders);
          await addAuditEvent("schedule", `${task} · ${day}`, leaderId ? `${people.find(person => person.id === leaderId)?.name || "Handledare"} vald som handledare` : "Handledare rensad");
          await renderSchedule();
          await renderBreakPlanner();
        });

        cell.appendChild(leaderLabel);
        cell.appendChild(leaderSelect);

        locationLabel.className = "training-field-label";
        locationLabel.innerHTML = "<span>3</span> Maskin / avdelning";
        locationSelect.className = "schedule-select training-location-select";
        locationSelect.setAttribute("aria-label", `Maskin eller avdelning för ${task} ${day}`);
        locationSelect.disabled = !selectedPersonId;
        emptyLocationOption.value = "";
        emptyLocationOption.textContent = "Välj plats";
        locationSelect.appendChild(emptyLocationOption);

        getProductionWorkplaces().forEach(location => {
          const option = document.createElement("option");
          const occupiedBy = schedule?.[location]?.[day];
          const reservedByOtherTraining = TASKS.filter(item => isTrainingTaskName(item) && item !== task)
            .some(item => trainingLocations?.[item]?.[day] === location && schedule?.[item]?.[day]);
          option.value = location;
          option.textContent = occupiedBy || reservedByOtherTraining
            ? `${location} · Upptagen`
            : location;
          option.selected = selectedLocation === location;
          option.disabled = selectedLocation !== location && Boolean(occupiedBy || reservedByOtherTraining);
          locationSelect.appendChild(option);
        });

        locationSelect.addEventListener("change", async () => {
          const nextLocation = locationSelect.value;
          if (nextLocation && schedule?.[nextLocation]?.[day]) {
            showAppToast("Den här maskinen eller avdelningen är redan upptagen den här dagen.", "error");
            await renderSchedule();
            return;
          }
          const usedByOtherTraining = TASKS.filter(item => isTrainingTaskName(item) && item !== task)
            .some(item => trainingLocations?.[item]?.[day] === nextLocation && schedule?.[item]?.[day]);
          if (nextLocation && usedByOtherTraining) {
            showAppToast("Platsen används redan av en annan utbildning den här dagen.", "error");
            await renderSchedule();
            return;
          }
          recordScheduleHistory(schedule, trainingLeaders, trainingLocations, extraPersonLocations);
          trainingLocations[task] ??= {};
          trainingLocations[task][day] = nextLocation;
          await saveTrainingLocations(trainingLocations);
          await renderSchedule();
        });

        cell.appendChild(locationLabel);
        cell.appendChild(locationSelect);
      }

      root.appendChild(cell);
    });
  });

  const card = root.parentElement;
  let historyNotice = card?.querySelector(".schedule-history-notice");
  if (isViewingPreviousWeek()) {
    if (!historyNotice && card) {
      historyNotice = document.createElement("div");
      historyNotice.className = "schedule-history-notice";
      card.insertBefore(historyNotice, root);
    }
    if (historyNotice) historyNotice.textContent = "Visar förra veckans schema · Du kan redigera och spara ändringar";
  } else {
    historyNotice?.remove();
  }
}

const AVAILABILITY_OPTIONS = [
  ["available", "Tillgänglig"],
  ["unavailable", "Ej tillgänglig"],
  ["off", "Ledig"]
];

function availabilityOptionsFor() {
  return AVAILABILITY_OPTIONS;
}

function canCreateAccountFor(person, role = ROLES.OPERATOR) {
  if (isAdmin()) return true;
  return canEditPerson(person) && assignableRoles().includes(role);
}

function canResetPasswordFor(person) {
  return Boolean(person.account) && canEditPerson(person);
}

function describeAccount(person) {
  if (!person.account) return "Ingen inloggning";
  return `${ROLE_LABELS[person.account.role] || "Operatör"} · ${person.account.username}`;
}

// Clears someone who is away from the selected week's schedule in their shift,
// as the app always did when a status was changed on the staff page.
async function removePersonFromSelectedWeek(personId, shiftId) {
  if (!canEditShift(shiftId)) return;
  const [storedSchedule, storedLeaders, storedLocations] = await Promise.all([
    getDocument(shiftId, getWeekDocumentKey("schedule"), null),
    getDocument(shiftId, getWeekDocumentKey("trainingLeaders"), null),
    getDocument(shiftId, getWeekDocumentKey("trainingLocations"), null)
  ]);
  const schedule = normalizeSchedule(storedSchedule);
  const trainingLeaders = normalizeTrainingLeaders(storedLeaders);
  const trainingLocations = normalizeTrainingLocations(storedLocations);
  let scheduleChanged = false, leadersChanged = false, locationsChanged = false;
  TASKS.forEach(task => {
    DAYS.forEach(day => {
      if (schedule[task]?.[day] === personId) {
        schedule[task][day] = "";
        scheduleChanged = true;
        if (isTrainingTaskName(task) && trainingLocations[task]?.[day]) {
          trainingLocations[task][day] = "";
          locationsChanged = true;
        }
      }
      if (trainingLeaders[task]?.[day] === personId) {
        trainingLeaders[task][day] = "";
        leadersChanged = true;
      }
    });
  });
  await Promise.all([
    scheduleChanged ? saveDocument(shiftId, getWeekDocumentKey("schedule"), schedule) : null,
    leadersChanged ? saveDocument(shiftId, getWeekDocumentKey("trainingLeaders"), trainingLeaders) : null,
    locationsChanged ? saveDocument(shiftId, getWeekDocumentKey("trainingLocations"), trainingLocations) : null
  ]);
}

function ensurePeopleShiftFilter() {
  const bar = document.querySelector("#peopleList")?.closest(".card")?.querySelector(".filter-bar");
  if (!bar || document.getElementById("peopleShiftFilter")) return;
  const select = document.createElement("select");
  select.id = "peopleShiftFilter";
  select.setAttribute("aria-label", "Visa skift");
  select.innerHTML = `<option value="">Alla skift</option>${shifts.map(shift => `<option value="${escapeHtml(shift.id)}">${escapeHtml(shiftOptionLabel(shift))}${shift.id === getOwnShiftId() ? " (ditt)" : ""}</option>`).join("")}<option value="none">Utan skift</option>`;
  // Shift leaders and right hands start in their own shift; admins see everyone.
  select.value = linkedShiftId || (!isAdmin() && getOwnShiftId() ? getOwnShiftId() : "");
  select.addEventListener("change", () => void renderPeople());
  bar.prepend(select);
}

async function renderPeople() {
  const list = document.getElementById("peopleList");
  if (!list) return;

  ensurePeopleShiftFilter();
  const allPeople = await getAllPeople();
  const query = (document.getElementById("peopleSearch")?.value || "").trim().toLocaleLowerCase();
  const statusFilter = document.getElementById("availabilityFilter")?.value || "";
  const shiftFilter = document.getElementById("peopleShiftFilter")?.value || "";
  const availabilityOrder = {
    available: 0,
    off: 1,
    unavailable: 2
  };
  const people = allPeople
    .filter(person =>
      (!query || `${person.name} ${person.company || ""} ${person.account?.username || ""}`.toLocaleLowerCase().includes(query)) &&
      (!statusFilter || getPersonAvailability(person) === statusFilter) &&
      (!shiftFilter || (shiftFilter === "none" ? !person.shiftId : person.shiftId === shiftFilter))
    )
    .sort((firstPerson, secondPerson) =>
      (availabilityOrder[getPersonAvailability(firstPerson)] ?? 2) -
      (availabilityOrder[getPersonAvailability(secondPerson)] ?? 2) ||
      firstPerson.name.localeCompare(secondPerson.name, "sv")
    );
  list.innerHTML = "";

  people.forEach(person => {
    const row = document.createElement("div");
    const meta = document.createElement("div");
    const actions = document.createElement("div");
    const availabilitySelect = document.createElement("select");
    const availability = getPersonAvailability(person);
    const editable = canEditPerson(person);

    row.className = `person-row person-row-${availability}`;
    meta.className = "person-meta";
    actions.className = "person-actions";
    availabilitySelect.className = `person-availability person-availability-${availability}`;
    availabilitySelect.setAttribute("aria-label", `Tillgänglighet för ${person.name}`);
    availabilitySelect.title = availability === "available"
      ? `${person.name} är tillgänglig.`
      : getUnavailableMessage(person);
    availabilitySelect.disabled = !editable;

    const details = [person.company, getShiftName(person.shiftId) || "Inget skift"].filter(Boolean).join(" · ");
    meta.innerHTML = `
      <h3 title="${escapeHtml(availabilitySelect.title)}">${escapeHtml(person.name)}</h3>
      <p>${shiftColorDot(person.shiftId)}${escapeHtml(details)}</p>
      <span class="person-role-badge${person.account ? ` role-${escapeHtml(person.account.role)}` : " no-account"}">${escapeHtml(describeAccount(person))}</span>
    `;

    availabilityOptionsFor(availability).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = availability === value;
      availabilitySelect.appendChild(option);
    });

    availabilitySelect.addEventListener("change", async () => {
      const nextAvailability = availabilitySelect.value;
      availabilitySelect.disabled = true;
      try {
        // The server logs the change in the shift's history.
        await updatePerson(person.id, { availability: nextAvailability });
        if (nextAvailability !== "available" && person.shiftId) await removePersonFromSelectedWeek(person.id, person.shiftId);
      } finally {
        await refreshAppViews();
      }
    });

    actions.append(availabilitySelect);
    if (editable) {
      const editBtn = document.createElement("button");
      editBtn.className = "btn";
      editBtn.type = "button";
      editBtn.textContent = "Redigera";
      editBtn.addEventListener("click", () => void editPerson(person.id));
      actions.append(editBtn);
    }
    // Removing people and their logins is reserved for admins.
    if (isAdmin() && person.id !== currentPerson?.id) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn danger";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Ta bort";
      deleteBtn.addEventListener("click", () => void deletePerson(person.id));
      actions.append(deleteBtn);
    }
    row.append(meta, actions);
    list.appendChild(row);
  });
  if (!people.length) {
    list.innerHTML = `<div class="empty-state">${allPeople.length ? "Ingen personal matchar filtret." : "Ingen personal har lagts till ännu."}</div>`;
  }
}

const MAX_TEST_RESULT_SCORE = 3;

function getTestResultClass(score) {
  if (score === "" || score === null || score === undefined) return "not-tested";
  const numericScore = Number(score);
  if (numericScore >= 3) return "test-high";
  if (numericScore >= 2) return "test-medium";
  return "test-low";
}

async function renderTestResults() {
  const root = document.getElementById("testResultsGrid");
  if (!root) return;

  const [allPeople, departments, results] = await Promise.all([
    getEvaluatedPeople(),
    getDepartmentsFor("showInTestResults"),
    getTestResults()
  ]);
  const testQuery = (document.getElementById("testSearch")?.value || "").trim().toLocaleLowerCase();
  const people = allPeople.filter(person => !testQuery || `${person.name} ${person.company || ""}`.toLocaleLowerCase().includes(testQuery));
  // Adding or removing a department changes every shift's results, so only admins do it.
  if (!isAdmin()) document.querySelector(".department-manager")?.remove();
  const form = document.getElementById("departmentForm");
  const input = document.getElementById("departmentNameInput");
  const message = document.getElementById("departmentMessage");
  const departmentList = document.getElementById("departmentList");

  if (form && input && form.dataset.bound !== "true") {
    form.dataset.bound = "true";
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const name = input.value.trim();
      const currentDepartments = await getDepartments();

      if (!name) return;
      if (currentDepartments.some(item => item.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        if (message) {
          message.textContent = "Avdelningen finns redan.";
          message.className = "inline-message error";
        }
        return;
      }

      currentDepartments.push(name);
      await saveDepartments(currentDepartments);
      await addAuditEvent("department", `${name} tillagd`, "Ny avdelning");
      input.value = "";
      if (message) {
        message.textContent = `${name} har lagts till.`;
        message.className = "inline-message success";
      }
      await renderTestResults();
      await renderMachineSkills();
      await renderTrainingReminders();
    });
  }

  if (departmentList) {
    departmentList.innerHTML = "";
    departments.forEach(department => {
      const chip = document.createElement("div");
      const name = document.createElement("span");
      const removeButton = document.createElement("button");
      chip.className = "department-chip";
      name.textContent = department;
      removeButton.type = "button";
      removeButton.className = "department-remove";
      removeButton.textContent = "×";
      removeButton.setAttribute("aria-label", `Ta bort ${department}`);
      removeButton.title = `Ta bort ${department}`;
      removeButton.addEventListener("click", async () => {
        const shouldRemove = confirm(
          `Vill du ta bort ${department}? Testresultat och maskinbehörighet för avdelningen tas också bort.`
        );
        if (!shouldRemove) return;

        const [currentDepartments, currentResults, currentSkills, currentRestrictions, currentDetails] = await Promise.all([
          getDepartments(),
          getTestResults(),
          getMachineSkills(),
          getMachineRestrictions(),
          getMachineSkillDetails()
        ]);
        const updatedDepartments = currentDepartments.filter(item => item !== department);
        Object.values(currentResults).forEach(personResults => {
          if (personResults && typeof personResults === "object") {
            delete personResults[department];
          }
        });
        Object.keys(currentSkills).forEach(personId => {
          if (Array.isArray(currentSkills[personId])) {
            currentSkills[personId] = currentSkills[personId].filter(item => item !== department);
          }
        });
        Object.keys(currentRestrictions).forEach(personId => {
          if (Array.isArray(currentRestrictions[personId])) {
            currentRestrictions[personId] =
              currentRestrictions[personId].filter(item => item !== department);
          }
        });
        Object.values(currentDetails).forEach(personDetails => { if (personDetails && typeof personDetails === "object") delete personDetails[department]; });

        await Promise.all([
          saveDepartments(updatedDepartments),
          saveTestResults(currentResults),
          saveMachineSkills(currentSkills),
          saveMachineRestrictions(currentRestrictions),
          saveMachineSkillDetails(currentDetails)
        ]);
        await addAuditEvent("department", `${department} borttagen`, "Resultat och kompetenser rensades");
        if (message) {
          message.textContent = `${department} har tagits bort.`;
          message.className = "inline-message success";
        }
        await renderTestResults();
        await renderMachineSkills();
        await renderTrainingReminders();
      });
      chip.append(name, removeButton);
      departmentList.appendChild(chip);
    });
  }

  root.innerHTML = "";
  root.className = "assessment-layout test-results-layout";
  if (!people.length) {
    root.innerHTML = `<div class="empty-state">${allPeople.length ? "Ingen personal matchar sökningen." : "Lägg till personal innan du registrerar testresultat."}</div>`;
    return;
  }

  if (selectedTestPersonId && !people.some(person => person.id === selectedTestPersonId)) {
    selectedTestPersonId = "";
  }

  const peoplePanel = document.createElement("aside");
  const peopleList = document.createElement("div");
  peoplePanel.className = "assessment-people-panel card";
  peoplePanel.innerHTML = `
    <div class="assessment-panel-heading">
      <div><h3>Medarbetare</h3><p>${people.length} personer</p></div>
    </div>
  `;
  peopleList.className = "assessment-people-list";

  people.forEach(person => {
    const testedCount = departments.filter(
      department => results[person.id]?.[department] !== undefined
    ).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `assessment-person-button status-none${
      person.id === selectedTestPersonId ? " active" : ""
    }`;
    button.innerHTML = `
      <span>${escapeHtml(person.name)}</span>
      <small>${testedCount} av ${departments.length} testade</small>
    `;
    button.addEventListener("click", async () => {
      selectedTestPersonId = person.id;
      await renderTestResults();
    });
    peopleList.appendChild(button);
  });
  peoplePanel.appendChild(peopleList);

  const content = document.createElement("section");
  content.className = "assessment-content card test-result-content";
  const selectedPerson = people.find(person => person.id === selectedTestPersonId);

  if (!selectedPerson) {
    content.innerHTML = `
      <div class="assessment-empty-state">
        <strong>Välj en medarbetare</strong>
        <p>Personens testresultat visas här efter att du har valt ett namn.</p>
      </div>
    `;
    root.append(peoplePanel, content);
    return;
  }

  const heading = document.createElement("div");
  const fields = document.createElement("div");
  heading.className = "competency-person-heading test-result-person-heading";
  heading.innerHTML = `
    <div><h3>${escapeHtml(selectedPerson.name)}</h3><p>${escapeHtml(selectedPerson.company || "Inget företag")}</p></div>
    <span>Testresultat</span>
  `;
  fields.className = "test-department-grid";

  departments.forEach(department => {
      const field = document.createElement("label");
      const label = document.createElement("span");
      const inputWrap = document.createElement("div");
      const scoreInput = document.createElement("input");
      const suffix = document.createElement("small");
      const storedScore = results[selectedPerson.id]?.[department] ?? "";
      const displayedScore = storedScore === ""
        ? ""
        : Math.max(0, Math.min(MAX_TEST_RESULT_SCORE, Math.round(Number(storedScore))));
      field.className = "test-score-field";
      label.textContent = department;
      inputWrap.className = `test-score-input ${getTestResultClass(displayedScore)}`;
      scoreInput.type = "number";
      scoreInput.min = "0";
      scoreInput.max = String(MAX_TEST_RESULT_SCORE);
      scoreInput.step = "1";
      scoreInput.inputMode = "numeric";
      scoreInput.value = displayedScore;
      scoreInput.placeholder = "—";
      scoreInput.setAttribute("aria-label", `${selectedPerson.name}, ${department}`);
      suffix.textContent = `/ ${MAX_TEST_RESULT_SCORE}`;

      scoreInput.addEventListener("change", async () => {
        let value = scoreInput.value === "" ? "" : Math.round(Number(scoreInput.value));
        if (value !== "") value = Math.max(0, Math.min(MAX_TEST_RESULT_SCORE, value));
        scoreInput.value = value;
        results[selectedPerson.id] ??= {};
        if (value === "") delete results[selectedPerson.id][department];
        else results[selectedPerson.id][department] = value;
        inputWrap.className = `test-score-input ${getTestResultClass(value)}`;
        await saveTestResults(results);
        await addAuditEvent("test", `${selectedPerson.name}: ${department}`, value === "" ? "Resultat borttaget" : `Resultat ${value}/${MAX_TEST_RESULT_SCORE}`, { action: "test", personId: selectedPerson.id, department, value: storedScore });
      });

      inputWrap.append(scoreInput, suffix);
      field.append(label, inputWrap);
      fields.appendChild(field);
    });
  content.append(heading, fields);
  root.append(peoplePanel, content);
}

async function renderTrainingReminders() {
  const main = document.querySelector("#appShell .main");
  if (!main) return;
  // Planning training means editing competence, which only admins do.
  if (!isAdmin()) {
    document.getElementById("trainingReminderPanel")?.remove();
    return;
  }

  const dismissedDay = localStorage.getItem(TRAINING_REMINDER_DISMISSED_KEY);
  const currentDay = formatDateKey(new Date());
  if (dismissedDay === currentDay) {
    document.getElementById("trainingReminderPanel")?.remove();
    return;
  }
  if (dismissedDay) localStorage.removeItem(TRAINING_REMINDER_DISMISSED_KEY);

  const [people, departments, skills, timestamps] = await Promise.all([
    getPeople(),
    getDepartmentsFor("showInCompetency"),
    getMachineSkills(),
    getMachineSkillUpdatedAt()
  ]);
  const now = Date.now();
  const monthInMilliseconds = 30 * 24 * 60 * 60 * 1000;
  let timestampsChanged = false;

  people.forEach(person => {
    if (!timestamps[person.id]) {
      timestamps[person.id] = new Date(now).toISOString();
      timestampsChanged = true;
    }
  });
  if (timestampsChanged) await saveMachineSkillUpdatedAt(timestamps);

  const reminders = people.flatMap(person => {
    const personSkills = Array.isArray(skills[person.id]) ? skills[person.id] : [];
    const learnedCount = personSkills.filter(machine => departments.includes(machine)).length;
    const lastUpdated = new Date(timestamps[person.id]).getTime();
    const elapsed = Number.isFinite(lastUpdated) ? now - lastUpdated : 0;
    const knowsEveryMachine = departments.length > 0 && learnedCount >= departments.length;

    if (learnedCount !== 1 || knowsEveryMachine || elapsed < monthInMilliseconds) return [];
    return [{
      person,
      machine: personSkills.find(item => departments.includes(item)) || personSkills[0],
      days: Math.floor(elapsed / (24 * 60 * 60 * 1000))
    }];
  });

  let panel = document.getElementById("trainingReminderPanel");
  if (!reminders.length) {
    panel?.remove();
    return;
  }

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "trainingReminderPanel";
    panel.className = "training-reminder-panel";
    const header = main.querySelector(".header");
    if (header) header.insertAdjacentElement("afterend", panel);
    else main.prepend(panel);
  }

  panel.innerHTML = `
    <div class="training-reminder-icon" aria-hidden="true">!</div>
    <div class="training-reminder-content">
      <div class="training-reminder-heading">
        <div>
          <span>Utbildningspåminnelse</span>
          <strong>Dags att planera ny maskinutbildning</strong>
        </div>
        <span class="training-reminder-count">${reminders.length}</span>
      </div>
      <p>Följande personer har endast en maskin registrerad och ingen ny kompetens har lagts till på minst 30 dagar.</p>
      <div class="training-reminder-people">
        ${reminders.map(item => `
          <div class="training-reminder-person" title="${escapeHtml(item.person.name)} behöver en ny utbildningsplan">
            <span>${escapeHtml(item.person.name)}</span>
            <small>${escapeHtml(item.machine || "En maskin")} · ${item.days} dagar</small>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="training-reminder-actions">
      <a class="btn primary training-reminder-action" href="maskiner.html">Planera utbildning</a>
      <button class="btn training-reminder-close" type="button">Stäng</button>
    </div>
  `;
  panel.querySelector(".training-reminder-close").addEventListener("click", () => {
    localStorage.setItem(TRAINING_REMINDER_DISMISSED_KEY, currentDay);
    panel.remove();
  });
}

// Admins choose which shift the competence page shows: one shift or "Alla skift".
// This only filters the view; nobody's competence or shift is changed.
function ensureCompetencyShiftFilter() {
  const bar = document.getElementById("machineSearch")?.closest(".filter-bar");
  if (!bar || !isAdmin() || document.getElementById("competencyShiftFilter")) return;
  const select = document.createElement("select");
  select.id = "competencyShiftFilter";
  select.setAttribute("aria-label", "Visa skift");
  select.innerHTML = `<option value="">Alla skift</option>${shifts.map(shift => `<option value="${escapeHtml(shift.id)}">${escapeHtml(shiftOptionLabel(shift))}</option>`).join("")}`;
  const stored = sessionStorage.getItem(COMPETENCY_SHIFT_KEY) || "";
  select.value = shifts.some(shift => shift.id === stored) ? stored : "";
  select.addEventListener("change", () => {
    sessionStorage.setItem(COMPETENCY_SHIFT_KEY, select.value);
    void renderMachineSkills();
  });
  bar.prepend(select);
}

function getCompetencyShiftFilter() {
  return isAdmin() ? document.getElementById("competencyShiftFilter")?.value || "" : getShiftScope();
}

// The people on the competence page. Admins see the chosen shift, or everyone in a shift.
async function getCompetencyPeople() {
  if (!isAdmin()) return getEvaluatedPeople();
  const shiftId = getCompetencyShiftFilter();
  return (await getAllPeople()).filter(person =>
    shiftId ? person.shiftId === shiftId : shifts.some(shift => shift.id === person.shiftId)
  );
}

async function renderMachineSkills() {
  const root = document.getElementById("machineSkillsGrid");
  if (!root) return;

  ensureCompetencyShiftFilter();
  const [allPeople, departments, skills, timestamps, restrictions, details] = await Promise.all([
    getCompetencyPeople(),
    getDepartmentsFor("showInCompetency"),
    getMachineSkills(),
    getMachineSkillUpdatedAt(),
    getMachineRestrictions(),
    getMachineSkillDetails()
  ]);
  const machineQuery = (document.getElementById("machineSearch")?.value || "").trim().toLocaleLowerCase();
  const machineFilter = document.getElementById("machineFilter")?.value || "";
  const people = allPeople.filter(person => {
    const personSkills = Array.isArray(skills[person.id]) ? skills[person.id] : [];
    const personRestrictions = Array.isArray(restrictions[person.id]) ? restrictions[person.id] : [];
    const matchesQuery = !machineQuery || `${person.name} ${person.company || ""}`.toLocaleLowerCase().includes(machineQuery);
    const matchesFilter = !machineFilter ||
      (machineFilter === "complete" && departments.length > 0 && departments.every(item => personSkills.includes(item))) ||
      (machineFilter === "incomplete" && !departments.every(item => personSkills.includes(item))) ||
      (machineFilter === "restricted" && personRestrictions.includes("GD"));
    return matchesQuery && matchesFilter;
  });
  const nowIso = new Date().toISOString();
  let timestampsChanged = false;
  people.forEach(person => {
    if (!timestamps[person.id]) {
      timestamps[person.id] = nowIso;
      timestampsChanged = true;
    }
  });
  if (timestampsChanged) await saveMachineSkillUpdatedAt(timestamps);
  root.innerHTML = "";

  if (!people.length) {
    root.innerHTML = `<div class="empty-state">${allPeople.length ? "Ingen personal matchar filtret." : "Lägg till personal innan du registrerar maskinbehörighet."}</div>`;
    return;
  }

  const summary = document.createElement("section");
  summary.className = "competency-department-summary";
  summary.innerHTML = departments.map(department => {
    const count = allPeople.filter(person =>
      Array.isArray(skills[person.id]) && skills[person.id].includes(department)
    ).length;
    return `<article data-department-summary="${escapeHtml(department)}"><span>${escapeHtml(department)}</span><strong>${count}</strong><small>av ${allPeople.length} personer</small></article>`;
  }).join("");
  const refreshDepartmentCount = department => {
    const count = allPeople.filter(person =>
      Array.isArray(skills[person.id]) && skills[person.id].includes(department)
    ).length;
    [...summary.querySelectorAll("[data-department-summary]")]
      .find(item => item.dataset.departmentSummary === department)
      ?.querySelector("strong")?.replaceChildren(String(count));
  };

  if (selectedCompetencyPersonId && !people.some(person => person.id === selectedCompetencyPersonId)) {
    selectedCompetencyPersonId = "";
  }
  root.className = "assessment-layout competency-layout";
  const peoplePanel = document.createElement("aside");
  const peopleList = document.createElement("div");
  const content = document.createElement("section");
  peoplePanel.className = "assessment-people-panel card competency-people-panel";
  const shownShiftId = getCompetencyShiftFilter();
  const shiftLabel = shownShiftId ? getShiftName(shownShiftId) : "Alla skift";
  peoplePanel.innerHTML = `<div class="assessment-panel-heading"><div><h3>Medarbetare</h3><p>${people.length} personer${isAdmin() && shiftLabel ? ` · ${escapeHtml(shiftLabel)}` : ""}</p></div></div>`;
  peopleList.className = "assessment-people-list";
  people.forEach(person => {
    const personSkills = Array.isArray(skills[person.id]) ? skills[person.id] : [];
    const isRestricted = Array.isArray(restrictions[person.id]) && restrictions[person.id].includes("GD");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.personId = person.id;
    button.className = `assessment-person-button competency-person-button status-${personSkills.length >= departments.length && departments.length ? "ready" : personSkills.length ? "one" : "none"}${person.id === selectedCompetencyPersonId ? " active" : ""}`;
    // With every shift shown, a colored dot tells which shift each person belongs to.
    button.innerHTML = `<span>${isAdmin() && !shownShiftId ? shiftColorDot(person.shiftId) : ""}${escapeHtml(person.name)}</span><small>${personSkills.length} av ${departments.length}${isRestricted ? " · Får inte GD" : ""}</small>`;
    button.title = isAdmin() && !shownShiftId ? getShiftName(person.shiftId) : "";
    button.addEventListener("click", () => { selectedCompetencyPersonId = person.id; void renderMachineSkills(); });
    peopleList.appendChild(button);
  });
  peoplePanel.appendChild(peopleList);
  content.className = "assessment-content card competency-content";
  const selectedPerson = people.find(person => person.id === selectedCompetencyPersonId);
  if (!selectedPerson) {
    content.innerHTML = `<div class="competency-empty-state"><span>✓</span><strong>Välj en medarbetare</strong><p>Personens maskinkompetenser och utbildningsuppgifter visas här.</p></div>`;
    root.append(summary, peoplePanel, content);
    return;
  }

  {
    const person = selectedPerson;
    const card = document.createElement("article");
    const heading = document.createElement("div");
    const machineGrid = document.createElement("div");
    const personSkills = new Set(Array.isArray(skills[person.id]) ? skills[person.id] : []);
    const personRestrictions = new Set(
      Array.isArray(restrictions[person.id]) ? restrictions[person.id] : []
    );
    card.className = "competency-person-card";
    heading.className = "competency-person-heading";
    heading.innerHTML = `
      <div><h3>${escapeHtml(person.name)}</h3><p>${escapeHtml(person.company || "Inget företag")}</p></div>
      <span>${personSkills.size} av ${departments.length}</span>
    `;
    machineGrid.className = "machine-skill-grid";

    departments.forEach(department => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      const indicator = document.createElement("span");
      const text = document.createElement("span");
      const isRestricted = department === "GD" && personRestrictions.has("GD");
      label.className = `machine-skill${personSkills.has(department) ? " is-qualified" : ""}${
        isRestricted ? " is-restricted" : ""
      }`;
      checkbox.type = "checkbox";
      checkbox.checked = personSkills.has(department);
      indicator.className = "machine-skill-indicator";
      text.textContent = department;
      checkbox.addEventListener("change", async () => {
        if (checkbox.checked) {
          personSkills.add(department);
          if (department === "GD") personRestrictions.delete("GD");
        }
        else personSkills.delete(department);
        skills[person.id] = [...personSkills];
        restrictions[person.id] = [...personRestrictions];
        refreshDepartmentCount(department);
        label.classList.toggle("is-qualified", checkbox.checked);
        label.classList.remove("is-restricted");
        const restrictionButton = label.querySelector(".gd-restriction-toggle");
        if (restrictionButton) {
          restrictionButton.setAttribute("aria-pressed", "false");
        }
        heading.querySelector(":scope > span").textContent =
          `${personSkills.size} av ${departments.length}`;
        const listStatus = peoplePanel.querySelector(`[data-person-id="${person.id}"] small`);
        if (listStatus) listStatus.textContent = `${personSkills.size} av ${departments.length}`;
        if (checkbox.checked) timestamps[person.id] = new Date().toISOString();
        await Promise.all([
          saveMachineSkills(skills),
          saveMachineSkillUpdatedAt(timestamps),
          saveMachineRestrictions(restrictions)
        ]);
        await addAuditEvent("competency", `${person.name}: ${department}`, checkbox.checked ? "Kompetens tillagd" : "Kompetens borttagen", { action: "skill", personId: person.id, department, enabled: !checkbox.checked });
        await renderTrainingReminders();
      });
      label.append(checkbox, indicator, text);

      if (department === "GD") {
        const restrictionButton = document.createElement("button");
        restrictionButton.type = "button";
        restrictionButton.className = "gd-restriction-toggle";
        restrictionButton.textContent = "Får inte";
        restrictionButton.setAttribute("aria-pressed", String(isRestricted));
        restrictionButton.title = "Personen får inte arbeta på GD";
        restrictionButton.addEventListener("click", async event => {
          event.preventDefault();
          event.stopPropagation();
          const shouldRestrict = !personRestrictions.has("GD");
          if (shouldRestrict) {
            personRestrictions.add("GD");
            personSkills.delete("GD");
            checkbox.checked = false;
            label.classList.remove("is-qualified");
          } else {
            personRestrictions.delete("GD");
          }
          label.classList.toggle("is-restricted", shouldRestrict);
          restrictionButton.setAttribute("aria-pressed", String(shouldRestrict));
          skills[person.id] = [...personSkills];
          restrictions[person.id] = [...personRestrictions];
          refreshDepartmentCount(department);
          heading.querySelector(":scope > span").textContent =
            `${personSkills.size} av ${departments.length}`;
          const listStatus = peoplePanel.querySelector(`[data-person-id="${person.id}"] small`);
          if (listStatus) listStatus.textContent = `${personSkills.size} av ${departments.length}${shouldRestrict ? " · Får inte GD" : ""}`;
          await Promise.all([
            saveMachineSkills(skills),
            saveMachineRestrictions(restrictions)
          ]);
          await addAuditEvent("restriction", `${person.name}: GD`, shouldRestrict ? "Får inte aktiverad" : "Får inte borttagen", { action: "restriction", personId: person.id, enabled: !shouldRestrict });
          await renderTrainingReminders();
        });
        label.appendChild(restrictionButton);
      }
      const detailPanel = document.createElement("div");
      const savedDetail = details[person.id]?.[department] || {};
      detailPanel.className = `machine-detail-panel${checkbox.checked ? "" : " hidden"}`;
      detailPanel.innerHTML = `
        <label>Nivå<select class="skill-level"><option value="training">Under upplärning</option><option value="independent">Självständig</option><option value="trainer">Kan lära ut</option></select></label>
        <label>Datum<input class="skill-date" type="date" value="${escapeHtml(savedDetail.date || "")}" /></label>
        <label>Utbildare<input class="skill-trainer" value="${escapeHtml(savedDetail.trainer || "")}" placeholder="Namn" /></label>
        <label class="skill-notes-label">Anteckning<input class="skill-notes" value="${escapeHtml(savedDetail.notes || "")}" placeholder="Valfri anteckning" /></label>
      `;
      detailPanel.querySelector(".skill-level").value = savedDetail.level || "independent";
      const saveDetail = async () => {
        details[person.id] ??= {};
        details[person.id][department] = {
          level: detailPanel.querySelector(".skill-level").value,
          date: detailPanel.querySelector(".skill-date").value,
          trainer: detailPanel.querySelector(".skill-trainer").value.trim(),
          notes: detailPanel.querySelector(".skill-notes").value.trim()
        };
        await saveMachineSkillDetails(details);
        await addAuditEvent("competency", `${person.name}: ${department} uppdaterad`, getAvailabilityLabel("available"));
      };
      detailPanel.querySelectorAll("input, select").forEach(field => field.addEventListener("change", saveDetail));
      checkbox.addEventListener("change", () => detailPanel.classList.toggle("hidden", !checkbox.checked));
      const machineItem = document.createElement("div");
      machineItem.className = "machine-skill-item";
      machineItem.append(label, detailPanel);
      machineGrid.appendChild(machineItem);
    });
    card.append(heading, machineGrid);
    content.appendChild(card);
  }
  root.append(summary, peoplePanel, content);
}

async function getScheduleForDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay();
  date.setDate(date.getDate() - weekday + (weekday === 0 ? -6 : 1));
  const weekKey = formatDateKey(date);
  const schedule = await getShiftDocument(`schedule:${weekKey}`, null);
  return schedule ? normalizeSchedule(schedule) : createEmptySchedule();
}

async function getTrainingLocationsForDate(dateKey) {
  const { weekKey } = getScheduleDayForDate(dateKey);
  const locations = await getShiftDocument(`trainingLocations:${weekKey}`, null);
  return locations ? normalizeTrainingLocations(locations) : createEmptyTrainingLocations();
}

// The person scheduled for training at a work place on a day, or "". Training staffs the
// place, but the person keeps their registered competence; training adds none.
function getTraineeAtWorkplace(schedule, trainingLocations, workplace, day) {
  if (!day) return "";
  const task = TASKS.filter(isTrainingTaskName)
    .find(item => schedule?.[item]?.[day] && trainingLocations?.[item]?.[day] === workplace);
  return task ? schedule[task][day] : "";
}

function showProductionCelebration(total, previousRecord) {
  const notice = document.createElement("div");
  notice.className = "record-celebration";
  notice.innerHTML = `<span>★</span><div><small>NYTT FABRIKSREKORD</small><strong>Bra jobbat!</strong><p>${total} box · tidigare rekord ${previousRecord}</p></div><button type="button">×</button>`;
  document.body.appendChild(notice);
  const close = () => notice.remove();
  notice.querySelector("button").addEventListener("click", close);
  setTimeout(close, 8000);
}

const PRODUCTION_CANS_PER_BOX = 240;

function convertProductionCansToBoxes(value) {
  if (value === "" || value === null || value === undefined) return "";
  const cans = Number(value);
  if (!Number.isSafeInteger(cans) || cans < 0) return null;
  const wholeBoxes = Math.floor(cans / PRODUCTION_CANS_PER_BOX);
  const remainingCans = cans % PRODUCTION_CANS_PER_BOX;
  // Compare whole cans at the 0.6 threshold to avoid floating-point boundary errors.
  return wholeBoxes + (remainingCans >= PRODUCTION_CANS_PER_BOX * 0.6 ? 1 : 0);
}

// Everything typed on the production page is saved automatically, shortly after
// the last change. The pending save lives outside renderProduction so it can be
// finished before the page is drawn again or left.
const PRODUCTION_AUTOSAVE_DELAY = 700;
const productionAutosave = { timer: null, run: null, saving: Promise.resolve() };
const productionAuditedDates = new Set();
const productionCelebratedDates = new Set();

function flushProductionAutosave() {
  clearTimeout(productionAutosave.timer);
  productionAutosave.timer = null;
  const run = productionAutosave.run;
  productionAutosave.run = null;
  if (run) productionAutosave.saving = productionAutosave.saving.catch(() => {}).then(run);
  return productionAutosave.saving.catch(() => {});
}

window.addEventListener("pagehide", () => void flushProductionAutosave());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") void flushProductionAutosave();
});
window.addEventListener("beforeunload", event => {
  if (productionAutosave.run) { void flushProductionAutosave(); event.preventDefault(); }
});

// Saves one day and/or a target change, merged into the latest records and settings
// so other days and changes saved meanwhile are kept.
async function saveProductionDay(scope, dayRecord, targetChange = null) {
  const [records, settings] = await Promise.all([getProductionRecords(scope), getProductionSettings()]);
  let next = targetChange ? setProductionTargetFrom(settings, scope, targetChange.date, targetChange.target) : { ...settings };
  if (!dayRecord) {
    if (JSON.stringify(next) !== JSON.stringify(settings)) await saveProductionSettings(next);
    return { records, settings: next, brokeRecord: false, previousRecord: settings.factoryRecord };
  }
  records[dayRecord.date] = dayRecord;
  const setRecordEarlier = settings.recordDate === dayRecord.date;
  const recordToBeat = setRecordEarlier ? settings.recordPrevious : settings.factoryRecord;
  if (setRecordEarlier) next.factoryRecord = Math.max(recordToBeat, dayRecord.total);
  if (dayRecord.total > recordToBeat) {
    Object.assign(next, { factoryRecord: dayRecord.total, recordDate: dayRecord.date, recordPrevious: recordToBeat });
  } else if (setRecordEarlier) {
    Object.assign(next, { recordDate: "", recordPrevious: 0 });
  }
  await saveProductionRecords(records, scope);
  if (JSON.stringify(next) !== JSON.stringify(settings)) await saveProductionSettings(next);
  return { records, settings: next, brokeRecord: dayRecord.total > recordToBeat, previousRecord: recordToBeat };
}

function renderProductionHistory(root, records, settings, scope) {
  const section = root.querySelector(".production-history");
  if (!section) return;
  const days = Object.values(records).filter(item => item?.date).sort((a, b) => b.date.localeCompare(a.date));
  section.innerHTML = `<div class="production-history-heading"><div><h3>Historik</h3><p>Klicka på en dag för att visa eller ta bort resultatet. Förra månadens dagar tas bort automatiskt den 10:e.</p></div><span>${days.length} dagar</span></div><div class="production-history-list">${days.map(item => `<div class="production-history-item"><button type="button" data-production-menu="${item.date}" class="production-history-trigger ${item.date === selectedProductionDate ? "active" : ""}"><span>${new Date(item.date + "T12:00:00").toLocaleDateString("sv-SE")}</span><strong>${item.total || 0} box</strong><small class="${Number(item.total) >= getProductionTarget(settings, scope, item.date, item) ? "history-met" : "history-missed"}">${Number(item.total) >= getProductionTarget(settings, scope, item.date, item) ? "Mål uppnått" : "Under mål"}</small></button><div class="production-history-menu" data-production-actions="${item.date}" hidden><button type="button" data-production-view="${item.date}">Visa</button><button type="button" class="danger" data-production-delete="${item.date}">Ta bort</button></div></div>`).join("") || '<div class="empty-state">Ingen produktion sparad ännu.</div>'}</div>`;
  section.querySelectorAll("[data-production-menu]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const menu = section.querySelector(`[data-production-actions="${button.dataset.productionMenu}"]`);
    section.querySelectorAll(".production-history-menu").forEach(item => {
      if (item !== menu) item.hidden = true;
    });
    if (menu) menu.hidden = !menu.hidden;
  }));
  section.querySelectorAll("[data-production-view]").forEach(button => button.addEventListener("click", async () => {
    await flushProductionAutosave();
    selectedProductionDate = button.dataset.productionView;
    void renderProduction();
  }));
  section.querySelectorAll("[data-production-delete]").forEach(button => button.addEventListener("click", async () => {
    const date = button.dataset.productionDelete;
    const displayDate = new Date(date + "T12:00:00").toLocaleDateString("sv-SE");
    if (!confirm(`Vill du ta bort produktionsresultatet för ${displayDate}?`)) return;
    await flushProductionAutosave();
    const scope = getShiftScope();
    const latest = await getProductionRecords(scope);
    delete latest[date];
    await saveProductionRecords(latest, scope);
    await addAuditEvent("production", `Produktion ${date} borttagen`, "Resultatet raderades från historiken");
    await renderProduction();
    await renderDashboard();
  }));
}

async function renderProduction() {
  const root = document.getElementById("productionPage");
  if (!root) return;
  await flushProductionAutosave();
  const scope = getShiftScope();
  const retentionStart = getProductionRetentionStart();
  if (selectedProductionDate < retentionStart) selectedProductionDate = formatDateKey(new Date());
  const [people, records, settings, schedule, trainingLocations] = await Promise.all([
    getPeople(), getProductionRecords(scope), getProductionSettings(), getScheduleForDate(selectedProductionDate),
    getTrainingLocationsForDate(selectedProductionDate)
  ]);
  const configuredMachines = appSettings.productionMachines;
  const machines = [...new Set([...configuredMachines, ...Object.keys(records[selectedProductionDate]?.machines || {})])];
  const stored = records[selectedProductionDate];
  const dayIndex = (() => {
    const [year, month, day] = selectedProductionDate.split("-").map(Number);
    const value = new Date(year, month - 1, day).getDay();
    return value >= 1 && value <= 5 ? value - 1 : -1;
  })();
  const scheduleDay = dayIndex >= 0 ? ALL_DAYS[dayIndex] : "";
  // A person in training at a machine staffs it when nobody else is scheduled there.
  const scheduledOperator = (currentSchedule, currentLocations, machine) => scheduleDay
    ? currentSchedule[machine]?.[scheduleDay] || getTraineeAtWorkplace(currentSchedule, currentLocations, machine, scheduleDay)
    : "";
  const traineeName = machine => {
    const personId = getTraineeAtWorkplace(schedule, trainingLocations, machine, scheduleDay);
    return personId ? people.find(person => person.id === personId)?.name || "Borttagen person" : "";
  };
  const record = stored || {
    date: selectedProductionDate,
    machines: Object.fromEntries(machines.map(machine => [machine, {
      personId: scheduledOperator(schedule, trainingLocations, machine), result: "", waste: "", comment: ""
    }]))
  };
  const total = machines.reduce((sum, machine) => sum + (Number(record.machines?.[machine]?.result) || 0), 0);
  const target = getProductionTarget(settings, scope, selectedProductionDate, record);
  const month = selectedProductionDate.slice(0, 7);
  const otherMonthDays = Object.values(records).filter(item => item.date?.startsWith(month) && item.date !== selectedProductionDate);
  const otherMonthTotal = otherMonthDays.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const monthName = new Date(selectedProductionDate + "T12:00:00").toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  const monthDaysText = days => `${days} ${days === 1 ? "dag" : "dagar"} med resultat`;
  const savedText = stored?.updatedAt ? `Sparat ${new Date(stored.updatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}` : "Sparas automatiskt";
  const personOptions = (selectedId, savedName = "") => `<option value="">Välj person</option>${selectedId && !people.some(person => person.id === selectedId) ? `<option value="${selectedId}" selected>${escapeHtml(savedName || "Tidigare personal")}</option>` : ""}${people.map(person => `<option value="${person.id}"${person.id === selectedId ? " selected" : ""}>${escapeHtml(person.name)}</option>`).join("")}`;
  root.innerHTML = `
    <section class="production-month card" aria-live="polite"><div><small>SKIFTETS PRODUKTION · <span class="production-month-name">${escapeHtml(monthName)}</span></small><strong><span id="productionMonthTotal">${otherMonthTotal + total}</span> box</strong></div><span id="productionMonthDays" class="production-month-days">${monthDaysText(otherMonthDays.length + (stored ? 1 : 0))}</span></section>
    <div class="production-toolbar card"><label>Datum<input id="productionDate" type="date" min="${retentionStart}" value="${selectedProductionDate}" /></label><div class="production-settings"><label><span>Skiftets dagliga mål <small>· gäller från valt datum</small></span><input id="productionTarget" type="number" min="0" value="${target}" title="${canChangeProductionTarget() ? "Gäller bara det här skiftet, från valt datum och framåt. Tidigare dagar och andra skift behåller sitt mål." : "Endast skiftledare och admin kan ändra det dagliga målet."}"${canChangeProductionTarget() ? "" : " disabled"} /></label></div><button id="syncScheduleBtn" class="btn" type="button">Hämta från Schema</button><span id="productionSaveStatus" class="production-save-status" role="status" aria-live="polite">${savedText}</span></div>
    <div class="production-kpis"><article id="productionTotalCard" class="${total >= target ? "goal-card-met" : "goal-card-missed"}"><span>Dagens produktion</span><strong id="productionTotal">${total}</strong><small>box totalt</small></article><article><span>Dagligt mål</span><strong id="productionGoalValue">${target}</strong><small>box</small></article><article class="factory-record-card"><span>Fabriksrekord</span><strong id="factoryRecordValue">${settings.factoryRecord}</strong><small>officiellt rekord · uppdateras vid nytt rekord</small><button id="editFactoryRecordBtn" type="button">Ändra manuellt</button></article></div>
    <section class="production-entry card"><div class="production-heading"><div><small>DAGLIG PRODUKTION</small><h3>${new Date(selectedProductionDate + "T12:00:00").toLocaleDateString("sv-SE", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}</h3></div><span id="productionStatus" class="production-status ${total >= target ? "goal-met" : "goal-missed"}">${total >= target ? "Målet uppnått" : "Under målet"}</span></div><p class="production-conversion-note">${PRODUCTION_CANS_PER_BOX} dosor = 1 box. Ange antal dosor för automatisk omräkning, eller skriv BOX direkt. BOX avrundas uppåt från 0,6 och nedåt under 0,6.</p><div class="production-machine-list">${machines.map(machine => { const item = record.machines?.[machine] || {}; const trainee = traineeName(machine); return `<article class="production-machine-row"><strong>${escapeHtml(machine.replace("GD", "GD-"))}</strong><label>Operatör<select data-machine="${escapeHtml(machine)}" data-field="personId">${personOptions(item.personId, item.personName)}</select>${trainee ? `<span class="production-training-badge" title="${escapeHtml(trainee)} har utbildning på ${escapeHtml(machine)} enligt schemat. Kompetensen följer personens registrerade nivå.">${escapeHtml(trainee)} (Utbildning)</span>` : ""}</label><label>Antal dosor<input data-machine="${escapeHtml(machine)}" data-field="cans" class="production-cans" type="number" min="0" max="9007199254740991" step="1" inputmode="numeric" value="${escapeHtml(item.cans ?? "")}" placeholder="0" /></label><label>Resultat (BOX)<input data-machine="${escapeHtml(machine)}" data-field="result" class="production-result" type="number" min="0" step="any" inputmode="decimal" value="${escapeHtml(item.result ?? "")}" placeholder="0" /></label><label>Svinn (KG)<input data-machine="${escapeHtml(machine)}" data-field="waste" class="production-waste" type="number" min="0" step="0.01" inputmode="decimal" value="${escapeHtml(item.waste ?? "")}" placeholder="0" /></label><label class="production-comment">Kommentar<input data-machine="${escapeHtml(machine)}" data-field="comment" value="${escapeHtml(item.comment || "")}" placeholder="Kommentar, stopp eller material" /></label></article>`; }).join("")}</div></section>
    <section class="production-history card"></section>
  `;
  renderProductionHistory(root, records, settings, scope);
  const saveStatus = root.querySelector("#productionSaveStatus");
  const setSaveStatus = (text, state = "") => {
    saveStatus.textContent = text;
    saveStatus.className = `production-save-status${state ? ` is-${state}` : ""}`;
  };
  const updateSummary = () => {
    const currentTotal = [...root.querySelectorAll(".production-result")].reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    const currentTarget = Number(root.querySelector("#productionTarget").value) || 0;
    root.querySelector("#productionTotal").textContent = currentTotal;
    root.querySelector("#productionMonthTotal").textContent = otherMonthTotal + currentTotal;
    root.querySelector("#productionGoalValue").textContent = currentTarget;
    root.querySelector("#productionTotalCard").className = currentTotal >= currentTarget ? "goal-card-met" : "goal-card-missed";
    const status = root.querySelector("#productionStatus");
    status.textContent = currentTotal >= currentTarget ? "Målet uppnått" : "Under målet";
    status.className = `production-status ${currentTotal >= currentTarget ? "goal-met" : "goal-missed"}`;
  };
  const field = (machine, name) => root.querySelector(`[data-machine="${CSS.escape(machine)}"][data-field="${name}"]`);
  const collectDayRecord = () => {
    const dayRecord = { date: selectedProductionDate, target: Number(root.querySelector("#productionTarget").value) || 0, machines: {}, updatedAt: new Date().toISOString() };
    machines.forEach(machine => {
      const personId = field(machine, "personId").value;
      const cans = field(machine, "cans").value;
      dayRecord.machines[machine] = {
        personId,
        personName: people.find(person => person.id === personId)?.name || record.machines?.[machine]?.personName || "",
        cans: cans === "" ? null : Number(cans),
        result: Number(field(machine, "result").value) || 0,
        waste: Number(field(machine, "waste").value) || 0,
        comment: field(machine, "comment").value.trim()
      };
    });
    dayRecord.total = machines.reduce((sum, machine) => sum + dayRecord.machines[machine].result, 0);
    return dayRecord;
  };
  const date = selectedProductionDate;
  // Changing only the target does not create a production day for the date.
  const pending = { day: false, target: false };
  const queueSave = kind => {
    // Invalid numbers are not saved; the field shows why and the next valid change saves.
    if (![...root.querySelectorAll('input[type="number"]')].every(input => input.checkValidity())) {
      setSaveStatus("Rätta det markerade fältet för att spara", "error");
      clearTimeout(productionAutosave.timer);
      productionAutosave.run = null;
      return;
    }
    pending[kind] = true;
    const dayRecord = pending.day ? collectDayRecord() : null;
    const targetChange = pending.target ? { date, target: Number(root.querySelector("#productionTarget").value) || 0 } : null;
    setSaveStatus("Sparar…", "saving");
    clearTimeout(productionAutosave.timer);
    productionAutosave.run = async () => {
      pending.day = pending.target = false;
      try {
        const result = await saveProductionDay(scope, dayRecord, targetChange);
        if (targetChange) await addAuditEvent("production", "Dagligt mål ändrat", `Skift ${getShiftName(scope)}: ${targetChange.target} box från ${date}`);
        if (dayRecord && !productionAuditedDates.has(`${scope}|${date}`)) {
          productionAuditedDates.add(`${scope}|${date}`);
          await addAuditEvent("production", `Produktion ${date}`, `${dayRecord.total} box`);
        }
        if (!root.isConnected || selectedProductionDate !== date || getShiftScope() !== scope) return;
        if (!productionAutosave.run) setSaveStatus(`Sparat ${new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`, "saved");
        root.querySelector("#factoryRecordValue").textContent = result.settings.factoryRecord;
        Object.assign(settings, result.settings);
        renderProductionHistory(root, result.records, settings, scope);
        if (dayRecord) root.querySelector("#productionMonthDays").textContent = monthDaysText(otherMonthDays.length + 1);
        if (result.brokeRecord && !productionCelebratedDates.has(`${scope}|${date}`)) {
          productionCelebratedDates.add(`${scope}|${date}`);
          showProductionCelebration(dayRecord.total, result.previousRecord);
        }
      } catch (error) {
        if (dayRecord) pending.day = true;
        if (targetChange) pending.target = true;
        if (root.isConnected) setSaveStatus(error.message || "Det gick inte att spara. Försök igen.", "error");
        throw error;
      }
    };
    productionAutosave.timer = setTimeout(() => void flushProductionAutosave(), PRODUCTION_AUTOSAVE_DELAY);
  };
  root.querySelectorAll(".production-cans, .production-result").forEach(input => {
    const selectZero = () => {
      if (input.value !== "" && Number(input.value) === 0) input.select();
    };
    input.addEventListener("focus", selectZero);
    input.addEventListener("click", selectZero);
  });
  root.querySelectorAll(".production-cans").forEach(input => input.addEventListener("input", () => {
    if (!input.validity.valid) return;
    const boxes = convertProductionCansToBoxes(input.value);
    if (boxes === null) return;
    input.closest(".production-machine-row").querySelector(".production-result").value = boxes;
    updateSummary();
  }));
  root.querySelectorAll(".production-result").forEach(input => input.addEventListener("input", () => {
    // A manual BOX edit replaces the can-based result, so its old count must not be saved.
    input.closest(".production-machine-row").querySelector(".production-cans").value = "";
    updateSummary();
  }));
  root.querySelector("#productionTarget").addEventListener("input", updateSummary);
  root.querySelector(".production-entry").addEventListener("input", () => queueSave("day"));
  root.querySelector(".production-entry").addEventListener("change", () => queueSave("day"));
  root.querySelector("#productionTarget").addEventListener("input", () => queueSave("target"));
  root.querySelector("#productionDate").addEventListener("change", async event => {
    if (!event.target.value || !event.target.reportValidity()) return;
    await flushProductionAutosave();
    selectedProductionDate = event.target.value;
    void renderProduction();
  });
  root.querySelector("#syncScheduleBtn").addEventListener("click", async () => {
    const [currentSchedule, currentLocations] = await Promise.all([
      getScheduleForDate(selectedProductionDate), getTrainingLocationsForDate(selectedProductionDate)
    ]);
    machines.forEach(machine => { field(machine, "personId").value = scheduledOperator(currentSchedule, currentLocations, machine); });
    queueSave("day");
  });
  root.querySelector("#editFactoryRecordBtn").addEventListener("click", async () => {
    const enteredValue = prompt("Ange fabriksrekord (box):", String(settings.factoryRecord));
    if (enteredValue === null) return;
    const newRecord = Number(enteredValue);
    if (!Number.isFinite(newRecord) || newRecord < 0) {
      showAppToast("Ange ett giltigt fabriksrekord.", "error");
      return;
    }
    await flushProductionAutosave();
    const latest = await getProductionSettings();
    // A manual record is the official one; no day may lower it again.
    await saveProductionSettings({ ...latest, factoryRecord: Math.round(newRecord), recordDate: "", recordPrevious: 0 });
    await addAuditEvent("production", "Fabriksrekord ändrat", `${Math.round(newRecord)} box`);
    await renderProduction();
  });
  bindOnce(root, "click", event => {
    if (!event.target.closest(".production-history-item")) {
      root.querySelectorAll(".production-history-menu").forEach(menu => { menu.hidden = true; });
    }
  });
}

// Admin's production overview: every shift side by side.
let adminDashboardPeriod = "today";
let adminAuditOpen = false;
// The date the line overview reads the schedule for; empty means today.
let adminLinesDate = "";

// Drop-down menus (<details data-popover>) close on a click outside them or on Escape.
document.addEventListener("click", event => {
  // A click on the menu's own backdrop (the details element itself) also closes it.
  document.querySelectorAll("details[data-popover][open]").forEach(menu => {
    if (!menu.contains(event.target) || event.target === menu) menu.open = false;
  });
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (document.getElementById("scheduleViewer")?.hidden === false) return closeScheduleViewer();
  document.querySelectorAll("details[data-popover][open]").forEach(menu => {
    menu.open = false;
    menu.querySelector("summary")?.focus();
  });
});

// The pages behind "Fler inställningar" on a shift card. Each opens with that shift selected.
const SHIFT_MANAGE_LINKS = [
  ["index.html", "Ändra schema"], ["rast.html", "Rastplanering"], ["produktion.html", "Registrera produktion"],
  ["personal.html", "Personal och frånvaro"], ["anvandare.html", "Användare och inloggningar"], ["add.html", "Lägg till personal"],
  ["maskiner.html", "Kompetens"], ["testresultat.html", "Testresultat"], ["bedomning.html", "Bedömning"]
];

const sumBy = (items, value) => items.reduce((sum, item) => sum + (Number(value(item)) || 0), 0);
const formatNumber = (value, decimals = 0) => Number(value || 0).toLocaleString("sv-SE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

function getProductionDayTotal(record) {
  const machines = Object.values(record?.machines || {});
  return Number(record?.total) || sumBy(machines, machine => machine.result);
}

function getProductionDayWaste(record) {
  return sumBy(Object.values(record?.machines || {}), machine => machine.waste);
}

function getWorkplaceStaffCount(workplace) {
  return Math.max(1, Number(customWorkItems.find(item => item.name === workplace)?.staffCount) || 1);
}

// What keeps a person from a work place, with the same rules as the weekly schedule:
// the department skill, any skills the work item requires, and no GD restriction.
function workplaceSkillGaps(personId, workplace, skills, restrictions) {
  const department = getTaskDepartment(workplace);
  const personSkills = Array.isArray(skills[personId]) ? skills[personId] : [];
  const required = customWorkItems.find(item => item.name === workplace)?.requiredSkills || [];
  const personRestrictions = Array.isArray(restrictions[personId]) ? restrictions[personId] : [];
  const gaps = [...new Set([department, ...required])].filter(skill => skill && !personSkills.includes(skill))
    .map(skill => `saknar kompetens ${skill}`);
  if (department === "GD" && personRestrictions.includes("GD")) gaps.push("har GD-begränsning");
  return gaps;
}

function canStaffWorkplace(personId, workplace, skills, restrictions) {
  return Boolean(getTaskDepartment(workplace)) && !workplaceSkillGaps(personId, workplace, skills, restrictions).length;
}

// Whether every place in the workplaces can get its own person at the same time (bipartite matching).
function canStaffWorkplaces(workplaces, personIds, skills, restrictions) {
  const slots = workplaces.flatMap(workplace => Array(getWorkplaceStaffCount(workplace)).fill(workplace));
  if (slots.length > personIds.length) return false;
  const assigned = new Map();
  const assign = (slotIndex, seen) => personIds.some(personId => {
    if (seen.has(personId) || !canStaffWorkplace(personId, slots[slotIndex], skills, restrictions)) return false;
    seen.add(personId);
    if (assigned.has(personId) && !assign(assigned.get(personId), seen)) return false;
    assigned.set(personId, slotIndex);
    return true;
  });
  return slots.every((_, index) => assign(index, new Set()));
}

function getLineWorkplaces(lineId) {
  return (BREAK_LINE_WORKPLACES[lineId] || []).filter(task => TASKS.includes(task));
}

// The largest set of lines the available people can run together. Earlier lines win a tie.
function getRunnableLines(personIds, skills, restrictions) {
  const lines = Object.keys(BREAK_LINE_WORKPLACES).filter(lineId => getLineWorkplaces(lineId).length);
  let best = [];
  for (let mask = 1; mask < 2 ** lines.length; mask += 1) {
    const chosen = lines.filter((_, index) => mask & (2 ** index));
    if (chosen.length <= best.length) continue;
    const workplaces = [...new Set(chosen.flatMap(getLineWorkplaces))];
    if (canStaffWorkplaces(workplaces, personIds, skills, restrictions)) best = chosen;
  }
  return lines.map(lineId => ({ id: lineId, label: BREAK_LINE_LABELS[lineId] || lineId, runnable: best.includes(lineId) }));
}

// Rules the line overview cannot do without: the places on each line (Inställningar → Rastlinjer),
// the competence each place needs, and one person per place, since the schedule has one per place.
function getLineRuleGaps(lineId) {
  const workplaces = getLineWorkplaces(lineId);
  if (!workplaces.length) return ["Inga arbetsplatser i schemat är kopplade till linjen (Inställningar → Rastlinjer)."];
  return workplaces.flatMap(workplace => [
    ...getTaskDepartment(workplace) ? [] : [`${workplace}: ingen kompetens är kopplad till platsen.`],
    ...getWorkplaceStaffCount(workplace) > 1 ? [`${workplace}: kräver ${getWorkplaceStaffCount(workplace)} personer, men schemat har en plats per arbetsplats.`] : []
  ]);
}

// The schedule's weekday and week for a date, or no day when the date is not a work day.
function getScheduleDayForDate(dateKey) {
  const [year, month, dayOfMonth] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, dayOfMonth);
  const day = ALL_DAYS[date.getDay() - 1];
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return { day: DAYS.includes(day) ? day : "", weekKey: formatDateKey(date) };
}

// Which lines the schedule mans on one day. A line is manned when every place on it has a scheduled
// person who is available and has the competence. A person counts on one line only; a place that
// belongs to several lines (Logimark on line 2 and 3) is shared by them, as set in the settings.
function getScheduledLines({ schedule, trainingLocations, day, peopleById, skills, restrictions, record }) {
  // A person in training at a place staffs it when nobody else is scheduled there.
  const traineeAt = workplace => schedule?.[workplace]?.[day] ? "" : getTraineeAtWorkplace(schedule, trainingLocations, workplace, day);
  const placed = workplace => (day && (schedule?.[workplace]?.[day] || traineeAt(workplace))) || "";
  const nameOf = personId => peopleById.get(personId)?.name || "Borttagen person";
  const lines = Object.keys(BREAK_LINE_WORKPLACES).map(lineId => {
    const workplaces = getLineWorkplaces(lineId);
    const ruleGaps = getLineRuleGaps(lineId);
    const training = [];
    const issues = ruleGaps.length ? [] : workplaces.flatMap(workplace => {
      const personId = placed(workplace);
      const person = peopleById.get(personId);
      if (!personId) return [`${workplace}: ingen schemalagd`];
      if (!person) return [`${workplace}: den schemalagda personen finns inte längre`];
      const status = getPersonAvailability(person);
      if (status !== "available") return [`${workplace}: ${person.name} är ${getAvailabilityLabel(status).toLocaleLowerCase("sv-SE")}`];
      const gaps = workplaceSkillGaps(personId, workplace, skills, restrictions);
      // Training staffs the place but adds no competence: missing skills are shown, not counted against the line.
      if (traineeAt(workplace)) {
        training.push(`${workplace}: ${person.name} (Utbildning)${gaps.length ? `, ${gaps.join(" och ")}` : ""}`);
        return [];
      }
      return gaps.length ? [`${workplace}: ${person.name} ${gaps.join(" och ")}`] : [];
    });
    const seen = new Map();
    workplaces.forEach(workplace => {
      const personId = placed(workplace);
      if (!personId) return;
      if (seen.has(personId)) issues.push(`${nameOf(personId)} är schemalagd på både ${seen.get(personId)} och ${workplace}`);
      else seen.set(personId, workplace);
    });
    const machine = workplaces.find(workplace => appSettings.productionMachines.includes(workplace));
    return {
      id: lineId, label: BREAK_LINE_LABELS[lineId] || lineId, workplaces, ruleGaps, issues, training,
      production: machine && record ? Number(record.machines?.[machine]?.result) > 0 : null
    };
  });
  // The largest set of ready lines where no person stands on two places. Earlier lines win a tie.
  const ready = lines.filter(line => !line.ruleGaps.length && !line.issues.length);
  const placesOf = chosen => [...new Set(chosen.flatMap(line => line.workplaces))];
  let best = [];
  for (let mask = 1; mask < 2 ** ready.length; mask += 1) {
    const chosen = ready.filter((_, index) => mask & (2 ** index));
    if (chosen.length <= best.length) continue;
    const people = placesOf(chosen).map(placed);
    if (new Set(people).size === people.length) best = chosen;
  }
  const counted = new Map(placesOf(best).map(workplace => [placed(workplace), workplace]));
  return lines.map(line => {
    const staffed = best.includes(line);
    if (!staffed && ready.includes(line)) line.workplaces.forEach(workplace => {
      const other = counted.get(placed(workplace));
      if (other && other !== workplace) {
        const otherLine = best.find(item => item.workplaces.includes(other));
        line.issues.push(`${workplace}: ${nameOf(placed(workplace))} räknas redan på ${otherLine.label} (${other})`);
      }
    });
    return { ...line, staffed };
  });
}

// Whether the shift's available people and their competence are enough for every line at once, and if not, what is missing.
// places: how many people all lines need at once; departments: need and qualified available people per competence.
function getLineCapacity(available, skills, restrictions) {
  const lineIds = Object.keys(BREAK_LINE_WORKPLACES);
  const ruleGaps = lineIds.some(lineId => getLineRuleGaps(lineId).length);
  if (ruleGaps || !lineIds.length) return { canRunAll: null, runnable: 0, places: null, departments: [], reasons: [] };
  const personIds = available.map(person => person.id);
  const runnable = getRunnableLines(personIds, skills, restrictions).filter(line => line.runnable).length;
  const need = getDepartmentNeed(lineIds);
  const places = Object.values(need).reduce((sum, count) => sum + count, 0);
  const departments = Object.entries(need).map(([department, count]) => ({
    department, need: count,
    qualified: personIds.filter(personId => (skills[personId] || []).includes(department)
      && !(department === "GD" && (restrictions[personId] || []).includes("GD"))).length
  }));
  const canRunAll = runnable === lineIds.length;
  const reasons = canRunAll ? [] : [`Tillgänglig personal räcker till ${runnable} av ${lineIds.length} linjer samtidigt.`];
  if (!canRunAll && personIds.length >= places && departments.every(item => item.qualified >= item.need)) {
    reasons.push("Det finns nog med behöriga, men samma personer behövs på flera platser samtidigt.");
  }
  return { canRunAll, runnable, places, departments, reasons };
}

// How many people of each department the lines need at the same time.
function getDepartmentNeed(lineIds) {
  const need = {};
  [...new Set(lineIds.flatMap(getLineWorkplaces))].forEach(workplace => {
    const department = getTaskDepartment(workplace);
    if (department) need[department] = (need[department] || 0) + getWorkplaceStaffCount(workplace);
  });
  return need;
}

function auditCardHtml(events) {
  return `<section class="card audit-card"><div class="audit-heading"><div><h3>Dagens ändringar</h3><p>Aktiviteter som registrerats idag</p></div><span>${events.length}</span></div><div class="audit-list">${events.map(event => `<article><span class="audit-dot"></span><div><strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.detail || "")}</p><small>${new Date(event.createdAt).toLocaleString("sv-SE")}${event.userName ? ` · ${escapeHtml(event.userName)}` : ""}</small></div>${event.undo && (isAdmin() || event.undo.action === "availability") ? `<button class="audit-undo" data-audit-id="${escapeHtml(event.id)}" type="button">Återställ</button>` : ""}</article>`).join("") || '<div class="empty-state">Inga ändringar registrerade idag.</div>'}</div></section>`;
}

function bindAuditUndo(root, events) {
  root.querySelectorAll(".audit-undo").forEach(button => button.addEventListener("click", () => {
    const event = events.find(item => item.id === button.dataset.auditId);
    if (event) void applyAuditUndo(event);
  }));
}

async function getAdminDashboardData() {
  const today = formatDateKey(new Date());
  const monthStart = `${today.slice(0, 8)}01`;
  const linesDate = adminLinesDate || today;
  const { day: linesDay, weekKey } = getScheduleDayForDate(linesDate);
  const [allPeople, departments, skills, restrictions, settings, events, recordsByShift, schedules, trainingLocationsByShift] = await Promise.all([
    getAllPeople(), getDepartmentsFor("showInCompetency"), getMachineSkills(), getMachineRestrictions(),
    getProductionSettings(), getAuditLog(), Promise.all(shifts.map(shift => getProductionRecords(shift.id))),
    Promise.all(shifts.map(shift => getDocument(shift.id, `schedule:${weekKey}`, null))),
    Promise.all(shifts.map(shift => getDocument(shift.id, `trainingLocations:${weekKey}`, null)))
  ]);
  const peopleById = new Map(allPeople.map(person => [person.id, person]));
  const need = getDepartmentNeed(Object.keys(BREAK_LINE_WORKPLACES));
  const shiftData = shifts.map((shift, index) => {
    const staff = allPeople.filter(person => person.shiftId === shift.id);
    const leaders = staff.filter(person => person.account?.role === ROLES.LEADER);
    const operators = staff.filter(person => ![ROLES.ADMIN, ROLES.LEADER].includes(person.account?.role));
    const available = operators.filter(person => getPersonAvailability(person) === "available");
    const days = Object.values(recordsByShift[index])
      .filter(record => record?.date >= monthStart && record.date <= today)
      .sort((first, second) => first.date.localeCompare(second.date));
    const todayRecord = days.find(record => record.date === today);
    return {
      shift, leaders, operators, available,
      absent: staff.filter(person => getPersonAvailability(person) !== "available"),
      days,
      todayRecord,
      reportedToday: Boolean(todayRecord),
      today: getProductionDayTotal(todayRecord),
      todayTarget: getProductionTarget(settings, shift.id, today, todayRecord),
      month: sumBy(days, getProductionDayTotal),
      monthTarget: sumBy(days, record => getProductionTarget(settings, shift.id, record.date, record)),
      waste: sumBy(days, getProductionDayWaste),
      competence: departments.map(department => ({
        department,
        need: need[department] || 0,
        available: available.filter(person => (skills[person.id] || []).includes(department)).length,
        total: operators.filter(person => (skills[person.id] || []).includes(department)).length
      })),
      hasSchedule: Boolean(linesDay) && TASKS.some(task => schedules[index]?.[task]?.[linesDay]),
      lines: getScheduledLines({
        schedule: schedules[index], trainingLocations: trainingLocationsByShift[index], day: linesDay, peopleById, skills, restrictions,
        record: recordsByShift[index][linesDate] || null
      }),
      capacity: getLineCapacity(available, skills, restrictions)
    };
  });
  return { today, linesDate, linesDay, settings, events, shiftData, departments, need };
}

const shiftColorClass = shift => shift.color ? ` shift-color-${shift.color}` : "";
const competenceState = (available, need) => !need ? "" : available > need ? "good" : available === need ? "warn" : "bad";

const formatLinesDate = (dateKey, today) => dateKey === today ? "idag"
  : new Date(`${dateKey}T12:00:00`).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "numeric" });

// The overview's sections are closed until opened. Open ones are remembered so a live redraw keeps them open.
const adminOpenSections = new Set();
const adminSectionOpen = key => adminOpenSections.has(key) ? " open" : "";
const capacityState = (have, need) => have >= need ? "good" : have > 0 ? "warn" : "bad";

// Production capacity at a glance: manned lines, whether all lines could run, and available people.
// What is missing stays behind "Visa detaljer".
function adminLinesHtml(data, { today, linesDate, linesDay }) {
  const { shift, lines, capacity, hasSchedule, available } = data;
  if (!lines.length) return "";
  const staffed = lines.filter(line => line.staffed).length;
  const lineText = line => line.ruleGaps.length ? "Regel saknas" : line.staffed ? "Bemannad" : "Ej bemannad";
  const productionText = line => line.production === null ? "" : line.production ? "I produktion" : "Ingen produktion rapporterad";
  const lineTitle = line => [lineText(line), productionText(line), ...line.ruleGaps, ...line.issues, ...line.training].filter(Boolean).join("\n");
  const inTraining = hasSchedule ? lines.filter(line => line.training.length) : [];
  const problems = hasSchedule ? lines.filter(line => !line.staffed && (line.issues.length || line.ruleGaps.length)) : [];
  const unknown = capacity.canRunAll === null;
  const stats = [
    ["Bemannade linjer", `${staffed} av ${lines.length}`, capacityState(staffed, lines.length)],
    [`Kan köra alla ${lines.length} linjer`, unknown ? "Okänt" : capacity.canRunAll ? "Ja" : "Nej", unknown ? "warn" : capacity.canRunAll ? "good" : "bad"],
    ["Tillgänglig personal", unknown ? `${available.length}` : `${available.length} av ${capacity.places}`, unknown ? "warn" : capacityState(available.length, capacity.places)]
  ];
  const notes = [
    !linesDay ? "Ingen arbetsdag enligt inställningarna." : !hasSchedule ? "Inget schema är lagt för dagen." : "",
    unknown ? "Regler för linjerna saknas, se Regler för linjebemanning nedan." : "",
    linesDay && capacity.canRunAll && staffed < lines.length ? `Personalen räcker till alla ${lines.length} linjer, men schemat bemannar ${staffed}.` : "",
    ...capacity.reasons
  ].filter(Boolean);
  const competence = data.competence.map(item => ({ ...item, ...capacity.departments.find(entry => entry.department === item.department) }));
  return `<details class="admin-section admin-capacity-block" data-admin-section="capacity:${escapeHtml(shift.id)}"${adminSectionOpen(`capacity:${shift.id}`)}>
      <summary class="admin-section-toggle"><span class="admin-label">Produktionskapacitet</span><span class="admin-muted">${escapeHtml(formatLinesDate(linesDate, today))}</span></summary>
      <div class="admin-capacity-content">
      <div class="admin-lines">${lines.map(line => `<div class="admin-line ${line.ruleGaps.length ? "rule" : line.staffed ? "ok" : "no"}" title="${escapeHtml(lineTitle(line))}">${escapeHtml(line.label)}<small>${lineText(line)}</small>${productionText(line) ? `<span class="admin-line-production${line.production ? " on" : ""}">${line.production ? "I produktion" : "Ej i produktion"}</span>` : ""}</div>`).join("")}</div>
      <div class="admin-capacity-stats">${stats.map(([label, value, state]) => `<div class="admin-stat ${state}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>
      <details class="admin-capacity-details" data-admin-section="details:${escapeHtml(shift.id)}"${adminSectionOpen(`details:${shift.id}`)}>
        <summary><span class="show-label">Visa detaljer</span><span class="hide-label">Dölj detaljer</span></summary>
        <div class="admin-capacity-body">
          ${notes.length ? `<ul class="admin-capacity-reasons">${notes.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
          ${inTraining.length ? `<div><div class="admin-label">Under utbildning</div><ul class="admin-line-issues">${inTraining.map(line => `<li><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml(line.training.join(" · "))}</li>`).join("")}</ul></div>` : ""}
          ${problems.length ? `<div><div class="admin-label">Saknas på linjerna</div><ul class="admin-line-issues">${problems.map(line => `<li><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml([...line.ruleGaps, ...line.issues].join(" · "))}</li>`).join("")}</ul></div>` : ""}
          ${competence.length ? `<div><div class="admin-label">Kompetens, tillgängliga idag</div>
            <table class="admin-mini-table"><thead><tr><th>Kompetens</th><th>Behövs</th><th>Tillgängliga</th></tr></thead><tbody>
            ${competence.map(item => `<tr><th scope="row">${escapeHtml(item.department)}</th><td>${item.need || "–"}</td><td><span class="admin-cell ${competenceState(item.qualified ?? item.available, item.need)}">${item.qualified ?? item.available} <small>/ ${item.total}</small></span></td></tr>`).join("")}
            </tbody></table></div>` : ""}
        </div>
      </details>
      </div>
    </details>`;
}

// The rules the line overview counts with, and the ones that are missing.
function adminLineRulesHtml() {
  const lineIds = Object.keys(BREAK_LINE_WORKPLACES);
  const gaps = lineIds.flatMap(lineId => getLineRuleGaps(lineId).map(gap => `${BREAK_LINE_LABELS[lineId] || lineId}: ${gap}`));
  const shared = [...new Set(lineIds.flatMap(getLineWorkplaces))]
    .filter(workplace => lineIds.filter(lineId => getLineWorkplaces(lineId).includes(workplace)).length > 1);
  const placeHtml = workplace => {
    const department = getTaskDepartment(workplace);
    const required = customWorkItems.find(item => item.name === workplace)?.requiredSkills || [];
    const skillsText = department ? [...new Set([department, ...required])].join(" + ") : "kompetens saknas";
    return `<li><strong>${escapeHtml(workplace)}</strong> · ${getWorkplaceStaffCount(workplace)} person · ${escapeHtml(skillsText)}</li>`;
  };
  return `<details class="card admin-rules"${gaps.length ? " open" : ""}>
    <summary><h3>Regler för linjebemanning</h3>${gaps.length ? `<span class="admin-pill warn">${gaps.length} ${gaps.length === 1 ? "regel behöver" : "regler behöver"} definieras</span>` : '<span class="admin-muted">Från inställningar och kompetens</span>'}</summary>
    ${gaps.length ? `<div class="admin-rules-gaps"><strong>Behöver definieras innan linjerna kan räknas:</strong><ul>${gaps.map(gap => `<li>${escapeHtml(gap)}</li>`).join("")}</ul></div>` : ""}
    <p class="admin-sub">En linje är bemannad när varje plats på linjen har en schemalagd operatör som är Tillgänglig och har platsens kompetens, utan GD-begränsning på GD. En operatör med Utbildning på platsen i schemat bemannar den också, men får ingen kompetens av utbildningen; saknad kompetens visas under Under utbildning. En operatör räknas bara på en linje. I produktion betyder att produktion är rapporterad för linjens maskin den dagen. Om skiftet kan köra alla linjer räknas fram från alla tillgängliga operatörer och deras kompetens.${shared.length ? ` ${shared.join(", ")} hör till flera linjer och delas av dem.` : ""} Platserna per linje ändras under Inställningar → Rastlinjer, och kompetenskraven under Kompetens.</p>
    <div class="admin-rules-lines">${lineIds.map(lineId => `<div><h4>${escapeHtml(BREAK_LINE_LABELS[lineId] || lineId)}</h4><ul>${getLineWorkplaces(lineId).map(placeHtml).join("") || "<li>Inga platser</li>"}</ul></div>`).join("")}</div>
  </details>`;
}

function adminShiftCardHtml(data, context) {
  const { shift, leaders, operators, available, absent, lines } = data;
  const runnable = lines.filter(line => line.staffed).length;
  const lineState = !lines.length ? "" : runnable === lines.length ? "good" : runnable > 0 ? "warn" : "bad";
  const isToday = adminDashboardPeriod === "today";
  const produced = isToday ? data.today : data.month;
  const target = isToday ? data.todayTarget : data.monthTarget;
  const progress = target ? produced / target : 0;
  const notReported = isToday && !data.reportedToday;
  const absentOperators = operators.length - available.length;
  return `<article class="card admin-shift-card${shiftColorClass(shift)}">
    <div class="admin-shift-head">
      <div><h3>${shiftColorDot(shift.id)}Skift ${escapeHtml(shift.name)}</h3><small>${leaders.length ? `Skiftledare: ${leaders.map(person => escapeHtml(person.name)).join(", ")}` : "Ingen skiftledare"}</small></div>
      ${lines.length ? `<span class="admin-pill ${lineState}" title="Linjer bemannade enligt schemat">${runnable} av ${lines.length} linjer</span>` : ""}
    </div>
    <div class="admin-shift-figures">
      <button class="admin-figure-button" type="button" data-production-summary="${escapeHtml(shift.id)}" aria-label="${isToday ? "Box idag" : "Box under månaden"}: visa per maskin"><span>${isToday ? "Idag" : "Månaden"}</span><strong>${notReported ? "–" : formatNumber(produced)}</strong><small>box · per maskin ›</small></button>
      <div><span>Svinn månaden</span><strong>${formatNumber(data.waste, data.waste % 1 ? 1 : 0)}</strong><small>kg</small></div>
      <div><span>Operatörer</span><strong>${available.length}/${operators.length}</strong><small>på plats</small></div>
    </div>
    <div class="admin-progress">
      <div class="admin-row"><span>${isToday ? `Mot dagens mål ${formatNumber(target)} box` : `Mot målet för ${data.days.length} rapporterade dagar`}</span><strong>${notReported ? "Ej rapporterat" : target ? `${Math.round(progress * 100)} %` : "–"}</strong></div>
      <div class="admin-bar"><i style="width:${Math.min(100, progress * 100)}%"></i></div>
    </div>
    ${adminLinesHtml(data, context)}
    <div><span class="admin-pill ${absent.length ? "bad" : "good"}">${absent.length ? `${absent.length} frånvarande` : "Alla på plats"}</span>${absentOperators !== absent.length && absent.length ? ` <span class="admin-muted">varav ${absentOperators} operatörer</span>` : ""}</div>
    <div class="admin-shift-actions">
      <button class="btn primary" type="button" data-view-schedule="${escapeHtml(shift.id)}">Visa schema</button>
      <details class="admin-shift-menu" data-popover>
        <summary class="btn">Fler inställningar</summary>
        <div class="admin-menu-panel">
          <h4>${shiftColorDot(shift.id)}Skift ${escapeHtml(shift.name)}</h4>
          ${SHIFT_MANAGE_LINKS.filter(([page]) => canOpenPage(page)).map(([page, label]) => `<a href="${page}?skift=${encodeURIComponent(shift.id)}" data-shift-link="${escapeHtml(shift.id)}">${label}</a>`).join("")}
        </div>
      </details>
    </div>
  </article>`;
}

// Each shift's daily target is a dashed line in its colour; one grey line when they all match.
function adminProductionChartHtml(shiftData) {
  const targets = [...new Set(shiftData.map(data => data.todayTarget))];
  const target = Math.max(0, ...targets);
  const dates = [...new Set(shiftData.flatMap(data => data.days.map(record => record.date)))].sort();
  if (!dates.length) return '<div class="empty-state">Ingen produktion registrerad den här månaden ännu.</div>';
  const values = shiftData.flatMap(data => data.days.map(getProductionDayTotal));
  const max = Math.max(50, Math.ceil(Math.max(target, ...values) * 1.1 / 50) * 50);
  const width = 640, height = 240, left = 40, right = 14, top = 12, bottom = 28;
  const x = index => dates.length === 1 ? (left + width - right) / 2 : left + index * (width - left - right) / (dates.length - 1);
  const y = value => top + (1 - value / max) * (height - top - bottom);
  const step = max / 5;
  let svg = "";
  for (let value = 0; value <= max; value += step) {
    svg += `<line class="admin-grid" x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}"/><text x="${left - 6}" y="${y(value) + 4}" text-anchor="end">${formatNumber(value)}</text>`;
  }
  const labelEvery = Math.ceil(dates.length / 8);
  dates.forEach((date, index) => {
    if (index % labelEvery === 0 || index === dates.length - 1) svg += `<text x="${x(index)}" y="${height - 8}" text-anchor="middle">${Number(date.slice(8))}/${Number(date.slice(5, 7))}</text>`;
  });
  const targetLine = value => `<line class="admin-target" x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}"/>`;
  if (targets.length === 1 && target) svg += targetLine(target);
  if (targets.length > 1) shiftData.filter(data => data.todayTarget).forEach(data => {
    svg += `<g class="admin-series${shiftColorClass(data.shift)}"><title>Skift ${escapeHtml(data.shift.name)}: mål ${formatNumber(data.todayTarget)} box</title>${targetLine(data.todayTarget)}</g>`;
  });
  shiftData.forEach(data => {
    const points = data.days.map(record => [x(dates.indexOf(record.date)), y(getProductionDayTotal(record))]);
    if (!points.length) return;
    const end = points[points.length - 1];
    svg += `<g class="admin-series${shiftColorClass(data.shift)}"><title>Skift ${escapeHtml(data.shift.name)}</title>${points.length > 1 ? `<polyline points="${points.map(point => point.join(",")).join(" ")}"/>` : ""}<circle cx="${end[0]}" cy="${end[1]}" r="4.5"/></g>`;
  });
  return `<div class="admin-chart-scroll"><svg class="admin-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Produktion per dag och skift">${svg}</svg></div>`;
}

function adminWasteHtml(shiftData) {
  const max = Math.max(1, ...shiftData.map(data => data.waste));
  return shiftData.map(data => `<div class="admin-waste-row${shiftColorClass(data.shift)}">
    <div class="admin-row"><strong>${shiftColorDot(data.shift.id)}${escapeHtml(data.shift.name)}</strong><span><b>${formatNumber(data.waste, 1)} kg</b></span></div>
    <div class="admin-bar"><i style="width:${data.waste / max * 100}%"></i></div>
  </div>`).join("");
}

function adminCompetenceTableHtml({ shiftData, departments, need }) {
  if (!departments.length) return '<div class="empty-state">Inga avdelningar är tillagda.</div>';
  return `<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>Kompetens</th><th>Behövs för alla linjer</th>${shiftData.map(data => `<th>${shiftColorDot(data.shift.id)}${escapeHtml(data.shift.name)}</th>`).join("")}</tr></thead><tbody>
    ${departments.map(department => `<tr><th scope="row">${escapeHtml(department)}</th><td>${need[department] || "–"}</td>${shiftData.map(data => {
      const item = data.competence.find(entry => entry.department === department);
      return `<td><span class="admin-cell ${competenceState(item.available, item.need)}">${item.available} / ${item.total}</span></td>`;
    }).join("")}</tr>`).join("")}
  </tbody></table></div>`;
}

function adminAbsenceHtml(shiftData) {
  const absent = shiftData.flatMap(data => data.absent.map(person => ({ person, shift: data.shift })));
  if (!absent.length) return '<div class="empty-state">Alla är på plats idag.</div>';
  const state = { unavailable: "bad", off: "" };
  return absent.map(({ person, shift }) => `<div class="admin-absence-item"><span>${shiftColorDot(shift.id)}<strong>${escapeHtml(person.name)}</strong> <small>· ${escapeHtml(shift.name)}</small></span><span class="admin-pill ${state[getPersonAvailability(person)]}">${escapeHtml(getAvailabilityLabel(getPersonAvailability(person)))}</span></div>`).join("");
}

async function renderAdminDashboard(root) {
  const data = await getAdminDashboardData();
  adminDashboardData = data;
  const { shiftData, events, today } = data;
  const header = document.querySelector(".main > .header");
  if (header) {
    header.querySelector(":scope > h2").textContent = "Produktionsöversikt";
    header.querySelector(":scope > p").textContent = new Date(`${today}T12:00:00`).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  const month = new Date(`${today}T12:00:00`).toLocaleDateString("sv-SE", { month: "long" });
  const todayTotal = sumBy(shiftData, item => item.today);
  const reported = shiftData.filter(item => item.reportedToday);
  const monthTotal = sumBy(shiftData, item => item.month);
  const monthTarget = sumBy(shiftData, item => item.monthTarget);
  const waste = sumBy(shiftData, item => item.waste);
  const operators = sumBy(shiftData, item => item.operators.length);
  const available = sumBy(shiftData, item => item.available.length);
  const absent = shiftData.flatMap(item => item.absent);
  const absentCounts = ["unavailable", "off"]
    .map(status => [status, absent.filter(person => getPersonAvailability(person) === status).length])
    .filter(([, count]) => count)
    .map(([status, count]) => `${count} ${getAvailabilityLabel(status).toLocaleLowerCase("sv-SE")}`);
  const currentTargets = [...new Set(shiftData.map(item => item.todayTarget))];
  root.innerHTML = `
    <div class="admin-toolbar">
      <label class="admin-date">Linjer för <input type="date" id="adminLinesDate" value="${escapeHtml(data.linesDate)}" required></label>
      <div class="admin-period" role="group" aria-label="Period för skiftens produktion">
        <button type="button" data-period="today" aria-pressed="${adminDashboardPeriod === "today"}">Idag</button>
        <button type="button" data-period="month" aria-pressed="${adminDashboardPeriod === "month"}">Månaden</button>
      </div>
    </div>
    <section class="admin-kpis" aria-label="Alla skift">
      <article class="card"><span>Producerat idag</span><strong>${formatNumber(todayTotal)} <small>box</small></strong><p>${reported.length} av ${shiftData.length} skift har rapporterat</p></article>
      <article class="card"><span>Producerat i ${escapeHtml(month)}</span><strong>${formatNumber(monthTotal)} <small>box</small></strong><p>${monthTarget ? `<b class="${monthTotal >= monthTarget ? "admin-good" : "admin-bad"}">${Math.round(monthTotal / monthTarget * 100)} %</b> av målet för rapporterade dagar` : "Ingen produktion registrerad ännu"}</p></article>
      <article class="card"><span>Svinn i ${escapeHtml(month)}</span><strong>${formatNumber(waste, 1)} <small>kg</small></strong><p>${waste ? "Alla skift tillsammans" : "Inget svinn registrerat"}</p></article>
      <article class="card"><span>Bemanning idag</span><strong>${available} <small>/ ${operators} operatörer på plats</small></strong><p>${absent.length ? `<b class="admin-bad">${absent.length} frånvarande</b> · ${absentCounts.join(", ")}` : "Alla är på plats"}</p></article>
    </section>
    <section class="admin-shifts" aria-label="Skiften">${shiftData.map(item => adminShiftCardHtml(item, data)).join("") || '<div class="card empty-state">Inga skift finns ännu. Skapa skift under Inställningar.</div>'}</section>
    <section id="adminLineRules">${adminLineRulesHtml()}</section>
    <section class="admin-charts">
      <div class="card"><h3>Produktion per dag, ${escapeHtml(month)}</h3><p class="admin-sub">Box per skift och dag.${currentTargets.length === 1 && currentTargets[0] ? ` Streckad linje = dagligt mål ${formatNumber(currentTargets[0])} box.` : currentTargets.length > 1 ? " Streckade linjer = varje skifts dagliga mål." : ""}</p>
        <div class="admin-legend">${shiftData.map(item => `<span>${shiftColorDot(item.shift.id)}${escapeHtml(item.shift.name)} · ${formatNumber(item.month)} box</span>`).join("")}</div>
        ${adminProductionChartHtml(shiftData)}</div>
      <div class="card"><h3>Svinn hittills i månaden</h3><p class="admin-sub">Kilo svinn per skift.</p><div class="admin-waste">${adminWasteHtml(shiftData)}</div></div>
    </section>
    <section class="admin-columns">
      <details class="card admin-section admin-section-card" data-admin-section="competence"${adminSectionOpen("competence")}><summary class="admin-section-toggle"><h3>Kompetens per skift</h3></summary><p class="admin-sub">Tillgängliga idag / alla operatörer med kompetensen. Grönt = marginal, gult = precis, rött = räcker inte för alla linjer.</p>${adminCompetenceTableHtml(data)}</details>
      <div class="card"><h3>Frånvaro idag</h3><p class="admin-sub">Ej tillgängliga och lediga.</p><div class="admin-absence">${adminAbsenceHtml(shiftData)}</div></div>
    </section>
    <section id="adminAuditSection"${adminAuditOpen ? "" : " hidden"}>${auditCardHtml(events)}</section>
  `;
  root.querySelectorAll("[data-period]").forEach(button => button.addEventListener("click", () => {
    adminDashboardPeriod = button.dataset.period;
    root.querySelectorAll("[data-period]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    root.querySelector(".admin-shifts").innerHTML = data.shiftData.map(item => adminShiftCardHtml(item, data)).join("");
  }));
  root.querySelector("#adminLinesDate").addEventListener("change", async event => {
    if (!event.target.value) return;
    adminLinesDate = event.target.value === today ? "" : event.target.value;
    const next = await getAdminDashboardData();
    if (next.linesDate !== event.target.value) return;
    Object.assign(data, next);
    adminDashboardData = data;
    root.querySelector(".admin-shifts").innerHTML = next.shiftData.map(item => adminShiftCardHtml(item, next)).join("");
  });
  // The overview's own tools sit in the top bar's Meny, next to the links to every page.
  const menu = document.querySelector("#adminTopbar .admin-nav-menu");
  const tools = menu?.querySelector(".admin-nav-tools");
  if (tools) {
    tools.innerHTML = `<h4>Data</h4>
      <button type="button" id="adminAuditToggle">Dagens ändringar<small>${events.length} st</small></button>
      <button type="button" id="exportDataBtn">Exportera backup</button>
      <button type="button" id="importDataBtn">Importera backup</button>
      <input id="importDataInput" type="file" accept="application/json,.json" hidden>`;
  }
  document.getElementById("adminAuditToggle")?.addEventListener("click", () => {
    adminAuditOpen = !adminAuditOpen;
    const section = root.querySelector("#adminAuditSection");
    section.hidden = !adminAuditOpen;
    if (menu) menu.open = false;
    if (adminAuditOpen) section.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  if (root.dataset.adminBound !== "true") {
    root.dataset.adminBound = "true";
    // "toggle" does not bubble, so it is caught on the way down.
    root.addEventListener("toggle", event => {
      if (event.target.matches?.(".admin-shift-menu[open]")) placeShiftMenu(event.target);
      const key = event.target.dataset?.adminSection;
      if (key) event.target.open ? adminOpenSections.add(key) : adminOpenSections.delete(key);
    }, true);
    root.addEventListener("click", event => {
      const shiftLink = event.target.closest("[data-shift-link]");
      if (shiftLink) sessionStorage.setItem(ACTIVE_SHIFT_KEY, shiftLink.dataset.shiftLink);
      const summaryButton = event.target.closest("[data-production-summary]");
      if (summaryButton) void openProductionSummary(summaryButton.dataset.productionSummary);
      const scheduleButton = event.target.closest("[data-view-schedule]");
      if (scheduleButton) void openScheduleViewer(scheduleButton.dataset.viewSchedule, scheduleButton);
    });
  }
  setupDataTools();
  bindAuditUndo(root, events);
  void renderProductionSummary();
}

// A shift card's "Fler inställningar" opens upwards, or downwards when there is more room there,
// and never taller than the room it has. On phones it is a sheet at the bottom (see style.css).
function placeShiftMenu(menu) {
  const panel = menu.querySelector(".admin-menu-panel");
  if (!panel) return;
  menu.classList.remove("opens-down");
  panel.style.maxHeight = "";
  if (window.matchMedia("(max-width: 640px)").matches) return;
  const button = menu.querySelector("summary").getBoundingClientRect();
  const topBar = document.querySelector(".admin-topbar")?.getBoundingClientRect().bottom || 0;
  const above = button.top - Math.max(topBar, 0) - 18;
  const below = window.innerHeight - button.bottom - 18;
  const down = panel.scrollHeight > above && below > above;
  menu.classList.toggle("opens-down", down);
  panel.style.maxHeight = `${Math.max(160, Math.min(460, down ? below : above))}px`;
}

// "Box idag" on a shift card: boxes and waste per machine, with the GD operator who ran it.
// Today shows the operator registered on the Produktion page, or else the one the schedule placed there.
let adminDashboardData = null;
const productionSummary = { shiftId: "", close: null };

async function openProductionSummary(shiftId) {
  let overlay = document.getElementById("productionSummary");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "productionSummary";
    overlay.className = "schedule-viewer-backdrop";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", event => {
      if (event.target === overlay || event.target.closest("[data-summary-close]")) closeProductionSummary();
    });
  }
  productionSummary.shiftId = shiftId;
  overlay.hidden = false;
  await renderProductionSummary();
  productionSummary.close?.();
  productionSummary.close = manageDialogFocus(overlay.querySelector(".schedule-viewer"), closeProductionSummary);
}

function closeProductionSummary() {
  const overlay = document.getElementById("productionSummary");
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  productionSummary.close?.();
  productionSummary.close = null;
}

async function renderProductionSummary() {
  const overlay = document.getElementById("productionSummary");
  if (!overlay || overlay.hidden || !adminDashboardData) return;
  const { shiftId } = productionSummary;
  const data = adminDashboardData.shiftData.find(item => item.shift.id === shiftId);
  if (!data) return closeProductionSummary();
  const { today } = adminDashboardData;
  const isToday = adminDashboardPeriod === "today";
  const { day, weekKey } = getScheduleDayForDate(today);
  const records = isToday ? (data.todayRecord ? [data.todayRecord] : []) : data.days;
  // Training comes from the schedule: a training row's person, with the machine chosen as its place.
  const scheduleDays = (isToday ? [today] : records.map(record => record.date)).map(getScheduleDayForDate).filter(item => item.day);
  const weekKeys = [...new Set([weekKey, ...scheduleDays.map(item => item.weekKey)])];
  const [people, ...weekDocuments] = await Promise.all([getAllPeople(), ...weekKeys.flatMap(key => [
    getDocument(shiftId, `schedule:${key}`, null), getDocument(shiftId, `trainingLocations:${key}`, null)
  ])]);
  const weeks = new Map(weekKeys.map((key, index) => [key, { schedule: weekDocuments[index * 2], locations: weekDocuments[index * 2 + 1] }]));
  const schedule = weeks.get(weekKey).schedule;
  const nameById = new Map(people.map(person => [person.id, person.name]));
  const traineesOn = machine => [...new Set(scheduleDays.flatMap(({ day: scheduleDay, weekKey: key }) => {
    const { schedule: weekSchedule, locations } = weeks.get(key);
    return TASKS.filter(isTrainingTaskName)
      .filter(task => locations?.[task]?.[scheduleDay] === machine && weekSchedule?.[task]?.[scheduleDay])
      .map(task => nameById.get(weekSchedule[task][scheduleDay]) || "Borttagen person");
  }))];
  const lineOf = machine => Object.keys(BREAK_LINE_WORKPLACES).find(lineId => BREAK_LINE_WORKPLACES[lineId].includes(machine));
  const operatorsOn = machine => {
    const registered = records.map(record => {
      const entry = record.machines?.[machine];
      return (entry?.personId && nameById.get(entry.personId)) || entry?.personName || "";
    }).filter(Boolean);
    if (registered.length) return { names: [...new Set(registered)], fromSchedule: false };
    const scheduled = isToday && day ? nameById.get(schedule?.[machine]?.[day] || "") : "";
    return { names: scheduled ? [scheduled] : [], fromSchedule: Boolean(scheduled) };
  };
  const rows = appSettings.productionMachines.map(machine => {
    const entries = records.map(record => record.machines?.[machine]).filter(Boolean);
    const lineId = lineOf(machine);
    return {
      machine, line: lineId ? BREAK_LINE_LABELS[lineId] || lineId : "",
      reported: entries.length > 0,
      boxes: sumBy(entries, entry => entry.result),
      waste: sumBy(entries, entry => entry.waste),
      ...operatorsOn(machine),
      trainees: traineesOn(machine)
    };
  });
  const total = sumBy(records, getProductionDayTotal);
  const waste = sumBy(rows, row => row.waste);
  const target = isToday ? data.todayTarget : data.monthTarget;
  const shift = data.shift;
  const period = isToday
    ? new Date(`${today}T12:00:00`).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })
    : `${new Date(`${today}T12:00:00`).toLocaleDateString("sv-SE", { month: "long" })}, ${data.days.length} ${data.days.length === 1 ? "rapporterad dag" : "rapporterade dagar"}`;
  const operatorHtml = row => [
    row.names.length ? `${escapeHtml(row.names.join(", "))}${row.fromSchedule ? ' <small class="admin-muted">enligt schemat</small>' : ""}` : "",
    ...row.trainees.map(name => `<span class="summary-trainee">${escapeHtml(name)} <b>(Utbildning)</b></span>`)
  ].filter(Boolean).join("") || '<span class="admin-muted">–</span>';
  const body = !records.length
    ? `<div class="empty-state">${isToday ? "Ingen produktion är rapporterad idag." : "Ingen produktion är rapporterad den här månaden."}</div>`
    : `<div class="admin-table-scroll"><table class="admin-table production-summary-table"><thead><tr><th>Linje / maskin</th><th>Box</th><th>Svinn</th><th class="summary-operator">Operatörer</th></tr></thead><tbody>
      ${rows.map(row => `<tr class="${row.boxes ? "" : "is-idle"}"><th scope="row">${row.line ? `${escapeHtml(row.line)} <small>· ${escapeHtml(row.machine)}</small>` : escapeHtml(row.machine)}<span class="summary-operator-inline">${operatorHtml(row)}</span></th><td>${row.reported ? formatNumber(row.boxes) : "–"}</td><td>${row.reported ? `${formatNumber(row.waste, row.waste % 1 ? 1 : 0)} kg` : "–"}</td><td class="summary-operator">${operatorHtml(row)}</td></tr>`).join("")}
      </tbody><tfoot><tr><th scope="row">Totalt</th><td>${formatNumber(total)}</td><td>${formatNumber(waste, waste % 1 ? 1 : 0)} kg</td><td class="summary-operator">${target ? `Mål ${formatNumber(target)} box · <b class="${total >= target ? "admin-good" : "admin-bad"}">${Math.round(total / target * 100)} %</b>` : ""}</td></tr></tfoot></table></div>${target ? `<p class="summary-target-inline">Mål ${formatNumber(target)} box · <b class="${total >= target ? "admin-good" : "admin-bad"}">${Math.round(total / target * 100)} %</b></p>` : ""}`;
  overlay.innerHTML = `<section class="schedule-viewer production-summary${shift.color ? ` shift-color-${shift.color}` : ""}">
    <header class="viewer-head">
      <div><h3>${shiftColorDot(shift.id)}Produktion per maskin · Skift ${escapeHtml(shift.name)}</h3><small>${escapeHtml(period)}</small></div>
      <button class="viewer-close" type="button" data-summary-close aria-label="Stäng">×</button>
    </header>
    <div class="viewer-body">${body}</div>
  </section>`;
  if (productionSummary.close) {
    productionSummary.close();
    productionSummary.close = manageDialogFocus(overlay.querySelector(".schedule-viewer"), closeProductionSummary);
  }
}

// A read-only schedule for one shift, by day or by week. Changes are made on the Schema page.
const scheduleViewer = { shiftId: "", weekStart: null, view: "day", day: "", opener: null };

function getScheduleViewerDefaultDay() {
  const today = ALL_DAYS[new Date().getDay() - 1];
  return DAYS.includes(today) ? today : DAYS[0];
}

async function openScheduleViewer(shiftId, opener) {
  Object.assign(scheduleViewer, { shiftId, weekStart: getActualStartOfWeek(), day: getScheduleViewerDefaultDay(), opener });
  let overlay = document.getElementById("scheduleViewer");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "scheduleViewer";
    overlay.className = "schedule-viewer-backdrop";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", event => {
      if (event.target === overlay || event.target.closest("[data-viewer-close]")) return closeScheduleViewer();
      const week = event.target.closest("[data-viewer-week]");
      if (week) {
        const offset = Number(week.dataset.viewerWeek);
        const start = offset ? new Date(scheduleViewer.weekStart) : getActualStartOfWeek();
        if (offset) start.setDate(start.getDate() + offset);
        scheduleViewer.weekStart = start;
        return void renderScheduleViewer();
      }
      const view = event.target.closest("[data-viewer-view]");
      if (view) { scheduleViewer.view = view.dataset.viewerView; return void renderScheduleViewer(); }
      const day = event.target.closest("[data-viewer-day]");
      if (day) { scheduleViewer.day = day.dataset.viewerDay; scheduleViewer.view = "day"; return void renderScheduleViewer(); }
    });
  }
  overlay.hidden = false;
  document.body.classList.add("schedule-viewer-open");
  await renderScheduleViewer();
  overlay.querySelector("[data-viewer-close]")?.focus();
}

function closeScheduleViewer() {
  const overlay = document.getElementById("scheduleViewer");
  if (!overlay) return;
  overlay.hidden = true;
  document.body.classList.remove("schedule-viewer-open");
  scheduleViewer.opener?.focus();
}

async function renderScheduleViewer() {
  const overlay = document.getElementById("scheduleViewer");
  if (!overlay || overlay.hidden) return;
  const { shiftId, weekStart, view } = scheduleViewer;
  const focused = document.activeElement?.closest?.("#scheduleViewer [data-viewer-view], #scheduleViewer [data-viewer-week], #scheduleViewer [data-viewer-day]");
  const focusSelector = focused ? ["viewerView", "viewerWeek", "viewerDay"].filter(key => key in focused.dataset)
    .map(key => `[data-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}="${focused.dataset[key]}"]`)[0] : "";
  const weekKey = formatDateKey(weekStart);
  const [schedule, leaders, trainingLocations, extraLocations, shared, people] = await Promise.all([
    getDocument(shiftId, `schedule:${weekKey}`, null), getDocument(shiftId, `trainingLeaders:${weekKey}`, null),
    getDocument(shiftId, `trainingLocations:${weekKey}`, null),
    getDocument(shiftId, `extraPersonLocations:${weekKey}`, null), getDocument(shiftId, `scheduleShared:${weekKey}`, null), getAllPeople()
  ]);
  // A newer render may have started while this one waited.
  if (scheduleViewer.shiftId !== shiftId || scheduleViewer.weekStart !== weekStart || scheduleViewer.view !== view) return;
  const peopleById = new Map(people.map(person => [person.id, person]));
  const dateFor = day => { const date = new Date(weekStart); date.setDate(date.getDate() + ALL_DAYS.indexOf(day)); return date; };
  const todayKey = formatDateKey(new Date());
  const isToday = day => formatDateKey(dateFor(day)) === todayKey;
  const production = getProductionWorkplaces();
  const others = TASKS.filter(task => !production.includes(task));
  const placed = (task, day) => schedule?.[task]?.[day] || "";
  // A production place is staffed by training there when nobody else is scheduled.
  const traineeAt = (task, day) => production.includes(task) && !placed(task, day)
    ? getTraineeAtWorkplace(schedule, trainingLocations, task, day) : "";
  const staffedBy = (task, day) => placed(task, day) || traineeAt(task, day);
  const usedOthers = others.filter(task => DAYS.some(day => placed(task, day)));
  const personHtml = (task, day) => {
    const trainee = traineeAt(task, day);
    if (trainee) return `<span class="viewer-person">${escapeHtml(peopleById.get(trainee)?.name || "Borttagen person")} (Utbildning)</span>`;
    const person = peopleById.get(placed(task, day));
    if (!placed(task, day)) return '<span class="viewer-empty">Obemannad</span>';
    const status = person && isToday(day) ? getPersonAvailability(person) : "available";
    const leader = isTrainingTaskName(task) ? peopleById.get(leaders?.[task]?.[day] || "")?.name : "";
    const location = isExtraPersonTask(task) ? extraLocations?.[task]?.[day] : "";
    return `<span class="viewer-person">${escapeHtml(person?.name || "Borttagen person")}</span>${status !== "available" ? ` <span class="admin-pill bad">${escapeHtml(getAvailabilityLabel(status))}</span>` : ""}${leader ? `<small>Handledare: ${escapeHtml(leader)}</small>` : ""}${location ? `<small>${escapeHtml(location)}</small>` : ""}`;
  };
  const dayLabel = (day, long = false) => `${long ? day : day.slice(0, 3)} ${dateFor(day).getDate()}/${dateFor(day).getMonth() + 1}`;
  const hasSchedule = Boolean(schedule) && TASKS.some(task => DAYS.some(day => placed(task, day)));
  const thisWeek = formatDateKey(getActualStartOfWeek());
  const previousWeek = formatDateKey(getPreviousWeekStart());
  let body;
  if (!hasSchedule) {
    body = '<div class="empty-state">Inget schema är skapat för den här veckan.</div>';
  } else if (view === "day") {
    const day = DAYS.includes(scheduleViewer.day) ? scheduleViewer.day : DAYS[0];
    const staffed = production.filter(task => staffedBy(task, day)).length;
    const row = task => `<div class="viewer-row"><span class="viewer-task">${escapeHtml(task)}</span><span class="viewer-cell">${personHtml(task, day)}</span></div>`;
    const othersToday = usedOthers.filter(task => placed(task, day));
    body = `<div class="viewer-days" role="tablist" aria-label="Dag">${DAYS.map(item => `<button type="button" role="tab" data-viewer-day="${item}" aria-selected="${item === day}">${dayLabel(item)}${isToday(item) ? " · idag" : ""}</button>`).join("")}</div>
      <p class="viewer-summary"><strong>${staffed} av ${production.length}</strong> produktionsplatser bemannade ${escapeHtml(dayLabel(day, true).toLocaleLowerCase("sv-SE"))}</p>
      <div class="viewer-list"><h4>Produktion</h4>${production.map(row).join("")}</div>
      ${othersToday.length ? `<div class="viewer-list"><h4>Utbildning och extra</h4>${othersToday.map(row).join("")}</div>` : ""}`;
  } else {
    const rows = [...production, ...usedOthers];
    body = `<div class="viewer-table-scroll"><table class="viewer-table"><thead><tr><th>Plats</th>${DAYS.map(day => `<th class="${isToday(day) ? "is-today" : ""}"><button type="button" data-viewer-day="${day}" title="Visa ${day}">${dayLabel(day)}</button></th>`).join("")}</tr></thead>
      <tbody>${rows.map(task => `<tr><th scope="row">${escapeHtml(task)}</th>${DAYS.map(day => `<td class="${isToday(day) ? "is-today" : ""}">${personHtml(task, day)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  const shift = shifts.find(item => item.id === shiftId);
  overlay.innerHTML = `<section class="schedule-viewer${shift?.color ? ` shift-color-${shift.color}` : ""}" role="dialog" aria-modal="true" aria-labelledby="scheduleViewerTitle">
    <header class="viewer-head">
      <div><h3 id="scheduleViewerTitle">${shiftColorDot(shiftId)}Schema · Skift ${escapeHtml(shift?.name || "")}</h3>
        <small>${weekKey === thisWeek ? "Denna vecka" : weekKey === previousWeek ? "Förra veckan" : weekKey > thisWeek ? "Kommande vecka" : "Tidigare vecka"} · ${escapeHtml(formatDateRange(weekStart))} · ${shared?.shared ? "Delat med operatörerna" : "Inte delat med operatörerna"}</small></div>
      <button class="viewer-close" type="button" data-viewer-close aria-label="Stäng schemat">×</button>
    </header>
    <div class="viewer-toolbar">
      <div class="admin-period" role="group" aria-label="Vy">
        <button type="button" data-viewer-view="day" aria-pressed="${view === "day"}">Dag</button>
        <button type="button" data-viewer-view="week" aria-pressed="${view === "week"}">Vecka</button>
      </div>
      <div class="viewer-weeks">
        <button class="btn" type="button" data-viewer-week="-7"${weekKey <= previousWeek ? " disabled" : ""} aria-label="Föregående vecka">‹</button>
        <button class="btn" type="button" data-viewer-week="0"${weekKey === thisWeek ? " disabled" : ""}>Denna vecka</button>
        <button class="btn" type="button" data-viewer-week="7" aria-label="Nästa vecka">›</button>
      </div>
    </div>
    <div class="viewer-body">${body}</div>
  </section>`;
  if (focusSelector) (overlay.querySelector(`${focusSelector}:not([disabled])`) || overlay.querySelector("[data-viewer-close]")).focus();
}

function formatDateRange(monday) {
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const formatter = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" });
  return `${formatter.format(monday)} – ${formatter.format(friday)}`;
}

// Admin works from a compact top bar instead of the sidebar. The sidebar's links,
// shift switcher and logout move into its menu, so every page is still one click away.
const ADMIN_QUICK_PAGES = ["dashboard.html", "index.html", "produktion.html", "personal.html"];
const ADMIN_MENU_GROUPS = [
  ["Planering", ["dashboard.html", "index.html", "rast.html", "produktion.html", "todo.html"]],
  ["Personal och kompetens", ["personal.html", "anvandare.html", "add.html", "maskiner.html", "testresultat.html", "bedomning.html"]],
  ["Konto och system", ["profil.html", "installningar.html", "hjalp.html"]]
];

function setupAdminTopbar() {
  const appShell = document.getElementById("appShell");
  const sidebar = document.querySelector(".sidebar");
  const nav = sidebar?.querySelector(".nav");
  if (!isAdmin() || !appShell || !nav || document.getElementById("adminTopbar")) return;
  const labels = new Map([...nav.querySelectorAll(".nav-link")].map(link => [link.getAttribute("href"), link.textContent.trim()]));
  const grouped = new Set(ADMIN_MENU_GROUPS.flatMap(([, pages]) => pages));
  const groups = ADMIN_MENU_GROUPS.map(([title, pages], index) => [title, [
    ...pages, ...(index === ADMIN_MENU_GROUPS.length - 1 ? [...labels.keys()].filter(page => !grouped.has(page)) : [])
  ].filter(page => labels.has(page))]).filter(([, pages]) => pages.length);
  const current = getCurrentPage();
  const link = (page, className) => `<a class="${className}${page === current ? " is-active" : ""}" href="${page}"${page === current ? ' aria-current="page"' : ""}>${escapeHtml(labels.get(page))}</a>`;
  const bar = document.createElement("header");
  bar.id = "adminTopbar";
  bar.className = "admin-topbar";
  bar.innerHTML = `<a class="admin-brand" href="dashboard.html"><span aria-hidden="true">SP</span>Staff Planner</a>
    <nav class="admin-quick" aria-label="Genvägar">${ADMIN_QUICK_PAGES.filter(page => labels.has(page)).map(page => link(page, "admin-quick-link")).join("")}</nav>
    <details class="admin-nav-menu" data-popover>
      <summary class="btn">Meny</summary>
      <div class="admin-menu-panel admin-nav-panel">
        <div class="admin-nav-account"></div>
        <div class="admin-nav-tools"></div>
        ${groups.map(([title, pages]) => `<h4>${title}</h4>${pages.map(page => link(page, "admin-nav-item")).join("")}`).join("")}
        <div class="admin-nav-footer"></div>
      </div>
    </details>`;
  appShell.prepend(bar);
  const account = document.getElementById("sidebarAccount");
  if (account) bar.querySelector(".admin-nav-account").appendChild(account);
  const logout = document.getElementById("logoutBtn");
  if (logout) bar.querySelector(".admin-nav-footer").appendChild(logout);
  document.body.classList.add("admin-topnav");
}

async function renderDashboard() {
  const root = document.getElementById("dashboardPage");
  if (!root) return;
  if (isAdmin()) return renderAdminDashboard(root);
  const [people, departments, skills, events, productionRecords] = await Promise.all([
    getPeople(), getDepartmentsFor("showInCompetency"), getMachineSkills(), getAuditLog(), getProductionRecords()
  ]);
  const unavailable = people.filter(person => getPersonAvailability(person) === "unavailable").length;
  const off = people.filter(person => getPersonAvailability(person) === "off").length;
  const available = people.filter(person => getPersonAvailability(person) === "available").length;
  const fullyQualified = people.filter(person => {
    const personSkills = Array.isArray(skills[person.id]) ? skills[person.id] : [];
    return departments.length > 0 && departments.every(item => personSkills.includes(item));
  }).length;
  const latestProduction = Object.values(productionRecords).sort((a, b) => b.date.localeCompare(a.date))[0];
  root.innerHTML = `
    <div class="dashboard-stats">
      <article><span>Personal</span><strong>${people.length}</strong><small>${shiftColorDot(getShiftScope())}${escapeHtml(getShiftName(getShiftScope()) || "inget skift")}</small></article>
      <article class="stat-green"><span>Tillgängliga i gruppen</span><strong>${available}</strong><small>kan schemaläggas</small></article>
      <article class="stat-red"><span>Ej tillgängliga</span><strong>${unavailable}</strong><small>kan inte arbeta</small></article>
      <article class="stat-yellow"><span>Lediga</span><strong>${off}</strong><small>frånvarande</small></article>
      <article class="stat-green"><span>Full kompetens</span><strong>${fullyQualified}</strong><small>alla maskiner</small></article>
      <article><span>Senaste produktion</span><strong>${latestProduction?.total || 0}</strong><small>${latestProduction?.date || "ingen dag"}</small></article>
    </div>
    ${isShiftLeader() ? `<section class="card settings-card shift-backup-card"><div><h3>Backup av skiftet</h3><p>Ladda ner en backup av Skift ${escapeHtml(getShiftName(getOwnShiftId()))}: personal, scheman, produktion, kompetens och bedömningar för skiftet. Lösenord och andra skift ingår inte. Filen är en kopia att spara och kan inte importeras.</p></div><div class="settings-actions"><button id="exportShiftBackupBtn" class="btn primary" type="button">Exportera backup</button></div></section>` : ""}
    ${auditCardHtml(events)}
  `;
  root.querySelector("#exportShiftBackupBtn")?.addEventListener("click", event => void downloadShiftBackup(event.currentTarget));
  bindAuditUndo(root, events);
}

const MAX_BACKUP_SIZE_BYTES = 20 * 1024 * 1024;

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Revoked a moment later: revoking at once can make the browser lose the file name.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Admin backup of everything on the server. Passwords are not included.
async function downloadBackup() {
  const payload = await apiRequest("GET", "/admin/export");
  downloadJson(payload, `staff-planner-backup-${formatDateKey(new Date())}.json`);
  await addAuditEvent("backup", "Backup exporterad", formatDateKey(new Date()));
}

// A shift leader's backup of their own shift. The server decides what is in it.
async function downloadShiftBackup(button) {
  button.disabled = true;
  try {
    const payload = await apiRequest("GET", "/backup/shift");
    // Plain letters only: browsers may drop a download name with å, ä or ö.
    const name = (getShiftName(getOwnShiftId()) || "skift").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "skift";
    downloadJson(payload, `staff-planner-skift-${name}-${formatDateKey(new Date())}.json`);
    showAppToast("Backupen av skiftet har laddats ner.");
  } catch (error) {
    showAppToast(error instanceof ApiError ? error.message : "Backupen kunde inte skapas.", "error");
  } finally {
    button.disabled = false;
  }
}

// Accepts both new backups and encrypted backups from the old single-device version.
async function importBackupFile(file) {
  if (file.size > MAX_BACKUP_SIZE_BYTES) throw new ApiError(400, "Backupfilen är för stor.");
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new ApiError(400, "Backupfilen är ogiltig eller skadad.");
  }
  if (payload?.app !== "Staff Planner") throw new ApiError(400, "Filen är inte en backup från Staff Planner.");
  if (payload.kind === "shift") throw new ApiError(400, "Det här är en backup av ett enda skift. Den kan inte läsas in, eftersom den bara innehåller en del av datan.");
  if (payload.version === 1 && isPlainObject(payload.data)) {
    await openLegacyImportDialog(payload.data, "file");
    return;
  }
  if (!confirm("Importen ersätter scheman, inställningar och övrig data på servern. Personal och skift uppdateras, men ingen tas bort. Allas egna att göra-listor lämnas orörda. Vill du fortsätta?")) return;
  const result = await apiRequest("POST", "/admin/import", payload);
  const todoNote = result.todos ? ` ${result.todos} uppgifter från skiftens gamla att göra-listor lades i din egen lista.` : "";
  showAppToast(`Backupen har lästs in: ${result.people} personer och ${result.documents} dataposter.${todoNote}`);
  setTimeout(() => location.reload(), 900);
}

function setupDataTools() {
  const exportButton = document.getElementById("exportDataBtn");
  const importButton = document.getElementById("importDataBtn");
  const input = document.getElementById("importDataInput");
  bindOnce(exportButton, "click", downloadBackup);
  if (importButton && input && importButton.dataset.bound !== "true") {
    importButton.dataset.bound = "true";
    importButton.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await importBackupFile(file);
      } catch (error) {
        console.error("Could not import backup", error);
        showAppToast(error instanceof ApiError ? error.message : "Backupfilen är ogiltig eller skadad.", "error");
      } finally {
        input.value = "";
      }
    });
  }
}

// Moving data from the old version, where everything was encrypted in one browser.

const LEGACY_META_KEYS = [
  "staff_people_year", "staff_schedule_week", "staff_training_leaders_week", "staff_training_locations_week",
  "staff_break_plan_week", "staff_data_schema_version", "staff_people", "staff_schedule"
];

function isLegacyStorageKey(key) {
  return key === LEGACY_STORAGE_KEYS.salt || key === LEGACY_STORAGE_KEYS.check || /_enc(?::|$)/.test(key)
    || LEGACY_META_KEYS.includes(key) || key.startsWith("staff_schedule_updated_at:");
}

function readLegacyLocalData() {
  const data = {};
  try {
    Object.keys(localStorage).filter(isLegacyStorageKey).forEach(key => { data[key] = localStorage.getItem(key); });
  } catch {
    return null;
  }
  return data[LEGACY_STORAGE_KEYS.salt] && data[LEGACY_STORAGE_KEYS.check] ? data : null;
}

function removeLegacyLocalData() {
  try {
    Object.keys(localStorage).filter(isLegacyStorageKey).forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn("Could not remove the old local data:", error);
  }
}

async function decryptLegacyData(data, password) {
  let key;
  try {
    key = await deriveAesKey(password, fromBase64(data[LEGACY_STORAGE_KEYS.salt]));
    const check = await decryptJson(JSON.parse(data[LEGACY_STORAGE_KEYS.check]), key);
    if (check?.ok !== true) throw new Error("Check failed");
  } catch {
    throw new ApiError(400, "Fel lösenord för den gamla datan.");
  }
  const result = { people: [], global: {}, shift: {}, skipped: 0 };
  for (const [storageKey, raw] of Object.entries(data)) {
    if (typeof raw !== "string") continue;
    const separator = storageKey.indexOf(":");
    const base = separator === -1 ? storageKey : storageKey.slice(0, separator);
    const week = separator === -1 ? "" : storageKey.slice(separator + 1);
    let target = null;
    if (storageKey === LEGACY_STORAGE_KEYS.people) target = ["people"];
    else if (LEGACY_GLOBAL_DOCUMENTS[storageKey]) target = ["global", LEGACY_GLOBAL_DOCUMENTS[storageKey]];
    else if (LEGACY_SHIFT_DOCUMENTS[storageKey]) target = ["shift", LEGACY_SHIFT_DOCUMENTS[storageKey]];
    else if (LEGACY_WEEKLY_DOCUMENTS[base] && /^\d{4}-\d{2}-\d{2}$/.test(week)) target = ["shift", `${LEGACY_WEEKLY_DOCUMENTS[base]}:${week}`];
    if (!target) continue;
    try {
      const value = await decryptJson(JSON.parse(raw), key);
      if (target[0] === "people") result.people = Array.isArray(value) ? value : [];
      else result[target[0]][target[1]] = value;
    } catch (error) {
      console.warn(`Skipped a damaged record: ${storageKey}`, error);
      result.skipped += 1;
    }
  }
  return result;
}

function openLegacyImportDialog(data, source) {
  return new Promise(resolve => {
    if (!shifts.length) {
      showAppToast("Skapa minst ett skift under Inställningar innan du flyttar in gammal data.", "error");
      resolve(false);
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `<section class="replacement-modal legacy-import-modal">
      <h3>Flytta in data från den gamla versionen</h3>
      <p>Den gamla versionen sparade allt krypterat ${source === "file" ? "i backupfilen" : "på den här enheten"}. Ange lösenordet ni använde där. Personal och scheman läggs i skiftet du väljer. Data med samma namn på servern skrivs över.</p>
      <form>
        <label>Skift<select name="shiftId" required>${shifts.map(shift => `<option value="${escapeHtml(shift.id)}"${shift.id === getShiftScope() ? " selected" : ""}>${escapeHtml(shiftOptionLabel(shift))}</option>`).join("")}</select></label>
        <label>Gamla lösenordet<input name="password" type="password" autocomplete="off" required /></label>
        <p class="inline-message" role="status" aria-live="polite"></p>
        <div><button class="btn" type="button" data-action="cancel">Avbryt</button><button class="btn primary" type="submit">Flytta in data</button></div>
      </form>
    </section>`;
    document.body.appendChild(overlay);
    const form = overlay.querySelector("form");
    const status = overlay.querySelector(".inline-message");
    let cleanupFocus;
    const close = value => { overlay.remove(); cleanupFocus?.(); resolve(value); };
    cleanupFocus = manageDialogFocus(overlay.querySelector(".replacement-modal"), () => close(false));
    overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => close(false));
    bindOnce(form, "submit", async event => {
      event.preventDefault();
      status.className = "inline-message";
      status.textContent = "Läser den gamla datan…";
      try {
        const decrypted = await decryptLegacyData(data, form.elements.password.value);
        const shiftName = getShiftName(form.elements.shiftId.value);
        const documentCount = Object.keys(decrypted.global).length + Object.keys(decrypted.shift).length;
        if (!confirm(`${decrypted.people.length} personer och ${documentCount} dataposter flyttas till skiftet ${shiftName}. Fortsätt?`)) {
          status.textContent = "";
          return;
        }
        const result = await apiRequest("POST", "/admin/import-legacy", {
          shiftId: form.elements.shiftId.value,
          people: decrypted.people,
          global: decrypted.global,
          shift: decrypted.shift
        });
        await addAuditEvent("backup", "Data flyttad från gamla versionen", `${result.people} personer till ${shiftName}`);
        if (source === "local" && confirm("Datan finns nu på servern. Vill du ta bort den gamla krypterade kopian från den här enheten?")) {
          removeLegacyLocalData();
        }
        showAppToast(`Klart: ${result.people} personer och ${result.documents} dataposter flyttades in${decrypted.skipped ? `, ${decrypted.skipped} skadade poster hoppades över` : ""}.`);
        close(true);
        setTimeout(() => location.reload(), 900);
      } catch (error) {
        status.className = "inline-message error";
        status.textContent = error instanceof ApiError ? error.message : "Datan kunde inte flyttas. Försök igen.";
      }
    });
  });
}

function setupMobileNavigation() {
  const sidebar = document.querySelector(".sidebar");
  const nav = sidebar?.querySelector(".nav");
  const logo = sidebar?.querySelector(".logo");
  if (!sidebar || !nav || !logo || sidebar.querySelector(".mobile-nav-toggle")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mobile-nav-toggle";
  if (!nav.id) nav.id = "mainNavigation";
  button.setAttribute("aria-controls", nav.id);
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", "Öppna meny");
  button.innerHTML = "<span></span><span></span><span></span>";
  logo.insertAdjacentElement("afterend", button);

  const setMenuOpen = open => {
    sidebar.classList.toggle("nav-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Stäng meny" : "Öppna meny");
  };

  button.addEventListener("click", () => {
    setMenuOpen(!sidebar.classList.contains("nav-open"));
  });
  nav.addEventListener("click", event => {
    if (event.target.closest(".nav-link")) setMenuOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !sidebar.classList.contains("nav-open")) return;
    setMenuOpen(false);
    button.focus();
  });
}

const THEME_LABELS = { light: "Ljust läge", dark: "Mörkt läge" };
const THEME_ICONS = {
  light: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
  dark: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
};

function updateThemeToggles() {
  const theme = window.staffTheme?.current() || "light";
  const next = theme === "dark" ? "light" : "dark";
  document.querySelectorAll(".theme-toggle").forEach(button => {
    button.dataset.nextTheme = next;
    button.setAttribute("aria-label", `Byt till ${THEME_LABELS[next].toLowerCase()}`);
    button.title = `Byt till ${THEME_LABELS[next].toLowerCase()}`;
    button.innerHTML = THEME_ICONS[next];
  });
  document.querySelectorAll('[name="themePreference"]').forEach(input => {
    input.checked = input.value === window.staffTheme?.getPreference();
  });
}

function setupThemeToggles() {
  if (!window.staffTheme?.supported) return;
  const createToggle = extraClass => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `theme-toggle ${extraClass}`;
    button.addEventListener("click", () => window.staffTheme.setPreference(button.dataset.nextTheme));
    return button;
  };
  // Top right of the page header on wide screens; on narrow screens the header toggle is
  // hidden and the one in the top bar, next to the menu button, is shown instead.
  const header = document.querySelector(".main .header");
  if (header && !header.querySelector(".theme-toggle")) {
    header.prepend(createToggle("header-theme-toggle"));
  }
  const logoutButton = document.querySelector(".sidebar .sidebar-logout");
  if (logoutButton && !document.querySelector(".sidebar .theme-toggle")) {
    logoutButton.insertAdjacentElement("beforebegin", createToggle("sidebar-theme-toggle"));
  }
  const authScreen = document.getElementById("authScreen");
  if (authScreen && !authScreen.querySelector(".theme-toggle")) {
    authScreen.prepend(createToggle("auth-theme-toggle"));
  }
  document.addEventListener("staff-themechange", updateThemeToggles);
  updateThemeToggles();
}

function setupFilterControls() {
  [
    ["peopleSearch", "input", renderPeople], ["availabilityFilter", "change", renderPeople],
    ["testSearch", "input", renderTestResults], ["machineSearch", "input", renderMachineSkills],
    ["machineFilter", "change", renderMachineSkills]
  ].forEach(([id, eventName, render]) => {
    const element = document.getElementById(id);
    if (!element || element.dataset.bound === "true") return;
    element.dataset.bound = "true";
    element.addEventListener(eventName, () => void render());
  });
}

async function refreshAppViews() {
  enhanceAppShell();
  await renderSchedule();
  await renderBreakPlanner();
  await renderPeople();
  await renderUsersPage();
  await renderAssessments();
  await renderTestResults();
  await renderMachineSkills();
  await renderTrainingReminders();
  await renderDashboard();
  await renderProduction();
  await renderTodoList();
  renderExtraAssignmentManager();
}

// "Användare": every login in one place. Admins see everyone; shift leaders see
// their own shift and can do there what they may do elsewhere (create operator
// logins, reset operator passwords, edit details). Removing users stays with admins.
const usersPageFilters = { query: "", role: "accounts", shift: "" };

async function renderUsersPage() {
  const root = document.getElementById("usersPage");
  if (!root || !canManageStaff()) return;
  if (root.dataset.ready !== "true") {
    root.dataset.ready = "true";
    root.innerHTML = `
      ${isAdmin() ? "" : `<p class="shift-notice users-shift-notice">${shiftColorDot(getOwnShiftId())}<strong>${escapeHtml(getShiftName(getOwnShiftId()) || "Inget skift")}</strong> · Du ser användarna i ditt eget skift</p>`}
      <div id="usersStats" class="dashboard-stats users-stats"></div>
      <section class="card">
        <div class="filter-bar users-filter-bar">
          <input id="usersSearch" type="search" placeholder="Sök namn, användarnamn eller företag" aria-label="Sök användare" />
          <select id="usersRoleFilter" aria-label="Visa roll">
            <option value="accounts">Alla med inloggning</option>
            ${isAdmin() ? `<option value="${ROLES.ADMIN}">Admin</option>` : ""}
            <option value="${ROLES.LEADER}">Skiftledare</option>
            <option value="${ROLES.RIGHT_HAND}">Höger hand</option>
            <option value="${ROLES.OPERATOR}">Operatörer</option>
            <option value="none">Utan inloggning</option>
            <option value="">Alla personer</option>
          </select>
          ${isAdmin() ? `<select id="usersShiftFilter" aria-label="Visa skift"><option value="">Alla skift</option>${shifts.map(shift => `<option value="${escapeHtml(shift.id)}"${shift.id === usersPageFilters.shift ? " selected" : ""}>${escapeHtml(shiftOptionLabel(shift))}</option>`).join("")}<option value="none">Utan skift</option></select>` : ""}
          <a class="btn primary" href="add.html#addPersonSection">+ Ny användare</a>
        </div>
        <div id="usersList" class="people-list users-list"></div>
      </section>`;
    root.querySelector("#usersSearch").addEventListener("input", event => { usersPageFilters.query = event.target.value; void renderUsersPage(); });
    root.querySelector("#usersRoleFilter").addEventListener("change", event => { usersPageFilters.role = event.target.value; void renderUsersPage(); });
    root.querySelector("#usersShiftFilter")?.addEventListener("change", event => { usersPageFilters.shift = event.target.value; void renderUsersPage(); });
  }

  const everyone = await getAllPeople();
  const people = isAdmin() ? everyone : everyone.filter(person => getOwnShiftId() && person.shiftId === getOwnShiftId());
  const withAccount = people.filter(person => person.account);
  const countRole = role => withAccount.filter(person => person.account.role === role).length;
  const waiting = withAccount.filter(person => person.account.mustChangePassword).length;
  root.querySelector("#usersStats").innerHTML = `
    ${isAdmin() ? `<article><span>Admin</span><strong>${countRole(ROLES.ADMIN)}</strong><small>full behörighet</small></article>` : ""}
    <article><span>Skiftledare</span><strong>${countRole(ROLES.LEADER)}</strong><small>ändrar sitt skift</small></article>
    <article><span>Höger hand</span><strong>${countRole(ROLES.RIGHT_HAND)}</strong><small>skiftledarens stöd</small></article>
    <article><span>Operatörer</span><strong>${countRole(ROLES.OPERATOR)}</strong><small>ser schemat</small></article>
    <article class="${waiting ? "stat-yellow" : ""}"><span>Väntar på nytt lösenord</span><strong>${waiting}</strong><small>har inte loggat in än</small></article>
    <article><span>Utan inloggning</span><strong>${people.length - withAccount.length}</strong><small>personal</small></article>`;

  const query = usersPageFilters.query.trim().toLocaleLowerCase();
  const { role, shift } = usersPageFilters;
  const roleOrder = { [ROLES.ADMIN]: 0, [ROLES.LEADER]: 1, [ROLES.RIGHT_HAND]: 2, [ROLES.OPERATOR]: 3 };
  const visible = people
    .filter(person => {
      if (role === "accounts" && !person.account) return false;
      if (role === "none" && person.account) return false;
      if (role && role !== "accounts" && role !== "none" && person.account?.role !== role) return false;
      if (shift && (shift === "none" ? person.shiftId : person.shiftId !== shift)) return false;
      return !query || `${person.name} ${person.account?.username || ""} ${person.company || ""}`.toLocaleLowerCase().includes(query);
    })
    .sort((first, second) =>
      (roleOrder[first.account?.role] ?? 4) - (roleOrder[second.account?.role] ?? 4) || first.name.localeCompare(second.name, "sv"));

  const list = root.querySelector("#usersList");
  list.innerHTML = visible.map(person => {
    const account = person.account;
    const lastLogin = account?.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" }) : "aldrig";
    const details = [
      `${shiftColorDot(person.shiftId)}${escapeHtml(getShiftName(person.shiftId) || "Inget skift")}`,
      account ? `Senast inloggad ${escapeHtml(lastLogin)}` : escapeHtml(person.company || ""),
      escapeHtml(getAvailabilityLabel(getPersonAvailability(person)))
    ].filter(Boolean).join(" · ");
    return `<div class="person-row user-row">
      <div class="person-meta">
        <h3>${escapeHtml(person.name)}${person.id === currentPerson?.id ? ' <small class="user-you">(du)</small>' : ""}</h3>
        <p>${details}</p>
        <span class="person-role-badge${account ? ` role-${escapeHtml(account.role)}` : " no-account"}">${escapeHtml(describeAccount(person))}</span>${account?.mustChangePassword ? ' <span class="person-role-badge user-waiting">Väntar på nytt lösenord</span>' : ""}
      </div>
      <div class="person-actions">${canEditPerson(person) ? `<button class="btn${account ? "" : " primary"}" type="button" data-manage-user="${escapeHtml(person.id)}">${account ? "Hantera" : "Skapa inloggning"}</button>` : ""}${isAdmin() && person.id !== currentPerson?.id ? `<button class="btn danger" type="button" data-remove-user="${escapeHtml(person.id)}">Ta bort</button>` : ""}</div>
    </div>`;
  }).join("") || `<div class="empty-state">${people.length ? "Ingen användare matchar filtret." : isAdmin() ? "Ingen personal har lagts till ännu." : getOwnShiftId() ? "Ingen personal i ditt skift ännu." : "Du tillhör inget skift ännu. Be en admin att lägga till dig i ett skift."}</div>`;
  list.querySelectorAll("[data-manage-user]").forEach(button => button.addEventListener("click", () => void editPerson(button.dataset.manageUser)));
  list.querySelectorAll("[data-remove-user]").forEach(button => button.addEventListener("click", () => {
    const person = visible.find(item => item.id === button.dataset.removeUser);
    if (person) openRemoveUserDialog(person);
  }));
}

// Admins remove either just the login (the person stays in the staff list) or the
// person entirely, which also removes them from schedules, competence and results.
function openRemoveUserDialog(person) {
  if (!isAdmin() || person.id === currentPerson?.id) return;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<section class="replacement-modal remove-user-modal">
    <h3>Ta bort ${escapeHtml(person.name)}</h3>
    <p>${person.account ? `Användarnamn <strong>${escapeHtml(person.account.username)}</strong> · ${escapeHtml(ROLE_LABELS[person.account.role] || "")}. Välj vad som ska tas bort.` : "Personen har ingen inloggning."}</p>
    <div class="remove-user-options">
      ${person.account ? `<button class="btn" type="button" data-remove="account"><strong>Ta bort inloggningen</strong><small>Personen kan inte längre logga in men finns kvar i personallistan och schemat.</small></button>` : ""}
      <button class="btn danger" type="button" data-remove="person"><strong>Ta bort personen helt</strong><small>Tar även bort personen från alla scheman, kompetens, testresultat och bedömningar. Kan inte ångras.</small></button>
    </div>
    <p class="inline-message" role="status" aria-live="polite"></p>
    <div><button class="btn" type="button" data-action="cancel">Avbryt</button></div>
  </section>`;
  document.body.appendChild(overlay);
  const status = overlay.querySelector(".inline-message");
  let cleanupFocus;
  const close = () => { overlay.remove(); cleanupFocus?.(); };
  cleanupFocus = manageDialogFocus(overlay.querySelector(".remove-user-modal"), close);
  overlay.querySelector('[data-action="cancel"]').addEventListener("click", close);
  overlay.querySelectorAll("[data-remove]").forEach(button => bindOnce(button, "click", async () => {
    try {
      if (button.dataset.remove === "account") {
        await apiRequest("DELETE", `/people/${encodeURIComponent(person.id)}/account`);
        peopleCache = null;
        showAppToast(`Inloggningen för ${person.name} har tagits bort.`);
      } else {
        if (!confirm(`Ta bort ${person.name} helt? Det går inte att ångra.`)) return;
        await deletePersonRecord(person.id);
        invalidateCachedData();
        if (selectedAssessmentPersonId === person.id) selectedAssessmentPersonId = "";
        if (selectedTestPersonId === person.id) selectedTestPersonId = "";
        showAppToast(`${person.name} har tagits bort.`);
      }
      close();
      await refreshAppViews();
    } catch (error) {
      status.textContent = error instanceof ApiError ? error.message : "Det gick inte att ta bort.";
      status.className = "inline-message error";
    }
  }));
}

const TEMPORARY_PASSWORD_CHARACTERS = "abcdefghjkmnpqrstuvwxyz23456789";

function generateTemporaryPassword() {
  const values = crypto.getRandomValues(new Uint32Array(10));
  return [...values].map(value => TEMPORARY_PASSWORD_CHARACTERS[value % TEMPORARY_PASSWORD_CHARACTERS.length]).join("");
}

function suggestUsername(name) {
  return String(name || "")
    .toLocaleLowerCase("sv")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .trim().split(/\s+/).filter(Boolean).join(".")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 40);
}

function shiftOptionsHtml(selectedId, { allowNone = true } = {}) {
  return `${allowNone ? `<option value=""${selectedId ? "" : " selected"}>Inget skift</option>` : ""}${shifts.map(shift => `<option value="${escapeHtml(shift.id)}"${shift.id === selectedId ? " selected" : ""}>${escapeHtml(shiftOptionLabel(shift))}</option>`).join("")}`;
}

function roleOptionsHtml(selectedRole = ROLES.OPERATOR) {
  return assignableRoles().map(role => `<option value="${role}"${role === selectedRole ? " selected" : ""}>${ROLE_LABELS[role]}</option>`).join("");
}

function loginInstructions(username, password) {
  return `Inloggning: användarnamn ${username}, tillfälligt lösenord ${password}. Personen väljer ett eget lösenord vid första inloggningen.`;
}

function renderAccountSection(person) {
  if (person.account) {
    const lastLogin = person.account.lastLoginAt ? new Date(person.account.lastLoginAt).toLocaleString("sv-SE") : "aldrig";
    return `<p><strong>${escapeHtml(person.account.username)}</strong> · ${escapeHtml(ROLE_LABELS[person.account.role] || "")} · senast inloggad ${escapeHtml(lastLogin)}${person.account.mustChangePassword ? " · väntar på nytt lösenord" : ""}</p>
      ${isAdmin() ? `<div class="person-account-row"><label>Användarnamn<input name="username" value="${escapeHtml(person.account.username)}" autocomplete="off" maxlength="60" /></label><button class="btn" type="button" data-account-action="username">Spara användarnamn</button></div>` : ""}
      ${canChangeRoleOf(person) ? `<div class="person-account-row"><label>Roll<select name="role">${roleOptionsHtml(person.account.role)}</select></label><button class="btn" type="button" data-account-action="role">Spara roll</button></div>` : ""}
      ${canResetPasswordFor(person) && person.id !== currentPerson?.id ? `<div class="person-account-row"><label>Tillfälligt lösenord<input name="resetPassword" autocomplete="off" minlength="${MIN_PASSWORD_LENGTH}" /></label><button class="btn" type="button" data-account-action="suggest">Föreslå</button><button class="btn" type="button" data-account-action="reset">Återställ lösenord</button></div>` : ""}
      ${isAdmin() && person.id !== currentPerson?.id ? '<div class="person-account-row"><button class="btn danger" type="button" data-account-action="remove">Ta bort inloggning</button></div>' : ""}`;
  }
  if (!canCreateAccountFor(person)) return "<p>Ingen inloggning.</p>";
  return `<p>Personen har ingen inloggning. Skapa en så kan personen se schemat och ändra sin status själv.</p>
    <div class="person-account-row"><label>Användarnamn<input name="newUsername" value="${escapeHtml(suggestUsername(person.name))}" autocomplete="off" /></label><label>Roll<select name="newRole">${roleOptionsHtml()}</select></label></div>
    <div class="person-account-row"><label>Tillfälligt lösenord<input name="newPassword" value="${generateTemporaryPassword()}" autocomplete="off" minlength="${MIN_PASSWORD_LENGTH}" /></label><button class="btn primary" type="button" data-account-action="create">Skapa inloggning</button></div>`;
}

async function editPerson(id) {
  const person = (await getAllPeople()).find(item => item.id === id);
  if (!person || !canEditPerson(person)) return;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const availability = getPersonAvailability(person);
  overlay.innerHTML = `<section class="replacement-modal person-modal">
    <h3>Profil: ${escapeHtml(person.name)}</h3>
    <form class="person-modal-form">
      <label>Namn<input name="name" value="${escapeHtml(person.name)}" maxlength="120" required /></label>
      <label>Företag<input name="company" value="${escapeHtml(person.company || "")}" maxlength="120" /></label>
      <label>Telefon<input name="phone" type="tel" value="${escapeHtml(person.phone || "")}" maxlength="40" /></label>
      <label>E-post<input name="email" type="email" value="${escapeHtml(person.email || "")}" maxlength="200" /><small>Får ett mejl när veckans schema delas.</small></label>
      <label>Status<select name="availability">${availabilityOptionsFor(availability).map(([value, label]) => `<option value="${value}"${value === availability ? " selected" : ""}>${label}</option>`).join("")}</select></label>
      <label>Skift<select name="shiftId"${isAdmin() ? "" : " disabled"}>${shiftOptionsHtml(person.shiftId)}</select>${isAdmin() ? "" : "<small>Endast admin kan flytta personal mellan skift.</small>"}</label>
      <div><button class="btn" type="button" data-action="close">Stäng</button><button class="btn primary" type="submit">Spara</button></div>
    </form>
    <section class="person-account"><h4>Inloggning</h4><div class="person-account-body">${renderAccountSection(person)}</div><p class="inline-message" role="status" aria-live="polite"></p></section>
  </section>`;
  document.body.appendChild(overlay);
  const modal = overlay.querySelector(".person-modal");
  const form = overlay.querySelector("form");
  const status = overlay.querySelector(".person-account .inline-message");
  let cleanupFocus;
  let changed = false;
  const close = () => {
    overlay.remove();
    cleanupFocus?.();
    if (changed) void refreshAppViews();
  };
  cleanupFocus = manageDialogFocus(modal, close);
  overlay.querySelector('[data-action="close"]').addEventListener("click", close);
  const showStatus = (text, type = "success") => {
    status.textContent = text;
    status.className = `inline-message ${type}`;
  };

  bindOnce(form, "submit", async event => {
    event.preventDefault();
    const changes = {
      name: form.elements.name.value.trim(),
      company: form.elements.company.value.trim(),
      phone: form.elements.phone.value.trim(),
      email: form.elements.email.value.trim(),
      availability: form.elements.availability.value
    };
    if (isAdmin()) changes.shiftId = form.elements.shiftId.value || null;
    if (!changes.name) return showStatus("Namnet får inte vara tomt.", "error");
    let updated;
    try {
      updated = await updatePerson(person.id, changes);
    } catch (error) {
      return showStatus(error instanceof ApiError ? error.message : "Det gick inte att spara.", "error");
    }
    // Someone marked as away is taken out of this week's schedule, as on the staff list.
    if (changes.availability !== "available" && changes.availability !== availability && updated.shiftId) {
      await removePersonFromSelectedWeek(updated.id, updated.shiftId);
    }
    await addAuditEvent("person", `${changes.name} redigerad`, changes.company);
    changed = true;
    close();
  });

  const accountBody = overlay.querySelector(".person-account-body");
  accountBody.addEventListener("click", async event => {
    const action = event.target.closest("[data-account-action]")?.dataset.accountAction;
    if (!action) return;
    const field = name => accountBody.querySelector(`[name="${name}"]`);
    const button = event.target.closest("button");
    button.disabled = true;
    try {
      let result = null;
      if (action === "suggest") {
        field("resetPassword").value = generateTemporaryPassword();
        return;
      }
      if (action === "create") {
        const username = field("newUsername").value.trim();
        const password = field("newPassword").value;
        if (password.length < MIN_PASSWORD_LENGTH) return showStatus(`Lösenordet måste vara minst ${MIN_PASSWORD_LENGTH} tecken.`, "error");
        result = await apiRequest("POST", `/people/${encodeURIComponent(person.id)}/account`, { username, password, role: field("newRole").value });
        showStatus(loginInstructions(result.person.account.username, password));
      } else if (action === "username") {
        result = await apiRequest("PATCH", `/people/${encodeURIComponent(person.id)}/account`, { username: field("username").value.trim() });
        showStatus(`Användarnamnet är nu ${result.person.account.username}.`);
        if (person.id === currentPerson?.id) currentUser = { ...currentUser, username: result.person.account.username };
      } else if (action === "role") {
        result = await apiRequest("PATCH", `/people/${encodeURIComponent(person.id)}/account`, { role: field("role").value });
        showStatus(`Rollen är nu ${ROLE_LABELS[result.person.account.role]}.`);
      } else if (action === "reset") {
        const password = field("resetPassword").value;
        if (password.length < MIN_PASSWORD_LENGTH) return showStatus(`Lösenordet måste vara minst ${MIN_PASSWORD_LENGTH} tecken.`, "error");
        result = await apiRequest("PATCH", `/people/${encodeURIComponent(person.id)}/account`, { password });
        showStatus(loginInstructions(result.person.account.username, password));
      } else if (action === "remove") {
        if (!confirm(`Ta bort inloggningen för ${person.name}? Personen finns kvar i personallistan.`)) return;
        result = await apiRequest("DELETE", `/people/${encodeURIComponent(person.id)}/account`);
        showStatus("Inloggningen har tagits bort.");
      }
      if (result?.person) {
        changed = true;
        peopleCache = null;
        const message = status.textContent;
        const type = status.className;
        accountBody.innerHTML = renderAccountSection(result.person);
        status.textContent = message;
        status.className = type;
      }
    } catch (error) {
      showStatus(error instanceof ApiError ? error.message : "Det gick inte att spara.", "error");
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  });
}

// Only admins delete people. The server also removes them from every shift's
// schedules, competence, test results and assessments.
async function deletePerson(id) {
  if (!isAdmin()) return;
  const person = (await getAllPeople()).find(item => item.id === id);
  if (!person) return;
  const loginNote = person.account ? " Personens inloggning tas också bort." : "";
  if (!confirm(`Vill du ta bort ${person.name} och alla personens bedömningar, testresultat och schemaplaceringar?${loginNote}`)) return;
  await deletePersonRecord(id);
  invalidateCachedData();
  if (selectedAssessmentPersonId === id) selectedAssessmentPersonId = "";
  if (selectedTestPersonId === id) selectedTestPersonId = "";
  showAppToast(`${person.name} har tagits bort.`);
  await refreshAppViews();
}

function clearAddSuccessMessage(message) {
  if (addMessageTimeoutId) {
    clearTimeout(addMessageTimeoutId);
    addMessageTimeoutId = null;
  }

  if (!message) return;

  message.classList.add("hidden");
  message.classList.remove("success", "error");
}

function showAddSuccessMessage(message) {
  if (!message) return;

  clearAddSuccessMessage(message);
  message.textContent = "Person tillagd";
  message.classList.remove("hidden", "error");
  message.classList.add("success");

  addMessageTimeoutId = setTimeout(() => {
    clearAddSuccessMessage(message);
  }, 2000);
}

// Shift and login fields are added here so every page keeps the same markup.
function ensureAddFormExtras(form) {
  if (form.querySelector("#shiftInput")) return;
  const actions = form.querySelector(".actions");
  const ownShift = getOwnShiftId();
  const shiftField = isAdmin()
    ? `<label for="shiftInput">Skift</label><select id="shiftInput">${shiftOptionsHtml(getShiftScope())}</select>`
    : `<label for="shiftInput">Skift</label><select id="shiftInput" disabled>${shiftOptionsHtml(ownShift, { allowNone: false })}</select><small class="form-hint">Du lägger till personal i ditt eget skift.</small>`;
  actions.insertAdjacentHTML("beforebegin", `${shiftField}
    <label class="settings-switch add-login-toggle"><input id="createLoginInput" type="checkbox" /><span>Skapa inloggning så att personen kan se schemat och ändra sin status</span></label>
    <div id="addLoginFields" class="add-login-fields hidden">
      <label for="usernameInput">Användarnamn</label><input id="usernameInput" type="text" autocomplete="off" />
      <label for="temporaryPasswordInput">Tillfälligt lösenord</label><input id="temporaryPasswordInput" type="text" autocomplete="off" minlength="${MIN_PASSWORD_LENGTH}" />
      <label for="roleInput">Roll</label><select id="roleInput">${roleOptionsHtml()}</select>
    </div>`);
  const loginToggle = form.querySelector("#createLoginInput");
  const loginFields = form.querySelector("#addLoginFields");
  const nameInput = form.querySelector("#nameInput");
  const usernameInput = form.querySelector("#usernameInput");
  loginToggle.addEventListener("change", () => {
    loginFields.classList.toggle("hidden", !loginToggle.checked);
    if (loginToggle.checked) {
      if (!usernameInput.value) usernameInput.value = suggestUsername(nameInput.value);
      const passwordInput = form.querySelector("#temporaryPasswordInput");
      if (!passwordInput.value) passwordInput.value = generateTemporaryPassword();
    }
  });
  nameInput.addEventListener("input", () => {
    if (loginToggle.checked && !usernameInput.dataset.edited) usernameInput.value = suggestUsername(nameInput.value);
  });
  usernameInput.addEventListener("input", () => { usernameInput.dataset.edited = "true"; });
}

function setupAddForm() {
  const form = document.getElementById("addForm");
  if (!form) return;
  ensureAddFormExtras(form);

  const nameInput = document.getElementById("nameInput");
  const companyInput = document.getElementById("companyInput");
  const clearBtn = document.getElementById("clearBtn");
  const message = document.getElementById("message");

  bindOnce(form, "submit", async event => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const company = companyInput.value.trim();
    if (!name) return;

    const shiftId = isAdmin() ? form.querySelector("#shiftInput").value || null : getOwnShiftId();
    const createLogin = form.querySelector("#createLoginInput").checked;
    const username = form.querySelector("#usernameInput").value.trim();
    const password = form.querySelector("#temporaryPasswordInput").value;
    if (createLogin && password.length < MIN_PASSWORD_LENGTH) {
      message.textContent = `Lösenordet måste vara minst ${MIN_PASSWORD_LENGTH} tecken.`;
      message.className = "message error";
      return;
    }
    const account = createLogin ? { username, password, role: form.querySelector("#roleInput").value } : undefined;
    let person;
    try {
      person = await createPerson({ name, company, shiftId, account });
    } catch (error) {
      clearAddSuccessMessage(message);
      message.textContent = error instanceof ApiError ? error.message : "Personen kunde inte läggas till.";
      message.className = "message error";
      return;
    }
    await addAuditEvent("person", `${name} tillagd`, company);
    form.reset();
    form.querySelector("#addLoginFields").classList.add("hidden");
    delete form.querySelector("#usernameInput").dataset.edited;
    if (isAdmin()) form.querySelector("#shiftInput").value = shiftId || "";
    if (account) {
      clearAddSuccessMessage(message);
      message.textContent = `${person.name} är tillagd. ${loginInstructions(person.account.username, password)}`;
      message.className = "message success";
    } else {
      showAddSuccessMessage(message);
    }
    nameInput.focus();
  });

  bindOnce(clearBtn, "click", () => {
    form.reset();
    form.querySelector("#addLoginFields")?.classList.add("hidden");
    clearAddSuccessMessage(message);
  });
}

// Machines are shared by all shifts, so the server renames them in every shift's
// schedules, templates, competence and test results at once.
async function renameWorkItemReferences(previousName, nextName) {
  if (previousName === nextName) return;
  await apiRequest("POST", "/work-items/rename", { from: previousName, to: nextName });
  invalidateCachedData();
  resetScheduleHistory();
}

async function getWorkItemUsageCount(name) {
  const data = await apiRequest("GET", `/work-items/usage?name=${encodeURIComponent(name)}`);
  return data.count;
}

function chooseWorkItemReplacement(item, usageCount) {
  return new Promise(resolve => {
    const candidates = customWorkItems.filter(entry => entry.id !== item.id && entry.enabled && entry.showInSchema);
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `<section class="replacement-modal"><h3>${escapeHtml(item.name)} används i schemat</h3><p>${usageCount} sparade placeringar är kopplade till posten. Välj en ersättare innan den tas bort, eller pausa den i stället.</p><label>Ersätt med<select><option value="">Välj ersättare</option>${candidates.map(entry => `<option value="${entry.id}">${escapeHtml(entry.name)}</option>`).join("")}</select></label><div><button class="btn" data-action="cancel" type="button">Avbryt</button><button class="btn" data-action="pause" type="button">Pausa i stället</button><button class="btn danger" data-action="replace" type="button" disabled>Ersätt och ta bort</button></div></section>`;
    document.body.appendChild(overlay);
    const select = overlay.querySelector("select"), replace = overlay.querySelector('[data-action="replace"]');
    let cleanupFocus;
    const close = value => { overlay.remove(); cleanupFocus?.(); resolve(value); };
    cleanupFocus = manageDialogFocus(overlay.querySelector(".replacement-modal"), () => close(null));
    select.addEventListener("change", () => { replace.disabled = !select.value; });
    overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => close(null));
    overlay.querySelector('[data-action="pause"]').addEventListener("click", () => close({ action: "pause" }));
    replace.addEventListener("click", () => { const replacement = candidates.find(entry => entry.id === select.value); close(replacement ? { action: "replace", replacement } : null); });
  });
}

async function syncWorkItemCompetency(item, previousItem = null) {
  const departments = await getDepartments();
  let next = [...departments];
  if (previousItem?.name && previousItem.name !== item.name) {
    next = next.map(value => value === previousItem.name ? item.name : value);
  }
  const shouldShow = item.enabled && (item.showInCompetency || item.showInTestResults);
  const contains = next.some(value => value.toLocaleLowerCase() === item.name.toLocaleLowerCase());
  if (shouldShow && !contains) next.push(item.name);
  if (!shouldShow) next = next.filter(value => value !== item.name);
  await saveDepartments([...new Set(next)]);
}

function renderExtraAssignmentManager(statusText = "") {
  const panel = document.getElementById("extraAssignmentManager");
  if (!panel) return;
  if (!canChangeSharedSettings()) {
    panel.remove();
    return;
  }
  panel.innerHTML = `<div class="extra-assignment-manager-heading"><h3>Uppgifter för extra personer</h3><span class="extra-assignment-count">${EXTRA_PERSON_ASSIGNMENTS.length} uppgifter</span></div>
    <p>Lägg till uppgifter som kan väljas för alla extra personer i schemat. Borttagna uppgifter ligger kvar i sparade placeringar.</p>
    <form class="extra-assignment-form"><label>Ny uppgift<input name="assignment" required maxlength="120" placeholder="Exempel: Hjälp på lagret" /></label><button class="btn primary" type="submit">+ Lägg till uppgift</button></form>
    <div class="extra-assignment-status inline-message" role="status" aria-live="polite">${escapeHtml(statusText)}</div>
    <div class="extra-assignment-list">${EXTRA_PERSON_ASSIGNMENTS.map((assignment, index) => `<div class="extra-assignment-row"><span>${escapeHtml(assignment)}</span><button class="btn danger" type="button" data-remove-assignment="${index}" aria-label="Ta bort ${escapeHtml(assignment)}">Ta bort</button></div>`).join("") || '<div class="empty-state">Inga uppgifter ännu. Lägg till den första ovan.</div>'}</div>`;
  let saving = false;
  const saveAssignments = async (assignments, message) => {
    if (saving) return;
    saving = true;
    const controls = [...panel.querySelectorAll("button, input")];
    controls.forEach(control => { control.disabled = true; });
    try {
      await saveAppSettings({ ...appSettings, extraAssignments: assignments });
      renderExtraAssignmentManager(message);
      panel.querySelector('input[name="assignment"]').focus();
    } catch (error) {
      console.error("Extra assignment save failed:", error);
      const status = panel.querySelector(".extra-assignment-status");
      status.textContent = "Ändringen kunde inte sparas. Försök igen.";
      status.classList.add("error");
    } finally {
      saving = false;
      controls.forEach(control => { control.disabled = false; });
    }
  };
  panel.querySelector("form").addEventListener("submit", async event => {
    event.preventDefault();
    if (saving) return;
    const input = event.currentTarget.elements.assignment;
    const assignment = input.value.trim();
    if (!assignment) { input.focus(); return; }
    if (EXTRA_PERSON_ASSIGNMENTS.some(value => value.toLocaleLowerCase() === assignment.toLocaleLowerCase())) {
      const status = panel.querySelector(".extra-assignment-status");
      status.textContent = "Uppgiften finns redan.";
      status.classList.add("error");
      input.focus();
      return;
    }
    await saveAssignments([...EXTRA_PERSON_ASSIGNMENTS, assignment], "Uppgiften har lagts till och kan väljas i schemat.");
  });
  panel.querySelectorAll("[data-remove-assignment]").forEach(button => button.addEventListener("click", async () => {
    const index = Number(button.dataset.removeAssignment);
    await saveAssignments(EXTRA_PERSON_ASSIGNMENTS.filter((_, assignmentIndex) => assignmentIndex !== index), "Uppgiften har tagits bort från listan. Sparade placeringar finns kvar.");
  }));
}

async function setupWorkItemManager() {
  const form = document.getElementById("workItemForm");
  if (form && !canChangeSharedSettings()) {
    form.closest(".work-item-manager")?.remove();
    return;
  }
  const nameInput = document.getElementById("workItemName");
  const afterSelect = document.getElementById("workItemAfter");
  const schemaCheckbox = document.getElementById("workItemSchema");
  const competencyCheckbox = document.getElementById("workItemCompetency");
  const testResultsCheckbox = document.getElementById("workItemTestResults");
  const autoScheduleCheckbox = document.getElementById("workItemAutoSchedule");
  const typeSelect = document.getElementById("workItemType");
  const staffCountInput = document.getElementById("workItemStaffCount");
  const requiredSkillsInput = document.getElementById("workItemRequiredSkills");
  const cancelButton = document.getElementById("cancelWorkItemEdit");
  const saveButton = document.getElementById("saveWorkItemBtn");
  const message = document.getElementById("workItemMessage");
  const list = document.getElementById("workItemList");
  const trashList = document.getElementById("workItemTrashList");
  const trashCount = document.getElementById("workItemTrashCount");
  if (!form || !nameInput || !afterSelect || !list) return;
  let editingId = "";

  const showMessage = (text, type = "success") => {
    message.textContent = text;
    message.className = `inline-message ${type}`;
  };
  const resetEditor = () => {
    editingId = "";
    form.reset();
    schemaCheckbox.checked = false;
    competencyCheckbox.checked = false;
    testResultsCheckbox.checked = false;
    autoScheduleCheckbox.checked = false;
    if (typeSelect) typeSelect.value = "machine";
    if (staffCountInput) staffCountInput.value = "1";
    if (requiredSkillsInput) requiredSkillsInput.value = "";
    cancelButton?.classList.add("hidden");
    if (saveButton) saveButton.textContent = "+ Lägg till";
  };
  const startEdit = item => {
    editingId = item.id;
    nameInput.value = item.name;
    afterSelect.value = TASKS.includes(item.after) ? item.after : "Packa L4";
    schemaCheckbox.checked = item.showInSchema;
    competencyCheckbox.checked = item.showInCompetency;
    testResultsCheckbox.checked = item.showInTestResults;
    autoScheduleCheckbox.checked = item.autoSchedule;
    if (typeSelect) typeSelect.value = item.type || "machine";
    if (staffCountInput) staffCountInput.value = String(item.staffCount || 1);
    if (requiredSkillsInput) requiredSkillsInput.value = (item.requiredSkills || []).join(", ");
    cancelButton?.classList.remove("hidden");
    if (saveButton) saveButton.textContent = "Spara ändringar";
    nameInput.focus();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const renderManager = async () => {
    const previousValue = afterSelect.value;
    afterSelect.innerHTML = TASKS.filter(task => !editingId || customWorkItems.find(item => item.id === editingId)?.name !== task)
      .map(task => `<option value="${escapeHtml(task)}">${escapeHtml(task)}</option>`).join("");
    afterSelect.value = [...afterSelect.options].some(option => option.value === previousValue) ? previousValue : "Packa L4";
    list.innerHTML = customWorkItems.length ? customWorkItems.map((item, index) => `
      <article class="work-item-row${item.enabled ? "" : " is-disabled"}">
        <div><strong>${escapeHtml(item.name)}</strong><span>${({ machine: "Maskin", department: "Avdelning", training: "Utbildning", extra: "Extra person" })[item.type] || "Maskin"} · ${item.staffCount || 1} person${Number(item.staffCount) === 1 ? "" : "er"}${item.requiredSkills?.length ? ` · Kräver ${escapeHtml(item.requiredSkills.join(", "))}` : ""}</span><span>${item.showInSchema ? `Schema · efter ${escapeHtml(item.after || "Packa L4")}` : "Inte i Schema"}${item.showInCompetency ? " · Kompetens" : ""}${item.showInTestResults ? " · Testresultat" : ""}${item.autoSchedule ? " · Autoschema" : ""}</span>${item.enabled ? "" : '<span class="work-item-row-status">Pausad</span>'}</div>
        <div class="work-item-row-actions">
          <button class="btn" type="button" data-move-work-item="${item.id}" data-direction="-1"${index === 0 ? " disabled" : ""} aria-label="Flytta upp">↑</button>
          <button class="btn" type="button" data-move-work-item="${item.id}" data-direction="1"${index === customWorkItems.length - 1 ? " disabled" : ""} aria-label="Flytta ner">↓</button>
          <button class="btn" type="button" data-edit-work-item="${item.id}">Redigera</button>
          <button class="btn" type="button" data-toggle-work-item="${item.id}">${item.enabled ? "Pausa" : "Aktivera"}</button>
          <button class="btn danger" type="button" data-trash-work-item="${item.id}">Ta bort</button>
        </div>
      </article>`).join("") : '<div class="empty-state">Inga egna maskiner eller avdelningar har lagts till.</div>';

    const trash = await getWorkItemTrash();
    if (trashCount) trashCount.textContent = String(trash.length);
    if (trashList) trashList.innerHTML = trash.length ? trash.map(item => `
      <article class="work-item-row"><div><strong>${escapeHtml(item.name)}</strong><span>Borttagen ${new Date(item.deletedAt || Date.now()).toLocaleDateString("sv-SE")}</span></div><div class="work-item-row-actions"><button class="btn" type="button" data-restore-work-item="${item.id}">Återställ</button></div></article>`).join("") : '<div class="empty-state">Papperskorgen är tom.</div>';

    list.querySelectorAll("[data-edit-work-item]").forEach(button => button.addEventListener("click", () => {
      const item = customWorkItems.find(entry => entry.id === button.dataset.editWorkItem);
      if (item) startEdit(item);
    }));
    list.querySelectorAll("[data-move-work-item]").forEach(button => button.addEventListener("click", async () => {
      const index = customWorkItems.findIndex(entry => entry.id === button.dataset.moveWorkItem);
      const target = index + Number(button.dataset.direction);
      if (index < 0 || target < 0 || target >= customWorkItems.length) return;
      const next = [...customWorkItems];
      [next[index], next[target]] = [next[target], next[index]];
      await saveCustomWorkItems(next);
      showMessage("Ordningen har sparats.");
      await renderManager();
    }));
    list.querySelectorAll("[data-toggle-work-item]").forEach(button => button.addEventListener("click", async () => {
      const item = customWorkItems.find(entry => entry.id === button.dataset.toggleWorkItem);
      if (!item) return;
      const updated = { ...item, enabled: !item.enabled, updatedAt: new Date().toISOString() };
      await saveCustomWorkItems(customWorkItems.map(entry => entry.id === item.id ? updated : entry));
      await syncWorkItemCompetency(updated, item);
      await addAuditEvent("department", `${item.name} ${updated.enabled ? "aktiverad" : "pausad"}`, "Inställning ändrad");
      showMessage(updated.enabled ? `${item.name} är aktiv igen.` : `${item.name} har pausats. Befintlig data finns kvar.`);
      await renderManager();
    }));
    list.querySelectorAll("[data-trash-work-item]").forEach(button => button.addEventListener("click", async () => {
      const item = customWorkItems.find(entry => entry.id === button.dataset.trashWorkItem);
      if (!item) return;
      const usageCount = await getWorkItemUsageCount(item.name);
      if (usageCount) {
        const choice = await chooseWorkItemReplacement(item, usageCount);
        if (!choice) return;
        if (choice.action === "pause") {
          const updated = { ...item, enabled: false, updatedAt: new Date().toISOString() };
          await saveCustomWorkItems(customWorkItems.map(entry => entry.id === item.id ? updated : entry));
          await syncWorkItemCompetency(updated, item); showMessage(`${item.name} pausades och historiken finns kvar.`); await renderManager(); return;
        }
        await createWorkItemSafetySnapshot(`${item.name} ersätts med ${choice.replacement.name}`);
        await renameWorkItemReferences(item.name, choice.replacement.name);
      } else if (!confirm(`Flytta ${item.name} till papperskorgen? Befintlig historik sparas.`)) return;
      await createWorkItemSafetySnapshot(`${item.name} flyttas till papperskorgen`);
      const trashItems = await getWorkItemTrash();
      await saveWorkItemTrash([{ ...item, deletedAt: new Date().toISOString() }, ...trashItems]);
      await saveCustomWorkItems(customWorkItems.filter(entry => entry.id !== item.id));
      await syncWorkItemCompetency({ ...item, enabled: false }, item);
      if (editingId === item.id) resetEditor();
      await addAuditEvent("department", `${item.name} flyttad till papperskorgen`, "Kan återställas");
      showMessage(`${item.name} flyttades till papperskorgen.`);
      await renderManager();
    }));
    trashList?.querySelectorAll("[data-restore-work-item]").forEach(button => button.addEventListener("click", async () => {
      const trashItems = await getWorkItemTrash();
      const item = trashItems.find(entry => entry.id === button.dataset.restoreWorkItem);
      if (!item) return;
      const restored = { ...item, enabled: true, updatedAt: new Date().toISOString() };
      delete restored.deletedAt;
      await saveCustomWorkItems([...customWorkItems, restored]);
      await saveWorkItemTrash(trashItems.filter(entry => entry.id !== item.id));
      await syncWorkItemCompetency(restored);
      await addAuditEvent("department", `${item.name} återställd`, "Från papperskorgen");
      showMessage(`${item.name} har återställts.`);
      await renderManager();
    }));
  };

  bindOnce(cancelButton, "click", resetEditor);
  bindOnce(form, "submit", async event => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const previousItem = customWorkItems.find(item => item.id === editingId) || null;
    const showInSchema = schemaCheckbox.checked;
    const showInCompetency = competencyCheckbox.checked;
    const showInTestResults = testResultsCheckbox.checked;
    const autoSchedule = autoScheduleCheckbox.checked;
    const type = isExtraPersonTaskName(name) ? "extra" : typeSelect?.value || "machine";
    const staffCount = Math.max(1, Math.min(20, Number(staffCountInput?.value) || 1));
    const requiredSkills = [...new Set((requiredSkillsInput?.value || "").split(",").map(value => value.trim()).filter(Boolean))];
    if (!name) return showMessage("Ange ett namn.", "error");
    const duplicate = TASKS.some(task => task.toLocaleLowerCase() === name.toLocaleLowerCase() && task !== previousItem?.name) ||
      customWorkItems.some(item => item.id !== editingId && item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (duplicate) return showMessage("Namnet finns redan.", "error");
    if (autoSchedule && (!showInSchema || !showInCompetency)) return showMessage("Autoschema kräver att både Schema och Kompetens är valda.", "error");
    const now = new Date().toISOString();
    const item = previousItem ? { ...previousItem, name, after: afterSelect.value || "Packa L4", type, staffCount, requiredSkills, showInSchema, showInCompetency, showInTestResults, autoSchedule, updatedAt: now }
      : { id: makeId(), name, after: afterSelect.value || "Packa L4", type, staffCount, requiredSkills, showInSchema, showInCompetency, showInTestResults, autoSchedule, enabled: true, createdAt: now, updatedAt: now };
    if (previousItem && previousItem.name !== name) {
      await createWorkItemSafetySnapshot(`${previousItem.name} byter namn till ${name}`);
      await renameWorkItemReferences(previousItem.name, name);
    }
    const nextItems = previousItem ? customWorkItems.map(entry => entry.id === item.id ? item : { ...entry, after: entry.after === previousItem.name ? name : entry.after }) : [...customWorkItems, item];
    await saveCustomWorkItems(nextItems);
    await syncWorkItemCompetency(item, previousItem);
    await addAuditEvent("department", `${name} ${previousItem ? "uppdaterad" : "tillagd"}`, [showInSchema ? "Schema" : "", showInCompetency ? "Kompetens" : "", showInTestResults ? "Testresultat" : ""].filter(Boolean).join(" · "));
    resetEditor();
    showMessage(`${name} har ${previousItem ? "uppdaterats" : "lagts till"}.`);
    await renderManager();
  });
  await renderManager();
}

function initializeAppContent() {
  enhanceAppShell();
  if (document.getElementById("breakPlanner")) {
    resetBreakPlannerToToday();
  }
  renderWeekNavigation();
  void renderSchedule();
  void renderBreakPlanner();
  void renderPeople();
  void renderUsersPage();
  void renderAssessments();
  void renderTestResults();
  void renderMachineSkills();
  void renderTrainingReminders();
  void renderDashboard();
  void renderProduction();
  void renderTodoList();
  void renderSettings();
  void renderProfilePage();
  renderHelpPage();
  setupAddForm();
  void setupWorkItemManager();
  renderExtraAssignmentManager();
  setupAutoSchedule();
  setupShareSchedule();
  setupAutoLock();
  setupChat();
  setupNotifications();
  setupLiveUpdates();
  void setupOnboarding();
  setupFilterControls();
  setupTodoPage();
}

// Chat for admins and shift leaders: a button in the corner with an unread badge
// and a short preview when a new message arrives. New messages are fetched by
// polling: often while the chat is open, more rarely while it is closed.
const CHAT_POLL_OPEN_MS = 4000;
const CHAT_POLL_CLOSED_MS = 15000;
const CHAT_POLL_HIDDEN_MS = 60000;
const CHAT_MAX_IMAGE_SIDE = 1600;
const CHAT_MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const CHAT_NOTIFIED_KEY = "staff_chat_notified_id";
const CHAT_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
const CHAT_IMAGE_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
const chatState = { open: false, loaded: false, messages: [], hasOlder: false, timer: null, image: null, previewTimer: null };

const chatMessageId = message => BigInt(message?.id || 0);

function getChatElements() {
  const widget = document.getElementById("chatWidget");
  return widget && {
    widget,
    toggle: widget.querySelector(".chat-toggle"),
    badge: widget.querySelector(".chat-badge"),
    preview: widget.querySelector(".chat-preview"),
    panel: widget.querySelector(".chat-panel"),
    list: widget.querySelector(".chat-messages"),
    form: widget.querySelector(".chat-form"),
    input: widget.querySelector(".chat-form textarea"),
    file: widget.querySelector(".chat-form input[type=file]"),
    attachment: widget.querySelector(".chat-attachment"),
    status: widget.querySelector(".chat-status")
  };
}

function setupChat() {
  if (!canManageStaff() || document.getElementById("chatWidget")) return;
  const widget = document.createElement("div");
  widget.id = "chatWidget";
  widget.className = "chat-widget";
  widget.innerHTML = `
    <button type="button" class="chat-preview hidden"></button>
    <section class="chat-panel hidden" aria-label="Chatt">
      <header class="chat-header"><div><strong>Chatt</strong><small>Admin, skiftledare och höger hand</small></div><button type="button" class="chat-close" aria-label="Stäng chatten">×</button></header>
      <div class="chat-messages" role="log" aria-live="polite" tabindex="0"></div>
      <form class="chat-form">
        <div class="chat-attachment hidden"><img alt="Vald bild" /><button type="button" class="chat-attachment-remove" aria-label="Ta bort bilden">×</button></div>
        <p class="chat-status inline-message" role="status"></p>
        <div class="chat-input-row">
          <label class="chat-attach" title="Bifoga bild">${CHAT_IMAGE_ICON}<span class="visually-hidden">Bifoga bild</span><input type="file" accept="image/*" hidden /></label>
          <textarea rows="1" maxlength="2000" placeholder="Skriv ett meddelande…" aria-label="Meddelande"></textarea>
          <button class="btn primary chat-send" type="submit">Skicka</button>
        </div>
      </form>
    </section>
    <button type="button" class="chat-toggle" aria-label="Öppna chatten" aria-expanded="false">${CHAT_ICON}<span class="chat-badge hidden" aria-hidden="true"></span></button>`;
  document.body.appendChild(widget);
  document.body.classList.add("has-chat");
  const elements = getChatElements();

  elements.toggle.addEventListener("click", () => void setChatOpen(!chatState.open));
  elements.widget.querySelector(".chat-close").addEventListener("click", () => void setChatOpen(false));
  elements.preview.addEventListener("click", () => void setChatOpen(true));
  elements.panel.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); void setChatOpen(false); elements.toggle.focus(); }
  });
  elements.input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); elements.form.requestSubmit(); }
  });
  elements.input.addEventListener("input", () => resizeChatInput(elements.input));
  elements.input.addEventListener("paste", event => {
    const file = [...(event.clipboardData?.files || [])].find(item => item.type.startsWith("image/"));
    if (file) { event.preventDefault(); void attachChatImage(file); }
  });
  elements.file.addEventListener("change", () => {
    const file = elements.file.files?.[0];
    elements.file.value = "";
    if (file) void attachChatImage(file);
  });
  elements.widget.querySelector(".chat-attachment-remove").addEventListener("click", () => setChatImage(null));
  elements.form.addEventListener("submit", event => { event.preventDefault(); void sendChatMessage(); });
  elements.list.addEventListener("click", event => {
    const older = event.target.closest(".chat-older");
    if (older) { void loadOlderChatMessages(older); return; }
    const remove = event.target.closest("[data-delete-message]");
    if (remove) void deleteChatMessage(remove.dataset.deleteMessage);
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void pollChat(); });
  void pollChat();
}

// Notes ("Notiser"): a bell in the page header. Shift leaders and right hands get a
// short note when an admin changes something in their shift or in shared settings;
// everyone gets one when someone shares a to-do task with them.
const BELL_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
const notificationState = { items: [], unread: 0, open: false, seen: null, loading: null };

function getNotificationElements() {
  const bell = document.getElementById("notificationBell");
  if (!bell) return null;
  return {
    bell,
    toggle: bell.querySelector(".notification-toggle"),
    badge: bell.querySelector(".notification-badge"),
    panel: bell.querySelector(".notification-panel"),
    list: bell.querySelector(".notification-list"),
    clear: bell.querySelector(".notification-clear")
  };
}

function setupNotifications() {
  const header = document.querySelector(".main .header");
  if (!currentUser || !header || document.getElementById("notificationBell")) return;
  const bell = document.createElement("div");
  bell.id = "notificationBell";
  bell.className = "notification-bell";
  bell.innerHTML = `
    <button type="button" class="notification-toggle" aria-label="Notiser" aria-expanded="false" title="Notiser">${BELL_ICON}<span class="notification-badge hidden" aria-hidden="true"></span></button>
    <section class="notification-panel hidden" aria-label="Notiser">
      <header class="notification-header"><strong>Notiser</strong><button type="button" class="notification-clear">Rensa alla</button></header>
      <div class="notification-list"></div>
    </section>`;
  header.prepend(bell);
  header.classList.add("has-notifications");
  const elements = getNotificationElements();
  elements.toggle.addEventListener("click", () => void setNotificationsOpen(!notificationState.open));
  elements.clear.addEventListener("click", () => void clearNotifications());
  elements.bell.addEventListener("keydown", event => {
    if (event.key === "Escape" && notificationState.open) { event.preventDefault(); void setNotificationsOpen(false); elements.toggle.focus(); }
  });
  document.addEventListener("click", event => {
    if (notificationState.open && !event.target.closest("#notificationBell")) void setNotificationsOpen(false);
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void loadNotifications({ announce: true }); });
  void loadNotifications();
}

// Fetches the notes. With `announce`, notes that arrived since the last fetch are
// shown as a toast with a chime.
async function loadNotifications({ announce = false } = {}) {
  if (!getNotificationElements() || notificationState.loading) return notificationState.loading;
  notificationState.loading = (async () => {
    try {
      const data = await apiRequest("GET", "/notifications");
      const fresh = notificationState.seen ? data.notifications.filter(note => !note.read && !notificationState.seen.has(note.id)) : [];
      notificationState.seen = new Set(data.notifications.map(note => note.id));
      notificationState.items = data.notifications;
      notificationState.unread = data.unread;
      renderNotifications();
      if (announce && fresh.length) {
        showAppToast(fresh.length === 1 ? notificationText(fresh[0]) : `${fresh.length} nya notiser`, "info");
        playNotificationSound("message");
      }
      if (notificationState.open && data.unread) await markNotificationsRead();
    } catch (error) {
      console.warn("Notifications could not be loaded:", error);
    } finally {
      notificationState.loading = null;
    }
  })();
  return notificationState.loading;
}

function notificationText(note) {
  return note.kind === "todoShared"
    ? `${note.actorName || "Någon"} har delat en uppgift med dig: ${note.title}`
    : `${note.actorName || "Admin"} (admin) ändrade: ${note.title}`;
}

function renderNotifications() {
  const elements = getNotificationElements();
  if (!elements) return;
  const { unread, items } = notificationState;
  elements.badge.textContent = unread > 99 ? "99+" : String(unread);
  elements.badge.classList.toggle("hidden", !unread);
  elements.toggle.setAttribute("aria-label", unread ? `Notiser, ${unread} olästa` : "Notiser");
  elements.clear.classList.toggle("hidden", !items.length);
  if (!items.length) {
    elements.list.innerHTML = '<p class="notification-empty">Inga notiser.</p>';
    return;
  }
  elements.list.innerHTML = items.map(note => {
    const shared = note.kind === "todoShared";
    const heading = shared
      ? `<strong>${escapeHtml(note.actorName || "Någon")}</strong> har delat en uppgift med dig`
      : `<strong>${escapeHtml(note.actorName || "Admin")}</strong> (admin) ändrade`;
    const body = `<span class="notification-heading">${heading}</span>
      <span class="notification-title">${escapeHtml(note.title)}</span>
      ${note.detail ? `<span class="notification-detail">${escapeHtml(note.detail)}</span>` : ""}
      <time datetime="${escapeHtml(note.createdAt)}">${escapeHtml(formatChatTime(note.createdAt))}</time>`;
    const className = `notification-item${note.read ? "" : " unread"}`;
    return shared ? `<a class="${className}" href="todo.html">${body}</a>` : `<div class="${className}">${body}</div>`;
  }).join("");
}

async function setNotificationsOpen(open) {
  const elements = getNotificationElements();
  if (!elements) return;
  notificationState.open = open;
  elements.panel.classList.toggle("hidden", !open);
  elements.toggle.setAttribute("aria-expanded", String(open));
  if (!open) {
    // Notes seen while the panel was open no longer stand out next time.
    notificationState.items.forEach(note => { note.read = true; });
    renderNotifications();
    return;
  }
  renderNotifications();
  if (notificationState.unread) await markNotificationsRead();
}

async function markNotificationsRead() {
  try {
    await apiRequest("POST", "/notifications/read", {});
    notificationState.unread = 0;
    const { badge, toggle } = getNotificationElements() || {};
    badge?.classList.add("hidden");
    toggle?.setAttribute("aria-label", "Notiser");
  } catch (error) {
    console.warn("Notifications could not be marked as read:", error);
  }
}

async function clearNotifications() {
  try {
    await apiRequest("DELETE", "/notifications");
    notificationState.items = [];
    notificationState.unread = 0;
    renderNotifications();
  } catch (error) {
    showAppToast(error.message || "Notiserna kunde inte rensas.", "error");
  }
}

function resizeChatInput(input) {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
}

function showChatStatus(text, type = "error") {
  const { status } = getChatElements();
  status.textContent = text;
  status.className = `chat-status inline-message ${text ? type : ""}`;
}

function scheduleChatPoll() {
  clearTimeout(chatState.timer);
  const delay = document.hidden ? CHAT_POLL_HIDDEN_MS : chatState.open ? CHAT_POLL_OPEN_MS : CHAT_POLL_CLOSED_MS;
  chatState.timer = setTimeout(() => void pollChat(), delay);
}

async function pollChat() {
  clearTimeout(chatState.timer);
  try {
    if (chatState.open) await loadNewChatMessages();
    else await checkChatUnread();
  } catch (error) {
    console.warn("Chat update failed:", error);
  } finally {
    if (currentUser) scheduleChatPoll();
  }
}

function setChatBadge(count) {
  const { badge, toggle } = getChatElements();
  badge.textContent = count > 99 ? "99+" : String(count);
  badge.classList.toggle("hidden", !count);
  toggle.setAttribute("aria-label", count ? `Öppna chatten, ${count} olästa meddelanden` : "Öppna chatten");
}

async function checkChatUnread() {
  const { count, latest } = await apiRequest("GET", "/chat/unread");
  setChatBadge(count);
  // Each new message is announced once, even across page changes.
  const notified = BigInt(sessionStorage.getItem(CHAT_NOTIFIED_KEY) || 0);
  if (!count || !latest || chatMessageId(latest) <= notified) return;
  sessionStorage.setItem(CHAT_NOTIFIED_KEY, latest.id);
  playChatMessageSound(latest);
  const { preview } = getChatElements();
  const text = latest.text || (latest.imageUrl ? "Skickade en bild" : "");
  preview.innerHTML = `<strong>${escapeHtml(latest.authorName)}</strong><span>${escapeHtml(text.length > 90 ? `${text.slice(0, 90)}…` : text)}</span>${count > 1 ? `<small>${count} olästa meddelanden</small>` : ""}`;
  preview.classList.remove("hidden");
  clearTimeout(chatState.previewTimer);
  chatState.previewTimer = setTimeout(() => preview.classList.add("hidden"), 8000);
}

async function setChatOpen(open) {
  const elements = getChatElements();
  chatState.open = open;
  elements.panel.classList.toggle("hidden", !open);
  elements.preview.classList.add("hidden");
  elements.toggle.setAttribute("aria-expanded", String(open));
  elements.widget.classList.toggle("is-open", open);
  if (!open) { scheduleChatPoll(); return; }
  elements.input.focus();
  if (!chatState.loaded) {
    elements.list.innerHTML = '<p class="chat-empty">Laddar…</p>';
    try {
      const data = await apiRequest("GET", "/chat/messages");
      chatState.messages = data.messages;
      chatState.hasOlder = data.hasOlder;
      chatState.loaded = true;
    } catch (error) {
      elements.list.innerHTML = `<p class="chat-empty">${escapeHtml(error.message || "Chatten kunde inte laddas.")}</p>`;
      return;
    }
    renderChatMessages({ scrollToEnd: true });
  } else {
    renderChatMessages({ scrollToEnd: true });
    await loadNewChatMessages();
  }
  await markChatRead();
  scheduleChatPoll();
}

async function markChatRead() {
  const last = chatState.messages.at(-1);
  setChatBadge(0);
  if (!last) return;
  // What has been read needs no preview later.
  if (chatMessageId(last) > BigInt(sessionStorage.getItem(CHAT_NOTIFIED_KEY) || 0)) sessionStorage.setItem(CHAT_NOTIFIED_KEY, last.id);
  await apiRequest("POST", "/chat/read", { lastId: last.id });
}

async function loadNewChatMessages() {
  if (!chatState.loaded) return;
  const last = chatState.messages.at(-1);
  const data = await apiRequest("GET", `/chat/messages${last ? `?after=${encodeURIComponent(last.id)}` : ""}`);
  const known = new Set(chatState.messages.map(message => message.id));
  const fresh = data.messages.filter(message => !known.has(message.id));
  if (!fresh.length) return;
  const { list } = getChatElements();
  const nearEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  chatState.messages.push(...fresh);
  renderChatMessages({ scrollToEnd: nearEnd });
  playChatMessageSound(fresh.findLast(message => message.userId !== currentUser?.id));
  if (chatState.open && !document.hidden) await markChatRead();
}

async function loadOlderChatMessages(button) {
  const first = chatState.messages[0];
  if (!first) return;
  button.disabled = true;
  const { list } = getChatElements();
  const previousHeight = list.scrollHeight;
  const data = await apiRequest("GET", `/chat/messages?before=${encodeURIComponent(first.id)}`);
  chatState.messages = [...data.messages, ...chatState.messages];
  chatState.hasOlder = data.hasOlder;
  renderChatMessages();
  list.scrollTop = list.scrollHeight - previousHeight;
}

function formatChatTime(value) {
  const date = new Date(value);
  const time = date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  return formatDateKey(date) === formatDateKey(new Date()) ? time : `${date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })} ${time}`;
}

function renderChatMessages({ scrollToEnd = false } = {}) {
  const { list } = getChatElements();
  if (!chatState.messages.length) {
    list.innerHTML = '<p class="chat-empty">Inga meddelanden ännu. Skriv det första!</p>';
    return;
  }
  list.innerHTML = `${chatState.hasOlder ? '<button type="button" class="chat-older">Visa äldre meddelanden</button>' : ""}${chatState.messages.map(message => {
    const mine = message.userId === currentUser?.id;
    const canDelete = mine || isAdmin();
    return `<article class="chat-message${mine ? " is-mine" : ""}">
      <div class="chat-meta"><strong>${escapeHtml(mine ? "Du" : message.authorName)}</strong><time datetime="${escapeHtml(message.createdAt)}">${escapeHtml(formatChatTime(message.createdAt))}</time>${canDelete ? `<button type="button" class="chat-delete" data-delete-message="${escapeHtml(message.id)}" aria-label="Ta bort meddelandet">×</button>` : ""}</div>
      ${message.text ? `<p>${escapeHtml(message.text)}</p>` : ""}
      ${message.imageUrl ? `<a class="chat-image" href="${escapeHtml(message.imageUrl)}" target="_blank" rel="noopener"><img src="${escapeHtml(message.imageUrl)}" alt="Bild från ${escapeHtml(message.authorName)}" loading="lazy" /></a>` : ""}
    </article>`;
  }).join("")}`;
  if (scrollToEnd) {
    list.scrollTop = list.scrollHeight;
    // Images change the height once they load.
    list.querySelectorAll("img").forEach(image => image.addEventListener("load", () => { list.scrollTop = list.scrollHeight; }, { once: true }));
  }
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Photos from phones are large; they are shrunk to at most 1600 px and sent as JPEG.
// GIFs are sent unchanged so animations keep working.
async function prepareChatImage(file) {
  if (!file.type.startsWith("image/")) throw new ApiError(400, "Välj en bildfil.");
  if (file.type === "image/gif") {
    if (file.size > CHAT_MAX_IMAGE_BYTES) throw new ApiError(400, "GIF-bilden är för stor. Välj en bild under 3 MB.");
    return { type: "image/gif", dataUrl: await readBlobAsDataUrl(file) };
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ApiError(400, "Bilden kunde inte läsas. Prova en JPEG- eller PNG-bild.");
  }
  const scale = Math.min(1, CHAT_MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob || blob.size > CHAT_MAX_IMAGE_BYTES) throw new ApiError(400, "Bilden är för stor.");
  return { type: "image/jpeg", dataUrl: await readBlobAsDataUrl(blob) };
}

function setChatImage(image) {
  const { attachment, input } = getChatElements();
  chatState.image = image;
  attachment.classList.toggle("hidden", !image);
  attachment.querySelector("img").src = image?.dataUrl || "";
  input.placeholder = image ? "Lägg till text (valfritt)…" : "Skriv ett meddelande…";
}

async function attachChatImage(file) {
  showChatStatus("Förbereder bilden…", "");
  try {
    setChatImage(await prepareChatImage(file));
    showChatStatus("");
  } catch (error) {
    showChatStatus(error.message || "Bilden kunde inte läsas.");
  }
  getChatElements().input.focus();
}

async function sendChatMessage() {
  const { input, form } = getChatElements();
  const text = input.value.trim();
  if (!text && !chatState.image) return;
  const sendButton = form.querySelector(".chat-send");
  sendButton.disabled = true;
  try {
    const image = chatState.image ? { type: chatState.image.type, data: chatState.image.dataUrl } : undefined;
    const { message } = await apiRequest("POST", "/chat/messages", { text, image });
    input.value = "";
    resizeChatInput(input);
    setChatImage(null);
    showChatStatus("");
    if (!chatState.messages.some(item => item.id === message.id)) chatState.messages.push(message);
    renderChatMessages({ scrollToEnd: true });
  } catch (error) {
    showChatStatus(error.message || "Meddelandet kunde inte skickas.");
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
}

async function deleteChatMessage(id) {
  if (!confirm("Ta bort meddelandet?")) return;
  try {
    await apiRequest("DELETE", `/chat/messages/${encodeURIComponent(id)}`);
    chatState.messages = chatState.messages.filter(message => message.id !== id);
    renderChatMessages();
  } catch (error) {
    showChatStatus(error.message || "Meddelandet kunde inte tas bort.");
  }
}

// Signing in.

const AUTH_NOTICE_KEY = "staff_auth_notice";

function setSession(me) {
  currentUser = me.user;
  currentPerson = me.person;
  shifts = Array.isArray(me.shifts) ? me.shifts : [];
  sessionStorage.setItem(SIGNED_IN_HINT_KEY, "1");
}

async function signOut(notice = "") {
  clearTimeout(autoLockTimeoutId);
  currentUser = null;
  try {
    await apiRequest("POST", "/logout");
  } catch (error) {
    console.warn("Logout request failed:", error);
  }
  sessionStorage.removeItem(SIGNED_IN_HINT_KEY);
  sessionStorage.removeItem(ACTIVE_SHIFT_KEY);
  sessionStorage.removeItem(ADMIN_LANDED_KEY);
  if (notice) sessionStorage.setItem(AUTH_NOTICE_KEY, notice);
  location.reload();
}

// Reloads shared data, for example after someone else changed it.
async function reloadSharedData() {
  invalidateCachedData();
  await loadSharedSettings();
  await refreshAppViews();
}

// Sound notifications: a short chime when someone else sends a chat message or
// changes the schedule. The tones are made with Web Audio, so no sound files are
// needed. The setting belongs to this device and is on by default.
const SOUND_SETTING_KEY = "staff_sound_notifications";
const SOUND_LAST_PLAYED_KEY = "staff_sound_last_played";
const SOUND_CHAT_HEARD_KEY = "staff_sound_chat_id";
// One save often changes several documents, and several tabs may be open: one chime is enough.
const SOUND_MIN_GAP_MS = 4000;
const SOUND_TONES = {
  message: [[880, 0], [1318.5, 0.13]],
  schedule: [[523.25, 0], [659.25, 0.15], [783.99, 0.3]]
};
const SCHEDULE_SOUND_KEY = /^(schedule|breakPlan|trainingLeaders|trainingLocations|extraPersonLocations|scheduleShared):/;
const soundState = { context: null, lastPlayed: {} };

function soundNotificationsEnabled() {
  try {
    return localStorage.getItem(SOUND_SETTING_KEY) !== "off";
  } catch {
    return true;
  }
}

function setSoundNotificationsEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_SETTING_KEY, enabled ? "on" : "off");
  } catch (error) {
    console.warn("The sound setting could not be saved:", error);
  }
}

function getSoundContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  soundState.context ??= new AudioContextClass();
  return soundState.context;
}

// Browsers only allow sound once the user has clicked or typed on the page.
function unlockSound() {
  if (!soundNotificationsEnabled()) return;
  const context = getSoundContext();
  if (context?.state === "suspended") context.resume().catch(() => {});
}
["pointerdown", "keydown"].forEach(type => document.addEventListener(type, unlockSound, { capture: true, passive: true }));

function playTones(kind) {
  const context = getSoundContext();
  if (!context) return;
  const play = () => {
    const start = context.currentTime + 0.02;
    SOUND_TONES[kind].forEach(([frequency, offset]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = start + offset;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.45);
    });
  };
  if (context.state === "running") return play();
  // Without a click on this page the browser may keep the sound blocked; a late chime is worse than none.
  const asked = Date.now();
  context.resume().then(() => { if (Date.now() - asked < 1000) play(); }, () => {});
}

function playNotificationSound(kind) {
  if (!soundNotificationsEnabled()) return;
  const now = Date.now();
  try {
    const lastPlayed = JSON.parse(localStorage.getItem(SOUND_LAST_PLAYED_KEY) || "{}");
    if (Math.abs(now - (lastPlayed[kind] || 0)) < SOUND_MIN_GAP_MS) return;
    localStorage.setItem(SOUND_LAST_PLAYED_KEY, JSON.stringify({ ...lastPlayed, [kind]: now }));
  } catch {
    if (now - (soundState.lastPlayed[kind] || 0) < SOUND_MIN_GAP_MS) return;
    soundState.lastPlayed[kind] = now;
  }
  playTones(kind);
}

// A chat message is chimed once, even with several tabs open or after a page change.
function playChatMessageSound(message) {
  if (!message || message.userId === currentUser?.id) return;
  try {
    if (chatMessageId(message) <= BigInt(localStorage.getItem(SOUND_CHAT_HEARD_KEY) || 0)) return;
    localStorage.setItem(SOUND_CHAT_HEARD_KEY, message.id);
  } catch {
    // Without storage the gap between chimes still keeps it from repeating.
  }
  playNotificationSound("message");
}

// Someone else changed the schedule or break plan of the user's own shift or the shift shown.
async function noticeScheduleChange(change) {
  if (!SCHEDULE_SOUND_KEY.test(change.key) || !change.by || change.by === currentUser?.id) return;
  if (change.scope !== getOwnShiftId() && change.scope !== getShiftScope()) return;
  if (!soundNotificationsEnabled()) return;
  if (change.key.startsWith("scheduleShared:")) {
    // Sharing a week is news; taking the share back is not.
    try {
      const { documents } = await apiRequest("GET", `/documents?scope=${encodeURIComponent(change.scope)}&keys=${encodeURIComponent(change.key)}`);
      if (documents?.[change.key]?.value?.shared !== true) return;
    } catch {
      return;
    }
  }
  playNotificationSound("schedule");
}

// Live updates: the server tells the page when someone saves something, and the
// views that show it are drawn again. A redraw waits while the user is typing or
// has a dialog open, so nothing they are in the middle of is lost.
const LIVE_REFRESH_DELAY_MS = 250;
const LIVE_BUSY_RECHECK_MS = 1500;
const LIVE_RECONNECT_MS = 15000;
const LIVE_TEXT_INPUT_TYPES = new Set(["text", "search", "number", "email", "tel", "password", "url", "date", "time", "datetime-local", "month", "week"]);
const liveUpdates = {
  source: null, reconnectTimer: null, refreshTimer: null, connected: false, renewing: false,
  changedDocuments: new Set(), peopleChanged: false, shiftsChanged: false, reloadAll: false,
  deferredVersions: new Map()
};

function setupLiveUpdates() {
  if (liveUpdates.source || !currentUser || typeof EventSource === "undefined") return;
  clearTimeout(liveUpdates.reconnectTimer);
  const source = new EventSource("/api/events");
  liveUpdates.source = source;
  source.addEventListener("ready", () => {
    // Changes saved while the connection was down were missed; fetch everything again.
    if (liveUpdates.connected && !liveUpdates.renewing) queueLiveRefresh({ reloadAll: true });
    liveUpdates.connected = true;
    liveUpdates.renewing = false;
  });
  source.addEventListener("renew", () => { liveUpdates.renewing = true; });
  source.addEventListener("resync", () => queueLiveRefresh({ reloadAll: true }));
  source.addEventListener("change", event => {
    try {
      handleLiveChange(JSON.parse(event.data));
    } catch (error) {
      console.warn("Live update could not be read:", error);
    }
  });
  source.addEventListener("error", () => {
    if (source.readyState !== EventSource.CLOSED) return;
    // The browser gives up after an error response; try again a little later.
    liveUpdates.source = null;
    if (currentUser) liveUpdates.reconnectTimer = setTimeout(setupLiveUpdates, LIVE_RECONNECT_MS);
  });
}

function handleLiveChange(change, { fromSave = false } = {}) {
  if (change.type === "document" && !fromSave) void noticeScheduleChange(change);
  if (change.type === "chat") {
    if (getChatElements()) void pollChat();
    return;
  }
  if (change.type === "sharedTodos") {
    void renderSharedTodos();
    return;
  }
  if (change.type === "notification") {
    void loadNotifications({ announce: true });
    return;
  }
  if (change.type === "people") return queueLiveRefresh({ peopleChanged: true });
  if (change.type === "shifts") return queueLiveRefresh({ shiftsChanged: true });
  if (change.type !== "document") return;
  const cacheKey = documentCacheKey(change.scope, change.key);
  const cached = documentCache.get(cacheKey);
  // Not shown on this page, or already the version this page saved itself.
  if (!cached || (change.version && cached.version >= change.version)) return;
  if (documentsBeingSaved.has(cacheKey)) {
    // Probably this page's own save; compared when the save has finished.
    const deferred = liveUpdates.deferredVersions.get(cacheKey) ?? -1;
    liveUpdates.deferredVersions.set(cacheKey, Math.max(deferred, change.version || Infinity));
    return;
  }
  queueLiveRefresh({ document: cacheKey });
}

function recheckDeferredLiveChange(scope, key) {
  const cacheKey = documentCacheKey(scope, key);
  if (!liveUpdates.deferredVersions.has(cacheKey)) return;
  const version = liveUpdates.deferredVersions.get(cacheKey);
  liveUpdates.deferredVersions.delete(cacheKey);
  handleLiveChange({ type: "document", scope, key, version: Number.isFinite(version) ? version : 0 }, { fromSave: true });
}

function queueLiveRefresh({ document: cacheKey, peopleChanged, shiftsChanged, reloadAll } = {}) {
  if (cacheKey) liveUpdates.changedDocuments.add(cacheKey);
  if (peopleChanged) liveUpdates.peopleChanged = true;
  if (shiftsChanged) liveUpdates.shiftsChanged = true;
  if (reloadAll) liveUpdates.reloadAll = true;
  clearTimeout(liveUpdates.refreshTimer);
  liveUpdates.refreshTimer = setTimeout(() => void runLiveRefresh(), LIVE_REFRESH_DELAY_MS);
}

function isUserBusyEditing() {
  if (productionAutosave.run) return true;
  // The production summary only shows data, so it is redrawn while open.
  if ([...document.querySelectorAll('[aria-modal="true"]')].some(modal => modal.getClientRects().length && !modal.closest("#productionSummary"))) return true;
  if (document.querySelector(".todo-share-panel")) return true;
  const active = document.activeElement;
  if (!active || active.closest("#chatWidget")) return false;
  if (active.isContentEditable || active.tagName === "TEXTAREA") return true;
  return active.tagName === "INPUT" && LIVE_TEXT_INPUT_TYPES.has(active.type);
}

let liveRefreshRunning = false;
async function runLiveRefresh() {
  if (!currentUser || liveRefreshRunning) return;
  if (isUserBusyEditing()) {
    liveUpdates.refreshTimer = setTimeout(() => void runLiveRefresh(), LIVE_BUSY_RECHECK_MS);
    return;
  }
  const { changedDocuments, peopleChanged, shiftsChanged, reloadAll } = liveUpdates;
  if (!changedDocuments.size && !peopleChanged && !shiftsChanged && !reloadAll) return;
  liveUpdates.changedDocuments = new Set();
  liveUpdates.peopleChanged = liveUpdates.shiftsChanged = liveUpdates.reloadAll = false;
  liveRefreshRunning = true;
  try {
    if (shiftsChanged || reloadAll) shifts = (await apiRequest("GET", "/shifts")).shifts;
    if (reloadAll) {
      invalidateCachedData();
    } else {
      changedDocuments.forEach(cacheKey => documentCache.delete(cacheKey));
      if (peopleChanged || shiftsChanged) peopleCache = null;
    }
    await loadSharedSettings();
    await refreshAppViews();
  } catch (error) {
    console.warn("Live update failed:", error);
  } finally {
    liveRefreshRunning = false;
    // Changes that arrived during the redraw get one of their own.
    const { changedDocuments: queued, peopleChanged: people, shiftsChanged: shiftList, reloadAll: all } = liveUpdates;
    if (queued.size || people || shiftList || all) queueLiveRefresh();
  }
}

// A redraw that waited for typing to finish runs when the field is left.
document.addEventListener("focusout", () => {
  if (liveUpdates.refreshTimer) {
    clearTimeout(liveUpdates.refreshTimer);
    liveUpdates.refreshTimer = setTimeout(() => void runLiveRefresh(), LIVE_REFRESH_DELAY_MS);
  }
});

// "Fler inställningar" on the overview links to a page with ?skift=<id>. The page opens with that
// shift chosen: as the active shift, and in the shift filters on Personal, Kompetens and Användare.
let linkedShiftId = "";
function applyLinkedShift() {
  const params = new URLSearchParams(location.search);
  const shiftId = params.get("skift");
  if (shiftId === null) return false;
  params.delete("skift");
  history.replaceState(history.state, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
  if (!canBrowseShifts() || !shifts.some(shift => shift.id === shiftId)) return false;
  sessionStorage.setItem(ACTIVE_SHIFT_KEY, shiftId);
  if (isAdmin()) {
    linkedShiftId = shiftId;
    sessionStorage.setItem(COMPETENCY_SHIFT_KEY, shiftId);
    usersPageFilters.shift = shiftId;
  }
  return true;
}

async function openAppUI() {
  if (!canOpenPage(getCurrentPage())) {
    location.replace("index.html");
    return;
  }
  const linked = applyLinkedShift();
  // The admin's start page is the production overview. Only the first page of a visit
  // redirects, so the Schema link still opens the schedule.
  const firstPageThisVisit = !sessionStorage.getItem(ADMIN_LANDED_KEY);
  sessionStorage.setItem(ADMIN_LANDED_KEY, "1");
  if (isAdmin() && firstPageThisVisit && !linked && getCurrentPage() === "index.html") {
    location.replace("dashboard.html");
    return;
  }
  setupShareSchedule(); // Before the page is shown, so operators never see the share button.
  setupRoleNavigation(); // Likewise: only the menu for this role is ever drawn.
  setAuthenticatedView(true);
  document.getElementById("authScreen")?.classList.add("hidden");
  document.getElementById("appShell")?.classList.remove("hidden");
  finishInitialViewSetup();
  bindOnce(document.getElementById("logoutBtn"), "click", () => signOut());
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./service-worker.js").catch(error => console.warn("Offline cache could not start", error));

  await loadSharedSettings();
  initializeAppContent();
}

const AUTH_FORMS = {
  login: {
    title: "Logga in",
    subtitle: "Logga in med ditt användarnamn och lösenord.",
    button: "Logga in",
    fields: [
      { name: "username", type: "text", label: "Användarnamn", autocomplete: "username" },
      { name: "password", type: "password", label: "Lösenord", autocomplete: "current-password" }
    ]
  },
  setup: {
    title: "Skapa admin-konto",
    subtitle: "Det finns inga användare ännu. Skapa det första admin-kontot. Installationskoden är värdet på SETUP_CODE i Railway.",
    button: "Skapa admin-konto",
    fields: [
      { name: "setupCode", type: "password", label: "Installationskod", autocomplete: "off" },
      { name: "name", type: "text", label: "Ditt namn", autocomplete: "name" },
      { name: "username", type: "text", label: "Användarnamn", autocomplete: "username" },
      { name: "password", type: "password", label: `Lösenord (minst ${MIN_PASSWORD_LENGTH} tecken)`, autocomplete: "new-password" },
      { name: "confirm", type: "password", label: "Bekräfta lösenord", autocomplete: "new-password" }
    ]
  },
  changePassword: {
    title: "Välj ett nytt lösenord",
    subtitle: "Du loggade in med ett tillfälligt lösenord. Välj ett eget lösenord innan du fortsätter.",
    button: "Spara lösenord",
    fields: [
      { name: "currentPassword", type: "password", label: "Tillfälligt lösenord", autocomplete: "current-password" },
      { name: "newPassword", type: "password", label: `Nytt lösenord (minst ${MIN_PASSWORD_LENGTH} tecken)`, autocomplete: "new-password" },
      { name: "confirm", type: "password", label: "Bekräfta nytt lösenord", autocomplete: "new-password" }
    ]
  }
};

function checkNewPassword(password, confirmation) {
  if (password.length < MIN_PASSWORD_LENGTH) throw new ApiError(400, `Lösenordet måste vara minst ${MIN_PASSWORD_LENGTH} tecken.`);
  if (password !== confirmation) throw new ApiError(400, "Lösenorden matchar inte.");
}

function renderAuthForm(mode, onSubmit) {
  const config = AUTH_FORMS[mode];
  const current = document.getElementById("authForm");
  if (!current) return;
  document.getElementById("authTitle").textContent = config.title;
  document.getElementById("authSubtitle").textContent = config.subtitle;
  // A fresh element drops the listeners from the previous mode.
  const form = current.cloneNode(false);
  form.innerHTML = `${config.fields.map(field => `<input name="${field.name}" type="${field.type}" placeholder="${escapeHtml(field.label)}" aria-label="${escapeHtml(field.label)}" autocomplete="${field.autocomplete}" required />`).join("")}
    <div class="actions"><button class="btn primary" type="submit">${escapeHtml(config.button)}</button>${mode === "changePassword" ? '<button class="btn" type="button" data-auth-logout>Logga ut</button>' : ""}</div>`;
  current.replaceWith(form);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    clearAuthMessage();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(form)));
    } catch (error) {
      console.error(error);
      showAuthMessage(error instanceof ApiError ? error.message : "Något gick fel. Försök igen.");
    } finally {
      button.disabled = false;
    }
  });
  form.querySelector("[data-auth-logout]")?.addEventListener("click", () => signOut());
  form.querySelector("input")?.focus();
}

async function continueAfterSignIn(me) {
  setSession(me);
  if (me.user.mustChangePassword) {
    showAuthScreen("changePassword");
    return;
  }
  await openAppUI();
}

function showAuthScreen(mode) {
  setAuthenticatedView(false);
  document.getElementById("appShell")?.classList.add("hidden");
  document.getElementById("authScreen")?.classList.remove("hidden");
  finishInitialViewSetup();
  clearAuthMessage();
  if (mode === "login") {
    renderAuthForm("login", async values => {
      await continueAfterSignIn(await apiRequest("POST", "/login", { username: values.username, password: values.password }));
    });
  } else if (mode === "setup") {
    renderAuthForm("setup", async values => {
      checkNewPassword(values.password, values.confirm);
      await continueAfterSignIn(await apiRequest("POST", "/setup", {
        setupCode: values.setupCode, name: values.name, username: values.username, password: values.password
      }));
    });
  } else {
    renderAuthForm("changePassword", async values => {
      checkNewPassword(values.newPassword, values.confirm);
      await continueAfterSignIn(await apiRequest("POST", "/me/password", { currentPassword: values.currentPassword, newPassword: values.newPassword }));
    });
  }
  const notice = sessionStorage.getItem(AUTH_NOTICE_KEY);
  sessionStorage.removeItem(AUTH_NOTICE_KEY);
  if (notice) showAuthMessage(notice, false);
}

async function setupAuthUI() {
  if (!document.getElementById("authScreen") || !document.getElementById("appShell")) {
    finishInitialViewSetup();
    return;
  }
  let me = null;
  try {
    me = await apiRequest("GET", "/me");
  } catch (error) {
    if (error.status !== 401) throw error;
  }
  if (me) {
    await continueAfterSignIn(me);
    return;
  }
  sessionStorage.removeItem(SIGNED_IN_HINT_KEY);
  const setup = await apiRequest("GET", "/setup");
  showAuthScreen(setup.needsSetup ? "setup" : "login");
}

// Avoid flashing the login screen between pages while the session is checked.
// The script is loaded at the end of <body>, before first paint.
try {
  if (sessionStorage.getItem(SIGNED_IN_HINT_KEY)) setAuthenticatedView(true);
} catch (error) {
  console.warn("Could not read the saved session:", error);
}

// Save failures from handlers without their own error handling still reach the user.
window.addEventListener("unhandledrejection", event => {
  if (!(event.reason instanceof ApiError)) return;
  event.preventDefault();
  showAppToast(event.reason.message, "error");
});

// Pick up other people's changes when someone returns to a tab after a while.
let pageHiddenSince = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pageHiddenSince = Date.now();
    return;
  }
  const hiddenFor = Date.now() - pageHiddenSince;
  pageHiddenSince = 0;
  if (currentUser && hiddenFor > 60 * 1000 && hiddenFor < 24 * 60 * 60 * 1000) void reloadSharedData();
});

document.addEventListener("DOMContentLoaded", () => {
  setupThemeToggles();
  void setupAuthUI().catch(error => {
    console.error("App startup failed:", error);
    setAuthenticatedView(false);
    document.getElementById("appShell")?.classList.add("hidden");
    document.getElementById("authScreen")?.classList.remove("hidden");
    finishInitialViewSetup();
    showAuthMessage(error instanceof ApiError ? error.message : "Appen kunde inte starta. Ladda om sidan och försök igen.");
  });
});

window.addEventListener("pageshow", event => {
  pageIsUnloading = false;
  // A page restored from the back/forward cache has a closed event stream.
  if (event.persisted && currentUser && liveUpdates.source?.readyState === EventSource.CLOSED) {
    liveUpdates.source = null;
    setupLiveUpdates();
    queueLiveRefresh({ reloadAll: true });
  }
  if (!event.persisted || !document.getElementById("breakPlanner")) return;
  resetBreakPlannerToToday();
  renderWeekNavigation();
  void renderBreakPlanner();
});
