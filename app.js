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
const DEFAULT_PEOPLE = [];
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

const STORAGE_KEYS = {
  sessionPassword: "app_session_password",
  salt: "app_salt",
  check: "app_check",
  people: "staff_people_enc",
  peopleYear: "staff_people_year",
  schedule: "staff_schedule_enc",
  scheduleWeek: "staff_schedule_week",
  scheduleUpdatedAt: "staff_schedule_updated_at",
  trainingLeaders: "staff_training_leaders_enc",
  trainingLeadersWeek: "staff_training_leaders_week",
  trainingLocations: "staff_training_locations_enc",
  trainingLocationsWeek: "staff_training_locations_week",
  extraPersonLocations: "staff_extra_person_locations_enc",
  breakPlan: "staff_break_plan_enc",
  breakPlanWeek: "staff_break_plan_week",
  schedulePriorityLines: "staff_schedule_priority_lines_enc",
  assessments: "staff_assessments_enc",
  departments: "staff_departments_enc",
  testResults: "staff_test_results_enc",
  machineSkills: "staff_machine_skills_enc",
  machineSkillUpdatedAt: "staff_machine_skill_updated_at_enc",
  machineRestrictions: "staff_machine_restrictions_enc",
  machineSkillDetails: "staff_machine_skill_details_enc",
  trainingReminderDismissedDay: "staff_training_reminder_dismissed_day",
  auditLog: "staff_audit_log_enc",
  productionRecords: "staff_production_records_enc",
  productionSettings: "staff_production_settings_enc",
  todos: "staff_todos_enc",
  workItems: "staff_work_items_enc",
  workItemTrash: "staff_work_item_trash_enc",
  safetySnapshots: "staff_safety_snapshots_enc",
  automaticBackups: "staff_automatic_backups_enc",
  scheduleTemplates: "staff_schedule_templates_enc",
  dataSchemaVersion: "staff_data_schema_version",
  appSettings: "staff_app_settings_enc",
  legacyPeople: "staff_people",
  legacySchedule: "staff_schedule"
};

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

