const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");

const PASSWORD = "losenord123";

describe("personal settings", () => {
  let server, ada, bea, olle, adaPhone;

  before(async () => {
    server = await startTestServer();
    [ada, bea, olle, adaPhone] = Array.from({ length: 4 }, () => server.client());
    await ada.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    await ada.post("/api/people", { name: "Bea Admin", account: { username: "bea", password: PASSWORD, role: "admin", mustChangePassword: false } });
    await ada.post("/api/people", { name: "Olle Operatör", account: { username: "olle", password: PASSWORD, role: "operator", mustChangePassword: false } });
    await bea.login("bea", PASSWORD);
    await olle.login("olle", PASSWORD);
  });

  after(async () => {
    await server?.close();
  });

  const preferences = async client => (await client.get("/api/me")).data.preferences;

  test("start empty, so the app's defaults apply", async () => {
    assert.deepEqual(await preferences(ada), {});
  });

  test("one admin's settings do not change another admin's", async () => {
    const saved = await ada.patch("/api/me/preferences", { theme: "dark", autoLockMinutes: 5, showTips: false });
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.data.preferences, { theme: "dark", autoLockMinutes: 5, showTips: false });
    await bea.patch("/api/me/preferences", { theme: "light", autoLockMinutes: 60 });
    assert.deepEqual(await preferences(ada), { theme: "dark", autoLockMinutes: 5, showTips: false });
    assert.deepEqual(await preferences(bea), { theme: "light", autoLockMinutes: 60 });
  });

  test("follow the user to another device and survive logging out", async () => {
    assert.deepEqual((await adaPhone.login("ada", PASSWORD)).preferences, { theme: "dark", autoLockMinutes: 5, showTips: false });
    await ada.post("/api/logout");
    assert.deepEqual((await ada.login("ada", PASSWORD)).preferences.theme, "dark");
  });

  test("a change keeps the other settings, and null clears one", async () => {
    await ada.patch("/api/me/preferences", { scheduleView: "day", showTips: null });
    assert.deepEqual(await preferences(ada), { theme: "dark", autoLockMinutes: 5, scheduleView: "day" });
  });

  test("operators have their own settings too", async () => {
    const saved = await olle.patch("/api/me/preferences", { theme: "dark", soundNotifications: false });
    assert.equal(saved.status, 200);
    assert.deepEqual(await preferences(olle), { theme: "dark", soundNotifications: false });
  });

  test("rejects unknown settings, bad values and anonymous requests", async () => {
    assert.equal((await ada.patch("/api/me/preferences", { organizationName: "X" })).status, 400);
    assert.equal((await ada.patch("/api/me/preferences", { theme: "pink" })).status, 400);
    assert.equal((await ada.patch("/api/me/preferences", { autoLockMinutes: 7 })).status, 400);
    assert.equal((await server.client().patch("/api/me/preferences", { theme: "dark" })).status, 401);
    assert.deepEqual(await preferences(ada), { theme: "dark", autoLockMinutes: 5, scheduleView: "day" });
  });

  test("shared settings are still changed centrally by an admin", async () => {
    const saved = await ada.put("/api/documents/global/appSettings", { value: { organizationName: "Fabriken" }, baseVersion: 0 });
    assert.equal(saved.status, 200);
    assert.equal((await bea.get("/api/documents?scope=global&keys=appSettings")).data.documents.appSettings.value.organizationName, "Fabriken");
    assert.equal((await olle.put("/api/documents/global/appSettings", { value: {}, baseVersion: saved.data.version })).status, 403);
  });
});
