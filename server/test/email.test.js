const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");

const WEEK = "2026-10-12";
const PASSWORD = "losenord123";

describe("e-mail when a schedule is shared", () => {
  let server;
  let admin, leader, operator;
  let dayShift, eveningShift;
  let annaPerson;
  const sent = [];
  const mailer = {
    configured: true,
    async send(mail) {
      if (mail.to === "trasig@example.com") throw new Error("rejected");
      sent.push(mail);
      return true;
    }
  };

  before(async () => {
    server = await startTestServer({ mailer, appUrl: "https://planner.example.com" });
    admin = server.client();
    leader = server.client();
    operator = server.client();
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const create = async body => (await admin.post("/api/people", body)).data.person;
    const account = (username, role = "operator") => ({ username, password: PASSWORD, role, mustChangePassword: false });
    await create({ name: "Lisa Ledare", shiftId: dayShift.id, email: "lisa@example.com", account: account("lisa", "shift_leader") });
    annaPerson = await create({ name: "Anna Operatör", shiftId: dayShift.id, account: account("anna") });
    await create({ name: "Cia Operatör", shiftId: dayShift.id, email: "cia@example.com", account: account("cia") });
    await create({ name: "Bo Utan Inlogg", shiftId: dayShift.id, email: "bo@example.com" });
    await create({ name: "Erik Kväll", shiftId: eveningShift.id, email: "erik@example.com", account: account("erik") });
    await leader.login("lisa", PASSWORD);
    await operator.login("anna", PASSWORD);
  });

  after(async () => {
    await server?.close();
  });

  test("operators set their own e-mail address, and it must be valid", async () => {
    assert.equal((await operator.patch("/api/me", { email: "inte-en-adress" })).status, 400);
    const saved = await operator.patch("/api/me", { email: " Anna@Example.com " });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.person.email, "anna@example.com");
  });

  test("the shift leader can set an operator's e-mail address", async () => {
    const result = await leader.patch(`/api/people/${annaPerson.id}`, { email: "anna@example.com" });
    assert.equal(result.status, 200);
    assert.equal(result.data.person.email, "anna@example.com");
  });

  test("sharing a week e-mails the shift's operators with an address", async () => {
    const result = await leader.put(`/api/documents/${dayShift.id}/scheduleShared:${WEEK}`, { value: { shared: true }, baseVersion: 0 });
    assert.equal(result.status, 200);
    assert.deepEqual(result.data.notified, { sent: 2, failed: 0, configured: true });
    assert.deepEqual(sent.map(mail => mail.to).sort(), ["anna@example.com", "cia@example.com"]);
    assert.equal(sent[0].subject, "Schemat för vecka 42 finns nu");
    assert.match(sent[0].text, /https:\/\/planner\.example\.com/);
    assert.match(sent[0].text, /Logga in/);
  });

  test("saving the shared week again does not send again, sharing after unsharing does", async () => {
    sent.length = 0;
    const key = `/api/documents/${dayShift.id}/scheduleShared:${WEEK}`;
    const again = await leader.put(key, { value: { shared: true, note: "x" }, baseVersion: 1 });
    assert.equal(again.data.notified, undefined);
    const unshared = await leader.put(key, { value: { shared: false }, baseVersion: 2 });
    assert.equal(unshared.data.notified, undefined);
    assert.equal(sent.length, 0);
    const reshared = await leader.put(key, { value: { shared: true }, baseVersion: 3 });
    assert.equal(reshared.data.notified.sent, 2);
  });

  test("a failed mail is reported but the week is still shared", async () => {
    sent.length = 0;
    await admin.patch(`/api/people/${annaPerson.id}`, { email: "trasig@example.com" });
    const result = await admin.put(`/api/documents/${dayShift.id}/scheduleShared:2026-10-19`, { value: { shared: true }, baseVersion: 0 });
    assert.equal(result.status, 200);
    assert.deepEqual(result.data.notified, { sent: 1, failed: 1, configured: true });
  });

  test("backups keep e-mail addresses", async () => {
    const backup = (await admin.get("/api/admin/export")).data;
    assert.equal(backup.people.find(person => person.id === annaPerson.id).email, "trasig@example.com");
    await admin.patch(`/api/people/${annaPerson.id}`, { email: "" });
    assert.equal((await admin.post("/api/admin/import", backup)).status, 200);
    const { data } = await admin.get("/api/people");
    assert.equal(data.people.find(person => person.id === annaPerson.id).email, "trasig@example.com");
  });
});
