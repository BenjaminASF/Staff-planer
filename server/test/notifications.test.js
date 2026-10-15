const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, openStream, SETUP_CODE } = require("./helpers");

const PASSWORD = "losenord123";
const todo = (text, sharedWith) => ({ id: text, text, createdAt: "2026-10-14T08:00:00.000Z", createdWeek: "2026-10-12", completedAt: "", completedDay: "", ...(sharedWith ? { sharedWith } : {}) });

describe("notifications", () => {
  let server, admin, leader, rightHand, otherLeader, operator;
  let adminUser, leaderUser, rightHandUser, otherLeaderUser, operatorUser;
  let dayShift, eveningShift, operatorPerson;

  before(async () => {
    server = await startTestServer();
    [admin, leader, rightHand, otherLeader, operator] = Array.from({ length: 5 }, () => server.client());
    adminUser = (await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD })).data.user;
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const createPerson = async (name, shiftId, username, role) => (await admin.post("/api/people", {
      name, shiftId, account: { username, password: PASSWORD, role, mustChangePassword: false }
    })).data.person;
    await createPerson("Lisa Ledare", dayShift.id, "lisa", "shift_leader");
    await createPerson("Hanna Hand", dayShift.id, "hanna", "right_hand");
    await createPerson("Kalle Kväll", eveningShift.id, "kalle", "shift_leader");
    operatorPerson = await createPerson("Olle Operatör", dayShift.id, "olle", "operator");
    leaderUser = (await leader.login("lisa", PASSWORD)).user;
    rightHandUser = (await rightHand.login("hanna", PASSWORD)).user;
    otherLeaderUser = (await otherLeader.login("kalle", PASSWORD)).user;
    operatorUser = (await operator.login("olle", PASSWORD)).user;
  });

  after(async () => {
    await server?.close();
  });

  const notes = async client => (await client.get("/api/notifications")).data;
  const clearAll = async () => Promise.all([admin, leader, rightHand, otherLeader, operator].map(client => client.delete("/api/notifications")));

  test("an admin's change in a shift reaches that shift's leader and right hand", async () => {
    await clearAll();
    const leaderStream = await openStream(server, leader);
    const otherStream = await openStream(server, otherLeader);
    try {
      await leaderStream.waitFor(event => event.type === "ready");
      await otherStream.waitFor(event => event.type === "ready");
      assert.equal((await admin.post("/api/audit", { scope: dayShift.id, type: "schedule", title: "GD1 · Måndag", detail: "Olle schemalagd" })).status, 201);
      await leaderStream.waitFor(event => event.data.type === "notification");

      for (const client of [leader, rightHand]) {
        const { notifications, unread } = await notes(client);
        assert.equal(unread, 1);
        assert.deepEqual(notifications.map(({ kind, actorName, title, detail, read }) => ({ kind, actorName, title, detail, read })), [
          { kind: "adminChange", actorName: "Ada Admin", title: "GD1 · Måndag", detail: "Olle schemalagd", read: false }
        ]);
      }
      assert.equal((await notes(otherLeader)).unread, 0, "another shift is not told");
      assert.ok(!otherStream.events.some(event => event.data.type === "notification"), "nobody else hears about the note");
      assert.equal((await notes(admin)).unread, 0, "admins are not told about their own changes");
      assert.equal((await notes(operator)).unread, 0, "operators are not told");
    } finally {
      leaderStream.close();
      otherStream.close();
    }
  });

  test("shared settings changed by an admin reach every leader and right hand", async () => {
    await clearAll();
    await admin.post("/api/audit", { scope: "global", type: "settings", title: "Inställningar uppdaterade", detail: "Fabriken" });
    for (const client of [leader, rightHand, otherLeader]) assert.equal((await notes(client)).unread, 1);
    await admin.post("/api/audit", { scope: "global", type: "backup", title: "Backup exporterad" });
    assert.equal((await notes(leader)).unread, 1, "an export is not a change");
  });

  test("changes made by a shift leader do not notify", async () => {
    await clearAll();
    await leader.post("/api/audit", { scope: dayShift.id, type: "schedule", title: "GD1 · Tisdag" });
    assert.equal((await notes(rightHand)).unread, 0);
  });

  test("an admin changing someone's status is noted for the shift", async () => {
    await clearAll();
    assert.equal((await admin.patch(`/api/people/${operatorPerson.id}`, { availability: "off" })).status, 200);
    const { notifications } = await notes(leader);
    assert.equal(notifications[0]?.title, "Olle Operatör: Ledig");
  });

  test("notes are marked as read", async () => {
    await clearAll();
    await admin.post("/api/audit", { scope: dayShift.id, type: "schedule", title: "Veckoschema skapat" });
    assert.equal((await leader.post("/api/notifications/read", {})).status, 200);
    const { notifications, unread } = await notes(leader);
    assert.equal(unread, 0);
    assert.equal(notifications[0].read, true);
    assert.equal((await notes(rightHand)).unread, 1, "only the reader's own notes");
  });

  test("sharing a to-do task tells the person it was shared with, once", async () => {
    await clearAll();
    const scope = `user:${leaderUser.id}`;
    let saved = await leader.put(`/api/documents/${scope}/todos`, { value: [todo("Beställ handskar", [adminUser.id])], baseVersion: 0 });
    assert.equal(saved.status, 200);
    const { notifications } = await notes(admin);
    assert.deepEqual(notifications.map(({ kind, actorName, title }) => ({ kind, actorName, title })), [
      { kind: "todoShared", actorName: "Lisa Ledare", title: "Beställ handskar" }
    ]);

    saved = await leader.put(`/api/documents/${scope}/todos`, {
      value: [todo("Beställ handskar", [adminUser.id, rightHandUser.id]), todo("Ny uppgift")], baseVersion: saved.data.version
    });
    assert.equal(saved.status, 200);
    assert.equal((await notes(admin)).notifications.length, 1, "saving again does not repeat the note");
    assert.equal((await notes(rightHand)).notifications[0]?.title, "Beställ handskar");

    await leader.put(`/api/documents/${scope}/todos`, { value: [todo("Städa GD", [operatorUser.id])], baseVersion: saved.data.version });
    assert.equal((await notes(operator)).notifications[0]?.title, "Städa GD", "operators have lists and are told too");
  });
});
