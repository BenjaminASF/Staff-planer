const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");

const PASSWORD = "losenord123";
// A 1×1 PNG.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("chat for admins and shift leaders", () => {
  let server;
  let admin, leader, otherLeader, operator;
  let leaderMessage;

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    leader = server.client();
    otherLeader = server.client();
    operator = server.client();
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    const [red, blue] = (await admin.get("/api/shifts")).data.shifts;
    const account = (username, role) => ({ username, password: PASSWORD, role, mustChangePassword: false });
    await admin.post("/api/people", { name: "Lisa Ledare", shiftId: red.id, account: account("lisa", "shift_leader") });
    await admin.post("/api/people", { name: "Bo Blå", shiftId: blue.id, account: account("bosse", "shift_leader") });
    await admin.post("/api/people", { name: "Olle Operatör", shiftId: red.id, account: account("olle", "operator") });
    await leader.login("lisa", PASSWORD);
    await otherLeader.login("bosse", PASSWORD);
    await operator.login("olle", PASSWORD);
  });

  after(async () => {
    await server?.close();
  });

  test("operators cannot use the chat", async () => {
    assert.equal((await operator.get("/api/chat/messages")).status, 403);
    assert.equal((await operator.post("/api/chat/messages", { text: "Hej" })).status, 403);
    assert.equal((await operator.get("/api/chat/unread")).status, 403);
  });

  test("a leader sends a text message that everyone in the chat sees", async () => {
    const sent = await leader.post("/api/chat/messages", { text: "  Maskin GD2 står still  " });
    assert.equal(sent.status, 201);
    leaderMessage = sent.data.message;
    assert.equal(leaderMessage.text, "Maskin GD2 står still");
    assert.equal(leaderMessage.authorName, "Lisa Ledare");
    assert.equal(leaderMessage.imageUrl, null);
    for (const client of [admin, otherLeader]) {
      const { data } = await client.get("/api/chat/messages");
      assert.equal(data.messages.at(-1).id, leaderMessage.id);
    }
  });

  test("new messages show as unread for others but not for the sender", async () => {
    assert.equal((await leader.get("/api/chat/unread")).data.count, 0);
    const unread = await admin.get("/api/chat/unread");
    assert.equal(unread.data.count, 1);
    assert.equal(unread.data.latest.authorName, "Lisa Ledare");
    assert.equal((await admin.post("/api/chat/read", { lastId: leaderMessage.id })).status, 200);
    assert.equal((await admin.get("/api/chat/unread")).data.count, 0);
    assert.equal((await otherLeader.get("/api/chat/unread")).data.count, 1);
  });

  test("an image can be attached and is served to chat members only", async () => {
    const sent = await admin.post("/api/chat/messages", { text: "", image: { type: "image/png", data: PNG } });
    assert.equal(sent.status, 201);
    const url = sent.data.message.imageUrl;
    assert.match(url, /^\/api\/chat\/images\/\d+$/);
    const image = await fetch(server.baseUrl + url, { headers: { cookie: otherLeader.cookie } });
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/png");
    assert.equal(Buffer.from(await image.arrayBuffer()).toString("base64"), PNG);
    const forbidden = await fetch(server.baseUrl + url, { headers: { cookie: operator.cookie } });
    assert.equal(forbidden.status, 403);
  });

  test("files that are not images, or say the wrong type, are refused", async () => {
    const fake = Buffer.from("<script>alert(1)</script>").toString("base64");
    assert.equal((await leader.post("/api/chat/messages", { image: { type: "image/png", data: fake } })).status, 400);
    assert.equal((await leader.post("/api/chat/messages", { image: { type: "image/svg+xml", data: PNG } })).status, 400);
    assert.equal((await leader.post("/api/chat/messages", { image: { type: "image/jpeg", data: PNG } })).status, 400);
    assert.equal((await leader.post("/api/chat/messages", { text: "   " })).status, 400);
    assert.equal((await leader.post("/api/chat/messages", { text: "x".repeat(2001) })).status, 400);
  });

  test("polling returns only messages after the last one seen", async () => {
    const { data } = await otherLeader.get("/api/chat/messages");
    const lastId = data.messages.at(-1).id;
    assert.deepEqual((await otherLeader.get(`/api/chat/messages?after=${lastId}`)).data.messages, []);
    const sent = (await otherLeader.post("/api/chat/messages", { text: "Blå skift har täckt upp" })).data.message;
    const fresh = await leader.get(`/api/chat/messages?after=${lastId}`);
    assert.deepEqual(fresh.data.messages.map(message => message.id), [sent.id]);
  });

  test("authors delete their own messages; admins delete any", async () => {
    assert.equal((await otherLeader.delete(`/api/chat/messages/${leaderMessage.id}`)).status, 403);
    const own = (await otherLeader.post("/api/chat/messages", { text: "Fel tråd" })).data.message;
    assert.equal((await otherLeader.delete(`/api/chat/messages/${own.id}`)).status, 200);
    assert.equal((await admin.delete(`/api/chat/messages/${leaderMessage.id}`)).status, 200);
    const ids = (await admin.get("/api/chat/messages")).data.messages.map(message => message.id);
    assert.ok(!ids.includes(own.id) && !ids.includes(leaderMessage.id));
  });

  test("a private message is seen only by the sender and the recipient", async () => {
    const { members } = (await leader.get("/api/chat/members")).data;
    const names = members.map(member => member.name);
    assert.deepEqual(names, ["Ada Admin", "Bo Blå"]);
    const bo = members.find(member => member.name === "Bo Blå");
    const sent = await leader.post("/api/chat/messages", { text: "Bara till dig", recipientId: bo.id, image: { type: "image/png", data: PNG } });
    assert.equal(sent.status, 201);
    const message = sent.data.message;
    assert.equal(message.recipientId, bo.id);
    assert.equal(message.recipientName, "Bo Blå");
    const ids = async client => (await client.get("/api/chat/messages")).data.messages.map(item => item.id);
    assert.ok((await ids(leader)).includes(message.id));
    assert.ok((await ids(otherLeader)).includes(message.id));
    assert.ok(!(await ids(admin)).includes(message.id));
    assert.equal((await otherLeader.get("/api/chat/unread")).data.latest.id, message.id);
    assert.notEqual((await admin.get("/api/chat/unread")).data.latest?.id, message.id);
    const image = await fetch(server.baseUrl + message.imageUrl, { headers: { cookie: admin.cookie } });
    assert.equal(image.status, 404);
    assert.equal((await admin.delete(`/api/chat/messages/${message.id}`)).status, 404);
  });

  test("private messages need a recipient who uses the chat", async () => {
    const operatorUser = (await operator.get("/api/me")).data.user;
    assert.equal((await leader.post("/api/chat/messages", { text: "Hej", recipientId: operatorUser.id })).status, 400);
    assert.equal((await leader.post("/api/chat/messages", { text: "Hej", recipientId: "finns-inte" })).status, 400);
    const me = (await leader.get("/api/me")).data.user;
    assert.equal((await leader.post("/api/chat/messages", { text: "Hej", recipientId: me.id })).status, 400);
  });

  test("older messages load page by page", async () => {
    for (let index = 0; index < 55; index += 1) await leader.post("/api/chat/messages", { text: `Meddelande ${index}` });
    const first = await admin.get("/api/chat/messages");
    assert.equal(first.data.messages.length, 50);
    assert.equal(first.data.hasOlder, true);
    assert.equal(first.data.messages.at(-1).text, "Meddelande 54");
    const older = await admin.get(`/api/chat/messages?before=${first.data.messages[0].id}`);
    assert.ok(older.data.messages.length > 0);
    assert.equal(older.data.hasOlder, false);
  });
});

