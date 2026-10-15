const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");

const PASSWORD = "losenord123";

describe("tests, competence and assessments", () => {
  let server, admin, leader, rightHand, operator;
  let anna, nils, hanna, otherLeader, erik, bo;

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    leader = server.client();
    rightHand = server.client();
    operator = server.client();
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    const day = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    const evening = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const person = async (name, shiftId, username, role) => (await admin.post("/api/people", {
      name, shiftId, ...(username ? { account: { username, password: PASSWORD, role, mustChangePassword: false } } : {})
    })).data.person;
    await person("Lisa Ledare", day.id, "lisa", "shift_leader");
    otherLeader = await person("Leo Ledare", day.id, "leo", "shift_leader");
    hanna = await person("Hanna Hand", day.id, "hanna", "right_hand");
    anna = await person("Anna Operatör", day.id, "anna", "operator");
    bo = await person("Bo Utan Inlogg", day.id);
    nils = await person("Nils Operatör", day.id, "nils", "operator");
    erik = await person("Erik Kväll", evening.id, "erik", "operator");
    await leader.login("lisa", PASSWORD);
    await rightHand.login("hanna", PASSWORD);
    await operator.login("anna", PASSWORD);
  });

  after(async () => {
    await server?.close();
  });

  const read = async (client, key) => (await client.get(`/api/documents?scope=global&keys=${key}`)).data.documents[key];
  const stored = async key => (await read(admin, key)).value;

  test("admin's evaluations of everyone are kept", async () => {
    const results = { [anna.id]: { GD: 2 }, [erik.id]: { GD: 3 }, [otherLeader.id]: { GD: 1 } };
    assert.equal((await admin.put("/api/documents/global/testResults", { value: results, baseVersion: 0 })).status, 200);
    const assessments = [{ id: "a1", personId: anna.id, date: "2026-10-01" }, { id: "e1", personId: erik.id, date: "2026-10-02" }];
    assert.equal((await admin.put("/api/documents/global/assessments", { value: assessments, baseVersion: 0 })).status, 200);
  });

  test("a shift leader sees test results and assessments only for the operators in their shift", async () => {
    assert.deepEqual((await read(leader, "testResults")).value, { [anna.id]: { GD: 2 } });
    assert.deepEqual((await read(leader, "assessments")).value.map(item => item.id), ["a1"]);
  });

  test("a shift leader records tests and assessments in their own shift without touching anyone else's", async () => {
    const results = await read(leader, "testResults");
    const saved = await leader.put("/api/documents/global/testResults", {
      value: { ...results.value, [nils.id]: { GD: 3 }, [hanna.id]: { Packa: 2 }, [bo.id]: { GD: 1 } }, baseVersion: results.version
    });
    assert.equal(saved.status, 200);
    assert.deepEqual(await stored("testResults"), {
      [anna.id]: { GD: 2 }, [erik.id]: { GD: 3 }, [otherLeader.id]: { GD: 1 }, [nils.id]: { GD: 3 }, [hanna.id]: { Packa: 2 }, [bo.id]: { GD: 1 }
    });

    const assessments = await read(leader, "assessments");
    const value = [...assessments.value.map(item => ({ ...item, date: "2026-10-05" })), { id: "n1", personId: nils.id, date: "2026-10-06" }];
    assert.equal((await leader.put("/api/documents/global/assessments", { value, baseVersion: assessments.version })).status, 200);
    const all = await stored("assessments");
    assert.deepEqual(all.map(item => [item.id, item.date]).sort(), [["a1", "2026-10-05"], ["e1", "2026-10-02"], ["n1", "2026-10-06"]]);

    const removed = await read(leader, "assessments");
    assert.equal((await leader.put("/api/documents/global/assessments", { value: removed.value.filter(item => item.id !== "n1"), baseVersion: removed.version })).status, 200);
    assert.deepEqual((await stored("assessments")).map(item => item.id).sort(), ["a1", "e1"]);
  });

  test("a shift leader cannot evaluate other shifts, other shift leaders or themselves", async () => {
    const results = await read(leader, "testResults");
    for (const personId of [erik.id, otherLeader.id]) {
      const result = await leader.put("/api/documents/global/testResults", { value: { ...results.value, [personId]: { GD: 0 } }, baseVersion: results.version });
      assert.equal(result.status, 403, personId);
    }
    const assessments = await read(leader, "assessments");
    const hijack = await leader.put("/api/documents/global/assessments", {
      value: [...assessments.value, { id: "e1", personId: anna.id, date: "x" }], baseVersion: assessments.version
    });
    assert.equal(hijack.status, 403, "another shift's assessment cannot be moved onto your own operator");
    assert.equal((await leader.put("/api/documents/global/assessments", {
      value: [{ id: "x1", personId: erik.id }], baseVersion: assessments.version
    })).status, 403);
    assert.equal((await stored("testResults"))[erik.id].GD, 3);
  });

  test("a shift leader updates competence for their operators and sends the rest back unchanged", async () => {
    assert.equal((await admin.put("/api/documents/global/machineSkills", { value: { [erik.id]: ["GD"] }, baseVersion: 0 })).status, 200);
    const skills = await read(leader, "machineSkills");
    assert.deepEqual(skills.value, { [erik.id]: ["GD"] }, "competence stays readable for scheduling");
    const saved = await leader.put("/api/documents/global/machineSkills", { value: { ...skills.value, [anna.id]: ["GD", "Packa"] }, baseVersion: skills.version });
    assert.equal(saved.status, 200);
    assert.deepEqual(await stored("machineSkills"), { [erik.id]: ["GD"], [anna.id]: ["GD", "Packa"] });
    const changed = await leader.put("/api/documents/global/machineSkills", { value: { [erik.id]: [] }, baseVersion: saved.data.version });
    assert.equal(changed.status, 403);
  });

  test("right hands and operators still cannot evaluate", async () => {
    assert.equal((await rightHand.put("/api/documents/global/testResults", { value: {}, baseVersion: 1 })).status, 403);
    assert.equal((await rightHand.put("/api/documents/global/machineSkills", { value: {}, baseVersion: 1 })).status, 403);
    assert.deepEqual((await rightHand.get("/api/documents?scope=global&keys=testResults,assessments")).data.forbidden.sort(), ["assessments", "testResults"]);
    assert.deepEqual((await operator.get("/api/documents?scope=global&keys=testResults,assessments,machineSkills")).data.forbidden.sort(), ["assessments", "machineSkills", "testResults"]);
  });

  test("a conflicting save shows a shift leader only their own people", async () => {
    const conflict = await leader.put("/api/documents/global/testResults", { value: {}, baseVersion: 1 });
    assert.equal(conflict.status, 409);
    assert.ok(!(erik.id in conflict.data.current.value), JSON.stringify(conflict.data));
  });
});
