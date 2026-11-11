// Handovers in the chat: the shift that ends tells chosen shift leaders what is the
// priority and how GD, ETIKETTO and Packning went. Only the author, those shift leaders
// and admins see it (routes/chat.js). Who may send one is decided in
// permissions.js (canMakeHandover); this file checks what is sent.
const { HttpError } = require("./auth");
const { cleanText } = require("./validation");

const HANDOVER_DEPARTMENTS = Object.freeze(["GD", "ETIKETTO", "Packning"]);
const HANDOVER_STATUSES = Object.freeze(["ok", "problem"]);
const MAX_PRIO_LENGTH = 1000;
const MAX_COMMENT_LENGTH = 500;
const MAX_PRODUCTION_LENGTH = 500;

// Returns the handover to store, or throws. `leaders` are the shift leaders who can
// receive it ({ id, name }), `shifts` all shifts ({ id, name }). Admins belong to no
// shift and say which shift the handover is from; everyone else hands over their own.
function parseHandover(input, { user, leaders, shifts }) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new HttpError(400, "Överlämningen kunde inte läsas.");
  const fromShiftId = user.role === "admin" ? String(input.fromShiftId || "") : user.shiftId;
  const fromShift = shifts.find(shift => shift.id === fromShiftId);
  if (!fromShift) throw new HttpError(400, user.role === "admin" ? "Välj vilket skift överlämningen är från." : "Du hör inte till något skift.");

  const wanted = Array.isArray(input.to) ? [...new Set(input.to.map(String))] : [];
  if (!wanted.length) throw new HttpError(400, "Välj minst en skiftledare att lämna över till.");
  const to = wanted.map(id => {
    const leader = leaders.find(item => item.id === id);
    if (!leader || id === user.id) throw new HttpError(400, "Överlämningen kan bara skickas till andra skiftledare i chatten.");
    return { id: leader.id, name: leader.name };
  });

  const given = Array.isArray(input.departments) ? input.departments : [];
  const departments = HANDOVER_DEPARTMENTS.map(name => {
    const entry = given.find(item => item && item.name === name) || {};
    return { name, status: HANDOVER_STATUSES.includes(entry.status) ? entry.status : "", comment: cleanText(entry.comment, MAX_COMMENT_LENGTH) };
  });
  const missing = departments.filter(item => !item.status).map(item => item.name);
  if (missing.length) throw new HttpError(400, `Välj Rullade bra eller Problem för ${missing.join(", ")}.`);
  const unexplained = departments.filter(item => item.status === "problem" && !item.comment).map(item => item.name);
  if (unexplained.length) throw new HttpError(400, `Skriv vad som hände på ${unexplained.join(", ")}.`);

  return {
    fromShiftId: fromShift.id,
    fromShiftName: fromShift.name,
    to,
    prio: cleanText(input.prio, MAX_PRIO_LENGTH),
    // The day's production as the sender's page summed it up, if they chose to include it.
    production: cleanText(input.production, MAX_PRODUCTION_LENGTH),
    departments,
    other: cleanText(input.other, MAX_PRIO_LENGTH)
  };
}

module.exports = { HANDOVER_DEPARTMENTS, parseHandover };