describe("handovers in the chat", () => {
  let server;
  let admin, redLeader, blueLeader, rightHand, senior, operator;
  let red, blue, users;
  const departments = (overrides = {}) => ["GD", "ETIKETTO", "Packning"].map(name => ({ name, status: "ok", comment: "", ...overrides[name] }));

  before(async () => {
    server = await startTestServer();
    [admin, redLeader, blueLeader, rightHand, senior, operator] = Array.from({ length: 6 }, () => server.client());
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    [red, blue] = (await admin.get("/api/shifts")).data.shifts;
    const account = (username, role) => ({ username, password: PASSWORD, role, mustChangePassword: false });
    await admin.post("/api/people", { name: "Lisa Ledare", shiftId: red.id, account: account("lisa", "shift_leader") });
    await admin.post("/api/people", { name: "Bo Blå", shiftId: blue.id, account: account("bosse", "shift_leader") });
    await admin.post("/api/people", { name: "Hanna Hand", shiftId: red.id, account: account("hanna", "right_hand") });
    await admin.post("/api/people", { name: "Sara Senior", shiftId: red.id, account: account("sara", "senior_operator") });
    await admin.post("/api/people", { name: "Olle Operatör", shiftId: red.id, account: account("olle", "operator") });
    users = {
      admin: (await admin.get("/api/me")).data.user,
      lisa: (await redLeader.login("lisa", PASSWORD)).user,
      bo: (await blueLeader.login("bosse", PASSWORD)).user,
      hanna: (await rightHand.login("hanna", PASSWORD)).user,
      sara: (await senior.login("sara", PASSWORD)).user
    };
    await operator.login("olle", PASSWORD);
  });

  after(async () => {
    await server?.close();
  });

  test("members come with role and shift, so the shift leaders can be picked", async () => {
    const { members } = (await rightHand.get("/api/chat/members")).data;
    const bo = members.find(member => member.name === "Bo Blå");
    assert.deepEqual(bo, { id: users.bo.id, name: "Bo Blå", role: "shift_leader", shiftId: blue.id });
  });

  test("a right hand hands over their own shift to a chosen shift leader; only they, the author and admins see it", async () => {
    const sent = await rightHand.post("/api/chat/messages", { handover: {
      to: [users.bo.id], prio: "  Kör GD-3 först  ", other: "", production: " 412 box av mål 400 ",
      departments: departments({ ETIKETTO: { status: "problem", comment: "Rullen fastnade två gånger" } })
    } });
    assert.equal(sent.status, 201, JSON.stringify(sent.data));
    const { message } = sent.data;
    assert.equal(message.text, "");
    assert.equal(message.recipientId, null);
    assert.deepEqual(message.handover, {
      fromShiftId: red.id, fromShiftName: red.name, to: [{ id: users.bo.id, name: "Bo Blå" }], prio: "Kör GD-3 först",
      production: "412 box av mål 400",
      departments: [
        { name: "GD", status: "ok", comment: "" },
        { name: "ETIKETTO", status: "problem", comment: "Rullen fastnade två gånger" },
        { name: "Packning", status: "ok", comment: "" }
      ],
      other: ""
    });
    const ids = async client => (await client.get("/api/chat/messages")).data.messages.map(item => item.id);
    for (const client of [rightHand, blueLeader, admin]) assert.ok((await ids(client)).includes(message.id));
    for (const client of [redLeader, senior]) assert.ok(!(await ids(client)).includes(message.id), "others in the chat do not see it");
    assert.equal((await blueLeader.get("/api/chat/unread")).data.latest.handover.to[0].id, users.bo.id);
    assert.notEqual((await redLeader.get("/api/chat/unread")).data.latest?.id, message.id, "nor count it as unread");
    assert.equal((await redLeader.delete(`/api/chat/messages/${message.id}`)).status, 404);
  });

  test("a handover can go to several shift leaders, each once", async () => {
    const sent = await admin.post("/api/chat/messages", { handover: { fromShiftId: blue.id, to: [users.lisa.id, users.bo.id, users.lisa.id], departments: departments() } });
    assert.equal(sent.status, 201, JSON.stringify(sent.data));
    assert.deepEqual(sent.data.message.handover.to.map(item => item.name), ["Lisa Ledare", "Bo Blå"]);
    for (const client of [redLeader, blueLeader]) {
      assert.ok((await client.get("/api/chat/messages")).data.messages.some(item => item.id === sent.data.message.id), "every recipient sees it");
    }
    assert.equal(sent.data.message.handover.fromShiftName, blue.name);
  });

  test("only admins, shift leaders and right hands make handovers; senior operators still write in the chat", async () => {
    const handover = { to: [users.bo.id], departments: departments() };
    assert.equal((await senior.post("/api/chat/messages", { handover })).status, 403);
    assert.equal((await operator.post("/api/chat/messages", { handover })).status, 403);
    assert.equal((await senior.post("/api/chat/messages", { text: "Jag har läst överlämningen" })).status, 201);
    assert.equal((await redLeader.post("/api/chat/messages", { handover })).status, 201);
  });

  test("a handover needs shift leaders as recipients and a status for every department", async () => {
    const send = async (client, handover) => {
      const result = await client.post("/api/chat/messages", { handover });
      assert.equal(result.status, 400, JSON.stringify(result.data));
      return result.data.error;
    };
    assert.match(await send(rightHand, { to: [], departments: departments() }), /minst en skiftledare/);
    assert.match(await send(rightHand, { to: [users.sara.id], departments: departments() }), /andra skiftledare/);
    assert.match(await send(rightHand, { to: [users.admin.id], departments: departments() }), /andra skiftledare/);
    assert.match(await send(redLeader, { to: [users.lisa.id], departments: departments() }), /andra skiftledare/);
    assert.match(await send(rightHand, { to: [users.bo.id], departments: departments({ GD: { status: "" }, Packning: { status: "bra" } }) }), /för GD, Packning/);
    assert.match(await send(rightHand, { to: [users.bo.id], departments: departments({ GD: { status: "problem", comment: "  " } }) }), /hände på GD/);
    assert.match(await send(admin, { to: [users.bo.id], departments: departments() }), /vilket skift/);
    assert.match(await send(admin, { fromShiftId: "finns-inte", to: [users.bo.id], departments: departments() }), /vilket skift/);
    assert.match(await send(rightHand, "Bo, allt gick bra"), /kunde inte läsas/);
  });

  test("the author deletes their own handover", async () => {
    const { message } = (await rightHand.post("/api/chat/messages", { handover: { to: [users.bo.id], departments: departments() } })).data;
    assert.equal((await senior.delete(`/api/chat/messages/${message.id}`)).status, 404, "she does not see it");
    assert.equal((await blueLeader.delete(`/api/chat/messages/${message.id}`)).status, 403, "the recipient sees it but cannot delete it");
    assert.equal((await rightHand.delete(`/api/chat/messages/${message.id}`)).status, 200);
    const ids = (await admin.get("/api/chat/messages")).data.messages.map(item => item.id);
    assert.ok(!ids.includes(message.id));
  });
});

