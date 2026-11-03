const fs = require("node:fs");
const path = require("node:path");
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, openStream, SETUP_CODE } = require("./helpers");

const PASSWORD = "losenord123";

// Who is who: Ada and Bodil are admins (Bodil in the day shift). Lisa leads the day shift,
// Hanna is its right hand, Sara a senior operator and Olle an operator there. In the
// evening shift Kalle leads, Sven is a senior operator and Kim an operator.
describe("anteckningar", () => {
  let server, admin, otherAdmin, leader, rightHand, senior, operator, otherOperator, otherLeader, otherSenior;
  let adminUser, otherAdminUser, leaderUser, rightHandUser, seniorUser, operatorUser, otherOperatorUser, otherLeaderUser, otherSeniorUser;
  let dayShift, eveningShift;

  before(async () => {
    server = await startTestServer();
    [admin, otherAdmin, leader, rightHand, senior, operator, otherOperator, otherLeader, otherSenior] = Array.from({ length: 9 }, () => server.client());
    adminUser = (await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD })).data.user;
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    eveningShift = (await admin.post("/api/shifts", { name: "Kväll" })).data.shift;
    const createPerson = async (name, shiftId, username, role) => (await admin.post("/api/people", {
      name, shiftId, account: { username, password: PASSWORD, role, mustChangePassword: false }
    })).data.person;
    await createPerson("Bodil Admin", dayShift.id, "bodil", "admin");
    await createPerson("Lisa Ledare", dayShift.id, "lisa", "shift_leader");
    await createPerson("Hanna Hand", dayShift.id, "hanna", "right_hand");
    await createPerson("Sara Senior", dayShift.id, "sara", "senior_operator");
    await createPerson("Olle Operatör", dayShift.id, "olle", "operator");
    await createPerson("Kim Kväll", eveningShift.id, "kim", "operator");
    await createPerson("Kalle Kväll", eveningShift.id, "kalle", "shift_leader");
    await createPerson("Sven Senior", eveningShift.id, "sven", "senior_operator");
    otherAdminUser = (await otherAdmin.login("bodil", PASSWORD)).user;
    leaderUser = (await leader.login("lisa", PASSWORD)).user;
    rightHandUser = (await rightHand.login("hanna", PASSWORD)).user;
    seniorUser = (await senior.login("sara", PASSWORD)).user;
    operatorUser = (await operator.login("olle", PASSWORD)).user;
    otherOperatorUser = (await otherOperator.login("kim", PASSWORD)).user;
    otherLeaderUser = (await otherLeader.login("kalle", PASSWORD)).user;
    otherSeniorUser = (await otherSenior.login("sven", PASSWORD)).user;
  });

  after(async () => {
    await server?.close();
  });

  const notesOf = async client => (await client.get("/api/notes")).data;
  const ids = notes => notes.map(note => note.id).sort();
  // Operators get 403 and see nothing.
  const sees = async (client, id) => ids((await notesOf(client)).notes || []).includes(id);
  const noteKinds = async client => (await client.get("/api/notifications")).data.notifications.map(note => note.kind);
  const recipientsOf = note => note.recipients.map(person => person.id).sort();
  const pickable = async client => (await client.get("/api/notes/recipients")).data.groups.flatMap(group => group.people.map(person => person.id)).sort();

  test("a personal note is seen only by its author", async () => {
    const created = await senior.post("/api/notes", { text: "Fråga om semester", color: "mint" });
    assert.equal(created.status, 201);
    assert.equal(created.data.note.kind, "personal");
    assert.equal(created.data.note.color, "mint");
    assert.ok(await sees(senior, created.data.note.id));
    for (const client of [admin, leader, rightHand, otherSenior]) {
      assert.ok(!(await sees(client, created.data.note.id)));
    }
    assert.equal((await admin.patch(`/api/notes/${created.data.note.id}`, { priority: true })).status, 404, "admins cannot reach someone's private note");
  });

  test("operators have no notes at all", async () => {
    for (const [method, url, body] of [
      ["get", "/api/notes"], ["get", "/api/notes/unread"], ["get", "/api/notes/recipients"],
      ["post", "/api/notes", { text: "Hej" }], ["post", "/api/notes", { kind: "group", text: "Hej", people: [leaderUser.id] }],
      ["post", "/api/notes/layout/reset", { mode: "priority", ids: [] }]
    ]) {
      assert.equal((await operator[method](url, body)).status, 403, `${method} ${url}`);
    }
    for (const client of [admin, leader, rightHand, senior]) {
      const people = await pickable(client);
      assert.ok(!people.includes(operatorUser.id) && !people.includes(otherOperatorUser.id), "operators are never offered as recipients");
    }
    const picked = await leader.post("/api/notes", { kind: "group", text: "Hej", people: [operatorUser.id] });
    assert.equal(picked.status, 403);
    assert.equal(picked.data.error, "Operatörer har inte tillgång till Anteckningar.");
    const whole = await leader.post("/api/notes", { kind: "group", text: "Till hela dagskiftet", wholeShifts: [dayShift.id] });
    assert.equal(whole.status, 201);
    assert.ok(!recipientsOf(whole.data.note).includes(operatorUser.id), "a whole shift leaves operators out");
    assert.ok(!(await noteKinds(operator)).includes("noteShared"));
    await leader.delete(`/api/notes/${whole.data.note.id}`);
  });

  test("a group note reaches only the chosen people, who are notified", async () => {
    const stream = await openStream(server, senior);
    const operatorStream = await openStream(server, operator);
    try {
      await stream.waitFor(event => event.type === "ready");
      await operatorStream.waitFor(event => event.type === "ready");
      const created = await leader.post("/api/notes", { kind: "group", text: "Ny etikettrulle på linje 2", people: [seniorUser.id] });
      assert.equal(created.status, 201);
      const id = created.data.note.id;
      assert.deepEqual(created.data.note.recipients.map(person => [person.id, person.read]), [[seniorUser.id, false]]);
      await stream.waitFor(event => event.data.type === "notes");

      const seen = await notesOf(senior);
      const note = seen.notes.find(item => item.id === id);
      assert.equal(note.unread, true);
      assert.equal(note.canComment, true);
      assert.equal(note.recipients[0].read, undefined, "only the author sees who has read it");
      assert.equal(seen.unread, 1);
      assert.equal((await senior.get("/api/notes/unread")).data.count, 1);
      assert.deepEqual(await noteKinds(senior), ["noteShared"]);
      for (const client of [rightHand, admin, otherSenior]) {
        assert.ok(!(await sees(client, id)), "people who were not chosen do not see it");
      }
      assert.ok(!(await noteKinds(rightHand)).includes("noteShared"));
      assert.ok(!operatorStream.events.some(event => event.data?.type === "notes"), "operators are not told that notes changed");

      assert.equal((await senior.put(`/api/notes/${id}/state`, { read: true })).status, 200);
      assert.equal((await senior.get("/api/notes/unread")).data.count, 0);
      const authorView = (await notesOf(leader)).notes.find(item => item.id === id);
      assert.equal(authorView.recipients[0].read, true);
    } finally {
      stream.close();
      operatorStream.close();
    }
  });

  test("shift leaders and right hands share only within their own shift", async () => {
    assert.equal((await leader.post("/api/notes", { kind: "group", text: "Hej", people: [otherSeniorUser.id] })).status, 403);
    assert.equal((await rightHand.post("/api/notes", { kind: "group", text: "Hej", wholeShifts: [eveningShift.id] })).status, 403);
    assert.equal((await leader.post("/api/notes", { kind: "group", text: "Hej" })).status, 400, "a group note needs a recipient");
    const recipients = (await rightHand.get("/api/notes/recipients")).data;
    assert.deepEqual(recipients.groups.map(group => group.id), [dayShift.id]);
    assert.deepEqual(recipients.groups[0].people.map(person => person.id).sort(), [otherAdminUser.id, leaderUser.id, seniorUser.id].sort());
    assert.deepEqual(recipients.wholeShiftRoles.sort(), ["admin", "right_hand", "senior_operator", "shift_leader"]);

    const whole = await rightHand.post("/api/notes", { kind: "group", text: "Möte 14.00", wholeShifts: [dayShift.id] });
    assert.equal(whole.status, 201);
    assert.deepEqual(recipientsOf(whole.data.note), [otherAdminUser.id, leaderUser.id, seniorUser.id].sort(), "the whole shift: everyone in it but operators");
    assert.ok(await sees(otherAdmin, whole.data.note.id));
    assert.ok(!(await sees(admin, whole.data.note.id)), "an admin outside the shift is not in it");
    await rightHand.delete(`/api/notes/${whole.data.note.id}`);
  });

  test("admins share with anyone in any shift, and a whole shift includes its later members", async () => {
    const recipients = (await admin.get("/api/notes/recipients")).data;
    assert.deepEqual(recipients.groups.map(group => group.id), [dayShift.id, eveningShift.id], "shifts without anyone to share with are left out");
    assert.deepEqual(recipients.wholeShiftRoles.sort(), ["admin", "right_hand", "senior_operator", "shift_leader"]);
    const people = await pickable(admin);
    assert.ok([otherAdminUser.id, leaderUser.id, rightHandUser.id, seniorUser.id, otherLeaderUser.id, otherSeniorUser.id].every(id => people.includes(id)));

    const created = await admin.post("/api/notes", { kind: "group", text: "Brandövning tisdag", wholeShifts: [eveningShift.id], people: [leaderUser.id] });
    assert.equal(created.status, 201);
    const id = created.data.note.id;
    assert.deepEqual(recipientsOf(created.data.note), [leaderUser.id, otherLeaderUser.id, otherSeniorUser.id].sort(), "no operators in the whole shift");
    for (const client of [otherOperator, rightHand]) assert.ok(!(await sees(client, id)));

    const newcomer = server.client();
    await admin.post("/api/people", { name: "Nina Ny", shiftId: eveningShift.id, account: { username: "nina", password: PASSWORD, role: "right_hand", mustChangePassword: false } });
    await newcomer.login("nina", PASSWORD);
    const seen = (await notesOf(newcomer)).notes.find(note => note.id === id);
    assert.equal(seen?.unread, true);
  });

  test("admins and senior operators share notes with each other, one by one and as a whole shift", async () => {
    const people = (await senior.get("/api/notes/recipients")).data.groups.flatMap(group => group.people.map(person => person.id));
    assert.ok([adminUser.id, otherAdminUser.id, leaderUser.id, rightHandUser.id, otherLeaderUser.id, otherSeniorUser.id].every(id => people.includes(id)), "a senior operator picks admins and anyone in any shift");
    assert.ok(!people.includes(operatorUser.id) && !people.includes(otherOperatorUser.id));

    const toAdmin = await senior.post("/api/notes", { kind: "group", text: "GD-3 läcker lim", people: [adminUser.id, otherLeaderUser.id] });
    assert.equal(toAdmin.status, 201);
    assert.deepEqual(recipientsOf(toAdmin.data.note), [adminUser.id, otherLeaderUser.id].sort());
    assert.ok(await sees(admin, toAdmin.data.note.id));
    assert.ok((await noteKinds(admin)).includes("noteShared"));
    assert.equal((await admin.post(`/api/notes/${toAdmin.data.note.id}/comments`, { text: "Tack, jag kollar." })).status, 201);
    assert.ok((await noteKinds(senior)).includes("noteComment"));

    const toSenior = await admin.post("/api/notes", { kind: "group", text: "Inventering fredag", people: [seniorUser.id, otherSeniorUser.id] });
    assert.equal(toSenior.status, 201);
    assert.ok(await sees(senior, toSenior.data.note.id));
    assert.ok(await sees(otherSenior, toSenior.data.note.id));

    const seniorWhole = await senior.post("/api/notes", { kind: "group", text: "Till hela dagskiftet", wholeShifts: [dayShift.id] });
    assert.deepEqual(recipientsOf(seniorWhole.data.note), [otherAdminUser.id, leaderUser.id, rightHandUser.id].sort(), "Bodil (admin) is in the whole shift, Olle (operator) is not");
    assert.ok(!(await sees(operator, seniorWhole.data.note.id)));
    const adminWhole = await admin.post("/api/notes", { kind: "group", text: "Till dagskiftet", wholeShifts: [dayShift.id] });
    assert.deepEqual(recipientsOf(adminWhole.data.note), [otherAdminUser.id, leaderUser.id, rightHandUser.id, seniorUser.id].sort());

    const mixed = await leader.post("/api/notes", { kind: "group", text: "Till Bodil och Sara", people: [otherAdminUser.id, seniorUser.id], wholeShifts: [dayShift.id] });
    assert.equal(mixed.status, 201, "shift leaders put an admin and senior operators on the same note");
    assert.ok(await sees(otherAdmin, mixed.data.note.id));
    assert.ok(await sees(senior, mixed.data.note.id));
  });

  test("changing who a note is shared with notifies new people and cuts off removed ones", async () => {
    const created = await leader.post("/api/notes", { kind: "group", text: "GD-utbildning torsdag", people: [seniorUser.id, rightHandUser.id] });
    const id = created.data.note.id;
    await rightHand.put(`/api/notes/${id}/state`, { read: true, done: true });
    assert.equal((await rightHand.patch(`/api/notes/${id}`, { people: [seniorUser.id] })).status, 403, "only the author changes the sharing");

    const changed = await leader.patch(`/api/notes/${id}`, { people: [seniorUser.id], wholeShifts: [dayShift.id] });
    assert.equal(changed.status, 200);
    assert.deepEqual(recipientsOf(changed.data.note), [otherAdminUser.id, seniorUser.id, rightHandUser.id].sort(), "the whole day shift, Bodil (admin) included");

    const removed = await leader.patch(`/api/notes/${id}`, { people: [seniorUser.id], wholeShifts: [] });
    assert.deepEqual(recipientsOf(removed.data.note), [seniorUser.id]);
    assert.ok(!(await sees(rightHand, id)));
    assert.equal((await rightHand.put(`/api/notes/${id}/state`, { read: true })).status, 404);
    assert.ok(!(await rightHand.get("/api/notifications")).data.notifications.some(note => note.noteId === id), "the removed person's notification is gone");

    await leader.patch(`/api/notes/${id}`, { people: [seniorUser.id, rightHandUser.id] });
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
    const toAdmin = await otherAdmin.post("/api/notes", { kind: "group", text: "Till Ada", people: [adminUser.id] });
    assert.equal(toAdmin.status, 201);
    assert.equal((await admin.patch(`/api/notes/${toAdmin.data.note.id}`, { priority: true })).status, 200, "an admin who sees it may mark it");
    assert.equal((await admin.patch(`/api/notes/${toAdmin.data.note.id}`, { text: "Ändrad" })).status, 403, "but not edit it");
  });

  test("everyone on a group note comments, and removes only their own comments", async () => {
    const created = await otherSenior.post("/api/notes", { kind: "group", text: "Ny limsort på linje 1", people: [otherLeaderUser.id, seniorUser.id] });
    const id = created.data.note.id;
    assert.deepEqual(created.data.note.comments, []);
    assert.equal((await senior.patch(`/api/notes/${id}`, { text: "Ändrad" })).status, 403, "only the author changes the text");

    const first = await senior.post(`/api/notes/${id}/comments`, { text: "  Har ni testat den?  " });
    assert.equal(first.status, 201);
    assert.deepEqual(first.data.note.comments.map(comment => [comment.authorId, comment.text, comment.canDelete]), [[seniorUser.id, "Har ni testat den?", true]]);
    assert.ok((await noteKinds(otherSenior)).includes("noteComment"), "the author hears about it");
    assert.ok((await noteKinds(otherLeader)).includes("noteComment"), "and so do the other recipients");
    const commentNotices = async client => (await client.get("/api/notifications")).data.notifications.filter(note => note.kind === "noteComment" && note.noteId === id);
    assert.equal((await commentNotices(senior)).length, 0, "but not the one who wrote it");

    assert.equal((await otherLeader.post(`/api/notes/${id}/comments`, { text: "Ja, den fungerar." })).status, 201);
    assert.equal((await otherSenior.post(`/api/notes/${id}/comments`, { text: "Tack!" })).status, 201);
    const seen = (await notesOf(otherLeader)).notes.find(note => note.id === id);
    assert.deepEqual(seen.comments.map(comment => [comment.authorName, comment.text, comment.canDelete]), [
      ["Sara Senior", "Har ni testat den?", false], ["Kalle Kväll", "Ja, den fungerar.", true], ["Sven Senior", "Tack!", false]
    ]);

    assert.equal((await otherLeader.post(`/api/notes/${id}/comments`, { text: "   " })).status, 400);
    assert.equal((await otherLeader.post(`/api/notes/${id}/comments`, { text: "x".repeat(1001) })).status, 400);
    for (const client of [admin, leader, rightHand]) {
      assert.equal((await client.post(`/api/notes/${id}/comments`, { text: "Hej" })).status, 404, "only people on the note comment");
    }
    assert.equal((await operator.post(`/api/notes/${id}/comments`, { text: "Hej" })).status, 403);

    const mine = seen.comments[0].id;
    assert.equal((await otherLeader.delete(`/api/notes/${id}/comments/${mine}`)).status, 403, "not someone else's comment");
    assert.equal((await otherSenior.delete(`/api/notes/${id}/comments/${mine}`)).status, 403, "not even the note's author");
    const deleted = await senior.delete(`/api/notes/${id}/comments/${mine}`);
    assert.equal(deleted.status, 200);
    assert.equal(deleted.data.note.comments.length, 2);
    assert.equal((await senior.delete(`/api/notes/${id}/comments/${mine}`)).status, 404);

    const personal = await senior.post("/api/notes", { text: "Egen" });
    assert.equal((await senior.post(`/api/notes/${personal.data.note.id}/comments`, { text: "Hej" })).status, 400, "personal notes have no comments");

    assert.equal((await otherSenior.delete(`/api/notes/${id}`)).status, 200);
    assert.equal((await server.pool.query("SELECT count(*)::int AS n FROM note_comments WHERE note_id = $1", [id])).rows[0].n, 0, "the comments go with the note");
  });

  test("text, color, done and board position are saved", async () => {
    const id = (await senior.post("/api/notes", { text: "Hörselskydd" })).data.note.id;
    assert.equal((await senior.patch(`/api/notes/${id}`, { text: "Hörselskydd storlek M", color: "pink" })).status, 200);
    assert.equal((await senior.patch(`/api/notes/${id}`, { color: "orange" })).status, 400);
    assert.equal((await senior.patch(`/api/notes/${id}`, { text: "  " })).status, 400);
    const position = { zone: "rest", x: 240, y: 200, w: 230, h: 260, z: 12 };
    const saved = await senior.put(`/api/notes/${id}/state`, { done: true, layout: { mode: "priority", position } });
    assert.deepEqual(saved.data, { read: false, done: true, layout: { priority: position } });
    const note = (await notesOf(senior)).notes.find(item => item.id === id);
    assert.equal(note.text, "Hörselskydd storlek M");
    assert.equal(note.color, "pink");
    assert.deepEqual(note.layout, { priority: position });
    assert.equal((await senior.put(`/api/notes/${id}/state`, { layout: { mode: "priority", position: { ...position, w: 5 } } })).status, 400);
    await senior.post("/api/notes/layout/reset", { mode: "priority", ids: [id] });
    assert.deepEqual((await notesOf(senior)).notes.find(item => item.id === id).layout, {});
    assert.equal((await senior.delete(`/api/notes/${id}`)).status, 200);
    assert.ok(!(await sees(senior, id)));
  });

  test("only the author deletes a note, and its notifications go with it", async () => {
    const id = (await leader.post("/api/notes", { kind: "group", text: "Städdag", people: [seniorUser.id] })).data.note.id;
    assert.equal((await senior.delete(`/api/notes/${id}`)).status, 403);
    assert.equal((await leader.delete(`/api/notes/${id}`)).status, 200);
    assert.ok(!(await senior.get("/api/notifications")).data.notifications.some(note => note.noteId === id));
  });

  test("someone who becomes an operator loses their notes and the shared ones", async () => {
    const sven = (await admin.get("/api/people")).data.people.find(person => person.account?.username === "sven");
    const own = (await otherSenior.post("/api/notes", { text: "Svens egen" })).data.note.id;
    const shared = (await otherLeader.post("/api/notes", { kind: "group", text: "Till Sven", people: [otherSeniorUser.id] })).data.note.id;
    const written = (await otherSenior.post("/api/notes", { kind: "group", text: "Från Sven", people: [otherLeaderUser.id] })).data.note.id;
    assert.equal((await admin.patch(`/api/people/${sven.id}/account`, { role: "operator" })).status, 200);
    assert.equal((await otherSenior.get("/api/notes")).status, 403);
    assert.ok(!(await otherSenior.get("/api/notifications")).data.notifications.some(note => note.noteId), "notifications about notes are hidden");
    assert.ok(!(await sees(otherLeader, written)), "nobody sees a note written by an operator");
    assert.ok(!(await notesOf(otherLeader)).notes.find(note => note.id === shared).recipients.length, "nor is an operator listed on one");
    assert.equal((await admin.patch(`/api/people/${sven.id}/account`, { role: "senior_operator" })).status, 200);
    assert.ok(await sees(otherSenior, own));
  });

  test("the update removes operators' notes for good and leaves everyone else's", async () => {
    const pool = server.pool;
    const insert = (id, author, kind, wholeShifts = []) => pool.query(
      "INSERT INTO notes (id, author_id, kind, body, whole_shifts) VALUES ($1, $2, $3, $1, $4)", [id, author, kind, wholeShifts]
    );
    const share = (note, user) => pool.query("INSERT INTO note_people (note_id, user_id) VALUES ($1, $2)", [note, user]);
    const state = (note, user) => pool.query("INSERT INTO note_states (note_id, user_id, read_at) VALUES ($1, $2, now())", [note, user]);
    const notify = (note, user) => pool.query("INSERT INTO notifications (id, user_id, kind, title, note_id) VALUES (gen_random_uuid()::text, $1, 'noteShared', 'x', $2)", [user, note]);
    const comment = (note, user) => pool.query("INSERT INTO note_comments (id, note_id, author_id, body) VALUES (gen_random_uuid()::text, $1, $2, 'x')", [note, user]);

    // As before the update: Olle (operator) wrote notes and was on others' notes.
    await insert("olle-own", operatorUser.id, "personal");
    await insert("olle-group", operatorUser.id, "group");
    await share("olle-group", leaderUser.id);
    await notify("olle-group", leaderUser.id);
    await comment("olle-group", leaderUser.id);
    await insert("lisa-to-olle", leaderUser.id, "group");
    await share("lisa-to-olle", operatorUser.id);
    await share("lisa-to-olle", rightHandUser.id);
    await state("lisa-to-olle", operatorUser.id);
    await notify("lisa-to-olle", operatorUser.id);
    // Admins and senior operators on the same notes stay as they are.
    await insert("ada-to-sara", adminUser.id, "group");
    await share("ada-to-sara", seniorUser.id);
    await share("ada-to-sara", leaderUser.id);
    await notify("ada-to-sara", seniorUser.id);
    await insert("lisa-to-both", leaderUser.id, "group");
    await share("lisa-to-both", otherAdminUser.id);
    await share("lisa-to-both", seniorUser.id);
    await notify("lisa-to-both", otherAdminUser.id);
    await insert("lisa-to-bodil", leaderUser.id, "group");
    await share("lisa-to-bodil", otherAdminUser.id);
    await insert("leader-personal", leaderUser.id, "personal");

    await pool.query(fs.readFileSync(path.join(__dirname, "..", "migrations", "024_notes_roles_and_comments.sql"), "utf8"));

    const left = (await pool.query("SELECT id FROM notes WHERE id = ANY($1)", [["olle-own", "olle-group", "lisa-to-olle", "ada-to-sara", "lisa-to-both", "lisa-to-bodil", "leader-personal"]])).rows.map(row => row.id).sort();
    assert.deepEqual(left, ["ada-to-sara", "leader-personal", "lisa-to-bodil", "lisa-to-both", "lisa-to-olle"], "only the operator's notes are gone");
    const on = async note => (await pool.query("SELECT user_id FROM note_people WHERE note_id = $1", [note])).rows.map(row => row.user_id).sort();
    assert.deepEqual(await on("lisa-to-olle"), [rightHandUser.id]);
    assert.deepEqual(await on("ada-to-sara"), [seniorUser.id, leaderUser.id].sort());
    assert.deepEqual(await on("lisa-to-both"), [otherAdminUser.id, seniorUser.id].sort());
    assert.deepEqual(await on("lisa-to-bodil"), [otherAdminUser.id]);
    const count = async (sql, params) => (await pool.query(sql, params)).rows[0].n;
    assert.equal(await count("SELECT count(*)::int AS n FROM note_states WHERE user_id = $1", [operatorUser.id]), 0);
    assert.equal(await count("SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND note_id IS NOT NULL", [operatorUser.id]), 0);
    assert.equal(await count("SELECT count(*)::int AS n FROM notifications WHERE note_id = 'ada-to-sara' AND user_id = $1", [seniorUser.id]), 1);
    assert.equal(await count("SELECT count(*)::int AS n FROM notifications WHERE note_id = 'lisa-to-both' AND user_id = $1", [otherAdminUser.id]), 1);
    assert.equal(await count("SELECT count(*)::int AS n FROM note_comments WHERE note_id = 'olle-group'", []), 0);
    assert.equal(await count("SELECT count(*)::int AS n FROM notifications WHERE note_id = 'olle-group'", []), 0);
  });

  test("open tasks from the old Att göra list become personal notes", async () => {
    const task = (text, extra = {}) => ({ id: text, text, createdAt: "2026-10-14T08:00:00.000Z", completedAt: "", ...extra });
    await server.pool.query("DELETE FROM notes WHERE author_id = $1 AND kind = 'personal'", [leaderUser.id]);
    await server.pool.query("INSERT INTO documents (scope, key, value) VALUES ($1, 'todos', $2)", [
      `user:${leaderUser.id}`, JSON.stringify([task("Beställ handskar", { sharedWith: [adminUser.id] }), task("Klar sak", { completedAt: "2026-10-15T08:00:00.000Z" }), task("  ")])
    ]);
    await server.pool.query("INSERT INTO notifications (id, user_id, kind, title) VALUES ('old', $1, 'todoShared', 'Beställ handskar')", [adminUser.id]);
    await server.pool.query(fs.readFileSync(path.join(__dirname, "..", "migrations", "016_todos_to_notes.sql"), "utf8"));
    const mine = (await notesOf(leader)).notes.filter(note => note.kind === "personal");
    assert.deepEqual(mine.map(note => note.text), ["Beställ handskar"]);
    assert.ok(!(await notesOf(admin)).notes.some(note => note.text === "Beställ handskar"), "the moved note is private");
    assert.equal((await server.pool.query("SELECT count(*)::int AS n FROM documents WHERE key = 'todos'")).rows[0].n, 0);
    assert.ok(!(await admin.get("/api/notifications")).data.notifications.some(note => note.kind === "todoShared"));
    assert.equal((await leader.put(`/api/documents/user:${leaderUser.id}/todos`, { value: [], baseVersion: 0 })).status, 400, "the old list can no longer be saved");
    assert.equal((await leader.get("/api/todos/shared")).status, 404);
  });

  test("the sort order is a personal preference", async () => {
    assert.equal((await leader.patch("/api/me/preferences", { notesSort: "oldest" })).status, 200);
    assert.equal((await leader.patch("/api/me/preferences", { notesSort: "random" })).status, 400);
  });
});
