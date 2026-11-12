const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { withTransaction } = require("../db");
const { canUseNotes, canShareNotes, canEditWorkOrder, canMarkWorkOrderTask, canReopenWorkOrder } = require("../permissions");
const { addNotifications } = require("../notifications");
const { newId, WORK_ORDER_VISIBLE_SQL } = require("../store");
const { cleanText } = require("../validation");
const { cleanSharing } = require("./notes");

// Arbetsorder: a type of its own under Anteckningar (see "Arbetsorder" in permissions.js).
// A work order has a title, a description, the people on it and tasks with one person
// responsible each. Its status follows from the dates (see 027_work_orders.sql).

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TASK_LENGTH = 200;
const MAX_TASKS = 50;

const STATUS = Object.freeze({ NOT_STARTED: "not_started", IN_PROGRESS: "in_progress", COMPLETED: "completed" });

const VISIBLE = WORK_ORDER_VISIBLE_SQL;

const NAME = (users, people) => `COALESCE(${people}.name, ${users}.username)`;

// The people on the given work orders who may still see them: not operators, and
// temporary accounts only with the notes function.
const MEMBERS = `
  SELECT wp.work_order_id, u.id, ${NAME("u", "p")} AS name, u.role
    FROM work_order_people wp
    JOIN users u ON u.id = wp.user_id
    LEFT JOIN people p ON p.id = u.person_id
   WHERE wp.work_order_id = ANY($1::text[])
     AND u.role <> 'operator' AND (NOT u.temporary OR 'notes' = ANY(u.features))
   ORDER BY lower(${NAME("u", "p")})`;

const TASKS = `
  SELECT t.*, ${NAME("au", "ap")} AS assignee_name, ${NAME("du", "dp")} AS done_by_name
    FROM work_order_tasks t
    LEFT JOIN users au ON au.id = t.assignee_id LEFT JOIN people ap ON ap.id = au.person_id
    LEFT JOIN users du ON du.id = t.done_by LEFT JOIN people dp ON dp.id = du.person_id
   WHERE t.work_order_id = ANY($1::text[])
   ORDER BY t.position, t.created_at, t.id`;

function statusOf(row) {
  if (row.completed_at) return STATUS.COMPLETED;
  return row.started_at ? STATUS.IN_PROGRESS : STATUS.NOT_STARTED;
}

// The work orders the user sees, or only the one with `id`, newest first.
async function loadWorkOrders(db, user, id = null) {
  const { rows } = await db.query(
    `SELECT w.*, ${NAME("a", "ap")} AS author_name, a.role AS author_role, ${NAME("c", "cp")} AS completed_by_name
       FROM work_orders w
       JOIN users a ON a.id = w.author_id LEFT JOIN people ap ON ap.id = a.person_id
       LEFT JOIN users c ON c.id = w.completed_by LEFT JOIN people cp ON cp.id = c.person_id
      WHERE ${VISIBLE} AND ($2::text IS NULL OR w.id = $2)
      ORDER BY w.created_at DESC, w.id`,
    [user.id, id]
  );
  if (!rows.length) return [];
  const ids = rows.map(row => row.id);
  const [members, tasks] = await Promise.all([db.query(MEMBERS, [ids]), db.query(TASKS, [ids])]);
  const byOrder = list => list.reduce((map, row) => map.set(row.work_order_id, [...(map.get(row.work_order_id) || []), row]), new Map());
  const membersOf = byOrder(members.rows);
  const tasksOf = byOrder(tasks.rows);
  return rows.map(row => {
    const status = statusOf(row);
    const open = status !== STATUS.COMPLETED;
    const list = (tasksOf.get(row.id) || []).map(task => ({
      id: task.id,
      title: task.title,
      assigneeId: task.assignee_id,
      assigneeName: task.assignee_id ? task.assignee_name : null,
      done: Boolean(task.done_at),
      doneAt: task.done_at,
      doneById: task.done_by,
      doneByName: task.done_at ? (task.done_by ? task.done_by_name : "Borttagen användare") : null,
      canMark: open && canMarkWorkOrderTask(user, row, task)
    }));
    const allDone = list.every(task => task.done);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      authorId: row.author_id,
      authorName: row.author_name,
      authorRole: row.author_role,
      status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      completedById: row.completed_by,
      completedByName: row.completed_at ? (row.completed_by ? row.completed_by_name : "Borttagen användare") : null,
      members: (membersOf.get(row.id) || []).map(person => ({ id: person.id, name: person.name, role: person.role })),
      tasks: list,
      canEdit: open && canEditWorkOrder(user, row),
      canDelete: canEditWorkOrder(user, row),
      canStart: status === STATUS.NOT_STARTED,
      canComplete: open && allDone,
      canReopen: !open && canReopenWorkOrder(user, row),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  });
}

