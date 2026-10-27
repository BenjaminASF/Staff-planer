const fs = require("node:fs");
const path = require("node:path");
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, openStream, SETUP_CODE } = require("./helpers");

const PASSWORD = "losenord123";

describe("anteckningar", () => {
  let server, admin, leader, rightHand, operator, otherOperator, otherLeader;
  let leaderUser, rightHandUser, operatorUser, otherOperatorUser, otherLeaderUser, adminUser;
  let dayShift, eveningShift;

  before(async () => {
    server = await startTestServer();
    [admin, leader, rightHand, operator, otherOperator, otherLeader] = Array.from({ length: 6 }, () => server.client());
    adminUser = (await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD })).data.user;
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const createPerson = async (name, shiftId, username, role) => (await admin.post("/api/people", {
      name, shiftId, account: { username, password: PASSWORD, role, mustChangePassword: false }
    })).data.person;
    await createPerson("Lisa Ledare", dayShift.id, "lisa", "shift_leader");
    await createPerson("Hanna Hand", dayShift.id, "hanna", "right_hand");
    await createPerson("Olle Operatör", dayShift.id, "olle", "operator");
    await createPerson("Kim Kväll", eveningShift.id, "kim", "operator");
    await createPerson("Kalle Kväll", eveningShift.id, "kalle", "shift_leader");
    leaderUser = (await leader.login("lisa", PASSWORD)).user;
    rightHandUser = (await rightHand.login("hanna", PASSWORD)).user;
    operatorUser = (await operator.login("olle", PASSWORD)).user;
    otherOperatorUser = (await otherOperator.login("kim", PASSWORD)).user;
    otherLeaderUser = (await otherLeader.login("kalle", PASSWORD)).user;
  });

  after(async () => {
    await server?.close();
  });

  const notesOf = async client => (await client.get("/api/notes")).data;
  const ids = notes => notes.map(note => note.id).sort();
  const noteKinds = async client => (await client.get("/api/notifications")).data.notifications.map(note => note.kind);

  test("a personal note is seen only by its author", async () => {
    const created = await operator.post("/api/notes", { text: "Fråga om semester", color: "mint" });
    assert.equal(created.status, 201);
    assert.equal(created.data.note.kind, "personal");
    assert.equal(created.data.note.color, "mint");
    assert.ok(ids((await notesOf(operator)).notes).includes(created.data.note.id));
    for (const client of [admin, leader, rightHand]) {
      assert.ok(!ids((await notesOf(client)).notes).includes(created.data.note.id));
    }
    assert.equal((await admin.patch(`/api/notes/${created.data.note.id}`, { priority: true })).status, 404, "admins cannot reach someone's private note");
  });

  test("operators cannot share notes", async () => {
    const result = await operator.post("/api/notes", { kind: "group", text: "Hej", people: [leaderUser.id] });
    assert.equal(result.status, 403);
    assert.equal((await operator.get("/api/notes/recipients")).status, 403);
  });

  test("a group note reaches only the chosen people, who are notified", async () => {
    const stream = await openStream(server, operator);
    try {
      await stream.waitFor(event => event.type === "ready");
      const created = await leader.post("/api/notes", { kind: "group", text: "Ny etikettrulle på linje 2", people: [operatorUser.id] });
      assert.equal(created.status, 201);
      const id = created.data.note.id;
      assert.deepEqual(created.data.note.recipients.map(person => [person.id, person.read]), [[operatorUser.id, false]]);
      await stream.waitFor(event => event.data.type === "notes");

      const seen = await notesOf(operator);
      const note = seen.notes.find(item => item.id === id);
      assert.equal(note.unread, true);
      assert.equal(note.recipients[0].read, undefined, "only the author sees who has read it");
      assert.equal(seen.unread, 1);
      assert.equal((await operator.get("/api/notes/unread")).data.count, 1);
      assert.deepEqual(await noteKinds(operator), ["noteShared"]);
      for (const client of [rightHand, admin, otherOperator]) {
        assert.ok(!ids((await notesOf(client)).notes).includes(id), "people who were not chosen do not see it");
      }
      assert.ok(!(await noteKinds(rightHand)).includes("noteShared"));

      assert.equal((await operator.put(`/api/notes/${id}/state`, { read: true })).status, 200);
      assert.equal((await operator.get("/api/notes/unread")).data.count, 0);
      const authorView = (await notesOf(leader)).notes.find(item => item.id === id);
      assert.equal(authorView.recipients[0].read, true);
    } finally {
      stream.close();
    }
  });

  test("shift leaders and right hands share only within their own shift", async () => {
    assert.equal((await leader.post("/api/notes", { kind: "group", text: "Hej", people: [otherOperatorUser.id] })).status, 403);
    assert.equal((await rightHand.post("/api/notes", { kind: "group", text: "Hej", wholeShifts: [eveningShift.id] })).status, 403);
    assert.equal((await leader.post("/api/notes", { kind: "group", text: "Hej" })).status, 400, "a group note needs a recipient");
    const groups = (await rightHand.get("/api/notes/recipients")).data.groups;
    assert.deepEqual(groups.map(group => group.id), [dayShift.id]);
    assert.deepEqual(groups[0].people.map(person => person.id).sort(), [leaderUser.id, operatorUser.id].sort());
  });

  test("admins share with anyone, and a whole shift includes its later members", async () => {
    const groups = (await admin.get("/api/notes/recipients")).data.groups;
    assert.deepEqual(groups.map(group => group.id), [dayShift.id, eveningShift.id], "shifts without anyone to share with are left out");
    const created = await admin.post("/api/notes", { kind: "group", text: "Brandövning tisdag", wholeShifts: [eveningShift.id], people: [leaderUser.id] });
    assert.equal(created.status, 201);
    const id = created.data.note.id;
    assert.deepEqual(created.data.note.recipients.map(person => person.id).sort(), [leaderUser.id, otherOperatorUser.id, otherLeaderUser.id].sort());
    assert.ok(!ids((await notesOf(operator)).notes).includes(id));

    const newcomer = server.client();
    await admin.post("/api/people", { name: "Nina Ny", shiftId: eveningShift.id, account: { username: "nina", password: PASSWORD, role: "operator", mustChangePassword: false } });
    await newcomer.login("nina", PASSWORD);
    const seen = (await notesOf(newcomer)).notes.find(note => note.id === id);
    assert.equal(seen?.unread, true);
  });

  test("changing who a note is shared with notifies new people and cuts off removed ones", async () => {
    const created = await leader.post("/api/notes", { kind: "group", text: "GD-utbildning torsdag", people: [operatorUser.id, rightHandUser.id] });
    const id = created.data.note.id;
    await rightHand.put(`/api/notes/${id}/state`, { read: true, done: true });
    assert.equal((await rightHand.patch(`/api/notes/${id}`, { people: [operatorUser.id] })).status, 403, "only the author changes the sharing");

    const changed = await leader.patch(`/api/notes/${id}`, { people: [operatorUser.id], wholeShifts: [dayShift.id] });
    assert.equal(changed.status, 200);
    assert.deepEqual(changed.data.note.recipients.map(person => person.id).sort(), [operatorUser.id, rightHandUser.id].sort());

    const removed = await leader.patch(`/api/notes/${id}`, { people: [operatorUser.id], wholeShifts: [] });
    assert.deepEqual(removed.data.note.recipients.map(person => person.id), [operatorUser.id]);
    assert.ok(!ids((await notesOf(rightHand)).notes).includes(id));
    assert.equal((await rightHand.put(`/api/notes/${id}/state`, { read: true })).status, 404);
    assert.ok(!(await rightHand.get("/api/notifications")).data.notifications.some(note => note.noteId === id), "the removed person's notification is gone");

    await leader.patch(`/api/notes/${id}`, { people: [operatorUser.id, rightHandUser.id] });
    const back = (await notesOf(rightHand)).notes.find(note => note.id === id);
    assert.equal(back.unread, true, "someone added again sees it as new");
    assert.equal(back.done, false);
    assert.ok((await rightHand.get("/api/notifications")).data.notifications.some(note => note.noteId === id && note.kind === "noteAdded"));
    assert.equal((await leader.patch(`/api/notes/${id}`, { people: [], wholeShifts: [] })).status, 400, "a group note keeps at least one recipient");
  });

  test("priority is shared, and only the author or an admin with access changes it", async () => {
    const created = await rightHand.post("/api/notes", { kind: "group", text: "Kalibrera Logimark", people: [leaderUser.id] });
    const id = created.data.note.id;
    assert.equal(created.data.note.priority, false);
    assert.equal((await leader.patch(`/api/notes/${id}`, { priority: true })).status, 403, "a recipient cannot change it");
    assert.equal((await admin.patch(`/api/notes/${id}`, { priority: true })).status, 404, "an admin without access cannot");
    const marked = await rightHand.patch(`/api/notes/${id}`, { priority: true });
    assert.equal(marked.data.note.priority, true);
    assert.equal((await notesOf(leader)).notes.find(note => note.id === id).priority, true, "every recipient sees the mark");

    const shared = await admin.post("/api/notes", { kind: "group", text: "Inventering", people: [leaderUser.id], priority: true });
    assert.equal(shared.data.note.priority, true);
    assert.equal((await admin.patch(`/api/notes/${shared.data.note.id}`, { priority: false })).data.note.priority, false);
    assert.equal((await leader.post("/api/notes", { kind: "group", text: "Till admin", people: [adminUser.id] })).status, 403, "admins are outside the leader's shift");
    const otherAdmin = server.client();
    await admin.post("/api/people", { name: "Bo Admin", shiftId: dayShift.id, account: { username: "bodil", password: PASSWORD, role: "admin", mustChangePassword: false } });
    await otherAdmin.login("bodil", PASSWORD);
    const toAdmin = await otherAdmin.post("/api/notes", { kind: "group", text: "Till Ada", people: [adminUser.id] });
    assert.equal(toAdmin.status, 201);
    assert.equal((await admin.patch(`/api/notes/${toAdmin.data.note.id}`, { priority: true })).status, 200, "an admin who sees it may mark it");
    assert.equal((await admin.patch(`/api/notes/${toAdmin.data.note.id}`, { text: "Ändrad" })).status, 403, "but not edit it");
  });

  test("text, color, done and board position are saved", async () => {
    const id = (await operator.post("/api/notes", { text: "Hörselskydd" })).data.note.id;
    assert.equal((await operator.patch(`/api/notes/${id}`, { text: "Hörselskydd storlek M", color: "pink" })).status, 200);
    assert.equal((await operator.patch(`/api/notes/${id}`, { color: "orange" })).status, 400);
    assert.equal((await operator.patch(`/api/notes/${id}`, { text: "  " })).status, 400);
    const position = { zone: "rest", x: 240, y: 200, w: 230, h: 260, z: 12 };
    const saved = await operator.put(`/api/notes/${id}/state`, { done: true, layout: { mode: "priority", position } });
    assert.deepEqual(saved.data, { read: false, done: true, layout: { priority: position } });
    const note = (await notesOf(operator)).notes.find(item => item.id === id);
    assert.equal(note.text, "Hörselskydd storlek M");
    assert.equal(note.color, "pink");
    assert.deepEqual(note.layout, { priority: position });
    assert.equal((await operator.put(`/api/notes/${id}/state`, { layout: { mode: "priority", position: { ...position, w: 5 } } })).status, 400);
    await operator.post("/api/notes/layout/reset", { mode: "priority", ids: [id] });
    assert.deepEqual((await notesOf(operator)).notes.find(item => item.id === id).layout, {});
    assert.equal((await operator.delete(`/api/notes/${id}`)).status, 200);
    assert.ok(!ids((await notesOf(operator)).notes).includes(id));
  });

  test("only the author deletes a note, and its notifications go with it", async () => {
    const id = (await leader.post("/api/notes", { kind: "group", text: "Städdag", people: [operatorUser.id] })).data.note.id;
    assert.equal((await operator.delete(`/api/notes/${id}`)).status, 403);
    assert.equal((await leader.delete(`/api/notes/${id}`)).status, 200);
    assert.ok(!(await operator.get("/api/notifications")).data.notifications.some(note => note.noteId === id));
  });

  test("open tasks from the old Att göra list become notes, shared ones still shared", async () => {
    const task = (text, extra = {}) => ({ id: text, text, createdAt: "2026-10-14T08:00:00.000Z", completedAt: "", ...extra });
    await server.pool.query("INSERT INTO documents (scope, key, value) VALUES ($1, 'todos', $2)", [
      `user:${leaderUser.id}`, JSON.stringify([
        task("Beställ handskar", { sharedWith: [adminUser.id, operatorUser.id, "no-such-user", leaderUser.id] }),
        task("Fel datum", { createdAt: "2026-02-30T10:00:00Z" }),
        task("Inget datum", { createdAt: 42 }),
        task("Klar sak", { completedAt: "2026-10-15T08:00:00.000Z" }),
        task("  "),
        "inte en uppgift"
      ])
    ]);
    await server.pool.query("INSERT INTO notifications (id, user_id, kind, title) VALUES ('old', $1, 'todoShared', 'Beställ handskar')", [adminUser.id]);
    const migration = fs.readFileSync(path.join(__dirname, "..", "migrations", "016_todos_to_notes.sql"), "utf8");
    await server.pool.query(migration);
    await server.pool.query(migration);

    const moved = (await notesOf(leader)).notes.filter(note => ["Beställ handskar", "Fel datum", "Inget datum", "Klar sak"].includes(note.text));
    assert.deepEqual(moved.map(note => [note.text, note.kind]).sort(), [["Beställ handskar", "group"], ["Fel datum", "personal"], ["Inget datum", "personal"]]);
    const shared = moved.find(note => note.kind === "group");
    assert.equal(shared.authorId, leaderUser.id, "the owner of the list writes the note");
    assert.deepEqual(shared.recipients.map(person => person.id), [adminUser.id], "only those who could see the task: not operators, not unknown ids");
    const adminView = (await notesOf(admin)).notes.find(note => note.id === shared.id);
    assert.equal(adminView?.unread, false, "it was already seen, so it is not new");
    assert.ok(!ids((await notesOf(operator)).notes).includes(shared.id));
    assert.equal((await server.pool.query("SELECT count(*)::int AS n FROM documents WHERE key = 'todos'")).rows[0].n, 0);
    assert.ok(!(await admin.get("/api/notifications")).data.notifications.some(note => note.kind === "todoShared"));
    assert.equal((await leader.put(`/api/documents/user:${leaderUser.id}/todos`, { value: [], baseVersion: 0 })).status, 400, "the old list can no longer be saved");
    assert.equal((await leader.get(`/api/documents?scope=user:${leaderUser.id}&keys=todos`)).status, 404);
    assert.equal((await leader.get("/api/todos/shared")).status, 404);

    // The leader may keep the admin, who is outside their shift, but not add someone new from outside.
    const kept = await leader.patch(`/api/notes/${shared.id}`, { people: [adminUser.id, operatorUser.id] });
    assert.equal(kept.status, 200, JSON.stringify(kept.data));
    assert.deepEqual(kept.data.note.recipients.map(person => person.id).sort(), [adminUser.id, operatorUser.id].sort());
    assert.equal((await leader.patch(`/api/notes/${shared.id}`, { people: [adminUser.id, otherOperatorUser.id] })).status, 403);
  });

  test("restoring the same old backup again does not duplicate its tasks", async () => {
    const backup = (await admin.get("/api/admin/export")).data;
    backup.version = 2;
    backup.documents.push({ scope: dayShift.id, key: "todos", value: [
      { id: "a", text: "Byt filter på GD1", completedAt: "" },
      { id: "b", text: "Byt filter på GD1", completedAt: "" },
      { id: "c", text: "Klar", completedAt: "2026-10-01T08:00:00.000Z" }
    ] });
    const first = await admin.post("/api/admin/import", backup);
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(first.data.todos, 2, "two open tasks, kept as two notes");
    const second = await admin.post("/api/admin/import", backup);
    assert.equal(second.data.todos, 0);
    const legacy = await admin.post("/api/admin/import-legacy", { shiftId: dayShift.id, people: [], global: {}, shift: { todos: [{ text: "Byt filter på GD1" }, { text: "Ring leverantören" }] } });
    assert.equal(legacy.status, 200, JSON.stringify(legacy.data));
    assert.deepEqual([legacy.data.documents, legacy.data.todos], [0, 1], "the old list is not counted as a data item");
    const texts = (await notesOf(admin)).notes.filter(note => note.kind === "personal").map(note => note.text).sort();
    assert.deepEqual(texts, ["Byt filter på GD1", "Byt filter på GD1", "Ring leverantören"]);
  });

  test("the sort order is a personal preference", async () => {
    assert.equal((await leader.patch("/api/me/preferences", { notesSort: "oldest" })).status, 200);
    assert.equal((await leader.patch("/api/me/preferences", { notesSort: "random" })).status, 400);
  });
});
