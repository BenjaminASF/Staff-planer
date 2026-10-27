const { HttpError } = require("./auth");
const { normalizeAvailability } = require("./permissions");

const AVAILABILITY_LABELS = {
  available: "Tillgänglig",
  unavailable: "Ej tillgänglig",
  off: "Ledig"
};

function availabilityLabel(status) {
  return AVAILABILITY_LABELS[normalizeAvailability(status)] || AVAILABILITY_LABELS.available;
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

// An empty string means no e-mail address.
function cleanEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new HttpError(400, "Ange en giltig e-postadress.");
  }
  return email;
}

// Colors a shift can be marked with, and their names. An empty string means no color.
// Each color belongs to at most one shift.
const SHIFT_COLOR_LABELS = Object.freeze({
  red: "Röd", blue: "Blå", yellow: "Gul", green: "Grön", purple: "Lila", orange: "Orange", brown: "Brun"
});
const SHIFT_COLORS = Object.keys(SHIFT_COLOR_LABELS);

function cleanShiftColor(value) {
  const color = String(value ?? "");
  if (color && !SHIFT_COLORS.includes(color)) throw new HttpError(400, "Okänd färg.");
  return color;
}

// Picks the allowed person fields from a request body and returns them as
// database columns. Unknown or disallowed fields are rejected.
function cleanPersonFields(body, allowedFields) {
  const columns = {};
  const requested = Object.keys(body).filter(field => ["name", "company", "phone", "email", "availability", "shiftId"].includes(field));
  const forbidden = requested.filter(field => !allowedFields.includes(field));
  if (forbidden.length) throw new HttpError(403, "Du har inte behörighet att ändra de här uppgifterna.");
  if ("name" in body) {
    columns.name = cleanText(body.name, 120);
    if (!columns.name) throw new HttpError(400, "Namnet får inte vara tomt.");
  }
  if ("company" in body) columns.company = cleanText(body.company, 120);
  if ("phone" in body) columns.phone = cleanText(body.phone, 40);
  if ("email" in body) columns.email = cleanEmail(body.email);
  if ("availability" in body) {
    const availability = normalizeAvailability(body.availability);
    if (!availability) throw new HttpError(400, "Okänd status.");
    columns.availability = availability;
  }
  if ("shiftId" in body) columns.shift_id = body.shiftId ? String(body.shiftId) : null;
  return columns;
}

// Personal settings each user keeps for themselves, and the values each may take.
// null removes a setting, so the app's default applies again.
const AUTO_LOCK_MINUTES = [0, 5, 15, 30, 60];
const PREFERENCE_RULES = Object.freeze({
  theme: value => ["light", "dark", "system"].includes(value),
  autoLockMinutes: value => AUTO_LOCK_MINUTES.includes(value),
  showTips: value => typeof value === "boolean",
  soundNotifications: value => typeof value === "boolean",
  scheduleView: value => ["day", "week"].includes(value),
  // Overview: "Dagens ändringar" hides events up to this time for this user only. Nothing is deleted.
  auditClearedAt: value => typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value))
});

// Returns { set, remove }: the settings to store and the ones to clear.
function cleanPreferences(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Ogiltiga inställningar.");
  const set = {};
  const remove = [];
  for (const [name, value] of Object.entries(body)) {
    if (!Object.hasOwn(PREFERENCE_RULES, name)) throw new HttpError(400, "Okänd inställning.");
    if (value === null) remove.push(name);
    else if (PREFERENCE_RULES[name](value)) set[name] = value;
    else throw new HttpError(400, "Ogiltigt värde för inställningen.");
  }
  return { set, remove };
}

module.exports = {
  SHIFT_COLOR_LABELS, availabilityLabel, cleanText, cleanEmail, cleanShiftColor, cleanPersonFields, cleanPreferences, SHIFT_COLORS };
