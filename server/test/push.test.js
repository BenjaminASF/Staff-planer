const { describe, test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");
const { changedPeople, isAllowedEndpoint } = require("../push");
const { currentWeekKey } = require("../store");

const PASSWORD = "losenord123";

function weekAfter(weekKey, weeks) {
  const date = new Date(`${weekKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 7 * weeks);
  return date.toISOString().slice(0, 10);
}

describe("pushnotiser", () => {
  let server, admin, leader, rightHand, operator, otherLeader;
  let adminUser, leaderUser, rightHandUser, operatorUser;
  let operatorPerson, rightHandPerson, leaderPerson;
  let dayShift, eveningShift;
  const week = weekAfter(currentWeekKey(), 1);
  const sent = [];
  const pushSender = {
    configured: true,
    publicKey: "BPublicKeyForTests",
    async send(subscription, payload, options) {
      if (subscription.endpoint.includes("expired")) throw Object.assign(new Error("Gone"), { statusCode: 410 });
      sent.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload), options });
    }
  };

  const endpointFor = name => `https://fcm.googleapis.com/fcm/send/${name}`;
  const subscribe = (client, name) => client.post("/api/push/subscriptions", {
    endpoint: endpointFor(name), keys: { p256dh: "BKeyForTests", auth: "authForTests" }, device: "Testtelefon"
  });
  const sentTo = name => sent.filter(item => item.endpoint === endpointFor(name));
  // Sends everything waiting, without waiting for the delays.
  const flush = async () => {
    await server.pool.query("UPDATE push_outbox SET send_after = now() WHERE sent_at IS NULL");
    await server.app.locals.push.flush();
  };
  const pending = async userId => (await server.pool.query(
    "SELECT kind, dedupe_key, send_after > now() + interval '4 minutes' AS later FROM push_outbox WHERE user_id = $1 AND sent_at IS NULL", [userId]
  )).rows;
  const versions = new Map();
  const save = async (client, scope, key, value) => {
    const result = await client.put(`/api/documents/${scope}/${encodeURIComponent(key)}`, { value, baseVersion: versions.get(`${scope}|${key}`) || 0 });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    versions.set(`${scope}|${key}`, result.data.version);
    return result.data;
  };

  before(async () => {
    server = await startTestServer({ pushSender, pushAutoStart: false });
    [admin, leader, rightHand, operator, otherLeader] = Array.from({ length: 5 }, () => server.client());
    adminUser = (await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD })).data.user;
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const createPerson = async (name, shiftId, username, role) => (await admin.post("/api/people", {
      name, shiftId, account: { username, password: PASSWORD, role, mustChangePassword: false }
    })).data.person;
    leaderPerson = await createPerson("Lisa Ledare", dayShift.id, "lisa", "shift_leader");
    rightHandPerson = await createPerson("Hanna Hand", dayShift.id, "hanna", "right_hand");
    operatorPerson = await createPerson("Olle Operatör", dayShift.id, "olle", "operator");
    await createPerson("Kalle Kväll", eveningShift.id, "kalle", "shift_leader");
    leaderUser = (await leader.login("lisa", PASSWORD)).user;
    rightHandUser = (await rightHand.login("hanna", PASSWORD)).user;
    operatorUser = (await operator.login("olle", PASSWORD)).user;
    await otherLeader.login("kalle", PASSWORD);
    for (const [client, name] of [[admin, "admin"], [leader, "leader"], [rightHand, "hand"], [operator, "olle"], [otherLeader, "kalle"]]) {
      assert.equal((await subscribe(client, name)).status, 201);
    }
  });

  after(async () => {
    await server?.close();
  });

  beforeEach(async () => {
    await flush();
    sent.length = 0;
  });

  test("devices register only with the browsers' push services", async () => {
    const status = await operator.get("/api/push");
    assert.deepEqual(status.data, { available: true, publicKey: "BPublicKeyForTests", blocked: false, devices: 1 });
    const bad = await operator.post("/api/push/subscriptions", { endpoint: "https://evil.example.com/push", keys: { p256dh: "BKey", auth: "auth" } });
    assert.equal(bad.status, 400);
    assert.equal(isAllowedEndpoint("http://fcm.googleapis.com/x"), false);
    assert.equal(isAllowedEndpoint("https://web.push.apple.com/abc"), true);
    assert.equal(isAllowedEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc"), true);
    assert.equal(isAllowedEndpoint("https://googleapis.com.evil.net/x"), false);
  });

  test("a private chat message is pushed at once, only to its recipient, without its text", async () => {
    const result = await leader.post("/api/chat/messages", { text: "Hemligt: Olle är sjuk", recipientId: rightHandUser.id });
    assert.equal(result.status, 201);
    await server.app.locals.push.flush();
    assert.equal(sentTo("hand").length, 1);
    assert.equal(sent.length, 1, "nobody else is told");
    const { payload, options } = sentTo("hand")[0];
    assert.equal(payload.body, "Du har fått ett privat meddelande.");
    assert.ok(!JSON.stringify(payload).includes("Olle"), "no names or message text on the lock screen");
    assert.equal(options.urgency, "high");
  });

  test("messages to everyone are gathered into at most one push every five minutes", async () => {
    await leader.post("/api/chat/messages", { text: "Möte kl 14" });
    await server.app.locals.push.flush();
    assert.deepEqual(sent.map(item => item.endpoint).sort(), [endpointFor("admin"), endpointFor("hand"), endpointFor("kalle")].sort(),
      "every chat user except the author; operators have no chat");
    sent.length = 0;
    await leader.post("/api/chat/messages", { text: "Möte flyttat" });
    await leader.post("/api/chat/messages", { text: "Till 15" });
    await server.app.locals.push.flush();
    assert.equal(sent.length, 0, "a second push waits");
    assert.deepEqual(await pending(rightHandUser.id), [{ kind: "chatAll", dedupe_key: "chatAll", later: true }], "one waiting push for both messages");
    // Someone who has read the chat in the meantime gets nothing.
    assert.equal((await rightHand.post("/api/chat/read", { lastId: "999999" })).status, 200);
    await flush();
    assert.ok(!sentTo("hand").length);
    assert.equal(sentTo("admin").length, 1);
  });

  test("schedule changes reach only the people whose placement changed, once the week is theirs to see", async () => {
    await save(leader, dayShift.id, `schedule:${week}`, { "Linje 1": { mon: operatorPerson.id, tue: rightHandPerson.id }, "Linje 2": { mon: leaderPerson.id } });
    assert.deepEqual((await pending(rightHandUser.id)).map(row => row.kind), ["schedule"]);
    assert.deepEqual(await pending(leaderUser.id), [], "never for your own change");
    assert.deepEqual(await pending(operatorUser.id), [], "the week is not shared with operators yet");

    // More changes in the same week while the push waits become the same push.
    await save(leader, dayShift.id, `schedule:${week}`, { "Linje 1": { mon: operatorPerson.id, wed: rightHandPerson.id }, "Linje 2": { mon: leaderPerson.id } });
    assert.equal((await pending(rightHandUser.id)).length, 1);
    await flush();
    assert.equal(sentTo("hand").length, 1);
    assert.equal(sentTo("hand")[0].payload.body.startsWith("Ditt schema för vecka"), true);
    assert.equal(sent.length, 1);

    sent.length = 0;
    await save(leader, dayShift.id, `scheduleShared:${week}`, { shared: true });
    await flush();
    assert.equal(sentTo("olle").length, 1, "operators hear that the week is shared");
    assert.match(sentTo("olle")[0].payload.body, /^Schemat för vecka \d+ finns nu\.$/);
    assert.equal(sent.length, 1);

    sent.length = 0;
    await save(admin, dayShift.id, `schedule:${week}`, { "Linje 1": { tue: operatorPerson.id, wed: rightHandPerson.id }, "Linje 2": { mon: leaderPerson.id } });
    await flush();
    assert.deepEqual(sent.map(item => item.endpoint), [endpointFor("olle")], "only the operator moved; the shift leader keeps their place");
  });

  test("break times concern everyone working that day; other weeks' history does not push", async () => {
    const schedule = { "Linje 1": { mon: "a", tue: "b" }, Träning: { mon: "c" } };
    assert.deepEqual([...changedPeople("breakPlan:2026-01-05", { mon: { togetherStart: "10:00" } }, { mon: { togetherStart: "10:30" } }, schedule)].sort(), ["a", "c"]);
    assert.deepEqual([...changedPeople("breakPlan:2026-01-05", { mon: { groups: { a: 1 } } }, { mon: { groups: { a: 2, b: 1 } } }, schedule)].sort(), ["a", "b"]);
    assert.deepEqual([...changedPeople("trainingLocations:2026-01-05", { Träning: { mon: "" } }, { Träning: { mon: "Linje 3" } }, schedule)], ["c"]);
    assert.deepEqual([...changedPeople("schedule:2026-01-05", schedule, schedule, schedule)], []);

    const pastWeek = weekAfter(currentWeekKey(), -2);
    await save(leader, dayShift.id, `schedule:${pastWeek}`, { "Linje 1": { mon: rightHandPerson.id } });
    assert.deepEqual(await pending(rightHandUser.id), []);
  });

  test("moving someone to another shift tells them", async () => {
    const result = await admin.patch(`/api/people/${operatorPerson.id}`, { shiftId: eveningShift.id });
    assert.equal(result.status, 200);
    await flush();
    assert.deepEqual(sent.map(item => item.payload.body), ["Din placering har ändrats."]);
    await admin.patch(`/api/people/${operatorPerson.id}`, { shiftId: dayShift.id });
  });

  test("shared notes push to their recipients, and nothing is sent once the note is gone", async () => {
    const note = await leader.post("/api/notes", { kind: "group", text: "Ny rulle", people: [operatorUser.id] });
    assert.equal(note.status, 201);
    await flush();
    assert.deepEqual(sent.map(item => [item.endpoint, item.payload.body]), [[endpointFor("olle"), "En anteckning har delats med dig."]]);

    sent.length = 0;
    const other = await leader.post("/api/notes", { kind: "group", text: "Ångra", people: [rightHandUser.id] });
    assert.equal((await leader.delete(`/api/notes/${other.data.note.id}`)).status, 200);
    await flush();
    assert.equal(sent.length, 0);
  });

  test("admin changes reach shift leaders and right hands as one push", async () => {
    await admin.post("/api/audit", { scope: dayShift.id, type: "settings", title: "Ny maskin" });
    await admin.post("/api/audit", { scope: dayShift.id, type: "settings", title: "Ny station" });
    await flush();
    assert.deepEqual(sent.map(item => item.endpoint).sort(), [endpointFor("hand"), endpointFor("leader")].sort());
    assert.equal(sent[0].payload.body, "Det finns nya uppdateringar som berör dig.");
  });

  test("only admins turn push off for a user, and then nothing reaches their devices", async () => {
    assert.equal((await leader.patch(`/api/people/${operatorPerson.id}/account`, { pushBlocked: true })).status, 403);
    assert.equal((await rightHand.patch(`/api/people/${operatorPerson.id}/account`, { pushBlocked: true })).status, 403);
    const blocked = await admin.patch(`/api/people/${rightHandPerson.id}/account`, { pushBlocked: true });
    assert.equal(blocked.status, 200);
    assert.equal(blocked.data.person.account.pushBlocked, true);
    const listed = (await leader.get("/api/people")).data.people.find(person => person.id === rightHandPerson.id);
    assert.equal(listed.account.pushBlocked, true, "shift leaders see the 🔕 mark");

    assert.equal((await rightHand.get("/api/push")).data.blocked, true);
    assert.equal((await subscribe(rightHand, "hand-2")).status, 403, "the user cannot turn it back on");
    await leader.post("/api/chat/messages", { text: "Privat", recipientId: rightHandUser.id });
    await flush();
    assert.equal(sent.length, 0);
    assert.ok((await rightHand.get("/api/notifications")).status === 200, "in-app notifications still work");

    // Turned on again, the devices registered before get notices again, but not the old ones.
    await admin.patch(`/api/people/${rightHandPerson.id}/account`, { pushBlocked: false });
    await flush();
    assert.equal(sent.length, 0, "events from while push was off are not sent afterwards");
    await leader.post("/api/chat/messages", { text: "Igen", recipientId: rightHandUser.id });
    await flush();
    assert.equal(sentTo("hand").length, 1);
  });

  test("notices older than an hour are dropped instead of sent", async () => {
    await leader.post("/api/chat/messages", { text: "Gammalt", recipientId: rightHandUser.id });
    await server.pool.query("UPDATE push_outbox SET created_at = now() - interval '2 hours' WHERE sent_at IS NULL");
    await flush();
    assert.equal(sent.length, 0);
  });

  test("expired devices are removed, and a shared phone follows whoever signs in", async () => {
    assert.equal((await subscribe(otherLeader, "expired")).status, 201);
    await leader.post("/api/chat/messages", { text: "Privat", recipientId: rightHandUser.id });
    await leader.post("/api/chat/messages", { text: "Till alla" });
    await flush();
    const { rows } = await server.pool.query("SELECT endpoint FROM push_subscriptions WHERE endpoint = $1", [endpointFor("expired")]);
    assert.equal(rows.length, 0);

    // Olle signs in on the leader's phone: the phone stops getting the leader's notices.
    const check = await operator.post("/api/push/subscriptions/check", { endpoint: endpointFor("leader") });
    assert.deepEqual(check.data, { subscribed: false });
    assert.equal((await leader.get("/api/push")).data.devices, 0);
    assert.equal((await operator.post("/api/push/subscriptions/check", { endpoint: endpointFor("olle") })).data.subscribed, true);

    assert.equal((await operator.request("DELETE", "/api/push/subscriptions", { all: true })).status, 200);
    assert.equal((await operator.get("/api/push")).data.devices, 0);
  });

  test("if push notices cannot be queued, saving still works", async () => {
    await server.pool.query("ALTER TABLE push_outbox RENAME TO push_outbox_away");
    const quiet = console.error;
    console.error = () => {};
    try {
      assert.equal((await leader.post("/api/chat/messages", { text: "Hej", recipientId: rightHandUser.id })).status, 201);
      assert.equal((await leader.post("/api/chat/messages", { text: "Hej alla" })).status, 201);
      assert.equal((await leader.post("/api/notes", { kind: "group", text: "Lapp", people: [operatorUser.id] })).status, 201, "inside a transaction too");
      await save(leader, dayShift.id, `schedule:${weekAfter(week, 1)}`, { "Linje 3": { fri: rightHandPerson.id } });
      assert.equal((await admin.patch(`/api/people/${operatorPerson.id}`, { shiftId: eveningShift.id })).status, 200);
      assert.deepEqual((await operator.get("/api/notifications")).data.notifications.map(note => note.kind).slice(0, 1), ["noteShared"]);
    } finally {
      console.error = quiet;
      await server.pool.query("ALTER TABLE push_outbox_away RENAME TO push_outbox");
      await admin.patch(`/api/people/${operatorPerson.id}`, { shiftId: dayShift.id });
    }
  });

  test("without VAPID keys push stays off and everything else works", async () => {
    const plain = await startTestServer();
    try {
      const client = plain.client();
      await client.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
      assert.equal((await client.get("/api/push")).data.available, false);
      assert.equal((await subscribe(client, "x")).status, 503);
      assert.equal((await client.post("/api/chat/messages", { text: "Hej" })).status, 201);
    } finally {
      await plain.close();
    }
  });
});
