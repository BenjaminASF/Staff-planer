const fs = require("node:fs");
const path = require("node:path");
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");
const { runMigrations } = require("../db");

const PASSWORD = "losenord123";
const todo = text => ({ id: text, text, createdAt: "2026-10-14T08:00:00.000Z", createdWeek: "2026-10-12", completedAt: "", completedWeek: "", completedDay: "" });

describe("personal to-do lists", () => {
  let server;
  let admin, leader, operator;
  let adminUser, leaderUser, operatorUser, shift;

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    leader = server.client();
    operator = server.client();
    adminUser = (await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD })).data.user;
    shift = (await admin.get("/api/shifts")).data.shifts[0];
    await admin.post("/api/people", { name: "Lisa Ledare", shiftId: shift.id, account: { username: "lisa", password: PASSWORD, role: "shift_leader", mustChangePassword: false } });
    await admin.post("/api/people", { name: "Olle Operatör", shiftId: shift.id, account: { username: "olle", password: PASSWORD, role: "operator", mustChangePassword: false } });
    leaderUser = (await leader.login("lisa", PASSWORD)).user;
    operatorUser = (await operator.login("olle", PASSWORD)).user;
  });

  after(async () => {
    await server?.close();
  });

  const ownTexts = async (client, user) =>
    (await client.get(`/api/documents?scope=user:${user.id}&keys=todos`)).data.documents.todos?.value.map(item => item.text) || [];

  test("each admin and shift leader reads and writes only their own list", async () => {
    assert.equal((await admin.put(`/api/documents/user:${adminUser.id}/todos`, { value: [todo("Admin")], baseVersion: 0 })).status, 200);
    assert.equal((await leader.put(`/api/documents/user:${leaderUser.id}/todos`, { value: [todo("Ledare")], baseVersion: 0 })).status, 200);
    assert.deepEqual(await ownTexts(leader, leaderUser), ["Ledare"]);

    const others = await admin.get(`/api/documents?scope=user:${leaderUser.id}&keys=todos`);
    assert.deepEqual(others.data.forbidden, ["todos"], "not even an admin reads someone else's list");
    assert.equal((await admin.put(`/api/documents/user:${leaderUser.id}/todos`, { value: [], baseVersion: 1 })).status, 403);
    assert.equal((await operator.put(`/api/documents/user:${adminUser.id}/todos`, { value: [], baseVersion: 1 })).status, 403);
  });

  test("operators have a private list too, which not even an admin reads", async () => {
    assert.equal((await operator.put(`/api/documents/user:${operatorUser.id}/todos`, { value: [todo("Operatör")], baseVersion: 0 })).status, 200);
    assert.deepEqual(await ownTexts(operator, operatorUser), ["Operatör"]);
    assert.deepEqual((await admin.get(`/api/documents?scope=user:${operatorUser.id}&keys=todos`)).data.forbidden, ["todos"]);
    assert.deepEqual((await leader.get(`/api/documents?scope=user:${operatorUser.id}&keys=todos`)).data.forbidden, ["todos"]);
    assert.equal((await admin.put(`/api/documents/user:${operatorUser.id}/todos`, { value: [], baseVersion: 1 })).status, 403);
  });

  test("personal scopes reveal nothing and take no audit events", async () => {
    const unknown = await leader.get("/api/documents?scope=user:no-such-user&keys=todos");
    assert.equal(unknown.status, 200, "a missing user looks the same as someone else's list");
    assert.deepEqual(unknown.data.forbidden, ["todos"]);
    assert.equal((await admin.post("/api/audit", { scope: `user:${leaderUser.id}`, title: "x" })).status, 403);
    assert.equal((await admin.post("/api/audit", { scope: `user:${adminUser.id}`, title: "x" })).status, 403);
  });

  test("a right hand has a private list too", async () => {
    await admin.post("/api/people", { name: "Hanna Hand", shiftId: shift.id, account: { username: "hanna", password: PASSWORD, role: "right_hand", mustChangePassword: false } });
    const hand = server.client();
    const handUser = (await hand.login("hanna", PASSWORD)).user;
    assert.equal((await hand.put(`/api/documents/user:${handUser.id}/todos`, { value: [todo("Hand")], baseVersion: 0 })).status, 200);
    assert.deepEqual(await ownTexts(hand, handUser), ["Hand"]);
    assert.deepEqual((await leader.get(`/api/documents?scope=user:${handUser.id}&keys=todos`)).data.forbidden, ["todos"]);
    assert.deepEqual((await hand.get(`/api/documents?scope=user:${adminUser.id}&keys=todos`)).data.forbidden, ["todos"]);
  });

  test("a task is seen only by the people its owner shares it with, read-only", async () => {
    const recipients = (await leader.get("/api/todos/recipients")).data.recipients;
    assert.deepEqual(recipients.map(recipient => recipient.name), ["Ada Admin", "Hanna Hand", "Olle Operatör"], "everyone else with a login");
    const handId = recipients.find(recipient => recipient.name === "Hanna Hand").id;
    const hand = server.client();
    await hand.login("hanna", PASSWORD);

    const current = (await leader.get(`/api/documents?scope=user:${leaderUser.id}&keys=todos`)).data.documents.todos;
    const shared = { ...todo("Beställ handskar"), sharedWith: [handId] };
    const value = [...current.value, shared, todo("Hemlig")];
    assert.equal((await leader.put(`/api/documents/user:${leaderUser.id}/todos`, { value, baseVersion: current.version })).status, 200);

    const forHand = (await hand.get("/api/todos/shared")).data.items;
    assert.deepEqual(forHand.map(item => [item.text, item.ownerName]), [["Beställ handskar", "Lisa Ledare"]]);
    assert.deepEqual((await admin.get("/api/todos/shared")).data.items, [], "not shared with the admin");
    assert.deepEqual((await leader.get("/api/todos/shared")).data.items, [], "your own tasks are not listed as shared with you");
    assert.deepEqual((await hand.get(`/api/documents?scope=user:${leaderUser.id}&keys=todos`)).data.forbidden, ["todos"], "the rest of the list stays private");
    assert.equal((await hand.put(`/api/documents/user:${leaderUser.id}/todos`, { value: [], baseVersion: 2 })).status, 403);

    const latest = (await leader.get(`/api/documents?scope=user:${leaderUser.id}&keys=todos`)).data.documents.todos;
    const unshared = latest.value.map(item => item.text === "Beställ handskar" ? { ...item, sharedWith: [] } : item);
    assert.equal((await leader.put(`/api/documents/user:${leaderUser.id}/todos`, { value: unshared, baseVersion: latest.version })).status, 200);
    assert.deepEqual((await hand.get("/api/todos/shared")).data.items, []);
    const restored = await leader.put(`/api/documents/user:${leaderUser.id}/todos`, { value: current.value, baseVersion: latest.version + 1 });
    assert.equal(restored.status, 200);
  });

  test("operators share tasks and see the ones shared with them", async () => {
    const recipients = (await operator.get("/api/todos/recipients")).data.recipients;
    const adminId = recipients.find(recipient => recipient.name === "Ada Admin").id;
    const current = (await operator.get(`/api/documents?scope=user:${operatorUser.id}&keys=todos`)).data.documents.todos;
    const value = [...current.value, { ...todo("Till admin"), sharedWith: [adminId] }];
    assert.equal((await operator.put(`/api/documents/user:${operatorUser.id}/todos`, { value, baseVersion: current.version })).status, 200);
    assert.deepEqual((await admin.get("/api/todos/shared")).data.items.map(item => [item.text, item.ownerName]), [["Till admin", "Olle Operatör"]]);
    assert.deepEqual((await operator.get("/api/todos/shared")).data.items, []);
  });

  test("to-do lists no longer belong to a shift", async () => {
    assert.equal((await admin.put(`/api/documents/user:${adminUser.id}/schedule:2026-10-12`, { value: {}, baseVersion: 0 })).status, 400);
    const { rows } = await server.pool.query("SELECT 1 FROM documents WHERE scope = $1 AND key = 'todos'", [shift.id]);
    assert.equal(rows.length, 0);
  });

  test("pages opened before the change save to the user's own list without replacing it", async () => {
    const stale = await leader.put(`/api/documents/${shift.id}/todos`, { value: [todo("Gammal flik")], baseVersion: 3 });
    assert.equal(stale.status, 200);
    assert.deepEqual(await ownTexts(leader, leaderUser), ["Ledare", "Gammal flik"]);
    const done = { ...todo("Gammal flik"), completedAt: "2026-10-14T09:00:00.000Z" };
    assert.equal((await leader.put(`/api/documents/${shift.id}/todos`, { value: [done], baseVersion: stale.data.version })).status, 200);
    const { rows } = await server.pool.query("SELECT value FROM documents WHERE scope = $1 AND key = 'todos'", [`user:${leaderUser.id}`]);
    assert.deepEqual(rows[0].value.map(item => [item.text, item.completedAt]), [["Ledare", ""], ["Gammal flik", done.completedAt]]);
  });

  test("backups leave personal lists out and imports leave them alone", async () => {
    const backup = (await admin.get("/api/admin/export")).data;
    assert.equal(backup.version, 3);
    assert.deepEqual(backup.documents.filter(doc => doc.scope.startsWith("user:")), []);

    const forged = { ...backup, documents: [...backup.documents, { scope: `user:${leaderUser.id}`, key: "todos", value: [todo("Planterad")] }] };
    assert.equal((await admin.post("/api/admin/import", forged)).status, 200);
    assert.deepEqual(await ownTexts(leader, leaderUser), ["Ledare", "Gammal flik"]);
    assert.deepEqual(await ownTexts(admin, adminUser), ["Admin"]);
  });

  test("version 2 backups bring shift lists into the importing admin's own list", async () => {
    const backup = (await admin.get("/api/admin/export")).data;
    const old = {
      ...backup,
      version: 2,
      documents: [
        ...backup.documents,
        { scope: shift.id, key: "todos", value: [todo("Från backup 1"), todo("Från backup 2")] },
        { scope: `user:${leaderUser.id}`, key: "todos", value: [todo("Planterad")] }
      ]
    };
    const result = await admin.post("/api/admin/import", old);
    assert.equal(result.status, 200);
    assert.equal(result.data.todos, 2);
    assert.deepEqual(await ownTexts(admin, adminUser), ["Admin", "Från backup 1", "Från backup 2"]);
    assert.deepEqual(await ownTexts(leader, leaderUser), ["Ledare", "Gammal flik"]);
  });

  test("the old single-device list joins the admin's own list instead of replacing it", async () => {
    const result = await admin.post("/api/admin/import-legacy", { shiftId: shift.id, people: [], global: {}, shift: { todos: [todo("Från gamla appen")] } });
    assert.equal(result.status, 200);
    assert.deepEqual(await ownTexts(admin, adminUser), ["Admin", "Från backup 1", "Från backup 2", "Från gamla appen"]);
  });

  test("removing a login removes its list", async () => {
    const leaderPerson = (await admin.get("/api/people")).data.people.find(person => person.name === "Lisa Ledare");
    assert.equal((await admin.delete(`/api/people/${leaderPerson.id}/account`)).status, 200);
    const { rows } = await server.pool.query("SELECT 1 FROM documents WHERE scope = $1", [`user:${leaderUser.id}`]);
    assert.equal(rows.length, 0);
  });

  test("existing shift lists move to the shift's leaders, or to admins when it has none, in shift order", async () => {
    await server.pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await server.pool.query("CREATE TABLE schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const name of ["001_init.sql", "002_shift_colors.sql"]) {
      await server.pool.query(fs.readFileSync(path.join(__dirname, "../migrations", name), "utf8"));
      await server.pool.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
    }
    await server.pool.query(`
      INSERT INTO shifts (id, name, sort_order) VALUES ('a', 'A', 0), ('b', 'B', 2), ('c', 'C', 1);
      INSERT INTO people (id, name, shift_id) VALUES ('p-admin', 'Admin', NULL), ('p-lead', 'Ledare', 'a'), ('p-op', 'Operatör', 'a');
      INSERT INTO users (id, person_id, username, password_hash, role) VALUES
        ('u-admin', 'p-admin', 'admin', 'x', 'admin'), ('u-lead', 'p-lead', 'lead', 'x', 'shift_leader'), ('u-op', 'p-op', 'op', 'x', 'operator');
      INSERT INTO documents (scope, key, value) VALUES
        ('a', 'todos', '[{"id": "1", "text": "Från A"}]'), ('b', 'todos', '[{"id": "2", "text": "Från B"}]'),
        ('c', 'todos', '[{"id": "3", "text": "Från C 1"}, {"id": "4", "text": "Från C 2"}, {"id": "5", "text": "Från C 3"}]');
    `);
    await runMigrations(server.pool);
    const { rows } = await server.pool.query("SELECT scope, value FROM documents WHERE key = 'todos' ORDER BY scope");
    assert.deepEqual(rows.map(row => [row.scope, row.value.map(item => item.text)]), [
      ["user:u-admin", ["Från C 1", "Från C 2", "Från C 3", "Från B"]],
      ["user:u-lead", ["Från A"]]
    ]);
  });
});
