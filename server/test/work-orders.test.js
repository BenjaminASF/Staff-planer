const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, openStream, SETUP_CODE } = require("./helpers");

const PASSWORD = "losenord123";
const BASE = "/api/notes/work-orders";

// Who is who: Ada is an admin without a shift. Lisa leads the day shift, Hanna is its right
// hand, Sara a senior operator and Olle an operator there. Kalle leads the evening shift
// and Sven is a senior operator there.
describe("arbetsorder", () => {
  let server, admin, leader, rightHand, senior, operator, otherLeader, otherSenior;
  let adminUser, leaderUser, rightHandUser, seniorUser, operatorUser, otherLeaderUser, otherSeniorUser;

  before(async () => {
    server = await startTestServer();
    [admin, leader, rightHand, senior, operator, otherLeader, otherSenior] = Array.from({ length: 7 }, () => server.client());
    adminUser = (await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD })).data.user;
    const dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    const eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const createPerson = async (name, shiftId, username, role) => (await admin.post("/api/people", {
      name, shiftId, account: { username, password: PASSWORD, role, mustChangePassword: false }
    })).data.person;
    await createPerson("Lisa Ledare", dayShift.id, "lisa", "shift_leader");
    await createPerson("Hanna Hand", dayShift.id, "hanna", "right_hand");
    await createPerson("Sara Senior", dayShift.id, "sara", "senior_operator");
    await createPerson("Olle Operatör", dayShift.id, "olle", "operator");
    await createPerson("Kalle Kväll", eveningShift.id, "kalle", "shift_leader");
    await createPerson("Sven Senior", eveningShift.id, "sven", "senior_operator");
    leaderUser = (await leader.login("lisa", PASSWORD)).user;
    rightHandUser = (await rightHand.login("hanna", PASSWORD)).user;
    seniorUser = (await senior.login("sara", PASSWORD)).user;
    operatorUser = (await operator.login("olle", PASSWORD)).user;
    otherLeaderUser = (await otherLeader.login("kalle", PASSWORD)).user;
    otherSeniorUser = (await otherSenior.login("sven", PASSWORD)).user;
  });

  after(async () => {
    await server?.close();
  });

  const ordersOf = async client => (await client.get(BASE)).data.workOrders || [];
  const orderOf = async (client, id) => (await ordersOf(client)).find(order => order.id === id);
  const notificationsOf = async client => (await client.get("/api/notifications")).data.notifications;

  async function createOrder(overrides = {}) {
    const result = await leader.post(BASE, {
      title: "Byt filter på linje 3",
      description: "Filtren ska bytas innan nattskiftet.",
      people: [rightHandUser.id, seniorUser.id],
      tasks: [
        { title: "Hämta nya filter", assigneeId: rightHandUser.id },
        { title: "Byt filtren", assigneeId: seniorUser.id },
        { title: "Testkör linjen", assigneeId: leaderUser.id }
      ],
      ...overrides
    });
    assert.equal(result.status, 201, JSON.stringify(result.data));
    return result.data.workOrder;
  }

  test("a work order is created with people and tasks, and everyone on it sees all of it", async () => {
    const stream = await openStream(server, senior);
    try {
      await stream.waitFor(event => event.type === "ready");
      const order = await createOrder();
      assert.equal(order.status, "not_started");
      assert.equal(order.authorId, leaderUser.id);
      assert.equal(order.authorName, "Lisa Ledare");
      assert.deepEqual(order.members.map(person => person.id).sort(), [rightHandUser.id, seniorUser.id].sort());
      assert.deepEqual(order.tasks.map(task => [task.title, task.assigneeName, task.done]), [
        ["Hämta nya filter", "Hanna Hand", false], ["Byt filtren", "Sara Senior", false], ["Testkör linjen", "Lisa Ledare", false]
      ]);
      await stream.waitFor(event => event.data.type === "notes");

      const seen = await orderOf(senior, order.id);
      assert.equal(seen.title, "Byt filter på linje 3");
      assert.equal(seen.description, "Filtren ska bytas innan nattskiftet.");
      assert.equal(seen.tasks.length, 3, "everyone sees every task and who is responsible for it");
      assert.deepEqual(seen.tasks.map(task => task.canMark), [false, true, false], "only one's own task can be marked");
      assert.equal(seen.canEdit, false);

      for (const client of [admin, otherLeader, otherSenior]) {
        assert.ok(!(await orderOf(client, order.id)), "people not on it do not see it, admins included");
      }
      const notice = (await notificationsOf(senior)).find(item => item.workOrderId === order.id);
      assert.equal(notice.kind, "workOrderAdded");
      assert.equal(notice.title, "Byt filter på linje 3");
      assert.equal(notice.detail, "1 uppgift till dig");
      assert.ok(!(await notificationsOf(leader)).some(item => item.workOrderId === order.id), "the creator gets no notification");
    } finally {
      stream.close();
    }
  });

  test("work orders are kept apart from notes", async () => {
    const order = await createOrder();
    const notes = (await senior.get("/api/notes")).data.notes;
    assert.ok(!notes.some(note => note.id === order.id));
    assert.equal((await senior.get(`/api/notes/${order.id}/state`)).status, 404);
  });

  test("each person marks their own task as done; who and when is saved", async () => {
    const order = await createOrder();
    const [fetch, swap, run] = order.tasks;
    assert.equal((await senior.patch(`${BASE}/${order.id}/tasks/${fetch.id}`, { done: true })).status, 403, "not someone else's task");

    const marked = await rightHand.patch(`${BASE}/${order.id}/tasks/${fetch.id}`, { done: true });
    assert.equal(marked.status, 200);
    const task = marked.data.workOrder.tasks.find(item => item.id === fetch.id);
    assert.equal(task.done, true);
    assert.equal(task.doneById, rightHandUser.id);
    assert.equal(task.doneByName, "Hanna Hand");
    assert.ok(Date.now() - new Date(task.doneAt).getTime() < 60000);
    assert.equal(marked.data.workOrder.status, "in_progress", "the first done task starts the work order");

    assert.equal((await rightHand.put(`${BASE}/${order.id}/status`, { status: "completed" })).status, 409, "not while tasks remain");
    const view = await orderOf(senior, order.id);
    assert.equal(view.canComplete, false);

    // The creator may mark any task, for example when someone is away.
    assert.equal((await leader.patch(`${BASE}/${order.id}/tasks/${run.id}`, { done: true })).status, 200);
    assert.equal((await senior.patch(`${BASE}/${order.id}/tasks/${swap.id}`, { done: true })).status, 200);
    const ready = (await notificationsOf(leader)).find(item => item.workOrderId === order.id && item.kind === "workOrderReady");
    assert.ok(ready, "the creator hears when every task is done");
    assert.equal(ready.actorName, "Sara Senior");

    // Undo and redo.
    const undone = await senior.patch(`${BASE}/${order.id}/tasks/${swap.id}`, { done: false });
    assert.equal(undone.data.workOrder.tasks.find(item => item.id === swap.id).done, false);
    assert.equal(undone.data.workOrder.tasks.find(item => item.id === swap.id).doneByName, null);
    await senior.patch(`${BASE}/${order.id}/tasks/${swap.id}`, { done: true });
    assert.equal((await orderOf(senior, order.id)).canComplete, true);
  });

  test("once every task is done, anyone on it marks it Slutförd; only the creator opens it again", async () => {
    const order = await createOrder({ tasks: [{ title: "Byt filtren", assigneeId: seniorUser.id }] });
    assert.equal((await senior.put(`${BASE}/${order.id}/status`, { status: "in_progress" })).data.workOrder.status, "in_progress", "Påbörja");
    await senior.patch(`${BASE}/${order.id}/tasks/${order.tasks[0].id}`, { done: true });
    const done = await senior.put(`${BASE}/${order.id}/status`, { status: "completed" });
    assert.equal(done.status, 200);
    assert.equal(done.data.workOrder.status, "completed");
    assert.equal(done.data.workOrder.completedByName, "Sara Senior");
    assert.ok(done.data.workOrder.completedAt);
    assert.equal(done.data.workOrder.tasks[0].canMark, false);
    const kinds = async client => (await notificationsOf(client)).filter(item => item.workOrderId === order.id).map(item => item.kind);
    assert.ok((await kinds(leader)).includes("workOrderCompleted"));
    assert.ok((await kinds(rightHand)).includes("workOrderCompleted"));
    assert.ok(!(await kinds(senior)).includes("workOrderCompleted"));

    assert.equal((await senior.patch(`${BASE}/${order.id}/tasks/${order.tasks[0].id}`, { done: false })).status, 409, "a completed work order is locked");
    assert.equal((await leader.patch(`${BASE}/${order.id}`, { title: "Ny rubrik" })).status, 409);
    assert.equal((await senior.put(`${BASE}/${order.id}/status`, { status: "in_progress" })).status, 403);
    const reopened = await leader.put(`${BASE}/${order.id}/status`, { status: "in_progress" });
    assert.equal(reopened.data.workOrder.status, "in_progress");
    assert.equal(reopened.data.workOrder.completedByName, null);
    assert.equal((await leader.put(`${BASE}/${order.id}/status`, { status: "not_started" })).status, 400);
  });

  test("a work order without tasks can be completed at once", async () => {
    const order = await createOrder({ tasks: [] });
    assert.equal(order.canComplete, true);
    assert.equal((await rightHand.put(`${BASE}/${order.id}/status`, { status: "completed" })).data.workOrder.status, "completed");
  });

  test("only the creator changes the work order, its people and its tasks", async () => {
    const order = await createOrder();
    assert.equal((await senior.patch(`${BASE}/${order.id}`, { title: "Hej" })).status, 403);
    assert.equal((await senior.post(`${BASE}/${order.id}/tasks`, { title: "Extra" })).status, 403);
    assert.equal((await senior.patch(`${BASE}/${order.id}/tasks/${order.tasks[0].id}`, { assigneeId: seniorUser.id })).status, 403);
    assert.equal((await senior.delete(`${BASE}/${order.id}/tasks/${order.tasks[0].id}`)).status, 403);
    assert.equal((await senior.delete(`${BASE}/${order.id}`)).status, 403);

    const edited = await leader.patch(`${BASE}/${order.id}`, { title: "  Byt alla filter  ", description: "" });
    assert.equal(edited.data.workOrder.title, "Byt alla filter");
    assert.equal(edited.data.workOrder.description, "");

    const added = await leader.post(`${BASE}/${order.id}/tasks`, { title: "Städa efteråt", assigneeId: rightHandUser.id });
    assert.equal(added.status, 201);
    const extra = added.data.workOrder.tasks.at(-1);
    assert.equal(extra.title, "Städa efteråt");
    assert.ok((await notificationsOf(rightHand)).some(item => item.kind === "workOrderTask" && item.detail === "Städa efteråt"));

    assert.equal((await leader.post(`${BASE}/${order.id}/tasks`, { title: "Fel person", assigneeId: otherSeniorUser.id })).status, 400, "only people on it get tasks");
    const unassigned = await leader.post(`${BASE}/${order.id}/tasks`, { title: "Vem som helst" });
    const free = unassigned.data.workOrder.tasks.at(-1);
    assert.equal(free.assigneeId, null);
    assert.equal((await senior.patch(`${BASE}/${order.id}/tasks/${free.id}`, { done: true })).status, 200, "a task without a person can be marked by anyone on it");

    const moved = await leader.patch(`${BASE}/${order.id}/tasks/${extra.id}`, { assigneeId: seniorUser.id, title: "Städa" });
    assert.equal(moved.data.workOrder.tasks.find(task => task.id === extra.id).assigneeName, "Sara Senior");
    const removed = await leader.delete(`${BASE}/${order.id}/tasks/${extra.id}`);
    assert.ok(!removed.data.workOrder.tasks.some(task => task.id === extra.id));
  });

  test("people taken off lose the work order and their tasks get no person", async () => {
    const order = await createOrder();
    const result = await leader.patch(`${BASE}/${order.id}`, { people: [seniorUser.id] });
    assert.equal(result.status, 200);
    assert.ok(!(await orderOf(rightHand, order.id)));
    assert.ok(!(await notificationsOf(rightHand)).some(item => item.workOrderId === order.id));
    assert.equal(result.data.workOrder.tasks[0].assigneeId, null);
    assert.equal((await leader.patch(`${BASE}/${order.id}`, { people: [] })).status, 400, "someone must be on it");
    assert.equal((await rightHand.patch(`${BASE}/${order.id}/tasks/${order.tasks[0].id}`, { done: true })).status, 404);

    const back = await leader.patch(`${BASE}/${order.id}`, { people: [seniorUser.id, rightHandUser.id] });
    assert.equal(back.data.workOrder.members.length, 2);
    assert.ok((await notificationsOf(rightHand)).some(item => item.workOrderId === order.id && item.kind === "workOrderAdded"));
  });

  test("the people follow the same rules as for notes", async () => {
    assert.equal((await leader.post(BASE, { title: "Hej", people: [] })).status, 400, "someone must be on it");
    assert.equal((await leader.post(BASE, { title: "", people: [seniorUser.id] })).status, 400, "a title is needed");
    assert.equal((await leader.post(BASE, { title: "Hej", people: [otherSeniorUser.id] })).status, 403, "shift leaders pick in their own shift");
    const toOperator = await leader.post(BASE, { title: "Hej", people: [operatorUser.id] });
    assert.equal(toOperator.status, 403);
    assert.equal(toOperator.data.error, "Operatörer har inte tillgång till Anteckningar.");
    assert.equal((await admin.post(BASE, { title: "Över skiften", people: [leaderUser.id, otherLeaderUser.id] })).status, 201, "admins pick in every shift");
    assert.equal((await leader.post(BASE, { title: "Hej", people: [seniorUser.id], tasks: [{ title: "" }] })).status, 400);
    assert.equal((await leader.post(BASE, { title: "x".repeat(121), people: [seniorUser.id] })).status, 400);

    for (const [method, url, body] of [["get", BASE], ["post", BASE, { title: "Hej", people: [leaderUser.id] }]]) {
      assert.equal((await operator[method](url, body)).status, 403, `${method} ${url}`);
    }
  });

  test("someone who becomes an operator loses their work orders", async () => {
    const sara = (await admin.get("/api/people")).data.people.find(person => person.account?.username === "sara");
    const order = await createOrder();
    const written = (await senior.post(BASE, { title: "Från Sara", people: [leaderUser.id] })).data.workOrder.id;
    assert.equal((await admin.patch(`/api/people/${sara.id}/account`, { role: "operator" })).status, 200);
    assert.equal((await senior.get(BASE)).status, 403);
    assert.ok(!(await senior.get("/api/notifications")).data.notifications.some(item => item.workOrderId), "notifications about work orders are hidden");
    assert.ok(!(await orderOf(leader, written)), "nobody sees a work order written by an operator");
    assert.ok(!(await orderOf(leader, order.id)).members.some(person => person.id === seniorUser.id), "nor is an operator listed on one");
    assert.equal((await admin.patch(`/api/people/${sara.id}/account`, { role: "senior_operator" })).status, 200);
    assert.ok(await orderOf(senior, written));
  });

  test("deleting a work order removes its tasks and notifications", async () => {
    const order = await createOrder();
    assert.equal((await leader.delete(`${BASE}/${order.id}`)).status, 200);
    assert.ok(!(await orderOf(senior, order.id)));
    assert.ok(!(await notificationsOf(senior)).some(item => item.workOrderId === order.id));
    const { rows } = await server.pool.query("SELECT count(*)::int AS count FROM work_order_tasks WHERE work_order_id = $1", [order.id]);
    assert.equal(rows[0].count, 0);
  });
});
