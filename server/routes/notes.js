const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { withTransaction } = require("../db");
const { canShareNotes, noteShareShifts, canEditNote, canPrioritizeNote } = require("../permissions");
const { addNotifications } = require("../notifications");
const { newId } = require("../store");
const { cleanText } = require("../validation");

const MAX_TEXT_LENGTH = 1000;
const MAX_RECIPIENTS = 500;
const NOTE_COLORS = ["yellow", "pink", "blue", "mint", "lavender", "beige"];
const SORT_MODES = ["priority", "newest", "oldest"];
const LAYOUT_ZONES = ["prio", "rest", "all"];

// Notes the user may see. $1 is the user's id, $2 their shift id (or null).
const VISIBLE = `(n.author_id = $1 OR (n.kind = 'group' AND (
  EXISTS (SELECT 1 FROM note_people np WHERE np.note_id = n.id AND np.user_id = $1)
  OR $2::text = ANY(n.whole_shifts))))`;

// Everyone a group note is shared with, apart from its author.
const RECIPIENTS = `
  SELECT n.id AS note_id, u.id, COALESCE(p.name, u.username) AS name, u.role, p.shift_id, s.read_at IS NOT NULL AS read
    FROM notes n
    JOIN users u ON u.id <> n.author_id
    LEFT JOIN people p ON p.id = u.person_id
    LEFT JOIN note_states s ON s.note_id = n.id AND s.user_id = u.id
   WHERE n.kind = 'group' AND n.id = ANY($1::text[])
     AND (EXISTS (SELECT 1 FROM note_people np WHERE np.note_id = n.id AND np.user_id = u.id) OR p.shift_id = ANY(n.whole_shifts))
   ORDER BY lower(COALESCE(p.name, u.username))`;

const shiftIdOf = user => user.shiftId || null;

// The notes the user sees, or only the one with `id`, as the page draws them.
async function loadNotes(db, user, id = null) {
  const { rows } = await db.query(
    `SELECT n.*, COALESCE(p.name, a.username) AS author_name, a.role AS author_role,
            s.read_at, COALESCE(s.done, false) AS done, COALESCE(s.layout, '{}') AS layout,
            ARRAY(SELECT np.user_id FROM note_people np WHERE np.note_id = n.id) AS people
       FROM notes n
       JOIN users a ON a.id = n.author_id
       LEFT JOIN people p ON p.id = a.person_id
       LEFT JOIN note_states s ON s.note_id = n.id AND s.user_id = $1
      WHERE ${VISIBLE} AND ($3::text IS NULL OR n.id = $3)
      ORDER BY n.created_at DESC`,
    [user.id, shiftIdOf(user), id]
  );
  const recipients = new Map();
  const groupIds = rows.filter(row => row.kind === "group").map(row => row.id);
  if (groupIds.length) {
    for (const row of (await db.query(RECIPIENTS, [groupIds])).rows) {
      if (!recipients.has(row.note_id)) recipients.set(row.note_id, []);
      recipients.get(row.note_id).push(row);
    }
  }
  return rows.map(row => {
    const own = row.author_id === user.id;
    return {
      id: row.id,
      kind: row.kind,
      authorId: row.author_id,
      authorName: row.author_name,
      authorRole: row.author_role,
      text: row.body,
      color: row.color,
      priority: row.priority,
      people: row.people,
      wholeShifts: row.whole_shifts,
      // Only the author sees who has read the note.
      recipients: (recipients.get(row.id) || []).map(person => ({
        id: person.id, name: person.name, role: person.role, shiftId: person.shift_id ?? null, ...(own ? { read: person.read } : {})
      })),
      unread: row.kind === "group" && !own && !row.read_at,
      done: row.done,
      layout: row.layout,
      canEdit: canEditNote(user, row),
      canPrioritize: canPrioritizeNote(user, row),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  });
}

async function findVisibleNote(db, user, id, { lock = false } = {}) {
  const { rows } = await db.query(
    `SELECT n.* FROM notes n WHERE n.id = $3 AND ${VISIBLE}${lock ? " FOR UPDATE" : ""}`,
    [user.id, shiftIdOf(user), String(id ?? "")]
  );
  if (!rows[0]) throw new HttpError(404, "Anteckningen finns inte eller är inte delad med dig.");
  return rows[0];
}

const recipientIds = async (db, noteId) => (await db.query(RECIPIENTS, [[noteId]])).rows.map(row => row.id);

function cleanNoteText(value) {
  const text = cleanText(value, MAX_TEXT_LENGTH + 1);
  if (!text) throw new HttpError(400, "Skriv något på lappen.");
  if (text.length > MAX_TEXT_LENGTH) throw new HttpError(400, `En lapp får vara högst ${MAX_TEXT_LENGTH} tecken.`);
  return text;
}

function cleanColor(value) {
  if (!NOTE_COLORS.includes(value)) throw new HttpError(400, "Okänd färg.");
  return value;
}

const idList = (value, label) => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_RECIPIENTS || !value.every(id => typeof id === "string" && id.length <= 100)) {
    throw new HttpError(400, `Ogiltig lista med ${label}.`);
  }
  return [...new Set(value)];
};

