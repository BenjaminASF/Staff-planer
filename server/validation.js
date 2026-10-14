const { HttpError } = require("./auth");
const { AVAILABILITY_VALUES } = require("./permissions");

const AVAILABILITY_LABELS = {
  available: "Tillgänglig",
  sick: "Sjuk",
  vab: "Vård av barn",
  vacation: "Semester",
  unavailable: "Inte tillgänglig"
};

function availabilityLabel(status) {
  return AVAILABILITY_LABELS[status] || AVAILABILITY_LABELS.available;
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

// Picks the allowed person fields from a request body and returns them as
// database columns. Unknown or disallowed fields are rejected.
function cleanPersonFields(body, allowedFields) {
  const columns = {};
  const requested = Object.keys(body).filter(field => ["name", "company", "phone", "availability", "shiftId"].includes(field));
  const forbidden = requested.filter(field => !allowedFields.includes(field));
  if (forbidden.length) throw new HttpError(403, "Du har inte behörighet att ändra de här uppgifterna.");
  if ("name" in body) {
    columns.name = cleanText(body.name, 120);
    if (!columns.name) throw new HttpError(400, "Namnet får inte vara tomt.");
  }
  if ("company" in body) columns.company = cleanText(body.company, 120);
  if ("phone" in body) columns.phone = cleanText(body.phone, 40);
  if ("availability" in body) {
    if (!AVAILABILITY_VALUES.includes(body.availability)) throw new HttpError(400, "Okänd status.");
    columns.availability = body.availability;
  }
  if ("shiftId" in body) columns.shift_id = body.shiftId ? String(body.shiftId) : null;
  return columns;
}

module.exports = { availabilityLabel, cleanText, cleanPersonFields };