async function findWorkOrder(db, user, id, { lock = false } = {}) {
  const { rows } = await db.query(
    `SELECT w.* FROM work_orders w WHERE w.id = $2 AND ${VISIBLE}${lock ? " FOR UPDATE" : ""}`,
    [user.id, String(id ?? "")]
  );
  if (!rows[0]) throw new HttpError(404, "Arbetsordern finns inte eller så är du inte med i den.");
  return rows[0];
}

const loadOne = async (db, user, id) => (await loadWorkOrders(db, user, id))[0];

function requireEditor(user, order) {
  if (!canEditWorkOrder(user, order)) throw new HttpError(403, "Bara den som skapade arbetsordern kan ändra den.");
}

function requireOpen(order) {
  if (order.completed_at) throw new HttpError(409, "Arbetsordern är slutförd. Öppna den igen för att ändra något.");
}

function cleanTitle(value) {
  const text = cleanText(value, MAX_TITLE_LENGTH + 1);
  if (!text) throw new HttpError(400, "Skriv en rubrik.");
  if (text.length > MAX_TITLE_LENGTH) throw new HttpError(400, `Rubriken får vara högst ${MAX_TITLE_LENGTH} tecken.`);
  return text;
}

function cleanDescription(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new HttpError(400, "Ogiltig beskrivning.");
  const text = value.trim();
  if (text.length > MAX_DESCRIPTION_LENGTH) throw new HttpError(400, `Beskrivningen får vara högst ${MAX_DESCRIPTION_LENGTH} tecken.`);
  return text;
}

function cleanTaskTitle(value) {
  const text = cleanText(value, MAX_TASK_LENGTH + 1);
  if (!text) throw new HttpError(400, "Skriv vad uppgiften gäller.");
  if (text.length > MAX_TASK_LENGTH) throw new HttpError(400, `En uppgift får vara högst ${MAX_TASK_LENGTH} tecken.`);
  return text;
}

// A task's person must be on the work order: its creator or one of its people.
function cleanAssignee(value, allowed) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !allowed.includes(value)) throw new HttpError(400, "Uppgiften kan bara tilldelas någon som är med i arbetsordern.");
  return value;
}

const memberIds = async (db, orderId) => (await db.query(MEMBERS, [[orderId]])).rows.map(row => row.id);
// Everyone on the work order: its creator and its people.
const everyoneOn = async (db, order) => [order.author_id, ...await memberIds(db, order.id)];

async function insertTask(db, orderId, title, assigneeId) {
  await db.query(
    `INSERT INTO work_order_tasks (id, work_order_id, title, assignee_id, position)
     VALUES ($1, $2, $3, $4, (SELECT COALESCE(max(position), -1) + 1 FROM work_order_tasks WHERE work_order_id = $2))`,
    [newId(), orderId, title, assigneeId]
  );
}

const taskCountText = count => `${count} ${count === 1 ? "uppgift" : "uppgifter"} till dig`;

function workOrderRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser);
  router.use((req, res, next) => {
    if (!canUseNotes(req.user)) throw new HttpError(403, "Du har inte tillgång till Anteckningar.");
    next();
  });

  router.get("/", async (req, res) => {
    res.json({ workOrders: await loadWorkOrders(pool, req.user), canCreate: canShareNotes(req.user) });
  });

  router.post("/", async (req, res) => {
    const body = req.body || {};
    const title = cleanTitle(body.title);
    const description = cleanDescription(body.description);
    const tasks = body.tasks === undefined ? [] : body.tasks;
    if (!Array.isArray(tasks) || tasks.length > MAX_TASKS) throw new HttpError(400, `En arbetsorder kan ha högst ${MAX_TASKS} uppgifter.`);
    const order = await withTransaction(pool, async db => {
      const { people } = await cleanSharing(db, req.user, { people: body.people });
      if (!people.length) throw new HttpError(400, "Lägg till minst en person som ska arbeta med arbetsordern.");
      const allowed = [req.user.id, ...people];
      const cleaned = tasks.map(task => ({ title: cleanTaskTitle(task?.title), assigneeId: cleanAssignee(task?.assigneeId, allowed) }));
      const id = newId();
      await db.query("INSERT INTO work_orders (id, author_id, title, description) VALUES ($1, $2, $3, $4)", [id, req.user.id, title, description]);
      for (const userId of people) await db.query("INSERT INTO work_order_people (work_order_id, user_id) VALUES ($1, $2)", [id, userId]);
      for (const task of cleaned) await insertTask(db, id, task.title, task.assigneeId);
      for (const userId of await memberIds(db, id)) {
        const mine = cleaned.filter(task => task.assigneeId === userId).length;
        await addNotifications(db, [userId], {
          kind: "workOrderAdded", actorName: req.user.name, title, detail: mine ? taskCountText(mine) : "", workOrderId: id
        });
      }
      return loadOne(db, req.user, id);
    });
    res.status(201).json({ workOrder: order });
  });

  // The creator changes the title, the description and the people on it.
  router.patch("/:id", async (req, res) => {
    const body = req.body || {};
    const order = await withTransaction(pool, async db => {
      const current = await findWorkOrder(db, req.user, req.params.id, { lock: true });
      requireEditor(req.user, current);
      requireOpen(current);
      if (body.title !== undefined) await db.query("UPDATE work_orders SET title = $2, updated_at = now() WHERE id = $1", [current.id, cleanTitle(body.title)]);
      if (body.description !== undefined) {
        await db.query("UPDATE work_orders SET description = $2, updated_at = now() WHERE id = $1", [current.id, cleanDescription(body.description)]);
      }
      if (body.people !== undefined) {
        const before = await memberIds(db, current.id);
        const { people } = await cleanSharing(db, req.user, { people: body.people });
        if (!people.length) throw new HttpError(400, "Minst en person måste vara med i arbetsordern.");
        await db.query("DELETE FROM work_order_people WHERE work_order_id = $1", [current.id]);
        for (const userId of people) await db.query("INSERT INTO work_order_people (work_order_id, user_id) VALUES ($1, $2)", [current.id, userId]);
        const after = await memberIds(db, current.id);
        // People taken off lose it: their notifications go, and their open and done tasks get no person.
        const removed = before.filter(id => !after.includes(id));
        if (removed.length) {
          await db.query("DELETE FROM notifications WHERE work_order_id = $1 AND user_id = ANY($2::text[])", [current.id, removed]);
          await db.query("UPDATE work_order_tasks SET assignee_id = NULL WHERE work_order_id = $1 AND assignee_id = ANY($2::text[])", [current.id, removed]);
        }
        const title = (await db.query("SELECT title FROM work_orders WHERE id = $1", [current.id])).rows[0].title;
        await addNotifications(db, after.filter(id => !before.includes(id)), { kind: "workOrderAdded", actorName: req.user.name, title, workOrderId: current.id });
      }
      return loadOne(db, req.user, current.id);
    });
    res.json({ workOrder: order });
  });

  router.delete("/:id", async (req, res) => {
    const order = await findWorkOrder(pool, req.user, req.params.id);
    if (!canEditWorkOrder(req.user, order)) throw new HttpError(403, "Bara den som skapade arbetsordern kan ta bort den.");
    await pool.query("DELETE FROM work_orders WHERE id = $1", [order.id]);
    res.json({ ok: true });
  });

  // Påbörja, Slutförd, and Öppna igen.
  router.put("/:id/status", async (req, res) => {
    const status = req.body?.status;
    if (status !== STATUS.IN_PROGRESS && status !== STATUS.COMPLETED) throw new HttpError(400, "Okänd status.");
    const order = await withTransaction(pool, async db => {
      const current = await findWorkOrder(db, req.user, req.params.id, { lock: true });
      if (status === STATUS.COMPLETED) {
        requireOpen(current);
        const { rows } = await db.query("SELECT count(*)::int AS open FROM work_order_tasks WHERE work_order_id = $1 AND done_at IS NULL", [current.id]);
        if (rows[0].open) throw new HttpError(409, "Alla uppgifter måste vara klara innan arbetsordern kan markeras som slutförd.");
        await db.query(
          "UPDATE work_orders SET completed_at = now(), completed_by = $2, started_at = COALESCE(started_at, now()) WHERE id = $1",
          [current.id, req.user.id]
        );
        const others = (await everyoneOn(db, current)).filter(id => id !== req.user.id);
        await addNotifications(db, others, { kind: "workOrderCompleted", actorName: req.user.name, title: current.title, workOrderId: current.id });
      } else if (current.completed_at) {
        if (!canReopenWorkOrder(req.user, current)) throw new HttpError(403, "Bara den som skapade arbetsordern kan öppna den igen.");
        await db.query("UPDATE work_orders SET completed_at = NULL, completed_by = NULL WHERE id = $1", [current.id]);
      } else {
        await db.query("UPDATE work_orders SET started_at = COALESCE(started_at, now()) WHERE id = $1", [current.id]);
      }
      return loadOne(db, req.user, current.id);
    });
    res.json({ workOrder: order });
  });

  // The creator adds tasks.
  router.post("/:id/tasks", async (req, res) => {
    const body = req.body || {};
    const order = await withTransaction(pool, async db => {
      const current = await findWorkOrder(db, req.user, req.params.id, { lock: true });
      requireEditor(req.user, current);
      requireOpen(current);
      const { rows } = await db.query("SELECT count(*)::int AS count FROM work_order_tasks WHERE work_order_id = $1", [current.id]);
      if (rows[0].count >= MAX_TASKS) throw new HttpError(400, `En arbetsorder kan ha högst ${MAX_TASKS} uppgifter.`);
      const title = cleanTaskTitle(body.title);
      const assigneeId = cleanAssignee(body.assigneeId, await everyoneOn(db, current));
      await insertTask(db, current.id, title, assigneeId);
      if (assigneeId && assigneeId !== req.user.id) {
        await addNotifications(db, [assigneeId], { kind: "workOrderTask", actorName: req.user.name, title: current.title, detail: title, workOrderId: current.id });
      }
      return loadOne(db, req.user, current.id);
    });
    res.status(201).json({ workOrder: order });
  });

  // The creator renames a task or gives it to someone else. Klar / inte klar: the person
  // responsible, the creator, or anyone on it when the task has no person.
  router.patch("/:id/tasks/:taskId", async (req, res) => {
    const body = req.body || {};
    const order = await withTransaction(pool, async db => {
      const current = await findWorkOrder(db, req.user, req.params.id, { lock: true });
      requireOpen(current);
      const { rows } = await db.query("SELECT * FROM work_order_tasks WHERE id = $1 AND work_order_id = $2", [String(req.params.taskId), current.id]);
      const task = rows[0];
      if (!task) throw new HttpError(404, "Uppgiften finns inte.");
      if (body.title !== undefined || body.assigneeId !== undefined) requireEditor(req.user, current);
      if (body.title !== undefined) await db.query("UPDATE work_order_tasks SET title = $2 WHERE id = $1", [task.id, cleanTaskTitle(body.title)]);
      if (body.assigneeId !== undefined) {
        const assigneeId = cleanAssignee(body.assigneeId, await everyoneOn(db, current));
        await db.query("UPDATE work_order_tasks SET assignee_id = $2 WHERE id = $1", [task.id, assigneeId]);
        if (assigneeId && assigneeId !== task.assignee_id && assigneeId !== req.user.id) {
          const title = body.title === undefined ? task.title : cleanTaskTitle(body.title);
          await addNotifications(db, [assigneeId], { kind: "workOrderTask", actorName: req.user.name, title: current.title, detail: title, workOrderId: current.id });
        }
      }
      if (body.done !== undefined) {
        if (typeof body.done !== "boolean") throw new HttpError(400, "Ogiltigt värde.");
        if (!canMarkWorkOrderTask(req.user, current, task)) throw new HttpError(403, "Bara den som ansvarar för uppgiften kan markera den som klar.");
        if (body.done && !task.done_at) {
          await db.query("UPDATE work_order_tasks SET done_at = now(), done_by = $2 WHERE id = $1", [task.id, req.user.id]);
          await db.query("UPDATE work_orders SET started_at = COALESCE(started_at, now()) WHERE id = $1", [current.id]);
          // The creator hears when the last task is done, unless they did it themselves.
          const left = (await db.query("SELECT count(*)::int AS open FROM work_order_tasks WHERE work_order_id = $1 AND done_at IS NULL", [current.id])).rows[0].open;
          if (!left && current.author_id !== req.user.id) {
            await addNotifications(db, [current.author_id], {
              kind: "workOrderReady", actorName: req.user.name, title: current.title, detail: "Alla uppgifter är klara", workOrderId: current.id
            });
          }
        } else if (!body.done && task.done_at) {
          await db.query("UPDATE work_order_tasks SET done_at = NULL, done_by = NULL WHERE id = $1", [task.id]);
        }
      }
      return loadOne(db, req.user, current.id);
    });
    res.json({ workOrder: order });
  });

  router.delete("/:id/tasks/:taskId", async (req, res) => {
    const order = await withTransaction(pool, async db => {
      const current = await findWorkOrder(db, req.user, req.params.id, { lock: true });
      requireEditor(req.user, current);
      requireOpen(current);
      const { rowCount } = await db.query("DELETE FROM work_order_tasks WHERE id = $1 AND work_order_id = $2", [String(req.params.taskId), current.id]);
      if (!rowCount) throw new HttpError(404, "Uppgiften finns inte.");
      return loadOne(db, req.user, current.id);
    });
    res.json({ workOrder: order });
  });

  return router;
}

module.exports = { workOrderRoutes };
