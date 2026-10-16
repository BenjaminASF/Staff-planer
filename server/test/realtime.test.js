const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, openStream, SETUP_CODE } = require("./helpers");

const PASSWORD = "losenord123";

const settle = () => new Promise(resolve => setTimeout(resolve, 300));

describe("live updates", () => {
  let server;
  let admin, leader, operator, anonymous;
  let leaderUser, shift;
  const streams = [];

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    leader = server.client();
    operator = server.client();
    anonymous = server.client();
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    shift = (await admin.get("/api/shifts")).data.shifts[0];
    await admin.post("/api/people", { name: "Lisa Ledare", shiftId: shift.id, account: { username: "lisa", password: PASSWORD, role: "shift_leader", mustChangePassword: false } });
    await admin.post("/api/people", { name: "Olle Operatör", shiftId: shift.id, account: { username: "olle", password: PASSWORD, role: "operator", mustChangePassword: false } });
    leaderUser = (await leader.login("lisa", PASSWORD)).user;
    await operator.login("olle", PASSWORD);
  });

  after(async () => {
    streams.forEach(stream => stream.close());
    await server?.close();
  });

  const open = async client => {
    const stream = await openStream(server, client);
    streams.push(stream);
    if (stream.status === 200) await stream.waitFor(event => event.type === "ready");
    return stream;
  };

  test("only signed-in users get a stream", async () => {
    assert.equal((await open(anonymous)).status, 401);
  });

  test("a saved document reaches everyone who may read it, with its version and who saved it", async () => {
    const adminStream = await open(admin);
    await settle();
    const saved = await leader.put(`/api/documents/${shift.id}/breakPlan:2026-10-12`, { value: { mon: {} }, baseVersion: 0 });
    assert.equal(saved.status, 200);
    const isBreakPlan = event => event.type === "change" && event.data.key === "breakPlan:2026-10-12";
    const received = await adminStream.waitFor(isBreakPlan);
    assert.deepEqual(received.data, { type: "document", scope: shift.id, key: "breakPlan:2026-10-12", version: saved.data.version, by: leaderUser.id });
  });

  test("operators hear about a week's schedule only once it is shared", async () => {
    const week = "2026-10-19";
    const operatorStream = await open(operator);
    const leaderStream = await open(leader);
    await settle();
    const first = await leader.put(`/api/documents/${shift.id}/schedule:${week}`, { value: { mon: {} }, baseVersion: 0 });
    const isSchedule = event => event.type === "change" && event.data.key === `schedule:${week}`;
    await leaderStream.waitFor(isSchedule);
    await settle();
    assert.ok(!operatorStream.events.some(isSchedule), "an unshared week stays hidden");

    await leader.put(`/api/documents/${shift.id}/scheduleShared:${week}`, { value: { shared: true }, baseVersion: 0 });
    await operatorStream.waitFor(event => event.data.key === `scheduleShared:${week}`);
    await leader.put(`/api/documents/${shift.id}/schedule:${week}`, { value: { tue: {} }, baseVersion: first.data.version });
    await operatorStream.waitFor(isSchedule);
  });

  test("changes others may not read are not sent to them", async () => {
    const adminStream = await open(admin);
    const operatorStream = await open(operator);
    await settle();
    await leader.put(`/api/documents/user:${leaderUser.id}/todos`, { value: [], baseVersion: 0 });
    await admin.post("/api/chat/messages", { text: "Hej" });
    await admin.post("/api/shifts", { name: "Natt" });
    await operatorStream.waitFor(event => event.data.type === "shifts");
    await adminStream.waitFor(event => event.data.type === "chat");
    assert.ok(!adminStream.events.some(event => event.data.key === "todos"), "nobody else learns about a personal list");
    const hint = await adminStream.waitFor(event => event.data.type === "sharedTodos");
    assert.deepEqual(hint.data, { type: "sharedTodos" }, "others with a list only hear to look for shared tasks again");
    assert.ok(!operatorStream.events.some(event => event.data.type === "sharedTodos"), "operators have no list to look in");
    assert.ok(!operatorStream.events.some(event => event.data.type === "chat"), "chat is for admins and shift leaders");
  });

  test("staff changes are announced", async () => {
    const leaderStream = await open(leader);
    await settle();
    await admin.post("/api/people", { name: "Nina Ny", shiftId: shift.id });
    await leaderStream.waitFor(event => event.data.type === "people");
  });
});
