const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");

const WEEK = "2026-10-12";
const PASSWORD = "losenord123";

describe("shift leader backup", () => {
  let server, admin, leader, rightHand, operator;
  let dayShift, eveningShift;
  let annaPerson, erikPerson;

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    leader = server.client();
    rightHand = server.client();
    operator = server.client();
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const createPerson = async (name, shiftId, username, role) => (await admin.post("/api/people", {
      name, shiftId, account: { username, password: PASSWORD, role, mustChangePassword: false }
    })).data.person;
    await createPerson("Lisa Ledare", dayShift.id, "lisa", "shift_leader");
    await createPerson("Hanna Hand", dayShift.id, "hanna", "right_hand");
    annaPerson = await createPerson("Anna Operatör", dayShift.id, "anna", "operator");
    erikPerson = await createPerson("Erik Operatör", eveningShift.id, "erik", "operator");
    await leader.login("lisa", PASSWORD);
    await rightHand.login("hanna", PASSWORD);
    await operator.login("anna", PASSWORD);

    const put = (scope, key, value) => admin.put(`/api/documents/${scope}/${encodeURIComponent(key)}`, { value, baseVersion: 0 });
    await put(dayShift.id, `schedule:${WEEK}`, { GD1: { Måndag: annaPerson.id } });
    await put(eveningShift.id, `schedule:${WEEK}`, { GD1: { Måndag: erikPerson.id } });
    await put("global", "machineSkills", { [annaPerson.id]: ["GD"], [erikPerson.id]: ["Packa"] });
    await put("global", "testResults", { [annaPerson.id]: { GD: 3 }, [erikPerson.id]: { GD: 1 } });
    await put("global", "appSettings", { organizationName: "Fabriken" });
  });

  after(async () => {
    await server?.close();
  });

  test("a shift leader exports only their own shift", async () => {
    const { status, data } = await leader.get("/api/backup/shift");
    assert.equal(status, 200);
    assert.equal(data.kind, "shift");
    assert.equal(data.shiftId, dayShift.id);
    assert.deepEqual(data.shifts.map(shift => shift.id), [dayShift.id]);
    assert.ok(data.people.every(person => person.shiftId === dayShift.id), "no one from another shift");
    assert.ok(data.people.some(person => person.id === annaPerson.id));
    assert.ok(data.people.every(person => !("password" in person) && !("passwordHash" in person)));
    assert.ok(data.documents.every(doc => doc.scope === dayShift.id || doc.scope === "global"), "no other shift's documents");
    const doc = key => data.documents.find(item => item.key === key)?.value;
    assert.deepEqual(doc(`schedule:${WEEK}`), { GD1: { Måndag: annaPerson.id } });
    assert.deepEqual(doc("machineSkills"), { [annaPerson.id]: ["GD"] }, "competence only for the shift's people");
    assert.deepEqual(doc("testResults"), { [annaPerson.id]: { GD: 3 } }, "test results only for people the leader evaluates");
    assert.equal(doc("appSettings").organizationName, "Fabriken");
    assert.ok(!data.documents.some(item => ["safetySnapshots", "workItemTrash", "todos"].includes(item.key)));
  });

  test("the export is logged in the shift's changes", async () => {
    const { data } = await leader.get(`/api/audit?scopes=${dayShift.id}`);
    assert.ok(data.events.some(event => event.title === "Backup av skiftet exporterad"));
  });

  test("only shift leaders may export a shift backup, and they cannot export or import everything", async () => {
    assert.equal((await rightHand.get("/api/backup/shift")).status, 403);
    assert.equal((await operator.get("/api/backup/shift")).status, 403);
    assert.equal((await admin.get("/api/backup/shift")).status, 403, "admins use the full backup");
    assert.equal((await leader.get("/api/admin/export")).status, 403);
    assert.equal((await leader.post("/api/admin/import", {})).status, 403);
  });

  test("a shift backup cannot be imported", async () => {
    const backup = (await leader.get("/api/backup/shift")).data;
    const result = await admin.post("/api/admin/import", backup);
    assert.equal(result.status, 400);
    const skills = (await admin.get("/api/documents?scope=global&keys=machineSkills")).data.documents.machineSkills.value;
    assert.deepEqual(skills[erikPerson.id], ["Packa"], "other shifts' competence is untouched");
  });
});
