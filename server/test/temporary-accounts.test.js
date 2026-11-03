const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, openStream, SETUP_CODE } = require("./helpers");

const PASSWORD = "losenord123";
const DAY = 24 * 60 * 60 * 1000;
const inDays = days => new Date(Date.now() + days * DAY).toISOString();
const WEEK = "2026-11-02";

describe("temporary accounts", () => {
  let server, admin, leader, operator;
  let dayShift, eveningShift, operatorPerson;

  // Creates a temporary account through the admin and returns its person.
  const createTemporary = async (username, account = {}, shiftId = dayShift.id) => {
    const result = await admin.post("/api/people", {
      name: `Inhyrd ${username}`, shiftId,
      account: { username, password: PASSWORD, role: "operator", temporary: true, expiresAt: inDays(7), features: [], ...account }
    });
    assert.equal(result.status, 201, JSON.stringify(result.data));
    return result.data.person;
  };
  const temporaryLogin = (client, username, password = PASSWORD) => client.post("/api/login/temporary", { username, password });
  const signedIn = async (username, account) => {
    const person = await createTemporary(username, account);
    const client = server.client();
    const result = await temporaryLogin(client, username);
    assert.equal(result.status, 200, JSON.stringify(result.data));
    return { client, person, me: result.data };
  };

  before(async () => {
    server = await startTestServer();
    [admin, leader, operator] = Array.from({ length: 3 }, () => server.client());
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    await admin.post("/api/people", { name: "Lisa Ledare", shiftId: dayShift.id, email: "lisa@example.com", phone: "070-111", account: { username: "lisa", password: PASSWORD, role: "shift_leader", mustChangePassword: false } });
    operatorPerson = (await admin.post("/api/people", { name: "Anna Operatör", shiftId: dayShift.id, phone: "070-222", account: { username: "anna", password: PASSWORD, role: "operator", mustChangePassword: false } })).data.person;
    await leader.login("lisa", PASSWORD);
    await operator.login("anna", PASSWORD);
  });

  after(async () => {
    await server?.close();
  });

  test("only admins create them, never as admin, and the password is hashed", async () => {
    const byLeader = await leader.post("/api/people", {
      name: "Fel", account: { username: "fel", password: PASSWORD, role: "operator", temporary: true, expiresAt: inDays(1) }
    });
    assert.equal(byLeader.status, 403);
    const asAdmin = await admin.post("/api/people", {
      name: "Fel", shiftId: dayShift.id, account: { username: "fel2", password: PASSWORD, role: "admin", temporary: true, expiresAt: inDays(1) }
    });
    assert.equal(asAdmin.status, 400);
    for (const expiresAt of [undefined, "inte ett datum", inDays(-1), inDays(400)]) {
      const result = await admin.post("/api/people", {
        name: "Fel", shiftId: dayShift.id, account: { username: "fel3", password: PASSWORD, role: "operator", temporary: true, expiresAt }
      });
      assert.equal(result.status, 400, `expiresAt ${expiresAt}`);
    }
    const unknownFeature = await admin.post("/api/people", {
      name: "Fel", shiftId: dayShift.id, account: { username: "fel4", password: PASSWORD, role: "operator", temporary: true, expiresAt: inDays(1), features: ["admin"] }
    });
    assert.equal(unknownFeature.status, 400);

    const person = await createTemporary("tina", { features: ["schedule"] });
    assert.equal(person.account.temporary, true);
    assert.deepEqual(person.account.features, ["schedule"]);
    assert.equal(person.account.mustChangePassword, false, "keeps the password the admin chose");
    assert.equal(person.account.createdByName, "Ada Admin");
    const { rows } = await server.pool.query("SELECT password_hash FROM users WHERE username = 'tina'");
    assert.match(rows[0].password_hash, /^scrypt\$/);
    assert.ok(!rows[0].password_hash.includes(PASSWORD));
    const audit = await server.pool.query("SELECT title FROM audit_events WHERE type = 'temporaryAccount'");
    assert.ok(audit.rows.some(row => row.title === "Tillfälligt konto skapat: tina"));
  });

  test("sign in only through the temporary sign-in, and regular accounts only through the regular one", async () => {
    await createTemporary("tomas");
    const client = server.client();
    const regular = await client.post("/api/login", { username: "tomas", password: PASSWORD });
    assert.equal(regular.status, 403);
    assert.equal(regular.data.code, "temporary_required");
    const wrong = await temporaryLogin(client, "tomas", "fel-losenord");
    assert.equal(wrong.status, 401);
    const temporary = await temporaryLogin(client, "tomas");
    assert.equal(temporary.status, 200);
    assert.equal(temporary.data.user.temporary, true);
    assert.ok(temporary.data.user.expiresAt);

    const regularThroughTemporary = await temporaryLogin(server.client(), "anna");
    assert.equal(regularThroughTemporary.status, 403);
    assert.equal(regularThroughTemporary.data.code, "regular_required");
    const unknown = await temporaryLogin(server.client(), "finns-inte");
    assert.equal(unknown.status, 401, "the same answer as a wrong password");
  });

  test("are limited by the same failed-login limit as regular accounts", async () => {
    await createTemporary("bruteforce");
    const client = server.client();
    for (let attempt = 0; attempt < 10; attempt += 1) assert.equal((await temporaryLogin(client, "bruteforce", "fel")).status, 401);
    assert.equal((await temporaryLogin(client, "bruteforce")).status, 429);
  });

  test("end with their end date: no sign-in and no session", async () => {
    const { client, person } = await signedIn("utgar", { features: ["schedule"] });
    assert.equal((await client.get("/api/me")).status, 200);
    const session = await server.pool.query("SELECT s.expires_at, u.expires_at AS account FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.username = 'utgar'");
    assert.ok(session.rows[0].expires_at <= session.rows[0].account, "the session never outlives the account");

    await server.pool.query("UPDATE users SET expires_at = now() - interval '1 second' WHERE person_id = $1", [person.id]);
    assert.equal((await client.get("/api/me")).status, 401, "the open session ends at once");
    assert.equal((await client.get(`/api/documents?scope=${dayShift.id}&keys=schedule:${WEEK}`)).status, 401);
    const again = await temporaryLogin(server.client(), "utgar");
    assert.equal(again.status, 403);
    assert.equal(again.data.code, "account_expired");
  });

  test("admins disable, enable, extend and delete them, which ends their sessions", async () => {
    const { client, person } = await signedIn("paus");
    const stream = await openStream(server, client);
    await stream.waitFor(event => event.type === "ready");

    assert.equal((await leader.patch(`/api/people/${person.id}/account`, { disabled: true })).status, 403, "only admins");
    assert.equal((await leader.patch(`/api/people/${person.id}/account`, { password: "nyttlosen1" })).status, 403);
    const disabled = await admin.patch(`/api/people/${person.id}/account`, { disabled: true });
    assert.equal(disabled.status, 200);
    assert.equal(disabled.data.person.account.disabled, true);
    assert.equal((await client.get("/api/me")).status, 401);
    const blocked = await temporaryLogin(server.client(), "paus");
    assert.equal(blocked.data.code, "account_disabled");
    // The open page's event stream is closed too.
    const deadline = Date.now() + 2000;
    while ((await server.pool.query("SELECT 1")).rows && server.app.locals.realtime.subscriberCount > 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(server.app.locals.realtime.subscriberCount, 0);
    stream.close();

    assert.equal((await admin.patch(`/api/people/${person.id}/account`, { disabled: false })).status, 200);
    assert.equal((await temporaryLogin(server.client(), "paus")).status, 200);

    const end = inDays(30);
    const extended = await admin.patch(`/api/people/${person.id}/account`, { expiresAt: end });
    assert.equal(extended.status, 200);
    assert.equal(new Date(extended.data.person.account.expiresAt).toISOString(), end);
    assert.equal((await admin.patch(`/api/people/${person.id}/account`, { expiresAt: inDays(-1) })).status, 400);
    assert.equal((await admin.patch(`/api/people/${person.id}/account`, { role: "admin" })).status, 400);
    assert.equal((await admin.patch(`/api/people/${operatorPerson.id}/account`, { disabled: true })).status, 400, "regular accounts have no such thing");

    assert.equal((await admin.delete(`/api/people/${person.id}/account`)).status, 200);
    assert.equal((await temporaryLogin(server.client(), "paus")).status, 401);
    assert.ok((await admin.get("/api/people")).data.people.some(item => item.id === person.id), "stays in the staff list");
  });

  test("get only the functions the admin ticked, within their role", async () => {
    const { client } = await signedIn("bara-rast", { features: ["breaks"] });
    const reads = await client.get(`/api/documents?scope=${dayShift.id}&keys=schedule:${WEEK},breakPlan:${WEEK},productionRecords`);
    assert.deepEqual(reads.data.forbidden.sort(), ["productionRecords", `schedule:${WEEK}`].sort());
    assert.equal((await client.get("/api/notes")).status, 403);
    assert.equal((await client.post("/api/notes", { text: "hej" })).status, 403);

    const { client: withNotes } = await signedIn("med-anteckningar", { features: ["notes"] });
    assert.equal((await withNotes.get("/api/notes")).status, 200);
    assert.equal((await withNotes.post("/api/notes", { text: "egen lapp" })).status, 201);
    assert.equal((await withNotes.get("/api/notes/recipients")).status, 403, "an operator shares no notes");
  });

  test("a temporary shift leader plans their shift but administers nothing and sees nothing sensitive", async () => {
    const { client, person } = await signedIn("tillf-ledare", { role: "shift_leader", features: ["schedule", "chat", "production"] });
    const shiftPlan = await client.get(`/api/documents?scope=${dayShift.id}&keys=schedule:${WEEK},breakPlan:${WEEK},productionRecords`);
    assert.deepEqual(shiftPlan.data.forbidden, [`breakPlan:${WEEK}`], "the break plan was not ticked");
    assert.equal((await client.put(`/api/documents/${dayShift.id}/schedule:${WEEK}`, { value: {}, baseVersion: 0 })).status, 200);
    assert.equal((await client.put(`/api/documents/${dayShift.id}/breakPlan:${WEEK}`, { value: {}, baseVersion: 0 })).status, 403);
    assert.equal((await client.get("/api/chat/messages")).status, 200);
    const production = await client.patch(`/api/production/${dayShift.id}/2026-11-02`, { machines: { GD1: { result: 12 } } });
    assert.equal(production.status, 200, "production was ticked");
    const { client: withoutProduction } = await signedIn("tillf-hand", { role: "right_hand", features: ["schedule"] });
    assert.equal((await withoutProduction.patch(`/api/production/${dayShift.id}/2026-11-02`, { machines: { GD1: { result: 1 } } })).status, 403);

    const sensitive = await client.get("/api/documents?scope=global&keys=machineSkills,testResults,assessments,safetySnapshots,workItemTrash,appSettings");
    assert.deepEqual(sensitive.data.forbidden.sort(), ["assessments", "machineSkills", "safetySnapshots", "testResults", "workItemTrash"]);
    assert.equal((await client.put("/api/documents/global/appSettings", { value: {}, baseVersion: 0 })).status, 403, "shared settings");

    for (const [method, path, body] of [
      ["post", "/api/people", { name: "Ny", account: { username: "ny", password: PASSWORD, role: "operator" } }],
      ["patch", `/api/people/${operatorPerson.id}/account`, { password: "nyttlosen1" }],
      ["patch", `/api/people/${operatorPerson.id}`, { name: "Annat" }],
      ["delete", `/api/people/${operatorPerson.id}`],
      ["get", "/api/admin/export"],
      ["get", "/api/backup/shift"],
      ["get", `/api/audit?scope=${dayShift.id}`],
      ["post", "/api/shifts", { name: "X" }],
      ["post", "/api/work-items/rename", { from: "a", to: "b" }]
    ]) {
      const result = await client[method](path, body);
      assert.equal(result.status, 403, `${method} ${path}`);
    }

    const people = (await client.get("/api/people")).data.people;
    assert.equal(people[0].id, person.id);
    assert.ok(people.every(item => item.shiftId === dayShift.id), "only the own shift");
    const lisa = people.find(item => item.name === "Lisa Ledare");
    assert.equal(lisa.phone, "");
    assert.equal(lisa.email, "");
    assert.deepEqual(lisa.account, { role: "shift_leader" }, "no usernames");
    assert.equal((await client.patch(`/api/people/${person.id}`, { phone: "070-999" })).status, 200);
    assert.equal((await client.patch(`/api/people/${person.id}`, { name: "Nytt namn" })).status, 403);
  });

  test("may change their own password, but need not", async () => {
    const { client } = await signedIn("byter");
    assert.equal((await client.get("/api/me")).data.user.mustChangePassword, false);
    const changed = await client.post("/api/me/password", { currentPassword: PASSWORD, newPassword: "egetlosen1" });
    assert.equal(changed.status, 200);
    assert.equal((await temporaryLogin(server.client(), "byter", "egetlosen1")).status, 200);
  });

  test("regular shift leaders cannot reset or change a temporary account in their shift", async () => {
    const person = await createTemporary("skyddad", { features: ["schedule"] });
    assert.equal((await leader.patch(`/api/people/${person.id}/account`, { role: "right_hand" })).status, 403);
    assert.equal((await leader.patch(`/api/people/${person.id}/account`, { features: ["chat"] })).status, 403);
    assert.equal((await leader.patch(`/api/people/${person.id}`, { availability: "off" })).status, 200, "still staff in the shift");
  });

  test("can never sign in with Microsoft", async () => {
    await createTemporary("ms-test", {}, eveningShift.id);
    await assert.rejects(
      server.pool.query("UPDATE users SET entra_oid = 'oid-1' WHERE username = 'ms-test'"),
      /users_temporary_check/
    );
  });
});
