const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, openStream, SETUP_CODE } = require("./helpers");
const { wasteEditableDates } = require("../production");
const { currentWeekKey } = require("../store");

const PASSWORD = "losenord123";

const settle = () => new Promise(resolve => setTimeout(resolve, 300));
const copy = value => JSON.parse(JSON.stringify(value));

describe("senior operator", () => {
  let server, admin, leader, rightHand, senior, operator, otherSenior;
  let dayShift, eveningShift;
  let leaderUser, seniorUser, rightHandUser;
  let annaPerson, seniorPerson;
  const [today, yesterday] = wasteEditableDates();
  const twoDaysAgo = new Date(Date.parse(`${yesterday}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const recordsUrl = shiftId => `/api/documents/${shiftId}/productionRecords`;
  const read = async (client, shiftId = dayShift.id) => (await client.get(`/api/documents?scope=${shiftId}&keys=productionRecords`)).data;
  const save = async (client, value, shiftId = dayShift.id) => {
    const current = (await read(admin, shiftId)).documents.productionRecords;
    return client.put(recordsUrl(shiftId), { value, baseVersion: current?.version || 0 });
  };
  const change = (client, date, machines, extra = {}, shiftId = dayShift.id) =>
    client.patch(`/api/production/${shiftId}/${date}`, { machines, ...extra });
  const entryOf = async (client, date, machineName) => (await read(client)).documents.productionRecords.value[date].machines[machineName];
  const stored = async () => (await server.pool.query(
    "SELECT value FROM documents WHERE scope = $1 AND key = 'productionRecords'", [dayShift.id]
  )).rows[0].value;
  const pushSender = { configured: true, publicKey: "BPublicKeyForTests", async send() {} };

  before(async () => {
    server = await startTestServer({ pushSender, pushAutoStart: false });
    [admin, leader, rightHand, senior, operator, otherSenior] = Array.from({ length: 6 }, () => server.client());
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const createPerson = async (name, shiftId, username, role) => (await admin.post("/api/people", {
      name, shiftId, account: { username, password: PASSWORD, role, mustChangePassword: false }
    })).data.person;
    await createPerson("Lisa Ledare", dayShift.id, "lisa", "shift_leader");
    await createPerson("Hanna Hand", dayShift.id, "hanna", "right_hand");
    seniorPerson = await createPerson("Sven Senior", dayShift.id, "sven", "senior_operator");
    annaPerson = await createPerson("Anna Operatör", dayShift.id, "anna", "operator");
    await createPerson("Kim Kväll", eveningShift.id, "kim", "senior_operator");
    leaderUser = (await leader.login("lisa", PASSWORD)).user;
    rightHandUser = (await rightHand.login("hanna", PASSWORD)).user;
    seniorUser = (await senior.login("sven", PASSWORD)).user;
    await operator.login("anna", PASSWORD);
    await otherSenior.login("kim", PASSWORD);
  });

  after(async () => {
    await server?.close();
  });

  test("today and yesterday follow the calendar in Stockholm, across month and year ends", () => {
    assert.deepEqual(wasteEditableDates(new Date("2026-11-01T08:00:00Z")), ["2026-11-01", "2026-10-31"]);
    assert.deepEqual(wasteEditableDates(new Date("2027-01-01T08:00:00Z")), ["2027-01-01", "2026-12-31"]);
    assert.deepEqual(wasteEditableDates(new Date("2028-03-01T08:00:00Z")), ["2028-03-01", "2028-02-29"], "leap year");
    assert.deepEqual(wasteEditableDates(new Date("2026-10-31T23:30:00Z")), ["2026-11-01", "2026-10-31"], "already the 1st in Stockholm");
    assert.deepEqual(wasteEditableDates(new Date("2026-10-31T22:30:00Z")), ["2026-10-31", "2026-10-30"], "still the 31st in Stockholm");
  });

  test("is handed out by admins to anyone and by shift leaders in their own shift, never by right hands", async () => {
    assert.equal(seniorUser.role, "senior_operator");
    const byLeader = await leader.post("/api/people", { name: "Ny Senior", account: { username: "nysenior", password: PASSWORD, role: "senior_operator" } });
    assert.equal(byLeader.status, 201);
    assert.equal(byLeader.data.person.shiftId, dayShift.id);
    const byRightHand = await rightHand.post("/api/people", { name: "Fel Senior", account: { username: "felsenior", password: PASSWORD, role: "senior_operator" } });
    assert.equal(byRightHand.status, 403);

    assert.equal((await rightHand.patch(`/api/people/${annaPerson.id}/account`, { role: "senior_operator" })).status, 403);
    assert.equal((await rightHand.patch(`/api/people/${byLeader.data.person.id}/account`, { role: "operator" })).status, 403,
      "right hands do not take the role away either");
    assert.equal((await leader.patch(`/api/people/${annaPerson.id}/account`, { role: "senior_operator" })).status, 200);
    assert.equal((await leader.patch(`/api/people/${annaPerson.id}/account`, { role: "operator" })).status, 200);
    const evening = (await admin.get("/api/people")).data.people.find(person => person.name === "Kim Kväll");
    assert.equal((await leader.patch(`/api/people/${evening.id}/account`, { role: "operator" })).status, 403, "not in another shift");
    assert.equal((await admin.patch(`/api/people/${evening.id}/account`, { role: "operator" })).status, 200);
    assert.equal((await admin.patch(`/api/people/${evening.id}/account`, { role: "senior_operator" })).status, 200);
  });

  test("otherwise has what an operator has", async () => {
    const people = (await senior.get("/api/people")).data.people;
    assert.ok(people.slice(1).every(person => person.limited), "the same limited roster as operators");
    const reads = await senior.get(`/api/documents?scope=${dayShift.id}&keys=scheduleTemplates,schedule:2026-10-12`);
    assert.deepEqual(reads.data.forbidden, ["scheduleTemplates"]);
    assert.deepEqual(reads.data.unshared, ["schedule:2026-10-12"], "sees the schedule only once it is shared");
    assert.equal((await senior.put(`/api/documents/${dayShift.id}/schedule:2026-10-12`, { value: {}, baseVersion: 0 })).status, 403);
    assert.equal((await senior.get("/api/chat/messages")).status, 403);
    assert.equal((await senior.patch(`/api/people/${seniorPerson.id}`, { name: "Annat Namn" })).status, 403);
    assert.equal((await senior.patch(`/api/people/${seniorPerson.id}`, { phone: "070-1" })).status, 200);
    const competence = await senior.get("/api/documents?scope=global&keys=machineSkills,productionSettings");
    assert.deepEqual(competence.data.forbidden, ["machineSkills"]);
  });

  test("is told when the schedule is shared, like operators", async () => {
    const subscription = { endpoint: "https://fcm.googleapis.com/fcm/send/sven", keys: { p256dh: "BKeyForTests", auth: "authForTests" } };
    assert.equal((await senior.post("/api/push/subscriptions", subscription)).status, 201);
    const week = currentWeekKey();
    assert.equal((await leader.put(`/api/documents/${dayShift.id}/scheduleShared:${week}`, { value: { shared: true }, baseVersion: 0 })).status, 200);
    const { rows } = await server.pool.query("SELECT kind FROM push_outbox WHERE user_id = $1", [seniorUser.id]);
    assert.deepEqual(rows.map(row => row.kind), ["share"]);
  });

  test("reads the production of their own shift only, and may start today's or yesterday's day", async () => {
    assert.deepEqual((await read(senior)).forbidden, []);
    assert.deepEqual((await read(senior, eveningShift.id)).forbidden, ["productionRecords"]);
    assert.deepEqual((await read(operator)).forbidden, ["productionRecords"], "operators still do not");

    assert.equal((await change(senior, twoDaysAgo, { GD1: { waste: 1 } })).status, 403, "older days are read-only");
    assert.equal((await change(senior, "29-10-2026", { GD1: { waste: 1 } })).status, 400);
    const started = await change(senior, today, { GD1: { waste: 2 } });
    assert.equal(started.status, 200, JSON.stringify(started.data));
    const day = (await stored())[today];
    assert.equal(day.machines.GD1.waste, 2, "nobody has registered results yet");
    assert.equal(day.total, 0);
    assert.ok(!("result" in day.machines.GD1));
    assert.ok(!("edits" in started.data.value[today].machines.GD1), "the answer does not say who changed what");

    assert.equal((await change(otherSenior, today, { GD1: { waste: 1 } })).status, 403, "not another shift");
    assert.equal((await change(senior, today, { GD1: { waste: 1 } }, {}, eveningShift.id)).status, 403);
    assert.equal((await change(operator, today, { GD1: { waste: 1 } })).status, 403);
  });

  test("never changes results, operators, targets or the factory record", async () => {
    for (const fields of [{ result: 5 }, { cans: 240 }, { personId: annaPerson.id }, { waste: 1, result: 5 }]) {
      assert.equal((await change(senior, today, { GD1: fields })).status, 403, JSON.stringify(fields));
    }
    assert.equal((await change(senior, today, { GD1: { waste: 1 } }, { target: 1 })).status, 403);
    assert.equal((await change(senior, today, { GD1: { waste: -1 } })).status, 400);
    assert.equal((await change(senior, today, { GD1: { color: "red" } })).status, 400);
    assert.equal((await senior.put(recordsUrl(dayShift.id), { value: {}, baseVersion: (await read(admin)).documents.productionRecords.version })).status, 403,
      "the whole document is not saved by senior operators");
    assert.equal((await senior.put("/api/documents/global/productionSettings", { value: { factoryRecord: 1 }, baseVersion: 0 })).status, 403);
    assert.equal((await senior.post("/api/audit", { scope: dayShift.id, type: "production", title: "x" })).status, 403);
    assert.equal((await stored())[today].machines.GD1.waste, 2, "nothing was saved");
  });

  test("box results and waste are saved side by side, never over each other", async () => {
    const byLeader = await change(leader, today, {
      GD1: { personId: annaPerson.id, cans: null, result: 40, waste: 2, plusMinus: 0, comment: "" }, GD2: { result: 30 }
    }, { target: 160 });
    assert.equal(byLeader.status, 200, JSON.stringify(byLeader.data));
    assert.equal((await change(senior, today, { GD1: { plusMinus: 1.5, comment: "Stopp i matningen" } })).status, 200);
    // The right hand's page still shows the day before the senior operator's change.
    assert.equal((await change(rightHand, today, { GD2: { result: 35 } })).status, 200);
    assert.equal((await change(senior, today, { GD2: { waste: 0.75 } })).status, 200);

    const day = (await stored())[today];
    assert.deepEqual(
      [day.machines.GD1.result, day.machines.GD1.waste, day.machines.GD1.plusMinus, day.machines.GD1.comment],
      [40, 2, 1.5, "Stopp i matningen"]
    );
    assert.deepEqual([day.machines.GD2.result, day.machines.GD2.waste], [35, 0.75]);
    assert.equal(day.total, 75, "the total follows the results only");
    assert.equal(day.target, 160);
    assert.equal(day.machines.GD1.personName, "Anna Operatör", "the name comes from the server");

    assert.equal((await change(leader, yesterday, { GD1: { result: 50 } })).status, 200);
    assert.equal((await change(senior, yesterday, { GD1: { waste: 4 } })).status, 200, "yesterday, after the results");
    assert.deepEqual([(await stored())[yesterday].machines.GD1.result, (await stored())[yesterday].machines.GD1.waste], [50, 4]);
  });

  test("two managers starting the same day keep each other's results", async () => {
    const date = "2026-10-20";
    const defaults = { GD1: { personId: annaPerson.id, cans: null, result: 0 }, GD2: { personId: "", cans: null, result: 0 } };
    assert.equal((await change(leader, date, { GD1: { result: 40 } }, { defaults, target: 160 })).status, 200);
    // The right hand's page opened before the day existed, so it shows GD1 empty.
    assert.equal((await change(rightHand, date, { GD2: { result: 30 } }, { defaults: { ...defaults, GD1: { personId: "", cans: null, result: 0 } }, target: 160 })).status, 200);
    const day = (await stored())[date];
    assert.deepEqual([day.machines.GD1.result, day.machines.GD2.result, day.total], [40, 30, 70]);
    assert.equal(day.machines.GD1.personId, annaPerson.id, "defaults fill only what is empty");
    assert.equal((await change(senior, today, { GD1: { waste: 1 } }, { defaults })).status, 403, "senior operators send no defaults");
  });

  test("only admins and shift leaders see who changed each field and when", async () => {
    for (const client of [admin, leader]) {
      const entry = await entryOf(client, today, "GD1");
      assert.equal(entry.edits.waste.name, "Sven Senior", "the senior operator started the day with the waste");
      assert.equal(entry.edits.plusMinus.name, "Sven Senior");
      assert.equal(entry.edits.comment.name, "Sven Senior");
      assert.equal(entry.edits.result.name, "Lisa Ledare");
      assert.equal(entry.commentByName, "Sven Senior");
      assert.ok(!Number.isNaN(Date.parse(entry.edits.waste.at)));
    }
    assert.equal((await entryOf(leader, today, "GD2")).edits.result.name, "Hanna Hand");
    for (const client of [rightHand, senior]) {
      const entry = await entryOf(client, today, "GD1");
      assert.equal(entry.comment, "Stopp i matningen", "the comment itself is shown");
      for (const field of ["edits", "commentBy", "commentByName", "commentAt"]) assert.ok(!(field in entry), field);
    }

    // Saving the same value again does not make you the one who changed it.
    assert.equal((await change(leader, today, { GD1: { waste: 2 } })).status, 200);
    assert.equal((await entryOf(leader, today, "GD1")).edits.waste.name, "Sven Senior");

    // Whole-document saves keep the authors and ignore what the client says about them.
    const value = copy((await read(leader)).documents.productionRecords.value);
    value[today].machines.GD2.edits = { result: { by: seniorUser.id, at: "2020-01-01T00:00:00.000Z" } };
    value[today].machines.GD2.comment = "Bytt rulle";
    value[today].machines.GD2.commentBy = seniorUser.id;
    assert.equal((await save(leader, value)).status, 200);
    const gd2 = (await stored())[today].machines.GD2;
    assert.equal(gd2.edits.result.by, rightHandUser.id);
    assert.equal(gd2.commentBy, leaderUser.id);
    assert.equal(gd2.edits.comment.by, leaderUser.id);
    assert.ok(!("name" in gd2.edits.result) && !("commentByName" in (await stored())[today].machines.GD1), "names are not stored");
    assert.equal((await stored())[today].machines.GD1.edits.waste.by, seniorUser.id);

    assert.equal((await change(senior, today, { GD2: { comment: "" } })).status, 200);
    const cleared = await entryOf(leader, today, "GD2");
    assert.ok(!("commentBy" in cleared), "an empty comment has no author");
    assert.equal(cleared.edits.comment.name, "Sven Senior", "but who cleared it is kept");
  });

  test("a version conflict does not show who changed what either", async () => {
    const result = await rightHand.put(recordsUrl(dayShift.id), { value: {}, baseVersion: 1 });
    assert.equal(result.status, 409);
    assert.ok(!/commentBy|edits/.test(JSON.stringify(result.data.current)));
  });

  test("live updates tell only admins and shift leaders who saved the records", async () => {
    const seniorStream = await openStream(server, senior);
    const leaderStream = await openStream(server, leader);
    try {
      await seniorStream.waitFor(event => event.type === "ready");
      await leaderStream.waitFor(event => event.type === "ready");
      await settle();
      assert.equal((await change(senior, today, { GD1: { comment: "Ny kommentar" } })).status, 200);
      const isRecords = event => event.type === "change" && event.data.key === "productionRecords";
      assert.equal((await leaderStream.waitFor(isRecords)).data.by, seniorUser.id);
      assert.ok(!("by" in (await seniorStream.waitFor(isRecords)).data));
    } finally {
      seniorStream.close();
      leaderStream.close();
    }
  });
});
