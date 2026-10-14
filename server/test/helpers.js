const { createPool, runMigrations } = require("../db");
const { createApp } = require("../app");

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://postgres@localhost:5433/staffplanner_test";
const SETUP_CODE = "test-setup-code";

async function startTestServer() {
  const pool = createPool(TEST_DATABASE_URL);
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations(pool);
  const server = createApp({ pool, setupCode: SETUP_CODE, trustProxy: false }).listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    pool,
    baseUrl,
    client: () => new ApiClient(baseUrl),
    async close() {
      await new Promise(resolve => server.close(resolve));
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

module.exports = { startTestServer, SETUP_CODE };
