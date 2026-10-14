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
const SELECTED_WEEK_KEY = "staff_selected_week";
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

const ROLES = { ADMIN: "admin", LEADER: "shift_leader", OPERATOR: "operator" };
const ROLE_LABELS = { admin: "Admin", shift_leader: "Skiftledare", operator: "Operatör" };
// Pages each role may open. The server enforces the same rules (server/permissions.js);
// this only decides what is shown.
const PAGE_ACCESS = {
  "dashboard.html": [ROLES.ADMIN, ROLES.LEADER],
  "index.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.OPERATOR],
  "produktion.html": [ROLES.ADMIN, ROLES.LEADER],
  "rast.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.OPERATOR],
  "personal.html": [ROLES.ADMIN, ROLES.LEADER],
  "anvandare.html": [ROLES.ADMIN],
  "testresultat.html": [ROLES.ADMIN],
  "maskiner.html": [ROLES.ADMIN],
  "bedomning.html": [ROLES.ADMIN],
  "todo.html": [ROLES.ADMIN, ROLES.LEADER],
  "add.html": [ROLES.ADMIN, ROLES.LEADER],
  "installningar.html": [ROLES.ADMIN, ROLES.LEADER],
  "profil.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.OPERATOR],
  "hjalp.html": [ROLES.ADMIN, ROLES.LEADER, ROLES.OPERATOR]
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
const isOperator = () => hasRole(ROLES.OPERATOR);
const canManageStaff = () => hasRole(ROLES.ADMIN, ROLES.LEADER);

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
const SHIFT_COLORS = [["red", "Röd", "🔴"], ["blue", "Blå", "🔵"], ["yellow", "Gul", "🟡"], ["green", "Grön", "🟢"], ["purple", "Lila", "🟣"], ["orange", "Orange", "🟠"]];

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

function shiftColorOptions(selected) {
  return `<option value=""${selected ? "" : " selected"}>Ingen färg</option>${SHIFT_COLORS.map(([value, label, emoji]) => `<option value="${value}"${value === selected ? " selected" : ""}>${emoji} ${label}</option>`).join("")}`;
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
  return Boolean(shiftId) && (isAdmin() || (isShiftLeader() && shiftId === getOwnShiftId()));
}

function canEditActiveShift() {
  return canEditShift(getShiftScope());
}

function canEditPerson(person) {
  if (!person || !currentUser) return false;
  if (isAdmin()) return true;
  return isShiftLeader() && Boolean(person.shiftId) && person.shiftId === getOwnShiftId();
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
// tick are sent as one request per scope ("global" or a shift id).
const documentCache = new Map();
const documentBatches = new Map();
const documentSaveQueues = new Map();
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
    try {
      const saved = await apiRequest("PUT", `/documents/${encodeURIComponent(scope)}/${encodeURIComponent(key)}`, {
        value: snapshot,
        baseVersion: entry.version || 0
      });
      documentCache.set(cacheKey, { value: snapshot, version: saved.version, updatedAt: saved.updatedAt });
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
      <div class="preview-heading"><div><small>${isShareView ? "DELA MED GRUPPEN" : "FÖRHANDSVISNING"}</small><h3>Veckoschema</h3><p>${escapeHtml(result.message)}</p></div><button type="button" class="preview-close" aria-label="Stäng">×</button></div>
      <div class="schedule-preview-grid"><div class="preview-task preview-header">Uppgift</div>${DAYS.map((day, index) => `<div class="preview-header"><strong>${escapeHtml(day)}</strong><small>${escapeHtml(dates[index])}</small></div>`).join("")}${rows}</div>
      <div class="preview-actions">${isShareView ? '<button type="button" class="btn primary preview-save">Stäng</button>' : '<button type="button" class="btn preview-cancel">Avbryt</button><button type="button" class="btn primary preview-save">Spara schema</button>'}</div>
    `;
    modal.style.setProperty("--schedule-day-count", String(DAYS.length));
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    let cleanupFocus;
    const close = accepted => { overlay.remove(); cleanupFocus?.(); resolve(accepted); };
    cleanupFocus = manageDialogFocus(modal, () => close(false));
    modal.querySelector(".preview-close").addEventListener("click", () => close(false));
    modal.querySelector(".preview-cancel")?.addEventListener("click", () => close(false));
    modal.querySelector(".preview-save").addEventListener("click", () => close(!isShareView));
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

function getPersonAvailability(person) {
  return ["sick", "vab", "vacation", "unavailable"].includes(person?.availability)
    ? person.availability
    : "available";
}

function getAvailabilityLabel(status) {
  if (status === "sick") return "Sjuk";
  if (status === "vab") return "Vård av barn";
  if (status === "vacation") return "Semester";
  if (status === "unavailable") return "Inte tillgänglig";
  return "Tillgänglig";
}

function getUnavailableMessage(person) {
  const status = getPersonAvailability(person);
  if (status === "sick") return `${person.name} är sjuk och kan inte schemaläggas.`;
  if (status === "vab") return `${person.name} är hemma för vård av barn och kan inte schemaläggas.`;
  if (status === "vacation") return `${person.name} är på semester och kan inte schemaläggas.`;
  if (status === "unavailable") return `${person.name} är inte tillgänglig och kan inte schemaläggas.`;
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

async function loadAppSettings() {
  applyAppSettings(await getGlobalDocument("appSettings", {}));
}

async function saveAppSettings(nextSettings) {
  const normalized = normalizeAppSettings(nextSettings);
  await saveGlobalDocument("appSettings", normalized);
  applyAppSettings(normalized);
}

function setupShareSchedule() {
  const button = document.getElementById("shareScheduleBtn");
  if (!button || button.dataset.bound === "true") return;
  button.dataset.bound = "true";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const [schedule, trainingLeaders, trainingLocations, extraPersonLocations, people] = await Promise.all([
        getSchedule(),
        getTrainingLeaders(),
        getTrainingLocations(),
        getExtraPersonLocations(),
        getPeople()
      ]);
      const assignmentCount = TASKS.reduce((total, task) =>
        total + DAYS.filter(day => Boolean(schedule?.[task]?.[day])).length, 0);
      await showSchedulePreview({
        schedule,
        trainingLeaders,
        trainingLocations,
        extraPersonLocations,
        message: `${formatWeekRange()} · ${assignmentCount} placeringar`
      }, people, { mode: "share" });
    } finally {
      button.disabled = false;
    }
  });
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

async function loadCustomWorkItems() {
  const items = await getGlobalDocument("workItems", []);
  applyCustomWorkItems(Array.isArray(items) ? items : []);
}

async function saveCustomWorkItems(items) {
  applyCustomWorkItems(items);
  await saveGlobalDocument("workItems", customWorkItems);
}

async function getWorkItemTrash() {
  if (!canManageStaff()) return [];
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
  if (!isAdmin()) return [];
  const assessments = await getGlobalDocument("assessments", []);
  return Array.isArray(assessments) ? assessments : [];
}

async function saveAssessments(assessments) {
  await saveGlobalDocument("assessments", assessments);
}

async function getDepartments() {
  const departments = await getGlobalDocument("departments", null);
  if (!Array.isArray(departments)) {
    if (canManageStaff()) await saveDepartments(DEFAULT_DEPARTMENTS);
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

// Test results and assessments are only visible to admins.
async function getTestResults() {
  if (!isAdmin()) return {};
  const results = await getGlobalDocument("testResults", {});
  return isPlainObject(results) ? results : {};
}

async function saveTestResults(results) {
  await saveGlobalDocument("testResults", results);
}

// Competence is read by shift leaders too, since scheduling depends on it.
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

async function getProductionRecords() {
  if (!canEditActiveShift()) return {};
  const records = await getShiftDocument("productionRecords", {});
  return isPlainObject(records) ? records : {};
}

async function saveProductionRecords(records) {
  await saveShiftDocument("productionRecords", records);
}

async function getProductionSettings() {
  const settings = await getGlobalDocument("productionSettings", {});
  return { dailyTarget: Number(settings?.dailyTarget) || 160, factoryRecord: Number(settings?.factoryRecord) || 0 };
}

async function saveProductionSettings(settings) {
  await saveGlobalDocument("productionSettings", settings);
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

async function getTodos() {
  if (!canEditActiveShift()) return [];
  const todos = await getShiftDocument("todos", []);
  return Array.isArray(todos) ? todos : [];
}

async function saveTodos(todos) {
  await saveShiftDocument("todos", todos);
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

  todos.forEach(todo => {
    const item = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");
    const isComplete = Boolean(todo.completedAt);
    const isOverdue = !isComplete && todo.createdWeek < currentWeek;
    item.className = `todo-item${isComplete ? " is-complete" : ""}${isOverdue ? " is-overdue" : ""}`;
    checkbox.type = "checkbox";
    checkbox.checked = isComplete;
    checkbox.setAttribute("aria-label", `Markera ${todo.text} som klar`);
    text.textContent = todo.text;
    if (isOverdue) {
      const overdueLabel = document.createElement("small");
      overdueLabel.textContent = "Inte klar från förra veckan";
      item.append(checkbox, text, overdueLabel);
    } else {
      item.append(checkbox, text);
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
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./service-worker.js").catch(error => console.warn("Offline cache could not start", error));
  const nav = document.querySelector(".nav");
  if (nav && !nav.querySelector('[href="installningar.html"]')) {
    nav.insertAdjacentHTML("beforeend", '<a class="nav-link" href="profil.html">Min profil</a><a class="nav-link" href="installningar.html">Inställningar</a><a class="nav-link" href="hjalp.html">Hjälp</a>');
  }
  if (nav && !nav.querySelector('[href="anvandare.html"]')) {
    nav.querySelector('[href="personal.html"]')?.insertAdjacentHTML("afterend", '<a class="nav-link" href="anvandare.html">Användare</a>');
  }
  nav?.querySelectorAll(".nav-link").forEach(link => {
    if (!canOpenPage(link.getAttribute("href"))) link.remove();
  });
  renderSidebarAccount();
  renderShiftNotice();
  const pageTips = {
    "dashboard.html": "Här finns senaste status och dagens ändringar för skiftet.",
    "anvandare.html": "Klicka på Hantera för att ändra roll, användarnamn eller lösenord. Bara admin ser den här sidan.",
    "personal.html": "Använd status för sjukdom, semester eller annan frånvaro; schemat visar orsaken direkt.",
    "add.html": "Pausa en arbetsplats när den inte används. Då bevaras historiken och den kan aktiveras igen.",
    "maskiner.html": "Registrerad kompetens används för att varna och hjälpa autoschemat.",
    "testresultat.html": "Sök fram en person och registrera resultaten per maskin eller avdelning.",
    "bedomning.html": "Spara återkommande bedömningar för att se utveckling över tid.",
    "todo.html": "Uppgifter som inte blir klara följer med som påminnelser till nästa vecka.",
    "produktion.html": "Spara dagens resultat regelbundet; historiken finns kvar lokalt.",
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
  document.querySelectorAll(".nav-link").forEach(link => {
    const isCurrent = link.getAttribute("href") === currentPage;
    link.classList.toggle("active", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

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

// "Min profil": everyone edits their own name, phone and status, and their password.
async function renderProfilePage() {
  const root = document.getElementById("profilePage");
  if (!root || !currentUser || !currentPerson) return;
  const person = currentPerson;
  const availability = getPersonAvailability(person);
  root.innerHTML = `
    <form id="profileForm" class="card settings-card profile-card">
      <div><h3>Mina uppgifter</h3><p>Användarnamn <strong>${escapeHtml(currentUser.username)}</strong> · ${escapeHtml(ROLE_LABELS[currentUser.role] || "")} · Skift: ${shiftColorDot(person.shiftId)}${escapeHtml(getShiftName(person.shiftId) || "inget skift")}</p></div>
      <label>Namn<input name="name" value="${escapeHtml(person.name)}" maxlength="120" required autocomplete="name" /></label>
      <label>Telefon<input name="phone" type="tel" value="${escapeHtml(person.phone || "")}" maxlength="40" autocomplete="tel" /></label>
      <label>Status<select name="availability" class="person-availability person-availability-${availability}">${AVAILABILITY_OPTIONS.map(([value, label]) => `<option value="${value}"${value === availability ? " selected" : ""}>${label}</option>`).join("")}</select><small>Är du sjuk eller borta? Ändra här så ser skiftledaren det direkt.</small></label>
      <div class="settings-actions"><span id="profileMessage" class="inline-message" aria-live="polite"></span><button class="btn primary" type="submit">Spara</button></div>
    </form>
    <form id="profilePasswordForm" class="card settings-card">
      <div><h3>Byt lösenord</h3><p>Du loggas ut från dina andra enheter när lösenordet byts.</p></div>
      <label>Nuvarande lösenord<input name="currentPassword" type="password" autocomplete="current-password" required /></label>
      <label>Nytt lösenord<input name="newPassword" type="password" minlength="${MIN_PASSWORD_LENGTH}" autocomplete="new-password" required /><small>Minst ${MIN_PASSWORD_LENGTH} tecken.</small></label>
      <label>Bekräfta nytt lösenord<input name="confirm" type="password" minlength="${MIN_PASSWORD_LENGTH}" autocomplete="new-password" required /></label>
      <div class="settings-actions"><span id="passwordChangeMessage" class="inline-message" aria-live="polite"></span><button class="btn primary" type="submit">Spara nytt lösenord</button></div>
    </form>`;

  const profileForm = root.querySelector("#profileForm");
  const profileMessage = root.querySelector("#profileMessage");
  profileForm.elements.availability.addEventListener("change", event => {
    event.target.className = `person-availability person-availability-${event.target.value}`;
  });
  bindOnce(profileForm, "submit", async event => {
    event.preventDefault();
    const changes = {
      name: profileForm.elements.name.value.trim(),
      phone: profileForm.elements.phone.value.trim(),
      availability: profileForm.elements.availability.value
    };
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
      <label>Automatisk utloggning för admin och skiftledare<select id="autoLockSetting"><option value="5">Efter 5 minuter</option><option value="15">Efter 15 minuter</option><option value="30">Efter 30 minuter</option><option value="60">Efter 1 timme</option><option value="0">Aldrig</option></select></label>
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
      <div class="shift-settings-list">${shifts.map(shift => `<article>${shiftColorDot(shift.id) || '<span class="shift-dot" aria-hidden="true"></span>'}<input value="${escapeHtml(shift.name)}" aria-label="Namn på skiftet ${escapeHtml(shift.name)}" data-shift-name="${escapeHtml(shift.id)}" maxlength="60" /><select aria-label="Färg på skiftet ${escapeHtml(shift.name)}" data-shift-color="${escapeHtml(shift.id)}">${shiftColorOptions(shift.color)}</select><button class="btn" type="button" data-rename-shift="${escapeHtml(shift.id)}">Spara</button><button class="btn danger" type="button" data-delete-shift="${escapeHtml(shift.id)}">Ta bort</button></article>`).join("") || '<div class="empty-state">Inga skift ännu. Lägg till det första nedan.</div>'}</div>
      <form id="addShiftForm" class="shift-settings-add"><input name="name" placeholder="Nytt skift, t.ex. Grön" maxlength="60" required aria-label="Namn på nytt skift" /><select name="color" aria-label="Färg på nytt skift">${shiftColorOptions("")}</select><button class="btn primary" type="submit">+ Lägg till skift</button></form>
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

  bindOnce(root.querySelector("#addShiftForm"), "submit", async event => {
    event.preventDefault();
    const name = event.currentTarget.elements.name.value.trim();
    if (!name) return;
    const { shift } = await apiRequest("POST", "/shifts", { name, color: event.currentTarget.elements.color.value });
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
      ["Sjuk eller borta?", "Öppna Min profil och ändra din status. Skiftledaren ser ändringen direkt."],
      ["Lösenord", "Byt lösenord under Min profil. Har du glömt det, be din skiftledare om ett tillfälligt."]
    ]
    : [
      ["Lägg till personal", "Öppna Lägg till, registrera namn, företag och skift. Skapa en inloggning om personen ska kunna se schemat själv."],
      ["Bygg arbetsplatser", "Lägg till maskiner, avdelningar, utbildningar och extraplatser. De gäller alla skift och kan pausas och ordnas."],
      ["Skapa schema", "Välj personer i listorna. Du kan också kopiera en dag eller använda en sparad veckomall."],
      ["Kontrollera varningar", "Röda rutor saknar bemanning. Inaktiva eller obehöriga personer visar orsaken direkt."],
      ["Roller", "Admin kan allt. Skiftledare ändrar sitt eget skift och ser andra skift. Operatörer ser sitt schema och ändrar sin profil."],
      ["Installera", "I webbläsarens meny kan appen installeras på datorn eller mobilen."]
    ];
  root.innerHTML = `<section class="card help-intro"><div><h3>Kom igång</h3><p>All data sparas på servern, så alla ser samma schema från sina egna enheter.</p></div><a class="btn primary" href="${isOperator() ? "profil.html" : "installningar.html"}">${isOperator() ? "Öppna min profil" : "Öppna inställningar"}</a></section><div class="help-grid">${steps.map(([title, text], index) => `<article class="card"><span>${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("")}</div><section class="card help-feedback"><div><h3>Förslag eller problem?</h3><p>Skicka feedback till den adress som angetts i Inställningar.</p></div>${appSettings.feedbackEmail ? `<a class="btn" href="mailto:${escapeHtml(appSettings.feedbackEmail)}?subject=Staff%20Planner%20feedback">Skicka feedback</a>` : isOperator() ? "" : '<a class="btn" href="installningar.html">Ange feedbackadress</a>'}</section>`;
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
  await renderBreakPlannerContent();
  if (canEditActiveShift()) return;
  // Operators and other shifts' leaders can switch days but not change anything.
  const root = document.getElementById("breakPlanner");
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
  const people = await getPeople();
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
  tools.innerHTML = `<div class="schedule-filter-tools"><label>Företag<select id="scheduleCompanyFilter"><option value="">Alla</option>${companies.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}</select></label><label>Status<select id="scheduleAvailabilityFilter"><option value="all">Alla</option><option value="available">Tillgänglig</option><option value="sick">Sjuk</option><option value="vab">Vård av barn</option><option value="vacation">Semester</option><option value="unavailable">Ej tillgänglig</option></select></label><label>Kompetens<select id="scheduleSkillFilter"><option value="">Alla</option>${knownSkills.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}</select></label></div><div class="schedule-copy-tools"><label>Från<select id="copyDayFrom">${DAYS.map(day => `<option>${day}</option>`).join("")}</select></label><label>Till<select id="copyDayTo">${DAYS.map((day, index) => `<option${index === 1 ? " selected" : ""}>${day}</option>`).join("")}</select></label><button id="copyScheduleDay" class="btn" type="button">Kopiera dag</button></div><div class="schedule-template-tools"><select id="scheduleTemplateSelect"><option value="">Välj mall</option>${templates.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select><button id="saveScheduleTemplate" class="btn" type="button">Spara veckan som mall</button><button id="applyScheduleTemplate" class="btn" type="button">Använd mall</button></div><div class="schedule-history-tools"><button id="undoSchedule" class="btn" type="button"${scheduleUndoStack.length ? "" : " disabled"}>↶ Ångra</button><button id="redoSchedule" class="btn" type="button"${scheduleRedoStack.length ? "" : " disabled"}>↷ Gör om</button><span class="schedule-save-state">✓ ${updatedAt ? `Sparat ${new Date(updatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}` : "Redo att spara"}</span></div>`;
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

// Read-only week for operators and for shift leaders looking at another shift.
function renderReadOnlySchedule(root, { people, schedule, trainingLeaders, trainingLocations, extraPersonLocations }) {
  const card = root.parentElement;
  document.getElementById("autoScheduleBtn")?.classList.add("hidden");
  document.getElementById("autoScheduleMessage")?.classList.add("hidden");
  card?.querySelectorAll(".schedule-tools, .schedule-priority-panel, .availability-summary, .unassigned-summary, .schedule-history-notice").forEach(element => element.remove());
  renderTrainingScheduleSummary(root, people, schedule, trainingLocations);
  renderMyWeekSummary(root, { schedule, trainingLeaders, trainingLocations, extraPersonLocations });

  const nameById = Object.fromEntries(people.map(person => [person.id, person.name]));
  const ownId = currentPerson?.id || "";
  const dates = getDatesForWeek();
  root.classList.add("schedule-readonly");
  root.innerHTML = "";
  root.appendChild(makeCell("Uppgift", "header task"));
  DAYS.forEach((day, index) => {
    const header = document.createElement("div");
    header.className = "cell header day-header";
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
      const personId = schedule?.[task]?.[day] || "";
      const lines = [];
      const involved = [personId];
      if (isTrainingTask) {
        if (personId) {
          const leaderId = trainingLeaders?.[task]?.[day] || "";
          involved.push(leaderId);
          lines.push(`<strong>${escapeHtml(nameById[personId] || "—")}</strong>`);
          lines.push(`<small>Handledare: ${escapeHtml(nameById[leaderId] || "—")}</small>`);
          lines.push(`<small>Plats: ${escapeHtml(trainingLocations?.[task]?.[day] || "—")}</small>`);
        }
      } else {
        const training = TASKS.filter(isTrainingTaskName)
          .find(item => schedule?.[item]?.[day] && trainingLocations?.[item]?.[day] === task);
        if (training) {
          involved.push(schedule[training][day]);
          lines.push(`<strong>Utbildning</strong><small>${escapeHtml(nameById[schedule[training][day]] || "")}</small>`);
        } else if (personId) {
          lines.push(`<strong>${escapeHtml(nameById[personId] || "—")}</strong>`);
          if (isExtraTask) lines.push(`<small>${escapeHtml(extraPersonLocations?.[task]?.[day] || "Ingen uppgift vald")}</small>`);
        }
      }
      cell.innerHTML = lines.join("") || '<span class="readonly-empty">—</span>';
      if (ownId && involved.includes(ownId)) {
        cell.classList.add("is-mine");
        cell.title = "Du";
      }
      root.appendChild(cell);
    });
  });
}

// "Min vecka": where the signed-in person works each day.
function renderMyWeekSummary(root, { schedule, trainingLeaders, trainingLocations, extraPersonLocations }) {
  const card = root.parentElement;
  card?.querySelector(".my-week-summary")?.remove();
  const ownId = currentPerson?.id;
  if (!card || !ownId || currentPerson.shiftId !== getShiftScope()) return;
  const dates = getDatesForWeek();
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
  const summary = document.createElement("section");
  summary.className = "my-week-summary";
  summary.innerHTML = `<div class="my-week-heading"><strong>Min vecka</strong><span>${escapeHtml(currentPerson.name)}</span></div><div class="my-week-days">${days.map(entry => `<article class="${entry.placed ? "is-placed" : ""}"><small>${escapeHtml(entry.day)} ${escapeHtml(entry.date)}</small><strong>${escapeHtml(entry.text)}</strong></article>`).join("")}</div>`;
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

  if (!canEditActiveShift()) {
    renderReadOnlySchedule(root, { people, schedule, trainingLeaders, trainingLocations, extraPersonLocations });
    return;
  }
  await renderScheduleTools(schedule, people, skills, { trainingLeaders, trainingLocations, extraPersonLocations });

  renderAvailabilitySummary(root, people);
  renderUnassignedPeopleSummary(root, people, schedule, trainingLeaders);
  renderTrainingScheduleSummary(root, people, schedule, trainingLocations);
  await renderSchedulePrioritySelector(root);
  root.innerHTML = "";
  root.appendChild(makeCell("Uppgift", "header task"));

  DAYS.forEach((day, index) => {
    const header = document.createElement("div");
    header.className = "cell header day-header";
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

    DAYS.forEach(day => {
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
  ["sick", "Sjuk"],
  ["vab", "Vård av barn"],
  ["vacation", "Semester"],
  ["unavailable", "Inte tillgänglig"]
];

function canCreateAccountFor(person, role = ROLES.OPERATOR) {
  if (isAdmin()) return true;
  return canEditPerson(person) && role === ROLES.OPERATOR;
}

function canResetPasswordFor(person) {
  if (!person.account) return false;
  if (isAdmin()) return true;
  return canEditPerson(person) && person.account.role === ROLES.OPERATOR;
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
  // Shift leaders start in their own shift; admins see everyone.
  select.value = isShiftLeader() && getOwnShiftId() ? getOwnShiftId() : "";
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
    vacation: 1,
    sick: 2,
    vab: 3,
    unavailable: 4
  };
  const people = allPeople
    .filter(person =>
      (!query || `${person.name} ${person.company || ""} ${person.account?.username || ""}`.toLocaleLowerCase().includes(query)) &&
      (!statusFilter || getPersonAvailability(person) === statusFilter) &&
      (!shiftFilter || (shiftFilter === "none" ? !person.shiftId : person.shiftId === shiftFilter))
    )
    .sort((firstPerson, secondPerson) =>
      (availabilityOrder[getPersonAvailability(firstPerson)] ?? 4) -
      (availabilityOrder[getPersonAvailability(secondPerson)] ?? 4) ||
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

    AVAILABILITY_OPTIONS.forEach(([value, label]) => {
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
    getPeople(),
    getDepartmentsFor("showInTestResults"),
    getTestResults()
  ]);
  const testQuery = (document.getElementById("testSearch")?.value || "").trim().toLocaleLowerCase();
  const people = allPeople.filter(person => !testQuery || `${person.name} ${person.company || ""}`.toLocaleLowerCase().includes(testQuery));
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

async function renderMachineSkills() {
  const root = document.getElementById("machineSkillsGrid");
  if (!root) return;

  const [allPeople, departments, skills, timestamps, restrictions, details] = await Promise.all([
    getPeople(),
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
  peoplePanel.innerHTML = `<div class="assessment-panel-heading"><div><h3>Medarbetare</h3><p>${people.length} personer</p></div></div>`;
  peopleList.className = "assessment-people-list";
  people.forEach(person => {
    const personSkills = Array.isArray(skills[person.id]) ? skills[person.id] : [];
    const isRestricted = Array.isArray(restrictions[person.id]) && restrictions[person.id].includes("GD");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.personId = person.id;
    button.className = `assessment-person-button competency-person-button status-${personSkills.length >= departments.length && departments.length ? "ready" : personSkills.length ? "one" : "none"}${person.id === selectedCompetencyPersonId ? " active" : ""}`;
    button.innerHTML = `<span>${escapeHtml(person.name)}</span><small>${personSkills.length} av ${departments.length}${isRestricted ? " · Får inte GD" : ""}</small>`;
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

async function renderProduction() {
  const root = document.getElementById("productionPage");
  if (!root) return;
  const [people, records, settings, schedule] = await Promise.all([
    getPeople(), getProductionRecords(), getProductionSettings(), getScheduleForDate(selectedProductionDate)
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
  const record = stored || {
    date: selectedProductionDate,
    target: settings.dailyTarget,
    machines: Object.fromEntries(machines.map(machine => [machine, {
      personId: scheduleDay ? schedule[machine]?.[scheduleDay] || "" : "", result: "", waste: "", comment: ""
    }]))
  };
  const total = machines.reduce((sum, machine) => sum + (Number(record.machines?.[machine]?.result) || 0), 0);
  const target = Number(record.target ?? settings.dailyTarget);
  const personOptions = (selectedId, savedName = "") => `<option value="">Välj person</option>${selectedId && !people.some(person => person.id === selectedId) ? `<option value="${selectedId}" selected>${escapeHtml(savedName || "Tidigare personal")}</option>` : ""}${people.map(person => `<option value="${person.id}"${person.id === selectedId ? " selected" : ""}>${escapeHtml(person.name)}</option>`).join("")}`;
  root.innerHTML = `
    <div class="production-toolbar card"><label>Datum<input id="productionDate" type="date" value="${selectedProductionDate}" /></label><div class="production-settings"><label>Dagligt mål<input id="productionTarget" type="number" min="0" value="${target}" /></label></div><button id="syncScheduleBtn" class="btn" type="button">Hämta från Schema</button><button id="saveProductionBtn" class="btn primary" type="button">Spara dagen</button></div>
    <div class="production-kpis"><article id="productionTotalCard" class="${total >= target ? "goal-card-met" : "goal-card-missed"}"><span>Dagens produktion</span><strong id="productionTotal">${total}</strong><small>box totalt</small></article><article><span>Dagligt mål</span><strong id="productionGoalValue">${target}</strong><small>box</small></article><article class="factory-record-card"><span>Fabriksrekord</span><strong id="factoryRecordValue">${settings.factoryRecord}</strong><small>officiellt rekord · uppdateras vid nytt rekord</small><button id="editFactoryRecordBtn" type="button">Ändra manuellt</button></article></div>
    <section class="production-entry card"><div class="production-heading"><div><small>DAGLIG PRODUKTION</small><h3>${new Date(selectedProductionDate + "T12:00:00").toLocaleDateString("sv-SE", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}</h3></div><span id="productionStatus" class="production-status ${total >= target ? "goal-met" : "goal-missed"}">${total >= target ? "Målet uppnått" : "Under målet"}</span></div><p class="production-conversion-note">${PRODUCTION_CANS_PER_BOX} dosor = 1 box. Ange antal dosor för automatisk omräkning, eller skriv BOX direkt. BOX avrundas uppåt från 0,6 och nedåt under 0,6.</p><div class="production-machine-list">${machines.map(machine => { const item = record.machines?.[machine] || {}; return `<article class="production-machine-row"><strong>${escapeHtml(machine.replace("GD", "GD-"))}</strong><label>Operatör<select data-machine="${escapeHtml(machine)}" data-field="personId">${personOptions(item.personId, item.personName)}</select></label><label>Antal dosor<input data-machine="${escapeHtml(machine)}" data-field="cans" class="production-cans" type="number" min="0" max="9007199254740991" step="1" inputmode="numeric" value="${escapeHtml(item.cans ?? "")}" placeholder="0" /></label><label>Resultat (BOX)<input data-machine="${escapeHtml(machine)}" data-field="result" class="production-result" type="number" min="0" step="any" inputmode="decimal" value="${escapeHtml(item.result ?? "")}" placeholder="0" /></label><label>Svinn (KG)<input data-machine="${escapeHtml(machine)}" data-field="waste" class="production-waste" type="number" min="0" step="0.01" inputmode="decimal" value="${escapeHtml(item.waste ?? "")}" placeholder="0" /></label><label class="production-comment">Kommentar<input data-machine="${escapeHtml(machine)}" data-field="comment" value="${escapeHtml(item.comment || "")}" placeholder="Kommentar, stopp eller material" /></label></article>`; }).join("")}</div></section>
    <section class="production-history card"><div class="production-history-heading"><div><h3>Historik</h3><p>Klicka på en dag för att visa eller ta bort resultatet.</p></div><span>${Object.keys(records).length} dagar</span></div><div class="production-history-list">${Object.values(records).sort((a,b) => b.date.localeCompare(a.date)).map(item => `<div class="production-history-item"><button type="button" data-production-menu="${item.date}" class="production-history-trigger ${item.date === selectedProductionDate ? "active" : ""}"><span>${new Date(item.date + "T12:00:00").toLocaleDateString("sv-SE")}</span><strong>${item.total || 0} box</strong><small class="${Number(item.total) >= Number(item.target) ? "history-met" : "history-missed"}">${Number(item.total) >= Number(item.target) ? "Mål uppnått" : "Under mål"}</small></button><div class="production-history-menu" data-production-actions="${item.date}" hidden><button type="button" data-production-view="${item.date}">Visa</button><button type="button" class="danger" data-production-delete="${item.date}">Ta bort</button></div></div>`).join("") || '<div class="empty-state">Ingen produktion sparad ännu.</div>'}</div></section>
  `;
  const updateSummary = () => {
    const currentTotal = [...root.querySelectorAll(".production-result")].reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    const currentTarget = Number(root.querySelector("#productionTarget").value) || 0;
    root.querySelector("#productionTotal").textContent = currentTotal;
    root.querySelector("#productionGoalValue").textContent = currentTarget;
    root.querySelector("#productionTotalCard").className = currentTotal >= currentTarget ? "goal-card-met" : "goal-card-missed";
    const status = root.querySelector("#productionStatus");
    status.textContent = currentTotal >= currentTarget ? "Målet uppnått" : "Under målet";
    status.className = `production-status ${currentTotal >= currentTarget ? "goal-met" : "goal-missed"}`;
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
  root.querySelector("#productionDate").addEventListener("change", event => { if (!event.target.value || !event.target.reportValidity()) return; selectedProductionDate = event.target.value; void renderProduction(); });
  root.querySelector("#syncScheduleBtn").addEventListener("click", async () => {
    const currentSchedule = await getScheduleForDate(selectedProductionDate);
    machines.forEach(machine => { const select = root.querySelector(`[data-machine="${CSS.escape(machine)}"][data-field="personId"]`); select.value = scheduleDay ? currentSchedule[machine]?.[scheduleDay] || "" : ""; });
  });
  root.querySelector("#editFactoryRecordBtn").addEventListener("click", async () => {
    const enteredValue = prompt("Ange fabriksrekord (box):", String(settings.factoryRecord));
    if (enteredValue === null) return;
    const newRecord = Number(enteredValue);
    if (!Number.isFinite(newRecord) || newRecord < 0) {
      showAppToast("Ange ett giltigt fabriksrekord.", "error");
      return;
    }
    settings.factoryRecord = Math.round(newRecord);
    await saveProductionSettings(settings);
    await addAuditEvent("production", "Fabriksrekord ändrat", `${settings.factoryRecord} box`);
    await renderProduction();
  });
  bindOnce(root.querySelector("#saveProductionBtn"), "click", async () => {
    if (![...root.querySelectorAll('input[type="number"]')].every(input => input.reportValidity())) return;
    const previousRecord = settings.factoryRecord;
    const dayRecord = { date: selectedProductionDate, target: Number(root.querySelector("#productionTarget").value) || 0, machines: {}, updatedAt: new Date().toISOString() };
    machines.forEach(machine => { const personId = root.querySelector(`[data-machine="${CSS.escape(machine)}"][data-field="personId"]`).value; dayRecord.machines[machine] = { personId, personName: people.find(person => person.id === personId)?.name || record.machines?.[machine]?.personName || "", cans: root.querySelector(`[data-machine="${CSS.escape(machine)}"][data-field="cans"]`).value === "" ? null : Number(root.querySelector(`[data-machine="${CSS.escape(machine)}"][data-field="cans"]`).value), result: Number(root.querySelector(`[data-machine="${CSS.escape(machine)}"][data-field="result"]`).value) || 0, waste: Number(root.querySelector(`[data-machine="${CSS.escape(machine)}"][data-field="waste"]`).value) || 0, comment: root.querySelector(`[data-machine="${CSS.escape(machine)}"][data-field="comment"]`).value.trim() }; });
    dayRecord.total = machines.reduce((sum, machine) => sum + dayRecord.machines[machine].result, 0);
    records[selectedProductionDate] = dayRecord;
    settings.dailyTarget = dayRecord.target;
    const brokeRecord = dayRecord.total > settings.factoryRecord;
    if (brokeRecord) settings.factoryRecord = dayRecord.total;
    await Promise.all([saveProductionRecords(records), saveProductionSettings(settings)]);
    await addAuditEvent("production", `Produktion ${selectedProductionDate}`, `${dayRecord.total} box`);
    if (brokeRecord) showProductionCelebration(dayRecord.total, previousRecord);
    await renderProduction();
    await renderDashboard();
  });
  root.querySelectorAll("[data-production-menu]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const menu = root.querySelector(`[data-production-actions="${button.dataset.productionMenu}"]`);
    root.querySelectorAll(".production-history-menu").forEach(item => {
      if (item !== menu) item.hidden = true;
    });
    if (menu) menu.hidden = !menu.hidden;
  }));
  root.querySelectorAll("[data-production-view]").forEach(button => button.addEventListener("click", () => {
    selectedProductionDate = button.dataset.productionView;
    void renderProduction();
  }));
  root.querySelectorAll("[data-production-delete]").forEach(button => button.addEventListener("click", async () => {
    const date = button.dataset.productionDelete;
    const displayDate = new Date(date + "T12:00:00").toLocaleDateString("sv-SE");
    if (!confirm(`Vill du ta bort produktionsresultatet för ${displayDate}?`)) return;
    delete records[date];
    await saveProductionRecords(records);
    await addAuditEvent("production", `Produktion ${date} borttagen`, "Resultatet raderades från historiken");
    await renderProduction();
    await renderDashboard();
  }));
  bindOnce(root, "click", event => {
    if (!event.target.closest(".production-history-item")) {
      root.querySelectorAll(".production-history-menu").forEach(menu => { menu.hidden = true; });
    }
  });
}

async function renderDashboard() {
  const root = document.getElementById("dashboardPage");
  if (!root) return;
  const [people, departments, skills, results, events, productionRecords] = await Promise.all([
    getPeople(), getDepartmentsFor("showInCompetency"), getMachineSkills(), getTestResults(), getAuditLog(), getProductionRecords()
  ]);
  const sick = people.filter(person => getPersonAvailability(person) === "sick").length;
  const vacation = people.filter(person => getPersonAvailability(person) === "vacation").length;
  const available = people.filter(person => getPersonAvailability(person) === "available").length;
  const fullyQualified = people.filter(person => {
    const personSkills = Array.isArray(skills[person.id]) ? skills[person.id] : [];
    return departments.length > 0 && departments.every(item => personSkills.includes(item));
  }).length;
  const tested = people.filter(person => Object.keys(results[person.id] || {}).length > 0).length;
  const latestProduction = Object.values(productionRecords).sort((a, b) => b.date.localeCompare(a.date))[0];
  root.innerHTML = `
    <div class="dashboard-stats">
      <article><span>Personal</span><strong>${people.length}</strong><small>${shiftColorDot(getShiftScope())}${escapeHtml(getShiftName(getShiftScope()) || "inget skift")}</small></article>
      <article class="stat-green"><span>Tillgängliga i gruppen</span><strong>${available}</strong><small>kan schemaläggas</small></article>
      <article class="stat-red"><span>Sjuka</span><strong>${sick}</strong><small>ej tillgängliga</small></article>
      <article class="stat-yellow"><span>Semester</span><strong>${vacation}</strong><small>frånvarande</small></article>
      <article class="stat-green"><span>Full kompetens</span><strong>${fullyQualified}</strong><small>alla maskiner</small></article>
      ${isAdmin() ? `<article><span>Testade</span><strong>${tested}</strong><small>av ${people.length}</small></article>` : ""}
      <article><span>Senaste produktion</span><strong>${latestProduction?.total || 0}</strong><small>${latestProduction?.date || "ingen dag"}</small></article>
    </div>
    <div class="dashboard-columns">
      ${isAdmin() ? '<section class="card data-tools-card"><div><h3>Data och säkerhet</h3><p>Exportera en säkerhetskopia av all data på servern eller återställ från en tidigare fil. Lösenord ingår inte.</p></div><div class="data-tool-actions"><button id="exportDataBtn" class="btn primary" type="button">Exportera backup</button><button id="importDataBtn" class="btn" type="button">Importera backup</button><input id="importDataInput" type="file" accept="application/json,.json" hidden></div></section>' : ""}
      <section class="card audit-card"><div class="audit-heading"><div><h3>Dagens ändringar</h3><p>Aktiviteter som registrerats idag</p></div><span>${events.length}</span></div><div class="audit-list">${events.map(event => `<article><span class="audit-dot"></span><div><strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.detail || "")}</p><small>${new Date(event.createdAt).toLocaleString("sv-SE")}${event.userName ? ` · ${escapeHtml(event.userName)}` : ""}</small></div>${event.undo && (isAdmin() || event.undo.action === "availability") ? `<button class="audit-undo" data-audit-id="${escapeHtml(event.id)}" type="button">Återställ</button>` : ""}</article>`).join("") || '<div class="empty-state">Inga ändringar registrerade idag.</div>'}</div></section>
    </div>
  `;
  setupDataTools();
  root.querySelectorAll(".audit-undo").forEach(button => button.addEventListener("click", () => {
    const event = events.find(item => item.id === button.dataset.auditId);
    if (event) void applyAuditUndo(event);
  }));
}

const MAX_BACKUP_SIZE_BYTES = 20 * 1024 * 1024;

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Admin backup of everything on the server. Passwords are not included.
async function downloadBackup() {
  const payload = await apiRequest("GET", "/admin/export");
  downloadJson(payload, `staff-planner-backup-${formatDateKey(new Date())}.json`);
  await addAuditEvent("backup", "Backup exporterad", formatDateKey(new Date()));
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
  if (payload.version === 1 && isPlainObject(payload.data)) {
    await openLegacyImportDialog(payload.data, "file");
    return;
  }
  if (!confirm("Importen ersätter scheman, inställningar och övrig data på servern. Personal och skift uppdateras, men ingen tas bort. Vill du fortsätta?")) return;
  const result = await apiRequest("POST", "/admin/import", payload);
  showAppToast(`Backupen har lästs in: ${result.people} personer och ${result.documents} dataposter.`);
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

// "Användare": every login in one place. Admins only.
const usersPageFilters = { query: "", role: "accounts", shift: "" };

async function renderUsersPage() {
  const root = document.getElementById("usersPage");
  if (!root || !isAdmin()) return;
  if (root.dataset.ready !== "true") {
    root.dataset.ready = "true";
    root.innerHTML = `
      <div id="usersStats" class="dashboard-stats users-stats"></div>
      <section class="card">
        <div class="filter-bar users-filter-bar">
          <input id="usersSearch" type="search" placeholder="Sök namn, användarnamn eller företag" aria-label="Sök användare" />
          <select id="usersRoleFilter" aria-label="Visa roll">
            <option value="accounts">Alla med inloggning</option>
            <option value="${ROLES.ADMIN}">Admin</option>
            <option value="${ROLES.LEADER}">Skiftledare</option>
            <option value="${ROLES.OPERATOR}">Operatörer</option>
            <option value="none">Utan inloggning</option>
            <option value="">Alla personer</option>
          </select>
          <select id="usersShiftFilter" aria-label="Visa skift"><option value="">Alla skift</option>${shifts.map(shift => `<option value="${escapeHtml(shift.id)}">${escapeHtml(shiftOptionLabel(shift))}</option>`).join("")}<option value="none">Utan skift</option></select>
          <a class="btn primary" href="add.html#addPersonSection">+ Ny användare</a>
        </div>
        <div id="usersList" class="people-list users-list"></div>
      </section>`;
    root.querySelector("#usersSearch").addEventListener("input", event => { usersPageFilters.query = event.target.value; void renderUsersPage(); });
    root.querySelector("#usersRoleFilter").addEventListener("change", event => { usersPageFilters.role = event.target.value; void renderUsersPage(); });
    root.querySelector("#usersShiftFilter").addEventListener("change", event => { usersPageFilters.shift = event.target.value; void renderUsersPage(); });
  }

  const people = await getAllPeople();
  const withAccount = people.filter(person => person.account);
  const countRole = role => withAccount.filter(person => person.account.role === role).length;
  const waiting = withAccount.filter(person => person.account.mustChangePassword).length;
  root.querySelector("#usersStats").innerHTML = `
    <article><span>Admin</span><strong>${countRole(ROLES.ADMIN)}</strong><small>full behörighet</small></article>
    <article><span>Skiftledare</span><strong>${countRole(ROLES.LEADER)}</strong><small>ändrar sitt skift</small></article>
    <article><span>Operatörer</span><strong>${countRole(ROLES.OPERATOR)}</strong><small>ser schemat</small></article>
    <article class="${waiting ? "stat-yellow" : ""}"><span>Väntar på nytt lösenord</span><strong>${waiting}</strong><small>har inte loggat in än</small></article>
    <article><span>Utan inloggning</span><strong>${people.length - withAccount.length}</strong><small>personal</small></article>`;

  const query = usersPageFilters.query.trim().toLocaleLowerCase();
  const { role, shift } = usersPageFilters;
  const roleOrder = { [ROLES.ADMIN]: 0, [ROLES.LEADER]: 1, [ROLES.OPERATOR]: 2 };
  const visible = people
    .filter(person => {
      if (role === "accounts" && !person.account) return false;
      if (role === "none" && person.account) return false;
      if (role && role !== "accounts" && role !== "none" && person.account?.role !== role) return false;
      if (shift && (shift === "none" ? person.shiftId : person.shiftId !== shift)) return false;
      return !query || `${person.name} ${person.account?.username || ""} ${person.company || ""}`.toLocaleLowerCase().includes(query);
    })
    .sort((first, second) =>
      (roleOrder[first.account?.role] ?? 3) - (roleOrder[second.account?.role] ?? 3) || first.name.localeCompare(second.name, "sv"));

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
      <div class="person-actions"><button class="btn${account ? "" : " primary"}" type="button" data-manage-user="${escapeHtml(person.id)}">${account ? "Hantera" : "Skapa inloggning"}</button></div>
    </div>`;
  }).join("") || `<div class="empty-state">${people.length ? "Ingen användare matchar filtret." : "Ingen personal har lagts till ännu."}</div>`;
  list.querySelectorAll("[data-manage-user]").forEach(button => button.addEventListener("click", () => void editPerson(button.dataset.manageUser)));
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
  const roles = isAdmin() ? [ROLES.OPERATOR, ROLES.LEADER, ROLES.ADMIN] : [ROLES.OPERATOR];
  return roles.map(role => `<option value="${role}"${role === selectedRole ? " selected" : ""}>${ROLE_LABELS[role]}</option>`).join("");
}

function loginInstructions(username, password) {
  return `Inloggning: användarnamn ${username}, tillfälligt lösenord ${password}. Personen väljer ett eget lösenord vid första inloggningen.`;
}

function renderAccountSection(person) {
  if (person.account) {
    const lastLogin = person.account.lastLoginAt ? new Date(person.account.lastLoginAt).toLocaleString("sv-SE") : "aldrig";
    return `<p><strong>${escapeHtml(person.account.username)}</strong> · ${escapeHtml(ROLE_LABELS[person.account.role] || "")} · senast inloggad ${escapeHtml(lastLogin)}${person.account.mustChangePassword ? " · väntar på nytt lösenord" : ""}</p>
      ${isAdmin() ? `<div class="person-account-row"><label>Användarnamn<input name="username" value="${escapeHtml(person.account.username)}" autocomplete="off" maxlength="60" /></label><button class="btn" type="button" data-account-action="username">Spara användarnamn</button></div>` : ""}
      ${isAdmin() && person.id !== currentPerson?.id ? `<div class="person-account-row"><label>Roll<select name="role">${roleOptionsHtml(person.account.role)}</select></label><button class="btn" type="button" data-account-action="role">Spara roll</button></div>` : ""}
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
      <label>Status<select name="availability">${AVAILABILITY_OPTIONS.map(([value, label]) => `<option value="${value}"${value === availability ? " selected" : ""}>${label}</option>`).join("")}</select></label>
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
      availability: form.elements.availability.value
    };
    if (isAdmin()) changes.shiftId = form.elements.shiftId.value || null;
    if (!changes.name) return showStatus("Namnet får inte vara tomt.", "error");
    const updated = await updatePerson(person.id, changes);
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
  void setupOnboarding();
  setupMobileNavigation();
  setupFilterControls();
  setupTodoPage();
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
  if (notice) sessionStorage.setItem(AUTH_NOTICE_KEY, notice);
  location.reload();
}

// Reloads shared data, for example after someone else changed it.
async function reloadSharedData() {
  invalidateCachedData();
  await loadAppSettings();
  await loadCustomWorkItems();
  await refreshAppViews();
}

async function openAppUI() {
  if (!canOpenPage(getCurrentPage())) {
    location.replace("index.html");
    return;
  }
  setAuthenticatedView(true);
  document.getElementById("authScreen")?.classList.add("hidden");
  document.getElementById("appShell")?.classList.remove("hidden");
  finishInitialViewSetup();
  bindOnce(document.getElementById("logoutBtn"), "click", () => signOut());

  await loadAppSettings();
  await loadCustomWorkItems();
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
  if (!event.persisted || !document.getElementById("breakPlanner")) return;
  resetBreakPlannerToToday();
  renderWeekNavigation();
  void renderBreakPlanner();
});