describe("priority messages in the chat", () => {
  let server;
  let admin, leader, rightHand, senior;
  let red;

  before(async () => {
    server = await startTestServer();
    [admin, leader, rightHand, senior] = Array.from({ length: 4 }, () => server.client());
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    [red] = (await admin.get("/api/shifts")).data.shifts;
    const account = (username, role) => ({ username, password: PASSWORD, role, mustChangePassword: false });
    await admin.post("/api/people", { name: "Lisa Ledare", shiftId: red.id, account: account("lisa", "shift_leader") });
    await admin.post("/api/people", { name: "Hanna Hand", shiftId: red.id, account: account("hanna", "right_hand") });
    await admin.post("/api/people", { name: "Sara Senior", shiftId: red.id, account: account("sara", "senior_operator") });
    await leader.login("lisa", PASSWORD);
    await rightHand.login("hanna", PASSWORD);
    await senior.login("sara", PASSWORD);
  });

  after(async () => {
    await server?.close();
  });

  test("a shift leader sends a priority message that everyone in the chat sees pinned", async () => {
    const sent = await leader.post("/api/chat/messages", { text: "Brandövning kl 10", priority: true });
    assert.equal(sent.status, 201, JSON.stringify(sent.data));
    assert.equal(sent.data.message.priority.by, "Lisa Ledare");
    for (const client of [admin, rightHand, senior]) {
      const { data } = await client.get("/api/chat/priority");
      assert.deepEqual(data.messages.map(item => item.text), ["Brandövning kl 10"]);
    }
  });

  test("only admins and shift leaders mark priority, and only on messages to everyone", async () => {
    assert.equal((await rightHand.post("/api/chat/messages", { text: "Viktigt!", priority: true })).status, 403);
    assert.equal((await senior.post("/api/chat/messages", { text: "Viktigt!", priority: true })).status, 403);
    const hannaId = (await leader.get("/api/chat/members")).data.members.find(member => member.name === "Hanna Hand").id;
    assert.equal((await leader.post("/api/chat/messages", { text: "Privat", recipientId: hannaId, priority: true })).status, 400);
    const plain = (await rightHand.post("/api/chat/messages", { text: "Lastkajen stängd 10–12" })).data.message;
    assert.equal(plain.priority, null);
    assert.equal((await rightHand.put(`/api/chat/messages/${plain.id}/priority`, { priority: true })).status, 403);
    const marked = await admin.put(`/api/chat/messages/${plain.id}/priority`, { priority: true });
    assert.equal(marked.status, 200);
    assert.equal(marked.data.message.priority.by, "Ada Admin");
    assert.deepEqual((await senior.get("/api/chat/priority")).data.messages.map(item => item.text), ["Lastkajen stängd 10–12", "Brandövning kl 10"], "newest mark first");
    const privateOne = (await leader.post("/api/chat/messages", { text: "Bara till dig", recipientId: hannaId })).data.message;
    assert.equal((await leader.put(`/api/chat/messages/${privateOne.id}/priority`, { priority: true })).status, 400);
  });

  test("an admin or shift leader takes the mark away, and the message stays in the chat", async () => {
    const { messages } = (await admin.get("/api/chat/priority")).data;
    const fire = messages.find(item => item.text === "Brandövning kl 10");
    const removed = await admin.put(`/api/chat/messages/${fire.id}/priority`, { priority: false });
    assert.equal(removed.status, 200);
    assert.equal(removed.data.message.priority, null);
    assert.deepEqual((await senior.get("/api/chat/priority")).data.messages.map(item => item.text), ["Lastkajen stängd 10–12"]);
    assert.ok((await senior.get("/api/chat/messages")).data.messages.some(item => item.id === fire.id));
  });
});

