const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");
const { ROLE_LEVELS, ROLE_VALUES, roleLevel, assignableRoles } = require("../permissions");

const PASSWORD = "losenord123";

describe("role hierarchy", () => {
  let server, admin, leader, rightHand;
  let adminPerson, leaderPerson, otherLeader, hand, anna, bo, erik;

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    leader = server.client();
    rightHand = server.client();
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    adminPerson = (await admin.get("/api/me")).data.person;
    const day = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    const evening = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const person = async (name, shiftId, username, role) => (await admin.post("/api/people", {
      name, shiftId, ...(username ? { account: { username, password: PASSWORD, role, mustChangePassword: false } } : {})
    })).data.person;
    leaderPerson = await person("Lisa Ledare", day.id, "lisa", "shift_leader");
    otherLeader = await person("Leo Ledare", day.id, "leo", "shift_leader");
    hand = await person("Hanna Hand", day.id, "hanna", "right_hand");
    anna = await person("Anna Operatör", day.id, "anna", "operator");
    bo = await person("Bo Utan Inlogg", day.id);
    erik = await person("Erik Kväll", evening.id, "erik", "operator");
    await leader.login("lisa", PASSWORD);
    await rightHand.login("hanna", PASSWORD);
  });

  after(async () => {
    await server?.close();
  });

  test("every role has a level, admin highest", () => {
    assert.deepEqual(Object.keys(ROLE_LEVELS).sort(), [...ROLE_VALUES].sort());
    assert.ok(roleLevel("admin") > roleLevel("shift_leader"));
    assert.ok(roleLevel("shift_leader") > roleLevel("right_hand"));
    assert.ok(roleLevel("right_hand") > roleLevel("operator"));
    assert.deepEqual(assignableRoles({ role: "shift_leader" }).sort(), ["operator", "right_hand"]);
    assert.deepEqual(assignableRoles({ role: "right_hand" }), ["operator"]);
    assert.deepEqual(assignableRoles({ role: "operator" }), []);
  });

  test("a shift leader makes an operator in their shift a right hand, and takes the role away again", async () => {
    const promoted = await leader.patch(`/api/people/${anna.id}/account`, { role: "right_hand" });
    assert.equal(promoted.status, 200);
    assert.equal(promoted.data.person.account.role, "right_hand");
    const demoted = await leader.patch(`/api/people/${anna.id}/account`, { role: "operator" });
    assert.equal(demoted.status, 200);
    assert.equal(demoted.data.person.account.role, "operator");

    assert.equal((await leader.patch(`/api/people/${hand.id}/account`, { role: "operator" })).status, 200);
    assert.equal((await leader.patch(`/api/people/${hand.id}/account`, { role: "right_hand" })).status, 200);
  });

  test("a shift leader creates right hand accounts in their shift, but nothing higher", async () => {
    const created = await leader.post(`/api/people/${bo.id}/account`, { username: "bosse", password: PASSWORD, role: "right_hand" });
    assert.equal(created.status, 201);
    assert.equal(created.data.person.account.role, "right_hand");
    assert.equal((await leader.post("/api/people", { name: "Ny Ledare", account: { username: "nyledare", password: PASSWORD, role: "shift_leader" } })).status, 403);
  });

  test("a shift leader cannot reach other shifts, their own level or above", async () => {
    assert.equal((await leader.patch(`/api/people/${erik.id}/account`, { role: "right_hand" })).status, 403, "other shift");
    assert.equal((await leader.patch(`/api/people/${anna.id}/account`, { role: "shift_leader" })).status, 403, "own level");
    assert.equal((await leader.patch(`/api/people/${anna.id}/account`, { role: "admin" })).status, 403, "above");
    assert.equal((await leader.patch(`/api/people/${otherLeader.id}/account`, { role: "operator" })).status, 403, "demote a peer");
    assert.equal((await leader.patch(`/api/people/${leaderPerson.id}/account`, { role: "admin" })).status, 403, "promote self");
    assert.equal((await leader.patch(`/api/people/${adminPerson.id}/account`, { role: "operator" })).status, 403, "demote admin");
    assert.equal((await leader.patch(`/api/people/${otherLeader.id}`, { phone: "070-9" })).status, 403, "a peer's details");
    assert.equal((await leader.patch(`/api/people/${otherLeader.id}/account`, { password: "tillfalligt1" })).status, 403, "a peer's password");
    assert.equal((await leader.patch(`/api/people/${bo.id}/account`, { password: "tillfalligt1" })).status, 200, "a right hand's password");
  });

  test("a right hand changes nobody's role and nobody at or above their level", async () => {
    assert.equal((await rightHand.patch(`/api/people/${anna.id}/account`, { role: "right_hand" })).status, 403);
    assert.equal((await rightHand.patch(`/api/people/${leaderPerson.id}/account`, { role: "operator" })).status, 403);
    assert.equal((await rightHand.patch(`/api/people/${hand.id}/account`, { role: "shift_leader" })).status, 403, "promote self");
    assert.equal((await rightHand.patch(`/api/people/${bo.id}`, { phone: "070-1" })).status, 403, "another right hand");
    assert.equal((await rightHand.patch(`/api/people/${leaderPerson.id}`, { phone: "070-1" })).status, 403);
    assert.equal((await rightHand.post("/api/people", { name: "Ny Hand", account: { username: "nyhand", password: PASSWORD, role: "right_hand" } })).status, 403);
    assert.equal((await rightHand.patch(`/api/people/${anna.id}`, { phone: "070-1" })).status, 200, "operators below are fine");
  });

  test("only admins change usernames or remove logins", async () => {
    assert.equal((await leader.patch(`/api/people/${anna.id}/account`, { username: "anna2" })).status, 403);
    assert.equal((await leader.delete(`/api/people/${anna.id}/account`)).status, 403);
    assert.equal((await admin.patch(`/api/people/${otherLeader.id}/account`, { role: "operator" })).status, 200, "admins change any role");
  });
});
