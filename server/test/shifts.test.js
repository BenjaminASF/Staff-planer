const fs = require("node:fs");
const path = require("node:path");
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");
const { runMigrations } = require("../db");

const PASSWORD = "losenord123";

describe("shift colors", () => {
  let server;
  let admin;

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
  });

  after(async () => {
    await server?.close();
  });

  test("the Red, Blue and Yellow shifts exist with their colors", async () => {
    const { data } = await admin.get("/api/shifts");
    assert.deepEqual(data.shifts.map(shift => [shift.name, shift.color]), [["Röd", "red"], ["Blå", "blue"], ["Gul", "yellow"]]);
    const me = await admin.get("/api/me");
    assert.equal(me.data.shifts[0].color, "red");
  });

  test("admin sets and changes a shift's color", async () => {
    const created = await admin.post("/api/shifts", { name: "Natt", color: "purple" });
    assert.equal(created.status, 201);
    assert.equal(created.data.shift.color, "purple");
    const renamed = await admin.patch(`/api/shifts/${created.data.shift.id}`, { name: "Natten" });
    assert.equal(renamed.data.shift.color, "purple", "color is kept when not sent");
    const recolored = await admin.patch(`/api/shifts/${created.data.shift.id}`, { name: "Natten", color: "" });
    assert.equal(recolored.data.shift.color, "");
    assert.equal((await admin.post("/api/shifts", { name: "Rosa", color: "pink" })).status, 400);
  });

  test("a new shift named after a color gets that color", async () => {
    const created = await admin.post("/api/shifts", { name: "Grön" });
    assert.equal(created.data.shift.color, "green");
  });

  test("backups keep shift colors", async () => {
    const backup = (await admin.get("/api/admin/export")).data;
    const red = backup.shifts.find(shift => shift.name === "Röd");
    assert.equal(red.color, "red");
    await admin.patch(`/api/shifts/${red.id}`, { name: "Röd", color: "orange" });
    assert.equal((await admin.post("/api/admin/import", backup)).status, 200);
    const { data } = await admin.get("/api/shifts");
    assert.equal(data.shifts.find(shift => shift.id === red.id).color, "red");
  });

  test("existing shifts with the names get colors instead of duplicates", async () => {
    await server.pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await server.pool.query("CREATE TABLE schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    await server.pool.query("INSERT INTO schema_migrations (name) VALUES ('001_init.sql')");
    await server.pool.query(fs.readFileSync(path.join(__dirname, "../migrations/001_init.sql"), "utf8"));
    await server.pool.query("INSERT INTO shifts (id, name, sort_order) VALUES ('dag', 'Dag', 1), ('rod', 'röd', 2)");
    await runMigrations(server.pool);
    const { rows } = await server.pool.query("SELECT name, color FROM shifts ORDER BY sort_order");
    assert.deepEqual(rows.map(row => [row.name, row.color]), [["Dag", ""], ["röd", "red"], ["Blå", "blue"], ["Gul", "yellow"]]);
  });
});
