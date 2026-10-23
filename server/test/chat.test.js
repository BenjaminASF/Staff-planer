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
