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
  let adminUser, leaderUser, operatorUser, operatorPerson, shift;

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    leader = server.client();
    operator = server.client();
    adminUser = (await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD })).data.user;
    shift = (await admin.get("/api/shifts")).data.shifts[0];
    await admin.post("/api/people", { name: "Lisa Ledare", shiftId: shift.id, account: { username: "lisa", password: PASSWORD, role: "shift_leader", mustChangePassword: false } });
    operatorPerson = (await admin.post("/api/people", { name: "Olle Operatör", shiftId: shift.id, account: { username: "olle", password: PASSWORD, role: "operator", mustChangePassword: false } })).data.person;
    leaderUser = (await leader.login("lisa", PASSWORD)).user;
    operatorUser = (await operator.login("olle", PASSWORD)).user;
  });

  after(async () => {
    await server?.close();
  });

  test("each user reads and writes only their own list", async () => {
    assert.equal((await admin.put(`/api/documents/user:${adminUser.id}/todos`, { value: [todo("Admin")], baseVersion: 0 })).status, 200);
    assert.equal((await leader.put(`/api/documents/user:${leaderUser.id}/todos`, { value: [todo("Ledare")], baseVersion: 0 })).status, 200);
    assert.equal((await operator.put(`/api/documents/user:${operatorUser.id}/todos`, { value: [todo("Operatör")], baseVersion: 0 })).status, 200);

    const own = await leader.get(`/api/documents?scope=user:${leaderUser.id}&keys=todos`);
    assert.deepEqual(own.data.documents.todos.value.map(item => item.text), ["Ledare"]);

    const others = await admin.get(`/api/documents?scope=user:${leaderUser.id}&keys=todos`);
    assert.deepEqual(others.data.forbidden, ["todos"], "not even an admin reads someone else's list");
    assert.equal((await admin.put(`/api/documents/user:${leaderUser.id}/todos`, { value: [], baseVersion: 1 })).status, 403);
    assert.equal((await operator.put(`/api/documents/user:${adminUser.id}/todos`, { value: [], baseVersion: 1 })).status, 403);
  });

  test("to-do lists no longer belong to a shift", async () => {
    assert.equal((await admin.put(`/api/documents/${shift.id}/todos`, { value: [], baseVersion: 0 })).status, 400);
    assert.equal((await admin.put(`/api/documents/user:${adminUser.id}/schedule:2026-10-12`, { value: {}, baseVersion: 0 })).status, 400);
  });

  test("removing a login removes its list", async () => {
    assert.equal((await admin.delete(`/api/people/${operatorPerson.id}/account`)).status, 200);
    const { rows } = await server.pool.query("SELECT 1 FROM documents WHERE scope = $1", [`user:${operatorUser.id}`]);
    assert.equal(rows.length, 0);
  });

  test("backups keep personal lists", async () => {
    const backup = (await admin.get("/api/admin/export")).data;
    await admin.put(`/api/documents/user:${adminUser.id}/todos`, { value: [], baseVersion: 1 });
    assert.equal((await admin.post("/api/admin/import", backup)).status, 200);
    const own = await admin.get(`/api/documents?scope=user:${adminUser.id}&keys=todos`);
    assert.deepEqual(own.data.documents.todos.value.map(item => item.text), ["Admin"]);
  });

  test("existing shift lists move to the shift's leaders, or to admins when it has none", async () => {
    await server.pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await server.pool.query("CREATE TABLE schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const name of ["001_init.sql", "002_shift_colors.sql"]) {
      await server.pool.query(fs.readFileSync(path.join(__dirname, "../migrations", name), "utf8"));
      await server.pool.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
    }
    await server.pool.query(`
      INSERT INTO shifts (id, name) VALUES ('a', 'A'), ('b', 'B');
      INSERT INTO people (id, name, shift_id) VALUES ('p-admin', 'Admin', NULL), ('p-lead', 'Ledare', 'a'), ('p-op', 'Operatör', 'a');
      INSERT INTO users (id, person_id, username, password_hash, role) VALUES
        ('u-admin', 'p-admin', 'admin', 'x', 'admin'), ('u-lead', 'p-lead', 'lead', 'x', 'shift_leader'), ('u-op', 'p-op', 'op', 'x', 'operator');
      INSERT INTO documents (scope, key, value) VALUES
        ('a', 'todos', '[{"id": "1", "text": "Från A"}]'), ('b', 'todos', '[{"id": "2", "text": "Från B"}]');
    `);
    await runMigrations(server.pool);
    const { rows } = await server.pool.query("SELECT scope, value FROM documents WHERE key = 'todos' ORDER BY scope");
    assert.deepEqual(rows.map(row => [row.scope, row.value.map(item => item.text)]), [
      ["user:u-admin", ["Från B"]],
      ["user:u-lead", ["Från A"]]
    ]);
  });
});
