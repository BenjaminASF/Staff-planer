const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");

const WEEK = "2026-10-12";
const PASSWORD = "losenord123";

describe("right hand", () => {
  let server, admin, leader, rightHand;
  let dayShift, eveningShift;
  let leaderPerson, annaPerson, erikPerson;

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    leader = server.client();
    rightHand = server.client();
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const createPerson = async (name, shiftId, username, role) => (await admin.post("/api/people", {
      name, shiftId, account: { username, password: PASSWORD, role, mustChangePassword: false }
    })).data.person;
    leaderPerson = await createPerson("Lisa Ledare", dayShift.id, "lisa", "shift_leader");
    await createPerson("Hanna Hand", dayShift.id, "hanna", "right_hand");
    annaPerson = await createPerson("Anna Operatör", dayShift.id, "anna", "operator");
    erikPerson = await createPerson("Erik Operatör", eveningShift.id, "erik", "operator");
    await leader.login("lisa", PASSWORD);
    await rightHand.login("hanna", PASSWORD);
  });

  after(async () => {
    await server?.close();
  });

  test("a right hand needs a shift and only admins hand out the role", async () => {
    const withoutShift = await admin.post("/api/people", { name: "Utan Skift", account: { username: "utan", password: PASSWORD, role: "right_hand" } });
    assert.equal(withoutShift.status, 400);
    const byLeader = await leader.post("/api/people", { name: "Ny Hand", account: { username: "nyhand", password: PASSWORD, role: "right_hand" } });
    assert.equal(byLeader.status, 403);
    assert.equal((await admin.patch(`/api/people/${annaPerson.id}/account`, { role: "right_hand" })).status, 200);
    assert.equal((await admin.patch(`/api/people/${annaPerson.id}`, { shiftId: null })).status, 400, "cannot leave the shift");
    assert.equal((await admin.patch(`/api/people/${annaPerson.id}/account`, { role: "operator" })).status, 200);
    assert.equal((await admin.delete(`/api/shifts/${dayShift.id}`)).status, 400);
  });

  test("edits the schedule only in their own shift and does not read other shifts", async () => {
    const schedule = { GD1: { Måndag: annaPerson.id } };
    assert.equal((await rightHand.put(`/api/documents/${dayShift.id}/schedule:${WEEK}`, { value: schedule, baseVersion: 0 })).status, 200);
    assert.equal((await rightHand.put(`/api/documents/${dayShift.id}/breakPlan:${WEEK}`, { value: {}, baseVersion: 0 })).status, 200);
    assert.equal((await rightHand.put(`/api/documents/${dayShift.id}/scheduleShared:${WEEK}`, { value: { shared: true }, baseVersion: 0 })).status, 200);
    assert.equal((await rightHand.put(`/api/documents/${eveningShift.id}/schedule:${WEEK}`, { value: {}, baseVersion: 0 })).status, 403);

    const own = await rightHand.get(`/api/documents?scope=${dayShift.id}&keys=schedule:${WEEK},scheduleTemplates`);
    assert.deepEqual(own.data.documents[`schedule:${WEEK}`].value, schedule);
    assert.deepEqual(own.data.forbidden, []);
    const other = await rightHand.get(`/api/documents?scope=${eveningShift.id}&keys=schedule:${WEEK}`);
    assert.deepEqual(other.data.forbidden, [`schedule:${WEEK}`]);
  });

  test("adds and manages operators in their own shift only", async () => {
    const added = await rightHand.post("/api/people", { name: "Nils Ny", account: { username: "nils", password: PASSWORD, role: "operator" } });
    assert.equal(added.status, 201);
    assert.equal(added.data.person.shiftId, dayShift.id);
    assert.equal((await rightHand.post("/api/people", { name: "Fel Skift", shiftId: eveningShift.id })).status, 403);
    assert.equal((await rightHand.post("/api/people", { name: "Ledare", account: { username: "ledare2", password: PASSWORD, role: "shift_leader" } })).status, 403);

    assert.equal((await rightHand.patch(`/api/people/${annaPerson.id}`, { availability: "sick" })).status, 200);
    assert.equal((await rightHand.patch(`/api/people/${annaPerson.id}/account`, { password: "tillfalligt1" })).status, 200);
    assert.equal((await rightHand.patch(`/api/people/${erikPerson.id}`, { availability: "sick" })).status, 403);
    assert.equal((await rightHand.patch(`/api/people/${leaderPerson.id}`, { phone: "070-1" })).status, 403, "not the shift leader");
    assert.equal((await rightHand.patch(`/api/people/${annaPerson.id}/account`, { role: "shift_leader" })).status, 403);
    assert.equal((await rightHand.delete(`/api/people/${annaPerson.id}`)).status, 403);
  });

  test("reads and writes chat messages", async () => {
    assert.equal((await leader.post("/api/chat/messages", { text: "Jag är borta i morgon" })).status, 201);
    const messages = await rightHand.get("/api/chat/messages");
    assert.equal(messages.status, 200);
    assert.ok(messages.data.messages.some(message => message.text === "Jag är borta i morgon"));
    assert.equal((await rightHand.post("/api/chat/messages", { text: "Jag tar skiftet" })).status, 201);
  });

  test("records production and the factory record, but not the daily target", async () => {
    const records = { "2026-10-15": { date: "2026-10-15", target: 160, total: 200, machines: {} } };
    assert.equal((await rightHand.put(`/api/documents/${dayShift.id}/productionRecords`, { value: records, baseVersion: 0 })).status, 200);
    assert.equal((await rightHand.put(`/api/documents/${eveningShift.id}/productionRecords`, { value: records, baseVersion: 0 })).status, 403);

    const settings = { dailyTarget: 160, targetChanges: {}, factoryRecord: 200, recordDate: "2026-10-15", recordPrevious: 0 };
    const recordSaved = await rightHand.put("/api/documents/global/productionSettings", { value: settings, baseVersion: 0 });
    assert.equal(recordSaved.status, 200, "a new factory record is saved");

    const newTarget = { ...settings, targetChanges: { "2026-10-15": 180 } };
    const refused = await rightHand.put("/api/documents/global/productionSettings", { value: newTarget, baseVersion: recordSaved.data.version });
    assert.equal(refused.status, 403);
    assert.equal((await rightHand.put("/api/documents/global/productionSettings", { value: { ...settings, dailyTarget: 150 }, baseVersion: recordSaved.data.version })).status, 403);
    assert.equal((await leader.put("/api/documents/global/productionSettings", { value: newTarget, baseVersion: recordSaved.data.version })).status, 200);
  });

  test("does not change shared machines or settings", async () => {
    assert.equal((await rightHand.put("/api/documents/global/appSettings", { value: {}, baseVersion: 0 })).status, 403);
    assert.equal((await rightHand.put("/api/documents/global/workItems", { value: [], baseVersion: 0 })).status, 403);
    assert.equal((await rightHand.put("/api/documents/global/machineSkills", { value: {}, baseVersion: 0 })).status, 403);
    assert.equal((await rightHand.post("/api/work-items/rename", { from: "GD1", to: "GD9" })).status, 403);
    const reads = await rightHand.get("/api/documents?scope=global&keys=appSettings,machineSkills,workItemTrash,assessments");
    assert.deepEqual(reads.data.forbidden.sort(), ["assessments", "workItemTrash"]);
  });
});
