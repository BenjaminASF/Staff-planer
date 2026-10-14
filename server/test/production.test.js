const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");
const { productionRetentionStart, purgeExpiredProductionRecords } = require("../store");

const PASSWORD = "losenord123";
const day = date => ({ date, target: 160, total: 100, machines: {} });

describe("monthly production reset", () => {
  let server, admin, shift;

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    shift = (await admin.get("/api/shifts")).data.shifts[0];
  });

  after(async () => {
    await server?.close();
  });

  test("last month is kept until the 10th, in the workplace's time zone", () => {
    assert.equal(productionRetentionStart(new Date("2026-11-09T12:00:00Z")), "2026-10-01");
    assert.equal(productionRetentionStart(new Date("2026-11-09T22:59:00Z")), "2026-10-01", "still the 9th in Stockholm");
    assert.equal(productionRetentionStart(new Date("2026-11-09T23:00:00Z")), "2026-11-01", "the 10th has begun in Stockholm");
    assert.equal(productionRetentionStart(new Date("2027-01-05T12:00:00Z")), "2026-12-01", "over the new year");
    assert.equal(productionRetentionStart(new Date("2027-01-10T12:00:00Z")), "2027-01-01");
  });

  test("the purge removes only expired days, in every shift", async () => {
    const records = Object.fromEntries(["2026-09-30", "2026-10-01", "2026-10-31", "2026-11-03"].map(date => [date, day(date)]));
    assert.equal((await admin.put(`/api/documents/${shift.id}/productionRecords`, { value: records, baseVersion: 0 })).status, 200);
    const read = async () => (await admin.get(`/api/documents?scope=${shift.id}&keys=productionRecords`)).data.documents.productionRecords.value;

    await purgeExpiredProductionRecords(server.pool, new Date("2026-11-09T12:00:00Z"));
    assert.deepEqual(Object.keys(await read()).sort(), ["2026-10-01", "2026-10-31", "2026-11-03"]);

    await purgeExpiredProductionRecords(server.pool, new Date("2026-11-10T06:00:00Z"));
    assert.deepEqual(Object.keys(await read()), ["2026-11-03"]);
  });
});
