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
    const same = await admin.patch(`/api/shifts/${created.data.shift.id}`, { name: "Natten", color: "purple" });
    assert.equal(same.status, 200, "a shift may keep its own color");
    const recolored = await admin.patch(`/api/shifts/${created.data.shift.id}`, { name: "Natten", color: "" });
    assert.equal(recolored.data.shift.color, "");
    assert.equal((await admin.post("/api/shifts", { name: "Rosa", color: "pink" })).status, 400);
    await admin.delete(`/api/shifts/${created.data.shift.id}`);
  });

  test("each color belongs to one shift", async () => {
    const taken = await admin.post("/api/shifts", { name: "Natt", color: "red" });
    assert.equal(taken.status, 409);
    assert.match(taken.data.error, /röd används redan av skiftet Röd/);
    const natt = (await admin.post("/api/shifts", { name: "Natt", color: "green" })).data.shift;
    const helg = (await admin.post("/api/shifts", { name: "Helg", color: "orange" })).data.shift;
    assert.equal((await admin.patch(`/api/shifts/${helg.id}`, { name: "Helg", color: "green" })).status, 409);
    await admin.patch(`/api/shifts/${natt.id}`, { name: "Natt", color: "" });
    assert.equal((await admin.patch(`/api/shifts/${helg.id}`, { name: "Helg", color: "green" })).data.shift.color, "green", "a freed color can be picked");
    await assert.rejects(server.pool.query("UPDATE shifts SET color = 'green' WHERE id = $1", [natt.id]), "the database keeps colors unique too");
    await admin.delete(`/api/shifts/${natt.id}`);
    await admin.delete(`/api/shifts/${helg.id}`);
  });

  test("a new shift named after a free color gets that color", async () => {
    const created = await admin.post("/api/shifts", { name: "Grön" });
    assert.equal(created.data.shift.color, "green");
    const taken = await admin.post("/api/shifts", { name: "Gul" });
    assert.equal(taken.status, 201);
    assert.equal(taken.data.shift.color, "", "yellow already belongs to the Gul shift");
    const none = await admin.post("/api/shifts", { name: "Lila", color: "" });
    assert.equal(none.data.shift.color, "", "choosing no color is respected");
    for (const shift of [created, taken, none]) await admin.delete(`/api/shifts/${shift.data.shift.id}`);
  });

  test("backups keep shift colors, also when shifts have swapped them", async () => {
    const backup = (await admin.get("/api/admin/export")).data;
    const red = backup.shifts.find(shift => shift.name === "Röd");
    const blue = backup.shifts.find(shift => shift.name === "Blå");
    assert.equal(red.color, "red");
    await admin.patch(`/api/shifts/${red.id}`, { name: "Röd", color: "" });
    await admin.patch(`/api/shifts/${blue.id}`, { name: "Blå", color: "red" });
    await admin.patch(`/api/shifts/${red.id}`, { name: "Röd", color: "blue" });
    assert.equal((await admin.post("/api/admin/import", backup)).status, 200);
    const { data } = await admin.get("/api/shifts");
    assert.equal(data.shifts.find(shift => shift.id === red.id).color, "red");
    assert.equal(data.shifts.find(shift => shift.id === blue.id).color, "blue");
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

  test("shifts with a color other than red, blue or yellow lose it", async () => {
    await server.pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await server.pool.query("CREATE TABLE schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const name of fs.readdirSync(path.join(__dirname, "../migrations")).filter(file => file < "006").sort()) {
      await server.pool.query(fs.readFileSync(path.join(__dirname, "../migrations", name), "utf8"));
      await server.pool.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
    }
    await server.pool.query("INSERT INTO shifts (id, name, color, sort_order) VALUES ('natt', 'Natt', 'purple', 9), ('helg', 'Helg', 'green', 10)");
    await runMigrations(server.pool);
    const { rows } = await server.pool.query("SELECT name, color FROM shifts ORDER BY sort_order");
    assert.deepEqual(rows.map(row => [row.name, row.color]), [["Röd", "red"], ["Blå", "blue"], ["Gul", "yellow"], ["Natt", ""], ["Helg", ""]]);
    await assert.rejects(server.pool.query("UPDATE shifts SET color = 'pink' WHERE id = 'natt'"));
  });

  test("shifts that share a color keep it only for the first", async () => {
    await server.pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await server.pool.query("CREATE TABLE schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const name of fs.readdirSync(path.join(__dirname, "../migrations")).filter(file => file < "009").sort()) {
      await server.pool.query(fs.readFileSync(path.join(__dirname, "../migrations", name), "utf8"));
      await server.pool.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
    }
    await server.pool.query("INSERT INTO shifts (id, name, color, sort_order) VALUES ('natt', 'Natt', 'red', 9), ('helg', 'Helg', 'blue', 10)");
    await runMigrations(server.pool);
    const { rows } = await server.pool.query("SELECT name, color FROM shifts ORDER BY sort_order");
    assert.deepEqual(rows.map(row => [row.name, row.color]), [["Röd", "red"], ["Blå", "blue"], ["Gul", "yellow"], ["Natt", ""], ["Helg", ""]]);
  });
});
