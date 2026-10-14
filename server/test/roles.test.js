const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");

const WEEK = "2026-10-12";
const PASSWORD = "losenord123";

describe("roles and permissions", () => {
  let server;
  let admin, leader, operator, otherOperator;
  let dayShift, eveningShift;
  let leaderPerson, annaPerson, erikPerson, boPerson;

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    leader = server.client();
    operator = server.client();
    otherOperator = server.client();
  });

  after(async () => {
    await server?.close();
  });

  test("first admin is created with the setup code, only once", async () => {
    const wrong = await admin.post("/api/setup", { setupCode: "nope", name: "Ada Admin", username: "ada", password: PASSWORD });
    assert.equal(wrong.status, 403);
    const created = await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "Ada", password: PASSWORD });
    assert.equal(created.status, 201);
    assert.equal(created.data.user.role, "admin");
    assert.equal(created.data.user.username, "ada");
    const again = await server.client().post("/api/setup", { setupCode: SETUP_CODE, name: "Eve", username: "eve", password: PASSWORD });
    assert.equal(again.status, 409);
    assert.equal((await admin.get("/api/setup")).data.needsSetup, false);
  });

  test("requests without the app header are refused", async () => {
    const client = server.client();
    client.sendAppHeader = false;
    const result = await client.post("/api/login", { username: "ada", password: PASSWORD });
    assert.equal(result.status, 403);
  });

  test("wrong password is refused", async () => {
    const result = await server.client().post("/api/login", { username: "ada", password: "fel-losenord" });
    assert.equal(result.status, 401);
  });

  test("admin creates shifts, people and accounts", async () => {
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    assert.ok(dayShift.id && eveningShift.id);

    const createPerson = async (name, shiftId, account) => {
      const result = await admin.post("/api/people", { name, shiftId, account });
      assert.equal(result.status, 201, JSON.stringify(result.data));
      return result.data.person;
    };
    leaderPerson = await createPerson("Lisa Ledare", dayShift.id, { username: "lisa", password: PASSWORD, role: "shift_leader", mustChangePassword: false });
    annaPerson = await createPerson("Anna Operatör", dayShift.id, { username: "anna", password: PASSWORD, role: "operator", mustChangePassword: false });
    erikPerson = await createPerson("Erik Operatör", eveningShift.id, { username: "erik", password: PASSWORD, role: "operator", mustChangePassword: false });
    boPerson = await createPerson("Bo Utan Inlogg", dayShift.id);
    assert.equal(boPerson.account, null);
    assert.equal(leaderPerson.account.role, "shift_leader");

    await leader.login("lisa", PASSWORD);
    await operator.login("anna", PASSWORD);
    await otherOperator.login("erik", PASSWORD);
  });

  test("a shift leader needs a shift", async () => {
    const result = await admin.post("/api/people", { name: "Utan Skift", account: { username: "utan", password: PASSWORD, role: "shift_leader" } });
    assert.equal(result.status, 400);
  });

  test("shift leader manages staff only in their own shift", async () => {
    const all = await leader.get("/api/people");
    assert.equal(all.status, 200);
    assert.ok(all.data.people.some(person => person.id === erikPerson.id), "leader sees other shifts' staff");

    const own = await leader.post("/api/people", { name: "Ny I Dag", shiftId: dayShift.id });
    assert.equal(own.status, 201);
    assert.equal(own.data.person.shiftId, dayShift.id);
    const defaulted = await leader.post("/api/people", { name: "Utan Val" });
    assert.equal(defaulted.data.person.shiftId, dayShift.id, "new staff default to the leader's shift");
    assert.equal((await leader.post("/api/people", { name: "Fel Skift", shiftId: eveningShift.id })).status, 403);

    const withOperatorAccount = await leader.post("/api/people", {
      name: "Nils Ny", shiftId: dayShift.id, account: { username: "nils", password: PASSWORD, role: "operator" }
    });
    assert.equal(withOperatorAccount.status, 201);
    assert.equal(withOperatorAccount.data.person.account.mustChangePassword, true, "new accounts get a temporary password");
    const withLeaderAccount = await leader.post("/api/people", {
      name: "Inte Ledare", shiftId: dayShift.id, account: { username: "inteledare", password: PASSWORD, role: "shift_leader" }
    });
    assert.equal(withLeaderAccount.status, 403);
    assert.equal((await leader.post(`/api/people/${boPerson.id}/account`, { username: "bo", password: PASSWORD, role: "admin" })).status, 403);

    assert.equal((await leader.patch(`/api/people/${annaPerson.id}`, { availability: "vacation", company: "Bemanning AB" })).status, 200);
    assert.equal((await leader.patch(`/api/people/${erikPerson.id}`, { availability: "sick" })).status, 403);
    assert.equal((await leader.patch(`/api/people/${annaPerson.id}`, { shiftId: eveningShift.id })).status, 403);
  });

  test("shift leader cannot delete users or change roles", async () => {
    assert.equal((await leader.delete(`/api/people/${boPerson.id}`)).status, 403);
    assert.equal((await leader.delete(`/api/people/${annaPerson.id}/account`)).status, 403);
    assert.equal((await leader.patch(`/api/people/${annaPerson.id}/account`, { role: "shift_leader" })).status, 403);
    assert.equal((await leader.post("/api/shifts", { name: "Natt" })).status, 403);
  });

  test("shift leader resets passwords only for operators in their shift", async () => {
    assert.equal((await leader.patch(`/api/people/${erikPerson.id}/account`, { password: "tillfalligt1" })).status, 403);
    const reset = await leader.patch(`/api/people/${annaPerson.id}/account`, { password: "tillfalligt1" });
    assert.equal(reset.status, 200);
    assert.equal(reset.data.person.account.mustChangePassword, true);

    // Anna's old session is gone and she must pick a new password before anything else.
    assert.equal((await operator.get("/api/me")).status, 401);
    await operator.login("anna", "tillfalligt1");
    const me = await operator.get("/api/me");
    assert.equal(me.data.user.mustChangePassword, true);
    const blocked = await operator.get("/api/people");
    assert.equal(blocked.status, 403);
    assert.equal(blocked.data.code, "password_change_required");
    assert.equal((await operator.post("/api/me/password", { currentPassword: "tillfalligt1", newPassword: "short" })).status, 400);
    const changed = await operator.post("/api/me/password", { currentPassword: "tillfalligt1", newPassword: PASSWORD });
    assert.equal(changed.status, 200);
    assert.equal(changed.data.user.mustChangePassword, false);
    assert.equal((await operator.get("/api/people")).status, 200);
  });

  test("shift leader edits schedules only in their own shift but can read others", async () => {
    const schedule = { GD1: { Måndag: annaPerson.id } };
    assert.equal((await leader.put(`/api/documents/${dayShift.id}/schedule:${WEEK}`, { value: schedule, baseVersion: 0 })).status, 200);
    assert.equal((await leader.put(`/api/documents/${eveningShift.id}/schedule:${WEEK}`, { value: {}, baseVersion: 0 })).status, 403);
    assert.equal((await admin.put(`/api/documents/${eveningShift.id}/schedule:${WEEK}`, { value: { GD1: { Måndag: erikPerson.id } }, baseVersion: 0 })).status, 200);

    const otherShift = await leader.get(`/api/documents?scope=${eveningShift.id}&keys=schedule:${WEEK},breakPlan:${WEEK},todos`);
    assert.equal(otherShift.status, 200);
    assert.ok(otherShift.data.documents[`schedule:${WEEK}`], "leader reads other shifts' schedules");
    assert.deepEqual(otherShift.data.forbidden, ["todos"], "but not their to-do list");

    assert.equal((await leader.put(`/api/documents/${dayShift.id}/todos`, { value: [], baseVersion: 0 })).status, 200);
    assert.equal((await leader.put(`/api/documents/${dayShift.id}/breakPlan:${WEEK}`, { value: {}, baseVersion: 0 })).status, 200);
  });

  test("shift leader changes shared settings but not competence or assessments", async () => {
    assert.equal((await leader.put("/api/documents/global/appSettings", { value: { organizationName: "Fabriken" }, baseVersion: 0 })).status, 200);
    assert.equal((await leader.put("/api/documents/global/workItems", { value: [], baseVersion: 0 })).status, 200);
    assert.equal((await leader.put("/api/documents/global/machineSkills", { value: {}, baseVersion: 0 })).status, 403);
    assert.equal((await leader.put("/api/documents/global/assessments", { value: [], baseVersion: 0 })).status, 403);
    assert.equal((await leader.put("/api/documents/global/testResults", { value: {}, baseVersion: 0 })).status, 403);

    const reads = await leader.get("/api/documents?scope=global&keys=appSettings,machineSkills,machineRestrictions,assessments,testResults,safetySnapshots");
    assert.deepEqual(reads.data.forbidden.sort(), ["assessments", "safetySnapshots", "testResults"]);
  });

  test("operator only sees their own shift and edits only their own profile", async () => {
    const people = await otherOperator.get("/api/people");
    assert.equal(people.status, 200);
    const ids = people.data.people.map(person => person.id);
    assert.ok(ids.includes(erikPerson.id));
    assert.ok(!ids.includes(annaPerson.id), "no people from other shifts");
    const own = people.data.people.find(person => person.id === erikPerson.id);
    assert.ok(!own.limited && own.account.username === "erik");

    const ownShift = await otherOperator.get(`/api/documents?scope=${eveningShift.id}&keys=schedule:${WEEK},breakPlan:${WEEK},todos,productionRecords`);
    assert.ok(ownShift.data.documents[`schedule:${WEEK}`]);
    assert.deepEqual(ownShift.data.forbidden.sort(), ["productionRecords", "todos"]);
    const dayShiftRead = await otherOperator.get(`/api/documents?scope=${dayShift.id}&keys=schedule:${WEEK}`);
    assert.deepEqual(dayShiftRead.data.forbidden, [`schedule:${WEEK}`]);
    const global = await otherOperator.get("/api/documents?scope=global&keys=appSettings,workItems,machineSkills,assessments");
    assert.deepEqual(global.data.forbidden.sort(), ["assessments", "machineSkills"]);

    assert.equal((await otherOperator.put(`/api/documents/${eveningShift.id}/schedule:${WEEK}`, { value: {}, baseVersion: 1 })).status, 403);
    assert.equal((await otherOperator.put(`/api/documents/${eveningShift.id}/breakPlan:${WEEK}`, { value: {}, baseVersion: 0 })).status, 403);
    assert.equal((await otherOperator.put("/api/documents/global/appSettings", { value: {}, baseVersion: 1 })).status, 403);
    assert.equal((await otherOperator.post("/api/people", { name: "Smyg" })).status, 403);
    assert.equal((await otherOperator.patch(`/api/people/${annaPerson.id}`, { availability: "sick" })).status, 403);
    assert.equal((await otherOperator.get("/api/audit?scopes=global," + eveningShift.id)).data.events.length, 0);
    assert.equal((await otherOperator.get("/api/admin/export")).status, 403);
    assert.equal((await otherOperator.get("/api/work-items/usage?name=GD1")).status, 403);
  });

  test("operator updates own status, name and phone but nothing else", async () => {
    const updated = await otherOperator.patch("/api/me", { availability: "sick", phone: "070-123 45 67", name: "Erik E" });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.person.availability, "sick");
    assert.equal(updated.data.person.phone, "070-123 45 67");
    assert.equal((await otherOperator.patch("/api/me", { company: "Annat AB" })).status, 403);
    assert.equal((await otherOperator.patch(`/api/people/${erikPerson.id}`, { shiftId: dayShift.id })).status, 403);
    assert.equal((await otherOperator.patch(`/api/people/${erikPerson.id}/account`, { role: "admin" })).status, 403);

    // The change shows up for the admin, with an audit entry for the shift.
    const audit = await admin.get(`/api/audit?scopes=${eveningShift.id}&since=2000-01-01T00:00:00Z`);
    assert.ok(audit.data.events.some(event => event.title === "Erik E: Sjuk"));
    assert.equal((await leader.get(`/api/audit?scopes=${eveningShift.id}`)).data.events.length, 0, "leaders only see their own shift's log");
  });

  test("operator can change their own password", async () => {
    assert.equal((await otherOperator.post("/api/me/password", { currentPassword: "fel", newPassword: "nyttlosen1" })).status, 400);
    assert.equal((await otherOperator.post("/api/me/password", { currentPassword: PASSWORD, newPassword: "nyttlosen1" })).status, 200);
    await server.client().login("erik", "nyttlosen1");
  });

  test("concurrent edits of the same document are detected", async () => {
    const key = `/api/documents/${dayShift.id}/schedulePriorityLines:${WEEK}`;
    const first = await leader.put(key, { value: ["GD1"], baseVersion: 0 });
    assert.equal(first.status, 200);
    assert.equal((await admin.put(key, { value: ["GD2"], baseVersion: first.data.version })).status, 200);
    const stale = await leader.put(key, { value: ["GD3"], baseVersion: first.data.version });
    assert.equal(stale.status, 409);
    assert.deepEqual(stale.data.current.value, ["GD2"]);
  });

  test("renaming a machine updates every shift", async () => {
    assert.equal((await leader.get("/api/work-items/usage?name=GD1")).data.count, 2);
    assert.equal((await leader.post("/api/work-items/rename", { from: "GD1", to: "GD-1" })).status, 200);
    const day = await admin.get(`/api/documents?scope=${dayShift.id}&keys=schedule:${WEEK}`);
    const evening = await admin.get(`/api/documents?scope=${eveningShift.id}&keys=schedule:${WEEK}`);
    assert.ok(day.data.documents[`schedule:${WEEK}`].value["GD-1"]);
    assert.ok(evening.data.documents[`schedule:${WEEK}`].value["GD-1"]);
  });

  test("moving someone to another shift clears them from the old shift from this week on", async () => {
    const { currentWeekKey } = require("../store");
    const thisWeek = currentWeekKey();
    const mover = (await admin.post("/api/people", { name: "Flytt Person", shiftId: dayShift.id })).data.person;
    const place = async week => {
      const existing = (await admin.get(`/api/documents?scope=${dayShift.id}&keys=schedule:${week}`)).data.documents[`schedule:${week}`];
      const value = { ...(existing?.value || {}), GD4: { Fredag: mover.id } };
      const saved = await admin.put(`/api/documents/${dayShift.id}/schedule:${week}`, { value, baseVersion: existing?.version || 0 });
      assert.equal(saved.status, 200);
    };
    await place(thisWeek);
    await place("2020-01-06");
    assert.equal((await admin.patch(`/api/people/${mover.id}`, { shiftId: eveningShift.id })).status, 200);
    const docs = await admin.get(`/api/documents?scope=${dayShift.id}&keys=schedule:${thisWeek},schedule:2020-01-06`);
    assert.equal(docs.data.documents[`schedule:${thisWeek}`].value.GD4.Fredag, "");
    assert.equal(docs.data.documents["schedule:2020-01-06"].value.GD4.Fredag, mover.id, "history is kept");
  });

  test("only admin deletes people, which removes them everywhere", async () => {
    await admin.put("/api/documents/global/machineSkills", { value: { [annaPerson.id]: ["GD"] }, baseVersion: 0 });
    assert.equal((await admin.delete(`/api/people/${annaPerson.id}`)).status, 200);
    const docs = await admin.get(`/api/documents?scope=${dayShift.id}&keys=schedule:${WEEK}`);
    assert.equal(docs.data.documents[`schedule:${WEEK}`].value["GD-1"].Måndag, "");
    const skills = await admin.get("/api/documents?scope=global&keys=machineSkills");
    assert.deepEqual(skills.data.documents.machineSkills.value, {});
    assert.equal((await server.client().post("/api/login", { username: "anna", password: PASSWORD })).status, 401);
  });

  test("the last admin and one's own account cannot be removed", async () => {
    const adminMe = await admin.get("/api/me");
    assert.equal((await admin.delete(`/api/people/${adminMe.data.person.id}`)).status, 400);
    assert.equal((await admin.delete(`/api/people/${adminMe.data.person.id}/account`)).status, 400);
    assert.equal((await admin.patch(`/api/people/${adminMe.data.person.id}/account`, { role: "operator" })).status, 400);
  });

  test("admin manages any profile, including the username", async () => {
    const nils = (await admin.get("/api/people")).data.people.find(person => person.account?.username === "nils");
    const updated = await admin.patch(`/api/people/${nils.id}`, { name: "Nils Nyman", phone: "070-000 00 00", availability: "vacation", shiftId: eveningShift.id });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.person.availability, "vacation");
    assert.equal(updated.data.person.shiftId, eveningShift.id);
    assert.equal((await leader.patch(`/api/people/${nils.id}/account`, { username: "nils.n" })).status, 403);
    const renamed = await admin.patch(`/api/people/${nils.id}/account`, { username: "Nils.Nyman" });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.data.person.account.username, "nils.nyman");
    assert.equal((await admin.patch(`/api/people/${nils.id}/account`, { username: "ada" })).status, 409, "usernames stay unique");
  });

  test("admin changes roles and removes logins", async () => {
    const promoted = await admin.patch(`/api/people/${erikPerson.id}/account`, { role: "shift_leader" });
    assert.equal(promoted.status, 200);
    assert.equal(promoted.data.person.account.role, "shift_leader");
    const removed = await admin.delete(`/api/people/${erikPerson.id}/account`);
    assert.equal(removed.status, 200);
    assert.equal(removed.data.person.account, null);
    assert.equal((await otherOperator.get("/api/me")).status, 401);
  });

  test("a shift with a leader cannot be deleted", async () => {
    assert.equal((await admin.delete(`/api/shifts/${dayShift.id}`)).status, 400);
  });

  test("admin export and import round-trip", async () => {
    const exported = await admin.get("/api/admin/export");
    assert.equal(exported.status, 200);
    assert.ok(!JSON.stringify(exported.data).includes("scrypt$"), "no password hashes in backups");
    const before = await admin.get("/api/documents?scope=global&keys=appSettings");
    const changed = await admin.put("/api/documents/global/appSettings", {
      value: { organizationName: "Ändrad" }, baseVersion: before.data.documents.appSettings.version
    });
    assert.equal(changed.status, 200);
    const imported = await admin.post("/api/admin/import", exported.data);
    assert.equal(imported.status, 200, JSON.stringify(imported.data));
    const settings = await admin.get("/api/documents?scope=global&keys=appSettings");
    assert.equal(settings.data.documents.appSettings.value.organizationName, "Fabriken");
    assert.equal((await leader.post("/api/admin/import", exported.data)).status, 403);
  });

  test("admin imports data from the old local version into a shift", async () => {
    const result = await admin.post("/api/admin/import-legacy", {
      shiftId: eveningShift.id,
      people: [{ id: "legacy-1", name: "Gammal Person", company: "AB", availability: "vab" }],
      global: { machineSkills: { "legacy-1": ["GD"] }, notAKey: 1 },
      shift: { [`schedule:${WEEK}`]: { GD2: { Tisdag: "legacy-1" } }, "breakPlan:bad": {} }
    });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal(result.data.people, 1);
    assert.equal(result.data.documents, 2);
    const people = await admin.get("/api/people");
    const legacy = people.data.people.find(person => person.id === "legacy-1");
    assert.equal(legacy.shiftId, eveningShift.id);
    assert.equal(legacy.availability, "vab");
  });

  test("logout ends the session", async () => {
    assert.equal((await leader.post("/api/logout")).status, 200);
    assert.equal((await leader.get("/api/me")).status, 401);
  });
});
