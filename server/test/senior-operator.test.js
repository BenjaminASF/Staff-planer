const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, openStream, SETUP_CODE } = require("./helpers");
const { wasteEditableDates } = require("../production");
const { currentWeekKey } = require("../store");

const PASSWORD = "losenord123";

const settle = () => new Promise(resolve => setTimeout(resolve, 300));
const machine = (personId, extra = {}) => ({ personId, personName: "", cans: null, result: 40, waste: 1, plusMinus: 0.5, comment: "", ...extra });
const day = (date, machines) => ({ date, target: 160, total: Object.values(machines).reduce((sum, item) => sum + item.result, 0), machines, updatedAt: "2026-01-01T00:00:00.000Z" });
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

  test("reads the production of their own shift only, and changes nothing before a manager has started the day", async () => {
    assert.deepEqual((await read(senior)).forbidden, []);
    assert.deepEqual((await read(senior, eveningShift.id)).forbidden, ["productionRecords"]);
    assert.deepEqual((await read(operator)).forbidden, ["productionRecords"], "operators still do not");

    const notStarted = await save(senior, { [today]: day(today, { GD1: machine("", { result: 0, waste: 2 }) }) });
    assert.equal(notStarted.status, 403);

    const records = {
      [today]: day(today, { GD1: machine(annaPerson.id), GD2: machine(annaPerson.id) }),
      [yesterday]: day(yesterday, { GD1: machine(annaPerson.id) }),
      [twoDaysAgo]: day(twoDaysAgo, { GD1: machine(annaPerson.id) })
    };
    assert.equal((await save(leader, records)).status, 200);
    assert.equal((await save(senior, { ...records, [today]: undefined, "2020-01-01": day("2020-01-01", {}) })).status, 403,
      "no new days, whatever the date");
    assert.equal((await save(senior, records, eveningShift.id)).status, 403);
  });

  test("records only waste, plus/minus and comments, today and yesterday", async () => {
    const before = await stored();
    const value = copy((await read(senior)).documents.productionRecords.value);
    Object.assign(value[today].machines.GD1, { waste: 3.25, plusMinus: 1, comment: "Stopp i matningen", result: 999, personId: "", cans: 5 });
    Object.assign(value[today], { target: 1, total: 999 });
    value[yesterday].machines.GD1.waste = 4;
    value[today].machines.GD9 = machine("", { waste: 7 });
    delete value[twoDaysAgo];
    const saved = await save(senior, value);
    assert.equal(saved.status, 200, JSON.stringify(saved.data));

    const after = await stored();
    assert.equal(after[today].machines.GD1.waste, 3.25);
    assert.equal(after[today].machines.GD1.plusMinus, 1);
    assert.equal(after[today].machines.GD1.comment, "Stopp i matningen");
    assert.equal(after[yesterday].machines.GD1.waste, 4);
    for (const field of ["result", "personId", "cans"]) assert.deepEqual(after[today].machines.GD1[field], before[today].machines.GD1[field], field);
    assert.equal(after[today].total, before[today].total, "results and totals stay as they were");
    assert.equal(after[today].target, before[today].target);
    assert.equal(after[today].machines.GD9, undefined, "no new machines");
    assert.deepEqual(after[twoDaysAgo], before[twoDaysAgo], "days left out are kept");

    const older = copy((await read(senior)).documents.productionRecords.value);
    older[twoDaysAgo].machines.GD1.comment = "För sent";
    assert.equal((await save(senior, older)).status, 403, "older days are read-only");
    const negative = copy((await read(senior)).documents.productionRecords.value);
    negative[today].machines.GD1.waste = -1;
    assert.equal((await save(senior, negative)).status, 400);
    assert.equal((await senior.put("/api/documents/global/productionSettings", { value: { factoryRecord: 1 }, baseVersion: 0 })).status, 403);
    assert.equal((await senior.post("/api/audit", { scope: dayShift.id, type: "production", title: "x" })).status, 403);
  });

  test("only admins and shift leaders see who wrote a comment, and the author is kept", async () => {
    const entry = async client => (await read(client)).documents.productionRecords.value[today].machines.GD1;
    assert.deepEqual([(await entry(admin)).commentByName, (await entry(leader)).commentByName], ["Sven Senior", "Sven Senior"]);
    assert.equal((await entry(leader)).commentBy, seniorUser.id);
    for (const client of [rightHand, senior]) {
      const visible = await entry(client);
      assert.equal(visible.comment, "Stopp i matningen", "the comment itself is shown");
      assert.ok(!("commentBy" in visible) && !("commentByName" in visible) && !("commentAt" in visible));
    }

    // A right hand saving the day, without seeing the author, keeps it.
    const handValue = copy((await read(rightHand)).documents.productionRecords.value);
    handValue[today].machines.GD2.result = 50;
    assert.equal((await save(rightHand, handValue)).status, 200);
    assert.equal((await stored())[today].machines.GD1.commentBy, seniorUser.id);

    // A new comment gets a new author, whatever the client says.
    const forged = copy((await read(rightHand)).documents.productionRecords.value);
    Object.assign(forged[today].machines.GD2, { comment: "Bytt rulle", commentBy: leaderUser.id, commentByName: "Lisa Ledare" });
    assert.equal((await save(rightHand, forged)).status, 200);
    const gd2 = (await read(leader)).documents.productionRecords.value[today].machines.GD2;
    assert.equal(gd2.commentBy, rightHandUser.id);
    assert.equal(gd2.commentByName, "Hanna Hand");
    assert.ok(!("commentByName" in (await stored())[today].machines.GD2), "names are not stored");

    // Admins and leaders saving the records they read do not change the authors.
    assert.equal((await save(leader, (await read(leader)).documents.productionRecords.value)).status, 200);
    assert.equal((await stored())[today].machines.GD1.commentBy, seniorUser.id);

    const cleared = copy((await read(senior)).documents.productionRecords.value);
    cleared[today].machines.GD2.comment = "";
    assert.equal((await save(senior, cleared)).status, 200);
    assert.ok(!("commentBy" in (await stored())[today].machines.GD2), "an empty comment has no author");
  });

  test("a version conflict does not show the authors either", async () => {
    const result = await senior.put(recordsUrl(dayShift.id), { value: {}, baseVersion: 1 });
    assert.equal(result.status, 409);
    assert.ok(!JSON.stringify(result.data.current).includes("commentBy"));
  });

  test("live updates tell only admins and shift leaders who saved the records", async () => {
    const seniorStream = await openStream(server, senior);
    const leaderStream = await openStream(server, leader);
    try {
      await seniorStream.waitFor(event => event.type === "ready");
      await leaderStream.waitFor(event => event.type === "ready");
      await settle();
      const value = copy((await read(senior)).documents.productionRecords.value);
      value[today].machines.GD1.comment = "Ny kommentar";
      assert.equal((await save(senior, value)).status, 200);
      const isRecords = event => event.type === "change" && event.data.key === "productionRecords";
      assert.equal((await leaderStream.waitFor(isRecords)).data.by, seniorUser.id);
      assert.ok(!("by" in (await seniorStream.waitFor(isRecords)).data));
    } finally {
      seniorStream.close();
      leaderStream.close();
    }
  });
});
