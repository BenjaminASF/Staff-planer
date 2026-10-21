const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");

const PASSWORD = "losenord123";

describe("dismissed info messages", () => {
  let server, admin, operator, otherDevice;

  before(async () => {
    server = await startTestServer();
    [admin, operator, otherDevice] = Array.from({ length: 3 }, () => server.client());
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    await admin.post("/api/people", { name: "Olle Operatör", account: { username: "olle", password: PASSWORD, role: "operator", mustChangePassword: false } });
    await operator.login("olle", PASSWORD);
  });

  after(async () => {
    await server?.close();
  });

  const dismissed = async client => (await client.get("/api/me")).data.dismissedMessages;

  test("'just this time' lasts for the session and ends at the next login", async () => {
    const result = await operator.post("/api/me/dismissed-messages", { id: "tip:index.html", permanent: false });
    assert.equal(result.status, 200);
    assert.deepEqual(result.data.dismissedMessages, ["tip:index.html"]);
    assert.deepEqual(await dismissed(operator), ["tip:index.html"], "still hidden after a reload");
    await otherDevice.login("olle", PASSWORD);
    assert.deepEqual(await dismissed(otherDevice), [], "a new login shows it again");
    await operator.post("/api/logout");
    assert.deepEqual((await operator.login("olle", PASSWORD)).dismissedMessages, []);
  });

  test("'hide permanently' survives logging out and in again", async () => {
    await operator.post("/api/me/dismissed-messages", { id: "tip:rast.html", permanent: true });
    await operator.post("/api/me/dismissed-messages", { id: "tip:rast.html", permanent: true });
    await operator.post("/api/logout");
    assert.deepEqual((await operator.login("olle", PASSWORD)).dismissedMessages, ["tip:rast.html"]);
    assert.deepEqual(await dismissed(operator), ["tip:rast.html"], "stored once");
  });

  test("choices are per user", async () => {
    assert.deepEqual(await dismissed(admin), []);
  });

  test("rejects bad ids and anonymous requests", async () => {
    assert.equal((await operator.post("/api/me/dismissed-messages", { id: "<script>" })).status, 400);
    assert.equal((await server.client().post("/api/me/dismissed-messages", { id: "tip:index.html" })).status, 401);
  });
});
