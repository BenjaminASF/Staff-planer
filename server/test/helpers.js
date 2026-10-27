const { createPool, runMigrations } = require("../db");
const { createApp } = require("../app");

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://postgres@localhost:5433/staffplanner_test";
const SETUP_CODE = "test-setup-code";

async function startTestServer(appOptions = {}) {
  const pool = createPool(TEST_DATABASE_URL);
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations(pool);
  const app = createApp({ pool, setupCode: SETUP_CODE, trustProxy: false, ...appOptions });
  const server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    pool,
    app,
    baseUrl,
    client: () => new ApiClient(baseUrl),
    async close() {
      const closing = new Promise(resolve => server.close(resolve));
      await app.locals.realtime.close();
      await app.locals.push.close();
      await closing;
      await pool.end();
    }
  };
}

// Minimal browser stand-in: keeps the session cookie and sends the app header.
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookie = "";
    this.sendAppHeader = true;
  }

  async request(method, path, body) {
    const headers = { "content-type": "application/json" };
    if (this.sendAppHeader) headers["x-requested-with"] = "StaffPlanner";
    if (this.cookie) headers.cookie = this.cookie;
    const response = await fetch(this.baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    for (const header of response.headers.getSetCookie()) {
      const match = header.match(/^sp_session=([^;]*)/);
      if (match) this.cookie = match[1] ? `sp_session=${match[1]}` : "";
    }
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: response.status, data };
  }

  get(path) { return this.request("GET", path); }
  post(path, body = {}) { return this.request("POST", path, body); }
  patch(path, body = {}) { return this.request("PATCH", path, body); }
  put(path, body = {}) { return this.request("PUT", path, body); }
  delete(path) { return this.request("DELETE", path); }

  async login(username, password) {
    const result = await this.post("/api/login", { username, password });
    if (result.status !== 200) throw new Error(`Login failed for ${username}: ${result.status} ${JSON.stringify(result.data)}`);
    return result.data;
  }
}

// Opens /api/events for a client and collects the events it receives.
async function openStream(server, client) {
  const controller = new AbortController();
  const response = await fetch(`${server.baseUrl}/api/events`, { headers: { cookie: client.cookie }, signal: controller.signal });
  const events = [];
  const waiters = [];
  if (response.ok) {
    void (async () => {
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        for await (const chunk of response.body) {
          buffer += decoder.decode(chunk, { stream: true });
          let end;
          while ((end = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const type = block.match(/^event: (.*)$/m)?.[1];
            const data = block.match(/^data: (.*)$/m)?.[1];
            if (!type) continue;
            events.push({ type, data: JSON.parse(data) });
            waiters.splice(0).forEach(wake => wake());
          }
        }
      } catch { /* aborted */ }
    })();
  }
  const waitFor = async (predicate, timeoutMs = 3000) => {
    const deadline = Date.now() + timeoutMs;
    while (!events.some(predicate)) {
      if (Date.now() > deadline) throw new Error(`Event not received; got ${JSON.stringify(events)}`);
      await new Promise(resolve => { waiters.push(resolve); setTimeout(resolve, 50); });
    }
    return events.find(predicate);
  };
  return { status: response.status, events, waitFor, close: () => controller.abort() };
}

module.exports = { startTestServer, openStream, SETUP_CODE };