// Checks the chosen people and whole shifts against what the user may share with.
// Recipients already on the note (`kept`) may stay even if they are outside those shifts
// now, for example after moving shift or when the note came from a shared to-do task.
async function cleanSharing(db, user, body, kept = { people: [], wholeShifts: [] }) {
  if (!canShareNotes(user)) throw new HttpError(403, "Bara admin, skiftledare och höger hand kan dela anteckningar.");
  const people = idList(body.people, "personer").filter(id => id !== user.id);
  const wholeShifts = idList(body.wholeShifts, "skift");
  const allowed = noteShareShifts(user);
  if (wholeShifts.length) {
    const { rows } = await db.query("SELECT id FROM shifts WHERE id = ANY($1::text[])", [wholeShifts]);
    if (rows.length !== wholeShifts.length) throw new HttpError(400, "Skiftet finns inte.");
    if (allowed && !wholeShifts.every(id => allowed.includes(id) || kept.wholeShifts.includes(id))) throw new HttpError(403, "Du kan bara dela med personer i ditt eget skift.");
  }
  if (people.length) {
    const { rows } = await db.query(
      "SELECT u.id, p.shift_id FROM users u LEFT JOIN people p ON p.id = u.person_id WHERE u.id = ANY($1::text[])",
      [people]
    );
    if (rows.length !== people.length) throw new HttpError(400, "En av mottagarna finns inte.");
    if (allowed && !rows.every(row => allowed.includes(row.shift_id) || kept.people.includes(row.id))) throw new HttpError(403, "Du kan bara dela med personer i ditt eget skift.");
  }
  return { people, wholeShifts };
}

function cleanLayout(value) {
  if (!value || typeof value !== "object" || !SORT_MODES.includes(value.mode)) throw new HttpError(400, "Ogiltig placering.");
  if (value.position === null) return { mode: value.mode, position: null };
  const position = value.position || {};
  const number = (name, min, max) => {
    const n = Number(position[name]);
    if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, "Ogiltig placering.");
    return Math.round(n);
  };
  if (!LAYOUT_ZONES.includes(position.zone)) throw new HttpError(400, "Ogiltig placering.");
  return {
    mode: value.mode,
    position: { zone: position.zone, x: number("x", 0, 20000), y: number("y", 0, 50000), w: number("w", 120, 800), h: number("h", 120, 800), z: number("z", 0, 1e9) }
  };
}

// Open tasks from an old "Att göra" list become the user's own notes, in order. A task
// that already is one of the user's own notes is skipped, so importing the same backup
// again adds nothing twice. Returns how many notes were added.
async function addTodosAsNotes(db, userId, items) {
  const texts = (Array.isArray(items) ? items : [])
    .filter(item => item && typeof item === "object" && !item.completedAt)
    .map(item => cleanText(item.text, MAX_TEXT_LENGTH))
    .filter(Boolean);
  if (!texts.length) return 0;
  const { rows } = await db.query("SELECT body FROM notes WHERE author_id = $1 AND kind = 'personal'", [userId]);
  const existing = new Set(rows.map(row => row.body));
  const added = texts.filter(text => !existing.has(text));
  for (const text of added) {
    await db.query("INSERT INTO notes (id, author_id, kind, body) VALUES ($1, $2, 'personal', $3)", [newId(), userId, text]);
  }
  return added.length;
}

const snippet = text => text.length > 120 ? `${text.slice(0, 119)}…` : text;

function noteRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser);

  router.get("/", async (req, res) => {
    const notes = await loadNotes(pool, req.user);
    res.json({ notes, unread: notes.filter(note => note.unread).length, canShare: canShareNotes(req.user) });
  });

  router.get("/unread", async (req, res) => {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS count FROM notes n
        WHERE n.kind = 'group' AND n.author_id <> $1 AND ${VISIBLE}
          AND NOT EXISTS (SELECT 1 FROM note_states s WHERE s.note_id = n.id AND s.user_id = $1 AND s.read_at IS NOT NULL)`,
      [req.user.id, shiftIdOf(req.user)]
    );
    res.json({ count: rows[0].count });
  });

  // The people the user may share a note with, by shift.
  router.get("/recipients", async (req, res) => {
    if (!canShareNotes(req.user)) throw new HttpError(403, "Bara admin, skiftledare och höger hand kan dela anteckningar.");
    const allowed = noteShareShifts(req.user);
    const [shifts, people] = await Promise.all([
      pool.query("SELECT id, name FROM shifts WHERE ($1::text[] IS NULL OR id = ANY($1)) ORDER BY sort_order NULLS LAST, name", [allowed]),
      pool.query(
        `SELECT u.id, COALESCE(p.name, u.username) AS name, u.role, p.shift_id
           FROM users u LEFT JOIN people p ON p.id = u.person_id
          WHERE u.id <> $1 AND ($2::text[] IS NULL OR p.shift_id = ANY($2))
          ORDER BY lower(COALESCE(p.name, u.username))`,
        [req.user.id, allowed]
      )
    ]);
    const person = row => ({ id: row.id, name: row.name, role: row.role });
    const groups = shifts.rows.map(shift => ({ id: shift.id, name: shift.name, people: people.rows.filter(row => row.shift_id === shift.id).map(person) }))
      .filter(group => group.people.length);
    // Admins can also reach users without a shift, such as other admins.
    const withoutShift = people.rows.filter(row => !row.shift_id || !shifts.rows.some(shift => shift.id === row.shift_id)).map(person);
    if (!allowed && withoutShift.length) groups.push({ id: null, name: "Utan skift", people: withoutShift });
    res.json({ groups });
  });

  router.post("/", async (req, res) => {
    const body = req.body || {};
    const kind = body.kind === "group" ? "group" : "personal";
    const text = cleanNoteText(body.text);
    const color = body.color === undefined ? "yellow" : cleanColor(body.color);
    const priority = body.priority === true;
    const note = await withTransaction(pool, async db => {
      const sharing = kind === "group" ? await cleanSharing(db, req.user, body) : { people: [], wholeShifts: [] };
      const id = newId();
      await db.query(
        "INSERT INTO notes (id, author_id, kind, body, color, priority, whole_shifts) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [id, req.user.id, kind, text, color, priority, sharing.wholeShifts]
      );
      for (const userId of sharing.people) await db.query("INSERT INTO note_people (note_id, user_id) VALUES ($1, $2)", [id, userId]);
      if (kind === "group") {
        const recipients = await recipientIds(db, id);
        if (!recipients.length) throw new HttpError(400, "Välj minst en person att dela lappen med.");
        await addNotifications(db, recipients, { kind: "noteShared", actorName: req.user.name, title: snippet(text), noteId: id });
      }
      return (await loadNotes(db, req.user, id))[0];
    });
    res.status(201).json({ note });
  });

  router.patch("/:id", async (req, res) => {
    const body = req.body || {};
    const note = await withTransaction(pool, async db => {
      const current = await findVisibleNote(db, req.user, req.params.id, { lock: true });
      const editsContent = ["text", "color", "people", "wholeShifts"].some(name => body[name] !== undefined);
      if (editsContent && !canEditNote(req.user, current)) throw new HttpError(403, "Bara den som skrev lappen kan ändra den.");
      if (body.priority !== undefined) {
        if (typeof body.priority !== "boolean") throw new HttpError(400, "Ogiltig prioritet.");
        if (!canPrioritizeNote(req.user, current)) throw new HttpError(403, "Bara den som skrev lappen eller admin kan ändra prioriteten.");
        await db.query("UPDATE notes SET priority = $2 WHERE id = $1", [current.id, body.priority]);
      }
      if (body.text !== undefined) await db.query("UPDATE notes SET body = $2, updated_at = now() WHERE id = $1", [current.id, cleanNoteText(body.text)]);
      if (body.color !== undefined) await db.query("UPDATE notes SET color = $2 WHERE id = $1", [current.id, cleanColor(body.color)]);
      if (body.people !== undefined || body.wholeShifts !== undefined) {
        if (current.kind !== "group") throw new HttpError(400, "En egen anteckning delas inte.");
        const before = await recipientIds(db, current.id);
        const previousPeople = (await db.query("SELECT user_id FROM note_people WHERE note_id = $1", [current.id])).rows.map(row => row.user_id);
        const sharing = await cleanSharing(db, req.user, {
          people: body.people ?? previousPeople,
          wholeShifts: body.wholeShifts ?? current.whole_shifts
        }, { people: previousPeople, wholeShifts: current.whole_shifts });
        await db.query("UPDATE notes SET whole_shifts = $2 WHERE id = $1", [current.id, sharing.wholeShifts]);
        await db.query("DELETE FROM note_people WHERE note_id = $1", [current.id]);
        for (const userId of sharing.people) await db.query("INSERT INTO note_people (note_id, user_id) VALUES ($1, $2)", [current.id, userId]);
        const after = await recipientIds(db, current.id);
        if (!after.length) throw new HttpError(400, "Välj minst en mottagare. Vill du sluta dela lappen, ta bort den.");
        // People taken off the note lose it completely: notifications, read and done marks and its spot.
        const removed = before.filter(id => !after.includes(id));
        if (removed.length) {
          await db.query("DELETE FROM notifications WHERE note_id = $1 AND user_id = ANY($2::text[])", [current.id, removed]);
          await db.query("DELETE FROM note_states WHERE note_id = $1 AND user_id = ANY($2::text[])", [current.id, removed]);
        }
        const added = after.filter(id => !before.includes(id));
        const text = (await db.query("SELECT body FROM notes WHERE id = $1", [current.id])).rows[0].body;
        await addNotifications(db, added, { kind: "noteAdded", actorName: req.user.name, title: snippet(text), noteId: current.id });
      }
      return (await loadNotes(db, req.user, current.id))[0];
    });
    res.json({ note });
  });

  router.delete("/:id", async (req, res) => {
    const note = await findVisibleNote(pool, req.user, req.params.id);
    if (!canEditNote(req.user, note)) throw new HttpError(403, "Bara den som skrev lappen kan ta bort den.");
    await pool.query("DELETE FROM notes WHERE id = $1", [note.id]);
    res.json({ ok: true });
  });

  // The user's own marks on a note: read, done and its spot on the board.
  router.put("/:id/state", async (req, res) => {
    const body = req.body || {};
    const note = await findVisibleNote(pool, req.user, req.params.id);
    if (body.done !== undefined && typeof body.done !== "boolean") throw new HttpError(400, "Ogiltigt värde.");
    const layout = body.layout === undefined ? null : cleanLayout(body.layout);
    const { rows } = await pool.query(
      `INSERT INTO note_states (note_id, user_id, read_at, done, layout)
       VALUES ($1, $2, CASE WHEN $3 THEN now() END, COALESCE($4, false), '{}')
       ON CONFLICT (note_id, user_id) DO UPDATE SET
         read_at = COALESCE(note_states.read_at, EXCLUDED.read_at),
         done = COALESCE($4, note_states.done)
       RETURNING read_at, done, layout`,
      [note.id, req.user.id, body.read === true, body.done ?? null]
    );
    let state = rows[0];
    if (body.read === true) {
      await pool.query("UPDATE notifications SET read_at = now() WHERE note_id = $1 AND user_id = $2 AND read_at IS NULL", [note.id, req.user.id]);
    }
    if (layout) {
      const result = await pool.query(
        `UPDATE note_states SET layout = CASE WHEN $4::jsonb IS NULL THEN layout - $3::text ELSE jsonb_set(layout, ARRAY[$3::text], $4::jsonb) END
          WHERE note_id = $1 AND user_id = $2 RETURNING read_at, done, layout`,
        [note.id, req.user.id, layout.mode, layout.position ? JSON.stringify(layout.position) : null]
      );
      state = result.rows[0];
    }
    res.json({ read: Boolean(state.read_at), done: state.done, layout: state.layout });
  });

  // "Ordna lapparna": forgets where the user put the given notes in one sort order.
  router.post("/layout/reset", async (req, res) => {
    const mode = req.body?.mode;
    if (!SORT_MODES.includes(mode)) throw new HttpError(400, "Okänd sortering.");
    const ids = idList(req.body?.ids, "anteckningar");
    await pool.query(
      "UPDATE note_states SET layout = layout - $2 WHERE user_id = $1 AND note_id = ANY($3::text[])",
      [req.user.id, mode, ids]
    );
    res.json({ ok: true });
  });

  return router;
}

module.exports = { noteRoutes, addTodosAsNotes };