const AUTH_MODES = {
  login: {
    title: "Logga in",
    buttonText: "Logga in",
    showConfirm: false
  },
  create: {
    title: "Skapa lösenord",
    buttonText: "Spara lösenord",
    showConfirm: true
  }
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let sessionKey = null;
let appUnlocked = false;
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

function getCurrentYearKey() {
  return String(new Date().getFullYear());
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

function getWeekStorageKey(baseKey) {
  return `${baseKey}:${getSelectedWeekKey()}`;
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

function getJsonItem(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Could not parse localStorage item: ${key}`, error);
    return fallback;
  }
}

function storeSessionPassword(password) {
  sessionStorage.setItem(STORAGE_KEYS.sessionPassword, password);
}

function getStoredSessionPassword() {
  return sessionStorage.getItem(STORAGE_KEYS.sessionPassword) || "";
}

function clearStoredSessionPassword() {
  sessionStorage.removeItem(STORAGE_KEYS.sessionPassword);
}

function clearPersistentData() {
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    if (name === "sessionPassword") return;
    localStorage.removeItem(key);
  });

  const weeklyPrefixes = [
    STORAGE_KEYS.schedule,
    STORAGE_KEYS.scheduleUpdatedAt,
    STORAGE_KEYS.trainingLeaders,
    STORAGE_KEYS.trainingLocations,
    STORAGE_KEYS.extraPersonLocations,
    STORAGE_KEYS.breakPlan,
    STORAGE_KEYS.schedulePriorityLines
  ].map(key => `${key}:`);

  Object.keys(localStorage).forEach(key => {
    if (weeklyPrefixes.some(prefix => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  });
}

function removeStoredAppData() {
  clearPersistentData();
  clearStoredSessionPassword();
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

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64) {
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

function randomBytes(length = 16) {
  return crypto.getRandomValues(new Uint8Array(length));
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

async function encryptJson(data, key) {
  const iv = randomBytes(12);
  const plaintext = encoder.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  return {
    iv: toBase64(iv),
    data: toBase64(ciphertext)
  };
}

async function decryptJson(payload, key) {
  const iv = fromBase64(payload.iv);
  const data = fromBase64(payload.data);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);

  return JSON.parse(decoder.decode(plaintext));
}

async function encryptStoredItem(keyName, value) {
  if (!appUnlocked || !sessionKey) return;

  const encrypted = await encryptJson(value, sessionKey);
  localStorage.setItem(keyName, JSON.stringify(encrypted));
}

async function decryptStoredItem(keyName, fallback) {
  if (!appUnlocked || !sessionKey) return fallback;

  const raw = localStorage.getItem(keyName);
  if (!raw) return null;

  try {
    return await decryptJson(JSON.parse(raw), sessionKey);
  } catch (error) {
    console.error(`Failed to decrypt item: ${keyName}`, error);
    return fallback;
  }
}

function getAuthElements() {
  return {
    authScreen: document.getElementById("authScreen"),
    appShell: document.getElementById("appShell"),
    authTitle: document.getElementById("authTitle"),
    authBtn: document.getElementById("authBtn"),
    passwordInput: document.getElementById("passwordInput"),
    passwordConfirmInput: document.getElementById("passwordConfirmInput"),
    wipeBtn: document.getElementById("wipeBtn"),
    logoutBtn: document.getElementById("logoutBtn")
  };
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
          showAppToast("Ändringen kunde inte sparas. Försök igen.", "error");
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

function bindEnterToClick(input, button) {
  bindOnce(input, "keydown", event => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    button?.click();
  });
}

function resetAuthInputs(passwordInput, passwordConfirmInput) {
  if (passwordInput) passwordInput.value = "";
  if (passwordConfirmInput) passwordConfirmInput.value = "";
}

function setAuthenticatedView(isAuthenticated) {
  document.body.classList.toggle("app-authenticated", isAuthenticated);
}

function finishInitialViewSetup() {
  document.body.classList.remove("app-booting");
}

function updateAuthMode(isLoginMode, authTitle, authBtn, passwordConfirmInput) {
  const mode = isLoginMode ? AUTH_MODES.login : AUTH_MODES.create;

  if (authTitle) authTitle.textContent = mode.title;
  if (authBtn) authBtn.textContent = mode.buttonText;
  if (passwordConfirmInput) {
    passwordConfirmInput.style.display = mode.showConfirm ? "block" : "none";
  }
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

function downloadRepairBackup() {
  const data = {};
  Object.keys(localStorage).forEach(key => {
    if (isAppStorageKey(key)) data[key] = localStorage.getItem(key);
  });
  const blob = new Blob([JSON.stringify({
    app: "Staff Planner",
    type: "pre-repair-backup",
    exportedAt: new Date().toISOString(),
    data
  }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `staff-planner-before-repair-${formatDateKey(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function repairLocalAppData() {
  const removedKeys = [];
  const encryptedKeys = Object.keys(localStorage).filter(key =>
    isAppStorageKey(key) && key.includes("_enc")
  );

  for (const key of encryptedKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const payload = JSON.parse(raw);
      if (typeof payload?.iv !== "string" || typeof payload?.data !== "string") {
        throw new Error("Invalid encrypted payload");
      }
      if (appUnlocked && sessionKey) {
        const value = await decryptJson(payload, sessionKey);
        const mustBeArray = [STORAGE_KEYS.workItems, STORAGE_KEYS.automaticBackups];
        if (mustBeArray.includes(key) && !Array.isArray(value)) {
          throw new Error("Invalid stored collection");
        }
        if (key === STORAGE_KEYS.appSettings && (!value || typeof value !== "object" || Array.isArray(value))) {
          throw new Error("Invalid settings");
        }
      }
    } catch (error) {
      console.error(`Removing damaged local record: ${key}`, error);
      localStorage.removeItem(key);
      removedKeys.push(key);
    }
  }

  return removedKeys;
}

function showRepairDataButton() {
  const actions = document.querySelector("#authScreen .actions");
  if (!actions || document.getElementById("repairDataBtn")) return;
  const button = document.createElement("button");
  button.id = "repairDataBtn";
  button.className = "btn";
  button.type = "button";
  button.textContent = "Reparera lokal data";
  button.addEventListener("click", async () => {
    if (!confirm("En säkerhetskopia laddas ner först. Fortsätt och ta bort endast skadade poster?")) return;
    button.disabled = true;
    button.textContent = "Reparerar…";
    try {
      downloadRepairBackup();
      const removedKeys = await repairLocalAppData();
      showAuthMessage(
        removedKeys.length
          ? `${removedKeys.length} skadade poster togs bort. Appen startas om…`
          : "Inga skadade poster hittades. Appen startas om…",
        false
      );
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      console.error("Local data repair failed:", error);
      showAuthMessage(`Reparationen misslyckades (${error.message || "okänt fel"}).`);
      button.disabled = false;
      button.textContent = "Reparera lokal data";
    }
  });
  actions.appendChild(button);
}

function hasPasswordSetup() {
  return Boolean(localStorage.getItem(STORAGE_KEYS.salt) && localStorage.getItem(STORAGE_KEYS.check));
}

async function setupPassword(password) {
  const salt = randomBytes(16);
  const key = await deriveAesKey(password, salt);
  const checkPayload = await encryptJson({ ok: true }, key);
  const people = getJsonItem(STORAGE_KEYS.legacyPeople, DEFAULT_PEOPLE);
  const schedule = getJsonItem(STORAGE_KEYS.legacySchedule, createEmptySchedule());

  localStorage.setItem(STORAGE_KEYS.salt, toBase64(salt));
  localStorage.setItem(STORAGE_KEYS.check, JSON.stringify(checkPayload));

  sessionKey = key;
  appUnlocked = true;

  await encryptStoredItem(STORAGE_KEYS.people, people);
  localStorage.setItem(STORAGE_KEYS.peopleYear, getCurrentYearKey());
  await encryptStoredItem(getWeekStorageKey(STORAGE_KEYS.schedule), schedule);
  localStorage.setItem(STORAGE_KEYS.scheduleWeek, getSelectedWeekKey());

  localStorage.removeItem(STORAGE_KEYS.legacyPeople);
  localStorage.removeItem(STORAGE_KEYS.legacySchedule);
  storeSessionPassword(password);
}

async function unlockApp(password) {
  const saltBase64 = localStorage.getItem(STORAGE_KEYS.salt);
  const checkRaw = localStorage.getItem(STORAGE_KEYS.check);

  if (!saltBase64 || !checkRaw) return false;

  try {
    const salt = fromBase64(saltBase64);
    const key = await deriveAesKey(password, salt);
    const check = await decryptJson(JSON.parse(checkRaw), key);

    if (check.ok !== true) return false;

    sessionKey = key;
    appUnlocked = true;
    storeSessionPassword(password);

    return true;
  } catch (error) {
    console.error("Unlock failed:", error);
    return false;
  }
}

function lockApp() {
  clearTimeout(autoLockTimeoutId);
  resetScheduleHistory();
  sessionKey = null;
  appUnlocked = false;
  clearStoredSessionPassword();
}

async function restoreSession() {
  if (!hasPasswordSetup() || appUnlocked) return false;

  const password = getStoredSessionPassword();
  if (!password) return false;

  const unlocked = await unlockApp(password);
  if (!unlocked) clearStoredSessionPassword();

  return unlocked;
}

function wipeAllData() {
  removeStoredAppData();
  lockApp();
  location.reload();
}

async function getPeople() {
  if (!appUnlocked || !sessionKey) return [];

  const people = await decryptStoredItem(STORAGE_KEYS.people, []);
  const storedYearKey = localStorage.getItem(STORAGE_KEYS.peopleYear);

  if (people === null) {
    const empty = [];
    await savePeople(empty);
    return empty;
  }

  if (storedYearKey !== getCurrentYearKey() && Array.isArray(people)) {
    localStorage.setItem(STORAGE_KEYS.peopleYear, getCurrentYearKey());
  }
  return Array.isArray(people) ? people : [];
}

async function savePeople(people) {
  await encryptStoredItem(STORAGE_KEYS.people, people);
  localStorage.setItem(STORAGE_KEYS.peopleYear, getCurrentYearKey());
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

function setupAutoLock() {
  const resetTimer = () => {
    clearTimeout(autoLockTimeoutId);
    const minutes = Number(appSettings.autoLockMinutes);
    if (!minutes || !appUnlocked) return;
    autoLockTimeoutId = setTimeout(async () => {
      lockApp();
      document.getElementById("appShell")?.classList.add("hidden");
      await setupAuthUI();
      showAuthMessage("Appen låstes automatiskt efter inaktivitet.", false);
    }, minutes * 60 * 1000);
  };
  if (document.body.dataset.autoLockBound !== "true") {
    document.body.dataset.autoLockBound = "true";
    ["pointerdown", "keydown", "touchstart"].forEach(eventName => document.addEventListener(eventName, resetTimer, { passive: true }));
  }
  resetTimer();
}

async function changeAppPassword(nextPassword) {
  const encryptedValues = [];
  for (const key of Object.keys(localStorage).filter(isAppStorageKey)) {
    if (key === STORAGE_KEYS.salt || key === STORAGE_KEYS.check || key === STORAGE_KEYS.automaticBackups || key === STORAGE_KEYS.dataSchemaVersion || key.endsWith("_week") || key === STORAGE_KEYS.peopleYear) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try { encryptedValues.push([key, await decryptJson(JSON.parse(raw), sessionKey)]); } catch { /* Unencrypted metadata is kept as-is. */ }
  }
  const salt = randomBytes(16);
  const nextKey = await deriveAesKey(nextPassword, salt);
  const checkPayload = await encryptJson({ ok: true }, nextKey);
  localStorage.setItem(STORAGE_KEYS.salt, toBase64(salt));
  localStorage.setItem(STORAGE_KEYS.check, JSON.stringify(checkPayload));
  sessionKey = nextKey;
  for (const [key, value] of encryptedValues) await encryptStoredItem(key, value);
  dataStore.remove(STORAGE_KEYS.automaticBackups);
  storeSessionPassword(nextPassword);
  await createAutomaticBackupIfNeeded();
}

// Central storage adapter. Replace this layer if an API or database is added later.
const dataStore = {
  async get(key, fallback = null) { return decryptStoredItem(key, fallback); },
  async set(key, value) { return encryptStoredItem(key, value); },
  remove(key) { localStorage.removeItem(key); },
  keys() { return Object.keys(localStorage); }
};

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
  applyAppSettings(await dataStore.get(STORAGE_KEYS.appSettings, {}));
}

async function saveAppSettings(nextSettings) {
  const normalized = normalizeAppSettings(nextSettings);
  await dataStore.set(STORAGE_KEYS.appSettings, normalized);
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
  if (!appUnlocked || !sessionKey) return applyCustomWorkItems([]);
  const items = await dataStore.get(STORAGE_KEYS.workItems, []);
  applyCustomWorkItems(Array.isArray(items) ? items : []);
}

async function saveCustomWorkItems(items) {
  applyCustomWorkItems(items);
  await dataStore.set(STORAGE_KEYS.workItems, customWorkItems);
  localStorage.setItem(STORAGE_KEYS.dataSchemaVersion, "2");
}

async function getWorkItemTrash() {
  if (!appUnlocked || !sessionKey) return [];
  const items = await dataStore.get(STORAGE_KEYS.workItemTrash, []);
  return Array.isArray(items) ? items : [];
}

async function saveWorkItemTrash(items) {
  await dataStore.set(STORAGE_KEYS.workItemTrash, Array.isArray(items) ? items : []);
}

async function createWorkItemSafetySnapshot(reason) {
  const snapshots = await dataStore.get(STORAGE_KEYS.safetySnapshots, []) || [];
  const [trash, departments, results, skills, details] = await Promise.all([
    getWorkItemTrash(), getDepartments(), getTestResults(), getMachineSkills(), getMachineSkillDetails()
  ]);
  snapshots.unshift({
    id: makeId(), createdAt: new Date().toISOString(), reason,
    data: { workItems: structuredClone(customWorkItems), trash, departments, results, skills, details }
  });
  await dataStore.set(STORAGE_KEYS.safetySnapshots, snapshots.slice(0, 5));
}

function cleanupOldWeeklyData() {
  const oldestWeekToKeep = formatDateKey(getPreviousWeekStart());
  const weeklyPrefixes = [
    STORAGE_KEYS.schedule,
    STORAGE_KEYS.trainingLeaders,
    STORAGE_KEYS.trainingLocations,
    STORAGE_KEYS.extraPersonLocations,
    STORAGE_KEYS.breakPlan,
    STORAGE_KEYS.schedulePriorityLines
  ].map(key => `${key}:`);

  Object.keys(localStorage).forEach(key => {
    const prefix = weeklyPrefixes.find(item => key.startsWith(item));
    if (!prefix) return;
    const weekKey = key.slice(prefix.length);
    if (/^\d{4}-\d{2}-\d{2}$/.test(weekKey) && weekKey < oldestWeekToKeep) {
      localStorage.removeItem(key);
    }
  });
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

async function getAssessments() {
  if (!appUnlocked || !sessionKey) return [];
  const assessments = await decryptStoredItem(STORAGE_KEYS.assessments, []);
  return Array.isArray(assessments) ? assessments : [];
}

async function saveAssessments(assessments) {
  await encryptStoredItem(STORAGE_KEYS.assessments, assessments);
}

async function getDepartments() {
  if (!appUnlocked || !sessionKey) return [...DEFAULT_DEPARTMENTS];
  const departments = await decryptStoredItem(STORAGE_KEYS.departments, null);
  if (!Array.isArray(departments)) {
    await saveDepartments(DEFAULT_DEPARTMENTS);
    return [...DEFAULT_DEPARTMENTS];
  }
  return departments;
}

async function saveDepartments(departments) {
  await encryptStoredItem(STORAGE_KEYS.departments, departments);
}

async function getDepartmentsFor(destination) {
  const departments = await getDepartments();
  return departments.filter(name => {
    const item = customWorkItems.find(entry => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    return !item || (item.enabled && item[destination]);
  });
}

async function getTestResults() {
  if (!appUnlocked || !sessionKey) return {};
  const results = await decryptStoredItem(STORAGE_KEYS.testResults, {});
  return results && typeof results === "object" && !Array.isArray(results) ? results : {};
}

async function saveTestResults(results) {
  await encryptStoredItem(STORAGE_KEYS.testResults, results);
}

async function getMachineSkills() {
  if (!appUnlocked || !sessionKey) return {};
  const skills = await decryptStoredItem(STORAGE_KEYS.machineSkills, {});
  return skills && typeof skills === "object" && !Array.isArray(skills) ? skills : {};
}

async function saveMachineSkills(skills) {
  await encryptStoredItem(STORAGE_KEYS.machineSkills, skills);
}

async function getMachineSkillUpdatedAt() {
  if (!appUnlocked || !sessionKey) return {};
  const timestamps = await decryptStoredItem(STORAGE_KEYS.machineSkillUpdatedAt, {});
  return timestamps && typeof timestamps === "object" && !Array.isArray(timestamps)
    ? timestamps
    : {};
}

async function saveMachineSkillUpdatedAt(timestamps) {
  await encryptStoredItem(STORAGE_KEYS.machineSkillUpdatedAt, timestamps);
}

async function getMachineRestrictions() {
  if (!appUnlocked || !sessionKey) return {};
  const restrictions = await decryptStoredItem(STORAGE_KEYS.machineRestrictions, {});
  return restrictions && typeof restrictions === "object" && !Array.isArray(restrictions)
    ? restrictions
    : {};
}

async function saveMachineRestrictions(restrictions) {
  await encryptStoredItem(STORAGE_KEYS.machineRestrictions, restrictions);
}

async function getMachineSkillDetails() {
  if (!appUnlocked || !sessionKey) return {};
  const details = await decryptStoredItem(STORAGE_KEYS.machineSkillDetails, {});
  return details && typeof details === "object" && !Array.isArray(details) ? details : {};
}

async function saveMachineSkillDetails(details) {
  await encryptStoredItem(STORAGE_KEYS.machineSkillDetails, details);
}

async function getProductionRecords() {
  if (!appUnlocked || !sessionKey) return {};
  const records = await decryptStoredItem(STORAGE_KEYS.productionRecords, {});
  return records && typeof records === "object" && !Array.isArray(records) ? records : {};
}

async function saveProductionRecords(records) {
  await encryptStoredItem(STORAGE_KEYS.productionRecords, records);
}

async function getProductionSettings() {
  if (!appUnlocked || !sessionKey) return { dailyTarget: 160, factoryRecord: 0 };
  const settings = await decryptStoredItem(STORAGE_KEYS.productionSettings, {});
  return { dailyTarget: Number(settings?.dailyTarget) || 160, factoryRecord: Number(settings?.factoryRecord) || 0 };
}

async function saveProductionSettings(settings) {
  await encryptStoredItem(STORAGE_KEYS.productionSettings, settings);
}

async function getAuditLog() {
  if (!appUnlocked || !sessionKey) return [];
  const events = await decryptStoredItem(STORAGE_KEYS.auditLog, []);
  if (!Array.isArray(events)) return [];
  const today = formatDateKey(new Date());
  const todaysEvents = events.filter(event => {
    const createdAt = new Date(event?.createdAt);
    return !Number.isNaN(createdAt.getTime()) && formatDateKey(createdAt) === today;
  });
  if (todaysEvents.length !== events.length) {
    await encryptStoredItem(STORAGE_KEYS.auditLog, todaysEvents);
  }
  return todaysEvents;
}

async function addAuditEvent(type, title, detail = "", undo = null) {
  const events = await getAuditLog();
  events.unshift({ id: makeId(), type, title, detail, undo, createdAt: new Date().toISOString() });
  await encryptStoredItem(STORAGE_KEYS.auditLog, events.slice(0, 500));
  void renderDashboard();
}

async function applyAuditUndo(event) {
  const undo = event?.undo;
  if (!undo || !confirm(`Återställ ändringen: ${event.title}?`)) return;
  if (undo.action === "availability") {
    const people = await getPeople(); const person = people.find(item => item.id === undo.personId);
    if (person) { person.availability = undo.value; await savePeople(people); }
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
  const events = await getAuditLog();
  const stored = events.find(item => item.id === event.id); if (stored) stored.undo = null;
  await encryptStoredItem(STORAGE_KEYS.auditLog, events);
  await addAuditEvent("restore", `${event.title} återställd`, "Tidigare värde återställt");
  await refreshAppViews();
}

async function getSchedule() {
  if (!appUnlocked || !sessionKey) return createEmptySchedule();

  const weekKey = getSelectedWeekKey();
  const weeklyStorageKey = getWeekStorageKey(STORAGE_KEYS.schedule);
  let schedule = await decryptStoredItem(weeklyStorageKey, createEmptySchedule());
  const storedWeekKey = localStorage.getItem(STORAGE_KEYS.scheduleWeek);

  if (schedule === null && storedWeekKey === weekKey) {
    schedule = await decryptStoredItem(STORAGE_KEYS.schedule, createEmptySchedule());
    if (schedule !== null) await saveSchedule(schedule);
  }

  if (schedule === null) return createEmptySchedule();
  return normalizeSchedule(schedule);
}

async function saveSchedule(schedule) {
  await encryptStoredItem(getWeekStorageKey(STORAGE_KEYS.schedule), normalizeSchedule(schedule));
  localStorage.setItem(STORAGE_KEYS.scheduleWeek, getSelectedWeekKey());
  localStorage.setItem(`${STORAGE_KEYS.scheduleUpdatedAt}:${getSelectedWeekKey()}`, new Date().toISOString());
}

async function getTrainingLeaders() {
  if (!appUnlocked || !sessionKey) return createEmptyTrainingLeaders();

  const weekKey = getSelectedWeekKey();
  let trainingLeaders = await decryptStoredItem(
    getWeekStorageKey(STORAGE_KEYS.trainingLeaders),
    createEmptyTrainingLeaders()
  );
  const storedWeekKey = localStorage.getItem(STORAGE_KEYS.trainingLeadersWeek);

  if (trainingLeaders === null && storedWeekKey === weekKey) {
    trainingLeaders = await decryptStoredItem(STORAGE_KEYS.trainingLeaders, createEmptyTrainingLeaders());
    if (trainingLeaders !== null) await saveTrainingLeaders(trainingLeaders);
  }

  if (trainingLeaders === null) return createEmptyTrainingLeaders();
  return normalizeTrainingLeaders(trainingLeaders);
}

async function saveTrainingLeaders(trainingLeaders) {
  await encryptStoredItem(
    getWeekStorageKey(STORAGE_KEYS.trainingLeaders),
    normalizeTrainingLeaders(trainingLeaders)
  );
  localStorage.setItem(STORAGE_KEYS.trainingLeadersWeek, getSelectedWeekKey());
}

async function getTrainingLocations() {
  if (!appUnlocked || !sessionKey) return createEmptyTrainingLocations();

  const weekKey = getSelectedWeekKey();
  let locations = await decryptStoredItem(
    getWeekStorageKey(STORAGE_KEYS.trainingLocations),
    createEmptyTrainingLocations()
  );
  const storedWeekKey = localStorage.getItem(STORAGE_KEYS.trainingLocationsWeek);

  if (locations === null && storedWeekKey === weekKey) {
    locations = await decryptStoredItem(STORAGE_KEYS.trainingLocations, createEmptyTrainingLocations());
    if (locations !== null) await saveTrainingLocations(locations);
  }

  if (locations === null) return createEmptyTrainingLocations();
  return normalizeTrainingLocations(locations);
}

async function saveTrainingLocations(trainingLocations) {
  await encryptStoredItem(
    getWeekStorageKey(STORAGE_KEYS.trainingLocations),
    normalizeTrainingLocations(trainingLocations)
  );
  localStorage.setItem(STORAGE_KEYS.trainingLocationsWeek, getSelectedWeekKey());
}

async function getExtraPersonLocations() {
  if (!appUnlocked || !sessionKey) return createEmptyExtraPersonLocations();
  const locations = await decryptStoredItem(
    getWeekStorageKey(STORAGE_KEYS.extraPersonLocations),
    createEmptyExtraPersonLocations()
  );
  return locations === null
    ? createEmptyExtraPersonLocations()
    : normalizeExtraPersonLocations(locations);
}

async function saveExtraPersonLocations(locations) {
  await encryptStoredItem(
    getWeekStorageKey(STORAGE_KEYS.extraPersonLocations),
    normalizeExtraPersonLocations(locations)
  );
}

async function getBreakPlan() {
  if (!appUnlocked || !sessionKey) return createEmptyBreakPlan();

  const weekKey = getSelectedWeekKey();
  let breakPlan = await decryptStoredItem(
    getWeekStorageKey(STORAGE_KEYS.breakPlan),
    createEmptyBreakPlan()
  );
  const storedWeekKey = localStorage.getItem(STORAGE_KEYS.breakPlanWeek);

  if (breakPlan === null && storedWeekKey === weekKey) {
    breakPlan = await decryptStoredItem(STORAGE_KEYS.breakPlan, createEmptyBreakPlan());
    if (breakPlan !== null) await saveBreakPlan(breakPlan);
  }

  if (breakPlan === null) return createEmptyBreakPlan();
  return normalizeBreakPlan(breakPlan);
}

async function saveBreakPlan(breakPlan) {
  await encryptStoredItem(getWeekStorageKey(STORAGE_KEYS.breakPlan), normalizeBreakPlan(breakPlan));
  localStorage.setItem(STORAGE_KEYS.breakPlanWeek, getSelectedWeekKey());
}

async function getSchedulePriorityLines() {
  if (!appUnlocked || !sessionKey) return [];
  const lines = await decryptStoredItem(
    getWeekStorageKey(STORAGE_KEYS.schedulePriorityLines),
    []
  );
  const validChoices = new Set([
    ...Object.keys(BREAK_LINE_WORKPLACES),
    ...customWorkItems.filter(item => item.enabled && item.showInSchema && item.autoSchedule).map(item => item.name)
  ]);
  return Array.isArray(lines)
    ? lines.filter(line => validChoices.has(line))
    : [];
}

async function saveSchedulePriorityLines(lines) {
  const validChoices = new Set([
    ...Object.keys(BREAK_LINE_WORKPLACES),
    ...customWorkItems.filter(item => item.enabled && item.showInSchema && item.autoSchedule).map(item => item.name)
  ]);
  const normalized = Array.isArray(lines)
    ? lines.filter(line => validChoices.has(line))
    : [];
  await encryptStoredItem(getWeekStorageKey(STORAGE_KEYS.schedulePriorityLines), normalized);
}

async function getTodos() {
  if (!appUnlocked || !sessionKey) return [];
  const todos = await decryptStoredItem(STORAGE_KEYS.todos, []);
  return Array.isArray(todos) ? todos : [];
}

async function saveTodos(todos) {
  await encryptStoredItem(STORAGE_KEYS.todos, todos);
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
    nav.insertAdjacentHTML("beforeend", '<a class="nav-link" href="installningar.html">Inställningar</a><a class="nav-link" href="hjalp.html">Hjälp</a>');
  }
  const pageTips = {
    "dashboard.html": "Här finns senaste status, ändringshistorik och knappar för krypterad backup och återställning.",
    "personal.html": "Använd status för sjukdom, semester eller annan frånvaro; schemat visar orsaken direkt.",
    "add.html": "Pausa en arbetsplats när den inte används. Då bevaras historiken och den kan aktiveras igen.",
    "maskiner.html": "Registrerad kompetens används för att varna och hjälpa autoschemat.",
    "testresultat.html": "Sök fram en person och registrera resultaten per maskin eller avdelning.",
    "bedomning.html": "Spara återkommande bedömningar för att se utveckling över tid.",
    "todo.html": "Uppgifter som inte blir klara följer med som påminnelser till nästa vecka.",
    "produktion.html": "Spara dagens resultat regelbundet; historiken finns kvar lokalt.",
    "rast.html": "Kontrollera att alla valda linjer täcks innan rastplanen används.",
    "installningar.html": "Ändringar här gäller bara den här enheten och sparas automatiskt när du trycker Spara."
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

async function renderSettings() {
  const root = document.getElementById("settingsPage");
  if (!root) return;
  const snapshots = await dataStore.get(STORAGE_KEYS.safetySnapshots, []) || [];
  const automaticBackups = await dataStore.get(STORAGE_KEYS.automaticBackups, []) || [];
  root.innerHTML = `
    <form id="generalSettingsForm" class="card settings-card">
      <div><h3>Allmänt</h3><p>Grundinställningar för den här enheten.</p></div>
      <label>Arbetsplatsens namn<input id="organizationNameSetting" value="${escapeHtml(appSettings.organizationName || "")}" placeholder="Företag eller avdelning" /></label>
      <fieldset><legend>Arbetsdagar</legend><div class="settings-day-grid">${ALL_DAYS.map(day => `<label><input type="checkbox" name="workDay" value="${day}"${DAYS.includes(day) ? " checked" : ""} /> ${day}</label>`).join("")}</div></fieldset>
      <label>Automatisk låsning<select id="autoLockSetting"><option value="5">Efter 5 minuter</option><option value="15">Efter 15 minuter</option><option value="30">Efter 30 minuter</option><option value="60">Efter 1 timme</option><option value="0">Aldrig</option></select></label>
      <label>E-post för feedback<input id="feedbackEmailSetting" type="email" value="${escapeHtml(appSettings.feedbackEmail || "")}" placeholder="namn@foretag.se" /></label>
      <label>Maskiner i produktion<input id="productionMachinesSetting" value="${escapeHtml(appSettings.productionMachines.join(", "))}" /><small>Separera med kommatecken.</small></label>
      <label>Uppgifter för extra person<textarea id="extraAssignmentsSetting" rows="3">${escapeHtml(appSettings.extraAssignments.join("\n"))}</textarea><small>En uppgift per rad.</small></label>
      <label>Rastlinjer<textarea id="breakLinesSetting" rows="5">${escapeHtml(appSettings.breakLines.map(line => `${line.id} | ${line.label} | ${line.workplaces.join(", ")}`).join("\n"))}</textarea><small>Format: ID | Visningsnamn | arbetsplatser separerade med kommatecken.</small></label>
      <label class="settings-switch"><input id="showTipsSetting" type="checkbox"${appSettings.showTips ? " checked" : ""} /><span>Visa tips och hjälptexter</span></label>
      <div class="settings-actions"><span id="settingsMessage" class="inline-message" aria-live="polite"></span><button class="btn primary" type="submit">Spara inställningar</button></div>
    </form>
    <section class="card settings-card"><div><h3>Maskiner, avdelningar och uppgifter</h3><p>Lägg till, redigera, pausa och ordna arbetsplatser från en samlad vy.</p></div><div class="settings-actions"><button id="removeDemoDataBtn" class="btn danger" type="button">Ta bort testdata</button><a class="btn primary settings-link" href="add.html#workItemForm">Öppna hanteraren</a></div></section>
    <section class="card settings-card"><div><h3>Säkerhet och historik</h3><p>${snapshots.length} säkerhetspunkter och ${automaticBackups.length} automatiska helhetskopior finns sparade.</p></div><details class="password-change"><summary>Byt lösenord</summary><form id="changePasswordForm"><label>Nuvarande lösenord<input id="currentPasswordSetting" type="password" autocomplete="current-password" required /></label><label>Nytt lösenord<input id="newPasswordSetting" type="password" minlength="6" autocomplete="new-password" required /></label><label>Bekräfta nytt lösenord<input id="confirmPasswordSetting" type="password" minlength="6" autocomplete="new-password" required /></label><div class="settings-actions"><span id="passwordChangeMessage" class="inline-message"></span><button class="btn primary" type="submit">Spara nytt lösenord</button></div></form></details><div class="settings-actions"><button id="exportSettingsBackupBtn" class="btn" type="button">Exportera backup</button></div><h4>Automatiska helhetskopior</h4><div class="snapshot-list">${automaticBackups.map(item => `<article><div><strong>Automatisk backup</strong><small>${new Date(item.createdAt).toLocaleString("sv-SE")}</small></div><button class="btn" type="button" data-restore-auto-backup="${item.id}">Återställ</button></article>`).join("") || '<div class="empty-state">Den första kopian skapas automatiskt idag.</div>'}</div><h4>Säkerhetspunkter för arbetsplatser</h4><div id="snapshotList" class="snapshot-list">${snapshots.map(item => `<article><div><strong>${escapeHtml(item.reason)}</strong><small>${new Date(item.createdAt).toLocaleString("sv-SE")}</small></div><button class="btn" type="button" data-restore-snapshot="${item.id}">Återställ</button></article>`).join("") || '<div class="empty-state">Inga säkerhetspunkter ännu.</div>'}</div></section>`;
  root.querySelector("#autoLockSetting").value = String(appSettings.autoLockMinutes);
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
  bindOnce(root.querySelector("#exportSettingsBackupBtn"), "click", downloadBackup);
  bindOnce(root.querySelector("#removeDemoDataBtn"), "click", async () => {
    const people = await getPeople();
    const demoPeople = people.filter(person => person.demo);
    if (!demoPeople.length) return showAppToast("Det finns ingen testdata att ta bort.", "error");
    await savePeople(people.filter(person => !person.demo));
    showAppToast(`${demoPeople.length} testpersoner togs bort.`);
  });
  bindOnce(root.querySelector("#changePasswordForm"), "submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const currentPassword = root.querySelector("#currentPasswordSetting").value;
    const nextPassword = root.querySelector("#newPasswordSetting").value;
    const confirmation = root.querySelector("#confirmPasswordSetting").value;
    const status = root.querySelector("#passwordChangeMessage");
    if (currentPassword !== getStoredSessionPassword()) { status.textContent = "Nuvarande lösenord är fel."; status.className = "inline-message error"; return; }
    if (nextPassword.length < 6 || nextPassword !== confirmation) { status.textContent = "Det nya lösenordet måste vara minst 6 tecken och matcha."; status.className = "inline-message error"; return; }
    await changeAppPassword(nextPassword);
    form.reset();
    status.textContent = "Lösenordet har ändrats och all data krypterats på nytt.";
    status.className = "inline-message success";
  });
  root.querySelectorAll("[data-restore-snapshot]").forEach(button => button.addEventListener("click", async () => {
    const snapshot = snapshots.find(item => item.id === button.dataset.restoreSnapshot);
    if (!snapshot || !confirm(`Återställ säkerhetspunkten "${snapshot.reason}"?`)) return;
    await createWorkItemSafetySnapshot("Före återställning");
    await Promise.all([saveCustomWorkItems(snapshot.data.workItems || []), saveWorkItemTrash(snapshot.data.trash || []), saveDepartments(snapshot.data.departments || []), saveTestResults(snapshot.data.results || {}), saveMachineSkills(snapshot.data.skills || {}), saveMachineSkillDetails(snapshot.data.details || {})]);
    await addAuditEvent("backup", "Säkerhetspunkt återställd", snapshot.reason);
    location.reload();
  }));
  root.querySelectorAll("[data-restore-auto-backup]").forEach(button => button.addEventListener("click", async () => {
    const backup = automaticBackups.find(item => item.id === button.dataset.restoreAutoBackup);
    if (!backup || !confirm("Återställ hela den lokala datan från denna tidpunkt?")) return;
    const auth = { salt: localStorage.getItem(STORAGE_KEYS.salt), check: localStorage.getItem(STORAGE_KEYS.check) };
    Object.keys(localStorage).filter(key => isAppStorageKey(key) && key !== STORAGE_KEYS.salt && key !== STORAGE_KEYS.check).forEach(key => localStorage.removeItem(key));
    Object.entries(backup.data || {}).forEach(([key, value]) => { if (key !== STORAGE_KEYS.salt && key !== STORAGE_KEYS.check) localStorage.setItem(key, value); });
    if (auth.salt) localStorage.setItem(STORAGE_KEYS.salt, auth.salt);
    if (auth.check) localStorage.setItem(STORAGE_KEYS.check, auth.check);
    location.reload();
  }));
}

function renderHelpPage() {
  const root = document.getElementById("helpPage");
  if (!root) return;
  root.innerHTML = `<section class="card help-intro"><div><h3>Kom igång</h3><p>All data sparas krypterat på den här enheten. Exportera backup regelbundet.</p></div><a class="btn primary" href="installningar.html">Öppna inställningar</a></section><div class="help-grid"><article class="card"><span>1</span><h3>Lägg till personal</h3><p>Öppna Lägg till, registrera namn och företag. Tillgänglighet ändras på personalsidan.</p></article><article class="card"><span>2</span><h3>Bygg arbetsplatser</h3><p>Lägg till maskiner, avdelningar, utbildningar och extraplatser. De kan pausas och ordnas.</p></article><article class="card"><span>3</span><h3>Skapa schema</h3><p>Välj personer i listorna. Du kan också kopiera en dag eller använda en sparad veckomall.</p></article><article class="card"><span>4</span><h3>Kontrollera varningar</h3><p>Röda rutor saknar bemanning. Inaktiva eller obehöriga personer visar orsaken direkt.</p></article><article class="card"><span>5</span><h3>Säkerhetskopiera</h3><p>Exportera en krypterad backup från Översikt eller Inställningar innan större förändringar.</p></article><article class="card"><span>6</span><h3>Installera</h3><p>I webbläsarens meny kan appen installeras på datorn när PWA-stödet är aktiverat.</p></article></div><section class="card help-feedback"><div><h3>Förslag eller problem?</h3><p>Skicka feedback till den adress som angetts i Inställningar.</p></div>${appSettings.feedbackEmail ? `<a class="btn" href="mailto:${escapeHtml(appSettings.feedbackEmail)}?subject=Staff%20Planner%20feedback">Skicka feedback</a>` : '<a class="btn" href="installningar.html">Ange feedbackadress</a>'}</section>`;
}

async function setupOnboarding() {
  if (appSettings.onboardingComplete || !document.getElementById("appShell") || document.getElementById("onboardingModal")) return;
  const overlay = document.createElement("div");
  overlay.id = "onboardingModal";
  overlay.className = "modal-overlay onboarding-overlay";
  overlay.innerHTML = `<section class="onboarding-modal"><span class="onboarding-kicker">Välkommen</span><h2>Gör Staff Planner redo</h2><p>Tre små val räcker. Allt kan ändras senare i Inställningar.</p><form id="onboardingForm"><label>Arbetsplatsens namn<input id="onboardingOrganization" placeholder="Företag eller avdelning" /></label><fieldset><legend>Arbetsdagar</legend><div class="settings-day-grid">${ALL_DAYS.map(day => `<label><input type="checkbox" name="onboardingDay" value="${day}" checked /> ${day}</label>`).join("")}</div></fieldset><label>Personal, en person per rad<textarea id="onboardingPeople" rows="5" placeholder="Anna Andersson&#10;Erik Svensson"></textarea></label><label class="settings-switch"><input id="onboardingDemo" type="checkbox" /><span>Lägg till tre tydligt märkta testpersoner</span></label><div class="onboarding-actions"><button id="skipOnboarding" class="btn" type="button">Hoppa över</button><button class="btn primary" type="submit">Spara och börja</button></div></form></section>`;
  document.body.appendChild(overlay);
  const cleanupFocus = manageDialogFocus(overlay.querySelector(".onboarding-modal"));
  const complete = async extra => { await saveAppSettings({ ...appSettings, onboardingComplete: true, ...extra }); overlay.remove(); cleanupFocus(); showAppToast("Grundinställningen är klar."); };
  bindOnce(overlay.querySelector("#skipOnboarding"), "click", () => complete({}));
  bindOnce(overlay.querySelector("#onboardingForm"), "submit", async event => {
    event.preventDefault();
    const workDays = [...overlay.querySelectorAll('[name="onboardingDay"]:checked')].map(input => input.value);
    if (!workDays.length) return showAppToast("Välj minst en arbetsdag.", "error");
    const names = overlay.querySelector("#onboardingPeople").value.split("\n").map(value => value.trim()).filter(Boolean);
    const people = await getPeople();
    names.forEach(name => people.push({ id: makeId(), name, company: "", createdAt: new Date().toISOString() }));
    if (overlay.querySelector("#onboardingDemo").checked) ["Testperson Anna", "Testperson Erik", "Testperson Sara"].forEach(name => people.push({ id: makeId(), name, company: "TESTDATA", demo: true, createdAt: new Date().toISOString() }));
    await savePeople(people);
    await complete({ workDays, organizationName: overlay.querySelector("#onboardingOrganization").value.trim() });
    await refreshAppViews();
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
  const templates = await dataStore.get(STORAGE_KEYS.scheduleTemplates, []) || [];
  const updatedAt = localStorage.getItem(`${STORAGE_KEYS.scheduleUpdatedAt}:${getSelectedWeekKey()}`);
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
    await dataStore.set(STORAGE_KEYS.scheduleTemplates, [...templates, { id: makeId(), name, createdAt: new Date().toISOString(), ...structuredClone(state) }]);
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

async function renderPeople() {
  const list = document.getElementById("peopleList");
  if (!list) return;

  const allPeople = await getPeople();
  const query = (document.getElementById("peopleSearch")?.value || "").trim().toLocaleLowerCase();
  const statusFilter = document.getElementById("availabilityFilter")?.value || "";
  const availabilityOrder = {
    available: 0,
    vacation: 1,
    sick: 2,
    vab: 3,
    unavailable: 4
  };
  const people = allPeople
    .filter(person =>
      (!query || `${person.name} ${person.company || ""}`.toLocaleLowerCase().includes(query)) &&
      (!statusFilter || getPersonAvailability(person) === statusFilter)
    )
    .sort((firstPerson, secondPerson) =>
      (availabilityOrder[getPersonAvailability(firstPerson)] ?? 4) -
      (availabilityOrder[getPersonAvailability(secondPerson)] ?? 4)
    );
  list.innerHTML = "";

  people.forEach(person => {
    const row = document.createElement("div");
    const meta = document.createElement("div");
    const actions = document.createElement("div");
    const availabilitySelect = document.createElement("select");
    const editBtn = document.createElement("button");
    const deleteBtn = document.createElement("button");
    const availability = getPersonAvailability(person);

    row.className = `person-row person-row-${availability}`;
    meta.className = "person-meta";
    actions.className = "person-actions";
    availabilitySelect.className = `person-availability person-availability-${availability}`;
    availabilitySelect.setAttribute("aria-label", `Tillgänglighet för ${person.name}`);
    availabilitySelect.title = availability === "available"
      ? `${person.name} är tillgänglig.`
      : getUnavailableMessage(person);
    editBtn.className = "btn";
    deleteBtn.className = "btn danger";

    meta.innerHTML = `
      <h3 title="${escapeHtml(availabilitySelect.title)}">${escapeHtml(person.name)}</h3>
      <p>${escapeHtml(person.company || "")}</p>
    `;

    [
      ["available", "Tillgänglig"],
      ["sick", "Sjuk"],
      ["vab", "Vård av barn"],
      ["vacation", "Semester"],
      ["unavailable", "Inte tillgänglig"]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = availability === value;
      availabilitySelect.appendChild(option);
    });

    availabilitySelect.addEventListener("change", async () => {
      person.availability = availabilitySelect.value;
      await savePeople(allPeople);
      await addAuditEvent("availability", `${person.name}: ${getAvailabilityLabel(availabilitySelect.value)}`, "Tillgänglighet uppdaterad", { action: "availability", personId: person.id, value: availability });

      if (availabilitySelect.value !== "available") {
        const schedule = await getSchedule();
        const trainingLeaders = await getTrainingLeaders();
        const trainingLocations = await getTrainingLocations();

        TASKS.forEach(task => {
          DAYS.forEach(day => {
            if (schedule[task]?.[day] === person.id) {
              schedule[task][day] = "";
              if (isTrainingTaskName(task) && trainingLocations[task]?.[day]) {
                trainingLocations[task][day] = "";
              }
            }
            if (trainingLeaders[task]?.[day] === person.id) {
              trainingLeaders[task][day] = "";
            }
          });
        });

        await saveSchedule(schedule);
        await saveTrainingLeaders(trainingLeaders);
        await saveTrainingLocations(trainingLocations);
      }

      await refreshAppViews();
    });

    editBtn.textContent = "Redigera";
    editBtn.onclick = () => editPerson(person.id);

    deleteBtn.textContent = "Ta bort";
    deleteBtn.onclick = () => deletePerson(person.id);

    actions.append(availabilitySelect, editBtn, deleteBtn);
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

  const dismissedDay = localStorage.getItem(STORAGE_KEYS.trainingReminderDismissedDay);
  const currentDay = formatDateKey(new Date());
  if (dismissedDay === currentDay) {
    document.getElementById("trainingReminderPanel")?.remove();
    return;
  }
  if (dismissedDay) localStorage.removeItem(STORAGE_KEYS.trainingReminderDismissedDay);

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
    localStorage.setItem(STORAGE_KEYS.trainingReminderDismissedDay, currentDay);
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
  const schedule = await decryptStoredItem(`${STORAGE_KEYS.schedule}:${weekKey}`, null);
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
      <article><span>Personal</span><strong>${people.length}</strong><small>registrerade</small></article>
      <article class="stat-green"><span>Tillgängliga i gruppen</span><strong>${available}</strong><small>kan schemaläggas</small></article>
      <article class="stat-red"><span>Sjuka</span><strong>${sick}</strong><small>ej tillgängliga</small></article>
      <article class="stat-yellow"><span>Semester</span><strong>${vacation}</strong><small>frånvarande</small></article>
      <article class="stat-green"><span>Full kompetens</span><strong>${fullyQualified}</strong><small>alla maskiner</small></article>
      <article><span>Testade</span><strong>${tested}</strong><small>av ${people.length}</small></article>
      <article><span>Senaste produktion</span><strong>${latestProduction?.total || 0}</strong><small>${latestProduction?.date || "ingen dag"}</small></article>
    </div>
    <div class="dashboard-columns">
      <section class="card data-tools-card"><div><h3>Data och säkerhet</h3><p>Exportera en krypterad säkerhetskopia eller återställ från en tidigare fil.</p></div><div class="data-tool-actions"><button id="exportDataBtn" class="btn primary" type="button">Exportera backup</button><button id="importDataBtn" class="btn" type="button">Importera backup</button><input id="importDataInput" type="file" accept="application/json,.json" hidden></div></section>
      <section class="card audit-card"><div class="audit-heading"><div><h3>Dagens ändringar</h3><p>Aktiviteter som registrerats idag</p></div><span>${events.length}</span></div><div class="audit-list">${events.map(event => `<article><span class="audit-dot"></span><div><strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.detail || "")}</p><small>${new Date(event.createdAt).toLocaleString("sv-SE")}</small></div>${event.undo ? `<button class="audit-undo" data-audit-id="${event.id}" type="button">Återställ</button>` : ""}</article>`).join("") || '<div class="empty-state">Inga ändringar registrerade idag.</div>'}</div></section>
    </div>
  `;
  setupDataTools();
  root.querySelectorAll(".audit-undo").forEach(button => button.addEventListener("click", () => {
    const event = events.find(item => item.id === button.dataset.auditId);
    if (event) void applyAuditUndo(event);
  }));
}

const BACKUP_VERSION = 1;
const MAX_BACKUP_SIZE_BYTES = 10 * 1024 * 1024;

function isAppStorageKey(key) {
  return key.startsWith("staff_") || key === STORAGE_KEYS.salt || key === STORAGE_KEYS.check;
}

function createBackupPayload() {
  const data = {};
  Object.keys(localStorage).forEach(key => {
    if (isAppStorageKey(key)) data[key] = localStorage.getItem(key);
  });
  return {
    app: "Staff Planner",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data
  };
}

async function createAutomaticBackupIfNeeded() {
  const storedBackups = await dataStore.get(STORAGE_KEYS.automaticBackups, []);
  const backups = Array.isArray(storedBackups) ? storedBackups : [];
  const today = formatDateKey(new Date());
  if (backups.some(item => formatDateKey(new Date(item.createdAt)) === today)) return;
  const payload = createBackupPayload();
  delete payload.data[STORAGE_KEYS.automaticBackups];
  delete payload.data[STORAGE_KEYS.salt];
  delete payload.data[STORAGE_KEYS.check];
  backups.unshift({ id: makeId(), createdAt: new Date().toISOString(), data: payload.data });
  await dataStore.set(STORAGE_KEYS.automaticBackups, backups.slice(0, 7));
}

function isValidBackupPayload(payload) {
  if (
    payload?.app !== "Staff Planner" ||
    payload.version !== BACKUP_VERSION ||
    !payload.data ||
    typeof payload.data !== "object" ||
    Array.isArray(payload.data)
  ) {
    return false;
  }

  // Imported ciphertext needs the original salt and password check to remain readable.
  try {
    if (typeof payload.data[STORAGE_KEYS.salt] !== "string" || fromBase64(payload.data[STORAGE_KEYS.salt]).length !== 16) return false;
    const check = JSON.parse(payload.data[STORAGE_KEYS.check]);
    if (typeof check?.iv !== "string" || typeof check?.data !== "string" || fromBase64(check.iv).length !== 12 || fromBase64(check.data).length < 16) return false;
  } catch { return false; }

  return Object.entries(payload.data).every(([key, value]) => {
    if (!isAppStorageKey(key) || typeof value !== "string") return false;
    if (!key.includes("_enc")) return true;
    try {
      const encrypted = JSON.parse(value);
      return typeof encrypted?.iv === "string" && typeof encrypted?.data === "string" && encrypted.iv.length > 8 && encrypted.data.length > 8;
    } catch { return false; }
  });
}

function downloadBackup() {
  const payload = createBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `staff-planner-backup-${formatDateKey(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function setupDataTools() {
  const exportButton = document.getElementById("exportDataBtn");
  const importButton = document.getElementById("importDataBtn");
  const input = document.getElementById("importDataInput");
  if (exportButton && exportButton.dataset.bound !== "true") {
    exportButton.dataset.bound = "true";
    exportButton.addEventListener("click", () => {
      downloadBackup();
      void addAuditEvent("backup", "Backup exporterad", formatDateKey(new Date()));
    });
  }
  if (importButton && input && importButton.dataset.bound !== "true") {
    importButton.dataset.bound = "true";
    importButton.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        if (file.size > MAX_BACKUP_SIZE_BYTES) throw new Error("Backup is too large");
        const payload = JSON.parse(await file.text());
        if (!isValidBackupPayload(payload)) throw new Error("Invalid backup");
        if (!confirm("Importen ersätter all lokal data. Vill du fortsätta?")) return;
        clearPersistentData();
        Object.entries(payload.data).forEach(([key, value]) => localStorage.setItem(key, value));
        clearStoredSessionPassword();
        location.reload();
      } catch (error) {
        console.error("Could not import backup", error);
        showAppToast("Backupfilen är ogiltig eller skadad.", "error");
      } finally {
        input.value = "";
      }
    });
  }
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
  await renderSchedule();
  await renderBreakPlanner();
  await renderPeople();
  await renderAssessments();
  await renderTestResults();
  await renderMachineSkills();
  await renderTrainingReminders();
  await renderDashboard();
  await renderProduction();
  await renderTodoList();
  renderExtraAssignmentManager();
}

async function editPerson(id) {
  const people = await getPeople();
  const person = people.find(item => item.id === id);
  if (!person) return;

  const newName = prompt("Nytt namn:", person.name);
  if (newName === null) return;

  const newCompany = prompt("Nytt företag:", person.company || "");
  if (newCompany === null) return;

  person.name = newName.trim() || person.name;
  person.company = newCompany.trim();

  await savePeople(people);
  await addAuditEvent("person", `${person.name} redigerad`, person.company || "");
  await refreshAppViews();
}

async function deletePerson(id) {
  const shouldDelete = confirm("Vill du ta bort personen och alla personens bedömningar?");
  if (!shouldDelete) return;

  const allPeople = await getPeople();
  const removedPerson = allPeople.find(person => person.id === id);
  const people = allPeople.filter(person => person.id !== id);
  const schedule = await getSchedule();
  const trainingLeaders = await getTrainingLeaders();
  const assessments = (await getAssessments()).filter(item => item.personId !== id);
  const testResults = await getTestResults();
  const machineSkills = await getMachineSkills();
  const machineSkillUpdatedAt = await getMachineSkillUpdatedAt();
  const machineRestrictions = await getMachineRestrictions();
  const machineSkillDetails = await getMachineSkillDetails();

  await savePeople(people);
  delete testResults[id];
  delete machineSkills[id];
  delete machineSkillUpdatedAt[id];
  delete machineRestrictions[id];
  delete machineSkillDetails[id];

  TASKS.forEach(task => {
    DAYS.forEach(day => {
      if (schedule[task]?.[day] === id) {
        schedule[task][day] = "";
      }
    });
  });

  await saveSchedule(schedule);

  Object.keys(trainingLeaders).forEach(task => {
    DAYS.forEach(day => {
      if (trainingLeaders[task]?.[day] === id) {
        trainingLeaders[task][day] = "";
      }
    });
  });

  await saveTrainingLeaders(trainingLeaders);
  await saveAssessments(assessments);
  await saveTestResults(testResults);
  await saveMachineSkills(machineSkills);
  await saveMachineSkillUpdatedAt(machineSkillUpdatedAt);
  await saveMachineRestrictions(machineRestrictions);
  await saveMachineSkillDetails(machineSkillDetails);
  await addAuditEvent("person", `${removedPerson?.name || "Person"} borttagen`, "Personal och kopplade uppgifter raderades");
  if (selectedAssessmentPersonId === id) selectedAssessmentPersonId = "";
  if (selectedTestPersonId === id) selectedTestPersonId = "";
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

function setupAddForm() {
  const form = document.getElementById("addForm");
  if (!form) return;

  const nameInput = document.getElementById("nameInput");
  const companyInput = document.getElementById("companyInput");
  const clearBtn = document.getElementById("clearBtn");
  const message = document.getElementById("message");

  bindOnce(form, "submit", async event => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const company = companyInput.value.trim();

    if (!name) return;

    const people = await getPeople();
    people.push({
      id: makeId(),
      name,
      company
    });

    await savePeople(people);
    await addAuditEvent("person", `${name} tillagd`, company);
    form.reset();
    showAddSuccessMessage(message);
    nameInput.focus();
  });

  bindOnce(clearBtn, "click", () => {
    form.reset();
    clearAddSuccessMessage(message);
  });
}

async function renameWorkItemReferences(previousName, nextName) {
  if (previousName === nextName) return;
  const [departments, results, skills, details] = await Promise.all([
    getDepartments(), getTestResults(), getMachineSkills(), getMachineSkillDetails()
  ]);
  const renamedDepartments = departments.map(value => value === previousName ? nextName : value);
  Object.values(results).forEach(personResults => {
    if (personResults && Object.hasOwn(personResults, previousName)) {
      personResults[nextName] = personResults[previousName];
      delete personResults[previousName];
    }
  });
  Object.keys(skills).forEach(personId => {
    if (Array.isArray(skills[personId])) {
      skills[personId] = skills[personId].map(value => value === previousName ? nextName : value);
    }
  });
  Object.values(details).forEach(personDetails => {
    if (personDetails && Object.hasOwn(personDetails, previousName)) {
      personDetails[nextName] = personDetails[previousName];
      delete personDetails[previousName];
    }
  });
  await Promise.all([
    saveDepartments(renamedDepartments), saveTestResults(results),
    saveMachineSkills(skills), saveMachineSkillDetails(details)
  ]);

  const weeklyKeys = Object.keys(localStorage).filter(key =>
    [STORAGE_KEYS.schedule, STORAGE_KEYS.trainingLeaders, STORAGE_KEYS.trainingLocations, STORAGE_KEYS.extraPersonLocations]
      .some(prefix => key.startsWith(`${prefix}:`))
  );
  for (const key of weeklyKeys) {
    const stored = await decryptStoredItem(key, null);
    if (!stored || typeof stored !== "object") continue;
    let changed = false;
    if (Object.hasOwn(stored, previousName)) {
      stored[nextName] = stored[previousName];
      delete stored[previousName];
      changed = true;
    }
    if (key.startsWith(`${STORAGE_KEYS.trainingLocations}:`)) {
      Object.values(stored).forEach(days => Object.keys(days || {}).forEach(day => {
        if (days[day] === previousName) { days[day] = nextName; changed = true; }
      }));
    }
    if (changed) await encryptStoredItem(key, stored);
  }
  const templates = await dataStore.get(STORAGE_KEYS.scheduleTemplates, []);
  if (Array.isArray(templates)) {
    templates.forEach(template => {
      ["schedule", "trainingLeaders", "trainingLocations", "extraPersonLocations"].forEach(key => {
        if (template[key] && Object.hasOwn(template[key], previousName)) {
          template[key][nextName] = template[key][previousName];
          delete template[key][previousName];
        }
      });
      Object.values(template.trainingLocations || {}).forEach(days => Object.keys(days || {}).forEach(day => {
        if (days[day] === previousName) days[day] = nextName;
      }));
    });
    await dataStore.set(STORAGE_KEYS.scheduleTemplates, templates);
  }
  resetScheduleHistory();
}

async function getWorkItemUsageCount(name) {
  let count = 0;
  const keys = Object.keys(localStorage).filter(key => key.startsWith(`${STORAGE_KEYS.schedule}:`));
  for (const key of keys) {
    const stored = await dataStore.get(key, {});
    count += Object.values(stored?.[name] || {}).filter(Boolean).length;
  }
  return count;
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
  cleanupOldWeeklyData();
  enhanceAppShell();
  if (document.getElementById("breakPlanner")) {
    resetBreakPlannerToToday();
  }
  renderWeekNavigation();
  void renderSchedule();
  void renderBreakPlanner();
  void renderPeople();
  void renderAssessments();
  void renderTestResults();
  void renderMachineSkills();
  void renderTrainingReminders();
  void renderDashboard();
  void renderProduction();
  void renderTodoList();
  void renderSettings();
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

async function openAppUI() {
  const { authScreen, appShell, logoutBtn } = getAuthElements();

  setAuthenticatedView(true);
  authScreen?.classList.add("hidden");
  appShell?.classList.remove("hidden");
  finishInitialViewSetup();

  bindOnce(logoutBtn, "click", async () => {
    lockApp();
    await setupAuthUI();
  });

  await loadAppSettings();
  await loadCustomWorkItems();
  try {
    await createAutomaticBackupIfNeeded();
  } catch (error) {
    // A backup failure must never prevent the user from opening the app.
    console.error("Automatic backup failed:", error);
  }
  initializeAppContent();
}

async function setupAuthUI() {
  const {
    authScreen,
    appShell,
    authTitle,
    authBtn,
    passwordInput,
    passwordConfirmInput,
    wipeBtn
  } = getAuthElements();

  if (passwordInput) {
    passwordInput.setAttribute("aria-label", "Lösenord");
    passwordInput.autocomplete = hasPasswordSetup() ? "current-password" : "new-password";
  }
  if (passwordConfirmInput) {
    passwordConfirmInput.setAttribute("aria-label", "Bekräfta lösenord");
    passwordConfirmInput.autocomplete = "new-password";
  }

  if (!authScreen || !appShell) {
    finishInitialViewSetup();
    initializeAppContent();
    return;
  }

  if (await restoreSession()) {
    await openAppUI();
    return;
  }

  setAuthenticatedView(false);
  appShell.classList.add("hidden");
  authScreen.classList.remove("hidden");
  finishInitialViewSetup();
  clearAuthMessage();
  resetAuthInputs(passwordInput, passwordConfirmInput);
  updateAuthMode(hasPasswordSetup(), authTitle, authBtn, passwordConfirmInput);

  bindOnce(authBtn, "click", async () => {
    clearAuthMessage();

    const password = passwordInput?.value.trim() || "";
    const confirmPassword = passwordConfirmInput?.value.trim() || "";
    const isLoginMode = hasPasswordSetup();

    if (password.length < 6) {
      showAuthMessage("Lösenordet måste vara minst 6 tecken.");
      return;
    }

    if (!isLoginMode && password !== confirmPassword) {
      showAuthMessage("Lösenorden matchar inte.");
      return;
    }

    try {
      const success = isLoginMode ? await unlockApp(password) : true;

      if (isLoginMode && !success) {
        showAuthMessage("Fel lösenord.");
        return;
      }

      if (!isLoginMode) {
        await setupPassword(password);
      }

      await openAppUI();
      resetAuthInputs(passwordInput, passwordConfirmInput);
    } catch (error) {
      console.error(error);
      showAuthMessage(
        isLoginMode ? "Det gick inte att logga in." : "Det gick inte att skapa lösenord."
      );
    }
  });

  bindOnce(wipeBtn, "click", () => {
    if (confirm("Vill du radera all lokal data?")) {
      wipeAllData();
    }
  });

  bindEnterToClick(passwordInput, authBtn);
  bindEnterToClick(passwordConfirmInput, authBtn);
}

// Avoid flashing the login screen between pages while the saved session is
// being verified. The script is loaded at the end of <body>, before first paint.
try {
  if (getStoredSessionPassword()) setAuthenticatedView(true);
} catch (error) {
  console.warn("Could not read the saved session:", error);
}

document.addEventListener("DOMContentLoaded", () => {
  void setupAuthUI().catch(error => {
    console.error("App startup failed:", error);
    setAuthenticatedView(false);
    document.getElementById("appShell")?.classList.add("hidden");
    document.getElementById("authScreen")?.classList.remove("hidden");
    finishInitialViewSetup();
    const reason = error instanceof Error && error.message ? ` (${error.message})` : "";
    showAuthMessage(`Appen kunde inte starta korrekt${reason}. Ladda om sidan och försök igen.`);
    showRepairDataButton();
  });
});

window.addEventListener("pageshow", event => {
  if (!event.persisted || !document.getElementById("breakPlanner")) return;
  resetBreakPlannerToToday();
  renderWeekNavigation();
  void renderBreakPlanner();
});