describe("private conversations", () => {
  let server;
  let admin, lisa, bo, hanna;
  let ids;

  before(async () => {
    server = await startTestServer();
    [admin, lisa, bo, hanna] = Array.from({ length: 4 }, () => server.client());
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    const [red, blue] = (await admin.get("/api/shifts")).data.shifts;
    const account = (username, role) => ({ username, password: PASSWORD, role, mustChangePassword: false });
    await admin.post("/api/people", { name: "Lisa Ledare", shiftId: red.id, account: account("lisa", "shift_leader") });
    await admin.post("/api/people", { name: "Bo Blå", shiftId: blue.id, account: account("bosse", "shift_leader") });
    await admin.post("/api/people", { name: "Hanna Hand", shiftId: red.id, account: account("hanna", "right_hand") });
    ids = {
      lisa: (await lisa.login("lisa", PASSWORD)).user.id,
      bo: (await bo.login("bosse", PASSWORD)).user.id,
      hanna: (await hanna.login("hanna", PASSWORD)).user.id
    };
  });

  after(async () => {
    await server?.close();
  });

  test("each person is one conversation, newest first, with its own unread count", async () => {
    await lisa.post("/api/chat/messages", { text: "Hej Bo", recipientId: ids.bo });
    await bo.post("/api/chat/messages", { text: "Hej Lisa", recipientId: ids.lisa });
    await bo.post("/api/chat/messages", { text: "Kan du byta tisdag?", recipientId: ids.lisa });
    await hanna.post("/api/chat/messages", { text: "Jag är sjuk imorgon", recipientId: ids.lisa });
    await lisa.post("/api/chat/messages", { text: "Möte kl 14" });
    const { conversations } = (await lisa.get("/api/chat/conversations")).data;
    assert.deepEqual(conversations.map(item => [item.name, item.unread, item.last.text]), [
      ["Hanna Hand", 1, "Jag är sjuk imorgon"],
      ["Bo Blå", 2, "Kan du byta tisdag?"]
    ]);
    assert.equal(conversations[0].role, "right_hand");
    assert.equal(conversations[1].last.mine, false);
    assert.equal((await lisa.get("/api/chat/unread")).data.count, 3, "three private, her own message to everyone is not unread");
  });

  test("a conversation is read on its own; Alla does not read private messages", async () => {
    const everyone = (await lisa.get("/api/chat/messages?scope=everyone")).data.messages;
    assert.deepEqual(everyone.map(item => item.text), ["Möte kl 14"], "Alla has no private messages");
    await lisa.post("/api/chat/read", { lastId: everyone.at(-1).id });
    assert.equal((await lisa.get("/api/chat/unread")).data.count, 3, "reading Alla leaves the private ones unread");
    const withBo = (await lisa.get(`/api/chat/messages?with=${ids.bo}`)).data.messages;
    assert.deepEqual(withBo.map(item => item.text), ["Hej Bo", "Hej Lisa", "Kan du byta tisdag?"]);
    assert.equal((await lisa.post(`/api/chat/conversations/${ids.bo}/read`, { lastId: withBo.at(-1).id })).status, 200);
    const { conversations } = (await lisa.get("/api/chat/conversations")).data;
    assert.deepEqual(conversations.map(item => item.unread), [1, 0]);
    assert.equal((await lisa.get("/api/chat/unread")).data.count, 1);
  });

  test("a conversation only ever holds the two people's messages", async () => {
    const hannaWithBo = (await hanna.get(`/api/chat/messages?with=${ids.bo}`)).data.messages;
    assert.equal(hannaWithBo.length, 0, "Hanna sees nothing of Lisa and Bo");
    const boConversations = (await bo.get("/api/chat/conversations")).data.conversations;
    assert.deepEqual(boConversations.map(item => item.name), ["Lisa Ledare"]);
    assert.equal(boConversations[0].unread, 0, "his own last message is not unread for him");
    const newer = (await lisa.get(`/api/chat/messages?with=${ids.hanna}&after=0`)).status;
    assert.equal(newer, 200);
  });
});
