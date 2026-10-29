const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, openStream, SETUP_CODE } = require("./helpers");
const { currentWeekKey, isoWeekNumber } = require("../store");

const PASSWORD = "losenord123";

describe("notifications", () => {
  let server, admin, leader, rightHand, otherLeader, operator;
  let adminUser, leaderUser, rightHandUser, otherLeaderUser, operatorUser;
  let dayShift, eveningShift, operatorPerson, rightHandPerson, leaderPerson;

  before(async () => {
    server = await startTestServer();
    [admin, leader, rightHand, otherLeader, operator] = Array.from({ length: 5 }, () => server.client());
    adminUser = (await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD })).data.user;
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const createPerson = async (name, shiftId, username, role) => (await admin.post("/api/people", {
      name, shiftId, account: { username, password: PASSWORD, role, mustChangePassword: false }
    })).data.person;
    leaderPerson = await createPerson("Lisa Ledare", dayShift.id, "lisa", "shift_leader");
    rightHandPerson = await createPerson("Hanna Hand", dayShift.id, "hanna", "right_hand");
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

  test("an admin's change in a shift reaches only that shift's leader", async () => {
    await clearAll();
    const leaderStream = await openStream(server, leader);
    const otherStream = await openStream(server, otherLeader);
    try {
      await leaderStream.waitFor(event => event.type === "ready");
      await otherStream.waitFor(event => event.type === "ready");
      assert.equal((await admin.post("/api/audit", { scope: dayShift.id, type: "schedule", title: "GD1 · Måndag", detail: "Olle schemalagd" })).status, 201);
      await leaderStream.waitFor(event => event.data.type === "notification");

      const { notifications, unread } = await notes(leader);
      assert.equal(unread, 1);
      assert.deepEqual(notifications.map(({ kind, actorName, title, detail, read }) => ({ kind, actorName, title, detail, read })), [
        { kind: "adminChange", actorName: "Ada Admin", title: "GD1 · Måndag", detail: "Olle schemalagd", read: false }
      ]);
      assert.equal((await notes(rightHand)).unread, 0, "right hands are not told");
      assert.equal((await notes(otherLeader)).unread, 0, "another shift is not told");
      assert.ok(!otherStream.events.some(event => event.data.type === "notification"), "nobody else hears about the note");
      assert.equal((await notes(admin)).unread, 0, "admins are not told about their own changes");
      assert.equal((await notes(operator)).unread, 0, "operators are not told");
    } finally {
      leaderStream.close();
      otherStream.close();
    }
  });

  test("shared settings changed by an admin reach every shift leader", async () => {
    await clearAll();
    await admin.post("/api/audit", { scope: "global", type: "settings", title: "Inställningar uppdaterade", detail: "Fabriken" });
    for (const client of [leader, otherLeader]) assert.equal((await notes(client)).unread, 1);
    assert.equal((await notes(rightHand)).unread, 0, "right hands are not told");
    assert.equal((await notes(operator)).unread, 0, "operators are not told");
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
    assert.equal((await notes(rightHand)).unread, 0);
    assert.equal((await notes(operator)).unread, 0);
  });

  test("notes are marked as read", async () => {
    await clearAll();
    await admin.post("/api/audit", { scope: "global", type: "settings", title: "Inställningar uppdaterade" });
    assert.equal((await leader.post("/api/notifications/read", {})).status, 200);
    const { notifications, unread } = await notes(leader);
    assert.equal(unread, 0);
    assert.equal(notifications[0].read, true);
    assert.equal((await notes(otherLeader)).unread, 1, "only the reader's own notes");
  });

  describe("changes to someone's own schedule", () => {
    const week = (() => {
      const date = new Date(`${currentWeekKey()}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + 7);
      return date.toISOString().slice(0, 10);
    })();
    const versions = new Map();
    const save = async (client, key, value) => {
      const result = await client.put(`/api/documents/${dayShift.id}/${encodeURIComponent(key)}`, { value, baseVersion: versions.get(key) || 0 });
      assert.equal(result.status, 200, JSON.stringify(result.data));
      versions.set(key, result.data.version);
    };
    const scheduleNotes = async client => (await notes(client)).notifications.filter(note => note.kind === "scheduleChange");

    test("reach only the people whose own schedule changed, whoever made the change", async () => {
      await clearAll();
      await save(admin, `scheduleShared:${week}`, { shared: true });
      await clearAll();
      const handStream = await openStream(server, rightHand);
      const operatorStream = await openStream(server, operator);
      try {
        await handStream.waitFor(event => event.type === "ready");
        await operatorStream.waitFor(event => event.type === "ready");
        await save(admin, `schedule:${week}`, { "Linje 1": { mon: rightHandPerson.id, tue: operatorPerson.id } });
        await handStream.waitFor(event => event.data.type === "notification");
        await operatorStream.waitFor(event => event.data.type === "notification");
        for (const client of [rightHand, operator]) {
          const list = await scheduleNotes(client);
          assert.deepEqual(list.map(({ actorName, title, read }) => ({ actorName, title, read })), [
            { actorName: "Ada Admin", title: `Ditt schema för vecka ${isoWeekNumber(week)} har ändrats`, read: false }
          ]);
        }
        assert.equal((await notes(admin)).unread, 0, "not for your own change");

        // A change that only moves the operator tells only the operator.
        await clearAll();
        await save(leader, `schedule:${week}`, { "Linje 1": { mon: rightHandPerson.id, wed: operatorPerson.id } });
        assert.equal((await scheduleNotes(operator)).length, 1);
        assert.equal((await notes(rightHand)).unread, 0, "the right hand's own place did not change");
        assert.equal((await notes(leader)).unread, 0);

        // A right hand's change reaches the operator too.
        await clearAll();
        await save(rightHand, `schedule:${week}`, { "Linje 1": { mon: rightHandPerson.id, thu: operatorPerson.id } });
        assert.equal((await scheduleNotes(operator))[0]?.actorName, "Hanna Hand");
        assert.equal((await notes(rightHand)).unread, 0);
      } finally {
        handStream.close();
        operatorStream.close();
      }
    });

    test("several changes in a row make one note and one alert", async () => {
      await clearAll();
      const stream = await openStream(server, operator);
      try {
        await stream.waitFor(event => event.type === "ready");
        await save(admin, `schedule:${week}`, { "Linje 1": { mon: rightHandPerson.id, fri: operatorPerson.id } });
        await stream.waitFor(event => event.data.type === "notification");
        await save(leader, `schedule:${week}`, { "Linje 1": { mon: rightHandPerson.id, tue: operatorPerson.id } });
        await save(admin, `breakPlan:${week}`, { tue: { groups: { [operatorPerson.id]: 2 } } });
        // Changes that do not concern the operator give nothing.
        await save(admin, `schedule:${week}`, { "Linje 1": { tue: operatorPerson.id }, "Linje 2": { mon: leaderPerson.id } });
        await admin.post("/api/audit", { scope: dayShift.id, type: "settings", title: "Ny maskin" });
        const { notifications, unread } = await notes(operator);
        assert.equal(unread, 1);
        assert.deepEqual(notifications.map(note => [note.kind, note.actorName]), [["scheduleChange", "Ada Admin"]]);
        assert.equal(stream.events.filter(event => event.data.type === "notification").length, 1, "one alert");

        // Once read, the next change is a new note.
        await operator.post("/api/notifications/read", {});
        await save(leader, `schedule:${week}`, { "Linje 1": { wed: operatorPerson.id }, "Linje 2": { mon: leaderPerson.id } });
        assert.equal((await notes(operator)).unread, 1);
        assert.equal((await scheduleNotes(operator)).length, 2);
      } finally {
        stream.close();
      }
    });

    test("operators are not told about weeks not shared with them", async () => {
      await clearAll();
      const nextWeek = (() => {
        const date = new Date(`${week}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + 7);
        return date.toISOString().slice(0, 10);
      })();
      await save(admin, `schedule:${nextWeek}`, { "Linje 1": { mon: operatorPerson.id, tue: rightHandPerson.id } });
      assert.equal((await notes(operator)).unread, 0);
      assert.equal((await scheduleNotes(rightHand)).length, 1);
    });

    test("moving someone to another shift tells only them", async () => {
      await clearAll();
      assert.equal((await admin.patch(`/api/people/${operatorPerson.id}`, { shiftId: eveningShift.id })).status, 200);
      const { notifications } = await notes(operator);
      assert.deepEqual(notifications.map(({ kind, title, detail }) => ({ kind, title, detail })), [
        { kind: "placementChange", title: "Din placering har ändrats", detail: "Nytt skift: Kväll" }
      ]);
      for (const client of [rightHand, leader, otherLeader]) assert.equal((await notes(client)).unread, 0);
      await admin.patch(`/api/people/${operatorPerson.id}`, { shiftId: dayShift.id });
    });
  });
});
