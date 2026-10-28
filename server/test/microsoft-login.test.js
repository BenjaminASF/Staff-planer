const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, SETUP_CODE } = require("./helpers");
const { createEntraClient } = require("../entra");

const PASSWORD = "losenord123";
const TENANT = "11111111-2222-3333-4444-555555555555";
const CLIENT_ID = "staff-planner-app";
const CLIENT_SECRET = "hemlig-nyckel";
const AUTHORITY = `https://login.microsoftonline.com/${TENANT}`;
const ISSUER = `${AUTHORITY}/v2.0`;

// Stands in for Microsoft: publishes its signing key, lets someone "sign in" on its login
// page and redeems the code only with the right secret, redirect URI and PKCE verifier.
function createFakeMicrosoft() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const codes = new Map();
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  const sign = (claims, key, kid) => {
    const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
    const body = `${encode({ alg: "RS256", typ: "JWT", kid })}.${encode(claims)}`;
    return `${body}.${crypto.sign("RSA-SHA256", Buffer.from(body), key).toString("base64url")}`;
  };
  return {
    keyRequests: 0,
    signIn(authorizeUrl, claims, { key = privateKey, kid = "key-1", tokenClaims = {} } = {}) {
      const params = authorizeUrl.searchParams;
      assert.equal(`${authorizeUrl.origin}${authorizeUrl.pathname}`, `${AUTHORITY}/oauth2/v2.0/authorize`);
      assert.equal(params.get("client_id"), CLIENT_ID);
      assert.equal(params.get("response_type"), "code");
      assert.equal(params.get("code_challenge_method"), "S256");
      assert.match(params.get("scope"), /\bopenid\b/);
      const now = Math.floor(Date.now() / 1000);
      const idToken = sign({
        iss: ISSUER, aud: CLIENT_ID, tid: TENANT, iat: now, nbf: now, exp: now + 3600, nonce: params.get("nonce"), ...claims, ...tokenClaims
      }, key, kid);
      const code = crypto.randomUUID();
      codes.set(code, { idToken, redirectUri: params.get("redirect_uri"), challenge: params.get("code_challenge") });
      return code;
    },
    async fetch(url, options = {}) {
      if (url === `${ISSUER}/.well-known/openid-configuration`) {
        return json({
          issuer: ISSUER,
          authorization_endpoint: `${AUTHORITY}/oauth2/v2.0/authorize`,
          token_endpoint: `${AUTHORITY}/oauth2/v2.0/token`,
          end_session_endpoint: `${AUTHORITY}/oauth2/v2.0/logout`,
          jwks_uri: `${AUTHORITY}/discovery/v2.0/keys`
        });
      }
      if (url === `${AUTHORITY}/discovery/v2.0/keys`) {
        this.keyRequests += 1;
        return json({ keys: [{ ...publicKey.export({ format: "jwk" }), kid: "key-1", use: "sig", alg: "RS256" }] });
      }
      if (url === `${AUTHORITY}/oauth2/v2.0/token`) {
        const body = new URLSearchParams(String(options.body));
        const grant = codes.get(body.get("code"));
        codes.delete(body.get("code"));
        const verifierHash = crypto.createHash("sha256").update(body.get("code_verifier") || "").digest("base64url");
        if (!grant || body.get("client_id") !== CLIENT_ID || body.get("client_secret") !== CLIENT_SECRET
          || body.get("redirect_uri") !== grant.redirectUri || verifierHash !== grant.challenge) {
          return json({ error: "invalid_grant" }, 400);
        }
        return json({ id_token: grant.idToken });
      }
      return json({ error: "not_found" }, 404);
    }
  };
}

describe("sign-in with Microsoft", () => {
  let server, microsoft, admin, dayShift, olle;

  // Goes through the whole sign-in like a browser: to Microsoft, signs in there and back.
  async function signInWithMicrosoft(claims, { returnTo = "/", state, dropFlowCookie = false, signInOptions } = {}) {
    const start = await fetch(`${server.baseUrl}/api/auth/microsoft?returnTo=${encodeURIComponent(returnTo)}`, { redirect: "manual" });
    assert.equal(start.status, 302);
    const authorizeUrl = new URL(start.headers.get("location"));
    const flowCookie = start.headers.getSetCookie().find(cookie => cookie.startsWith("sp_microsoft="));
    assert.match(flowCookie, /HttpOnly/);
    assert.match(flowCookie, /Path=\/api\/auth\/microsoft/);
    const code = microsoft.signIn(authorizeUrl, claims, signInOptions);
    const params = new URLSearchParams({ code, state: state ?? authorizeUrl.searchParams.get("state") });
    const callback = await fetch(`${server.baseUrl}/api/auth/microsoft/callback?${params}`, {
      redirect: "manual",
      headers: dropFlowCookie ? {} : { cookie: flowCookie.split(";")[0] }
    });
    const session = callback.headers.getSetCookie().map(cookie => cookie.match(/^sp_session=([^;]+)/)?.[1]).find(Boolean);
    const client = server.client();
    client.cookie = session ? `sp_session=${session}` : "";
    return { status: callback.status, location: callback.headers.get("location"), client };
  }

  before(async () => {
    microsoft = createFakeMicrosoft();
    const entra = createEntraClient({
      tenantId: TENANT, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, allowedDomain: "firma.se", fetch: (url, options) => microsoft.fetch(url, options)
    });
    server = await startTestServer({ entra });
    admin = server.client();
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    dayShift = (await admin.post("/api/shifts", { name: "Dag" })).data.shift;
    olle = (await admin.post("/api/people", {
      name: "Olle Operatör", shiftId: dayShift.id, email: "olle@firma.se", account: { username: "olle", password: PASSWORD, role: "operator" }
    })).data.person;
    assert.equal(olle.account.mustChangePassword, true);
    assert.equal(olle.account.microsoftLinked, false);
  });

  after(async () => {
    await server?.close();
  });

  test("the login page is told that Microsoft sign-in is on", async () => {
    assert.equal((await server.client().get("/api/setup")).data.microsoftLogin, true);
  });

  test("Microsoft sign-in is off without tenant, app and secret, and never for any organisation", () => {
    assert.equal(createEntraClient({ tenantId: "", clientId: "", clientSecret: "" }).configured, false);
    assert.equal(createEntraClient({ tenantId: TENANT, clientId: CLIENT_ID, clientSecret: "" }).configured, false);
    for (const tenantId of ["common", "organizations", "Consumers"]) {
      assert.equal(createEntraClient({ tenantId, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }).configured, false, tenantId);
    }
    assert.equal(createEntraClient({ tenantId: TENANT, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }).configured, true);
  });

  test("a user is found by e-mail address, linked and returned to the page they started on", async () => {
    const result = await signInWithMicrosoft({ oid: "oid-olle", preferred_username: "Olle@Firma.se", name: "Olle" }, { returnTo: "/personal.html?chat=1" });
    assert.equal(result.status, 302);
    assert.equal(result.location, "/personal.html?chat=1");
    const me = await result.client.get("/api/me");
    assert.equal(me.status, 200);
    assert.equal(me.data.user.username, "olle");
    assert.equal(me.data.user.mustChangePassword, false, "nobody signed in with Microsoft is asked to replace the temporary password");
    assert.equal(me.data.user.viaMicrosoft, true);
    assert.equal((await result.client.get("/api/people")).status, 200);
    const person = (await admin.get("/api/people")).data.people.find(item => item.id === olle.id);
    assert.equal(person.account.microsoftLinked, true);
    assert.ok(person.account.lastLoginAt);
  });

  test("a user linked to Microsoft can no longer sign in with the password", async () => {
    const client = server.client();
    const refused = await client.post("/api/login", { username: "olle", password: PASSWORD });
    assert.equal(refused.status, 403);
    assert.equal(refused.data.code, "microsoft_required");
    assert.equal(client.cookie, "");
    assert.equal((await client.get("/api/me")).status, 401);

    const wrong = await client.post("/api/login", { username: "olle", password: "fel-losenord" });
    assert.equal(wrong.status, 401, "a wrong password does not tell whether the user is linked");
    assert.equal(wrong.data.code, undefined);
  });

  test("users not linked to Microsoft still sign in with the password and replace the temporary one", async () => {
    await admin.post("/api/people", {
      name: "Per Papper", shiftId: dayShift.id, account: { username: "per", password: PASSWORD, role: "operator" }
    });
    const client = server.client();
    const me = await client.login("per", PASSWORD);
    assert.equal(me.user.mustChangePassword, true);
    assert.equal(me.user.viaMicrosoft, false);
    assert.equal((await client.get("/api/people")).data.code, "password_change_required");
  });

  test("signing in with Microsoft signs the user out of password sessions", async () => {
    await admin.post("/api/people", {
      name: "Lisa Länk", shiftId: dayShift.id, email: "lisa@firma.se", account: { username: "lisa", password: PASSWORD, role: "operator" }
    });
    const viaPassword = server.client();
    await viaPassword.login("lisa", PASSWORD);
    assert.equal((await viaPassword.get("/api/me")).status, 200);

    const viaMicrosoft = (await signInWithMicrosoft({ oid: "oid-lisa", preferred_username: "lisa@firma.se" })).client;
    assert.equal((await viaMicrosoft.get("/api/me")).status, 200);
    assert.equal((await viaPassword.get("/api/me")).status, 401);
    assert.equal((await server.client().post("/api/login", { username: "lisa", password: PASSWORD })).status, 403);
  });

  test("a linked account keeps working after the e-mail address changes", async () => {
    await admin.patch(`/api/people/${olle.id}`, { email: "olle.olsson@firma.se" });
    const result = await signInWithMicrosoft({ oid: "oid-olle", preferred_username: "olle@firma.se" });
    assert.equal(result.location, "/");
    assert.equal((await result.client.get("/api/me")).data.user.username, "olle");
  });

  test("a username that is the e-mail address also finds the user", async () => {
    await admin.post("/api/people", {
      name: "Stina Ledare", shiftId: dayShift.id, account: { username: "stina@firma.se", password: PASSWORD, role: "shift_leader" }
    });
    const result = await signInWithMicrosoft({ oid: "oid-stina", email: "stina@firma.se", preferred_username: "stina.s@firma.se" });
    assert.equal(result.location, "/");
    assert.equal((await result.client.get("/api/me")).data.user.username, "stina@firma.se");
  });

  test("Microsoft accounts without a user are turned away", async () => {
    const result = await signInWithMicrosoft({ oid: "oid-okand", preferred_username: "okand@firma.se" });
    assert.equal(result.location, "/?login_error=not_linked");
    assert.equal(result.client.cookie, "");
  });

  test("only addresses in ENTRA_ALLOWED_DOMAIN may sign in", async () => {
    await admin.post("/api/people", {
      name: "Gäst Konsult", shiftId: dayShift.id, email: "gast@annan.se", account: { username: "gast", password: PASSWORD, role: "operator" }
    });
    const result = await signInWithMicrosoft({ oid: "oid-gast", preferred_username: "gast@annan.se" });
    assert.equal(result.location, "/?login_error=not_allowed");
    assert.equal(result.client.cookie, "");
  });

  test("an address shared by several users signs in as none of them", async () => {
    for (const username of ["dubbel1", "dubbel2"]) {
      await admin.post("/api/people", {
        name: username, shiftId: dayShift.id, email: "dubbel@firma.se", account: { username, password: PASSWORD, role: "operator" }
      });
    }
    const result = await signInWithMicrosoft({ oid: "oid-dubbel", preferred_username: "dubbel@firma.se" });
    assert.equal(result.location, "/?login_error=ambiguous");
  });

  test("a user linked to one Microsoft account is not taken over by another with the same address", async () => {
    const result = await signInWithMicrosoft({ oid: "oid-nagon-annan", preferred_username: "olle.olsson@firma.se" });
    assert.equal(result.location, "/?login_error=linked_elsewhere");
    assert.equal(result.client.cookie, "");
  });

  test("the callback only finishes the sign-in the same browser started", async () => {
    const wrongState = await signInWithMicrosoft({ oid: "oid-olle", preferred_username: "olle@firma.se" }, { state: "fel" });
    assert.equal(wrongState.location, "/?login_error=expired");
    const noCookie = await signInWithMicrosoft({ oid: "oid-olle", preferred_username: "olle@firma.se" }, { dropFlowCookie: true });
    assert.equal(noCookie.location, "/?login_error=expired");
    assert.equal(noCookie.client.cookie, "");
  });

  test("ID tokens that are forged, from another organisation or for another sign-in are refused", async () => {
    const { privateKey: otherKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const claims = { oid: "oid-olle", preferred_username: "olle@firma.se" };
    const cases = {
      "signed with another key": { key: otherKey },
      "unknown key id": { kid: "key-2" },
      "another organisation": { tokenClaims: { iss: "https://login.microsoftonline.com/99999999-0000-0000-0000-000000000000/v2.0" } },
      "another app": { tokenClaims: { aud: "nagon-annan-app" } },
      expired: { tokenClaims: { exp: Math.floor(Date.now() / 1000) - 3600 } },
      "another sign-in": { tokenClaims: { nonce: "fel" } }
    };
    for (const [name, signInOptions] of Object.entries(cases)) {
      const result = await signInWithMicrosoft(claims, { signInOptions });
      assert.equal(result.location, "/?login_error=failed", name);
      assert.equal(result.client.cookie, "", name);
    }
  });

  test("cancelling at Microsoft returns to the login page", async () => {
    const result = await fetch(`${server.baseUrl}/api/auth/microsoft/callback?error=access_denied&state=x`, { redirect: "manual" });
    assert.equal(result.status, 302);
    assert.equal(result.headers.get("location"), "/?login_error=cancelled");
  });

  test("signing in never sends anyone to another site", async () => {
    for (const returnTo of ["//evil.example", "/\\evil.example", "https://evil.example/", "javascript:alert(1)"]) {
      const result = await signInWithMicrosoft({ oid: "oid-olle", preferred_username: "olle@firma.se" }, { returnTo });
      assert.equal(result.location, "/", returnTo);
    }
  });

  test("signing out of a Microsoft session signs out of Microsoft too, without picking an account", async () => {
    const { client } = await signInWithMicrosoft({ oid: "oid-olle", preferred_username: "olle@firma.se", login_hint: "hint-olle" });
    const result = await client.post("/api/logout");
    assert.equal(result.status, 200);
    const logout = new URL(result.data.microsoftLogoutUrl);
    assert.equal(`${logout.origin}${logout.pathname}`, `${AUTHORITY}/oauth2/v2.0/logout`);
    assert.equal(logout.searchParams.get("post_logout_redirect_uri"), `${server.baseUrl}/api/auth/microsoft/signed-out`);
    assert.equal(logout.searchParams.get("logout_hint"), "hint-olle");
    assert.equal((await client.get("/api/me")).status, 401);

    const withoutHint = (await signInWithMicrosoft({ oid: "oid-olle", preferred_username: "olle@firma.se" })).client;
    const asksForAccount = new URL((await withoutHint.post("/api/logout")).data.microsoftLogoutUrl);
    assert.equal(asksForAccount.searchParams.has("logout_hint"), false);

    const back = await fetch(`${server.baseUrl}/api/auth/microsoft/signed-out`, { redirect: "manual" });
    assert.equal(back.status, 302);
    assert.equal(back.headers.get("location"), "/");
  });

  test("signing out of a password session leaves Microsoft alone", async () => {
    const client = server.client();
    await client.login("ada", PASSWORD);
    const result = await client.post("/api/logout");
    assert.equal(result.status, 200);
    assert.equal(result.data.microsoftLogoutUrl, undefined);
  });

  test("unlinking a Microsoft account signs out its Microsoft sessions and lets the password work again", async () => {
    const viaMicrosoft = (await signInWithMicrosoft({ oid: "oid-olle", preferred_username: "olle@firma.se" })).client;
    const stina = (await admin.get("/api/people")).data.people.find(person => person.account?.username === "stina@firma.se");
    assert.equal(stina.account.microsoftLinked, true);
    assert.equal((await viaMicrosoft.patch(`/api/people/${stina.id}/account`, { microsoftLinked: false })).status, 403, "only those who may reset the password");

    const leader = (await signInWithMicrosoft({ oid: "oid-stina", preferred_username: "stina@firma.se" })).client;
    const unlinked = await leader.patch(`/api/people/${olle.id}/account`, { microsoftLinked: false });
    assert.equal(unlinked.status, 200);
    assert.equal(unlinked.data.person.account.microsoftLinked, false);
    assert.equal((await viaMicrosoft.get("/api/me")).status, 401);
    const viaPassword = server.client();
    await viaPassword.login("olle", PASSWORD);

    // The next sign-in links by e-mail address again, and the password stops working.
    const relinked = await signInWithMicrosoft({ oid: "oid-olle-ny", preferred_username: "olle.olsson@firma.se" });
    assert.equal((await relinked.client.get("/api/me")).data.user.username, "olle");
    assert.equal((await viaPassword.get("/api/me")).status, 401);
  });
});

describe("password sign-in with Microsoft sign-in off", () => {
  let server, admin;

  before(async () => {
    server = await startTestServer();
    admin = server.client();
    await admin.post("/api/setup", { setupCode: SETUP_CODE, name: "Ada Admin", username: "ada", password: PASSWORD });
    await server.pool.query("UPDATE users SET entra_oid = 'oid-ada' WHERE username = 'ada'");
  });

  after(async () => {
    await server?.close();
  });

  test("a user linked earlier signs in with the password while Microsoft sign-in is off", async () => {
    assert.equal((await server.client().get("/api/setup")).data.microsoftLogin, false);
    const me = await server.client().login("ada", PASSWORD);
    assert.equal(me.user.username, "ada");
  });

  test("the migration signs linked users out of their password sessions only", async () => {
    const viaPassword = server.client();
    await viaPassword.login("ada", PASSWORD);
    await server.pool.query("UPDATE sessions SET via_microsoft = true WHERE token_hash IN (SELECT token_hash FROM sessions LIMIT 1)");
    const microsoftSessions = Number((await server.pool.query("SELECT count(*) FROM sessions WHERE via_microsoft")).rows[0].count);
    await server.pool.query(fs.readFileSync(path.join(__dirname, "..", "migrations", "020_microsoft_only_for_linked.sql"), "utf8"));
    const { rows } = await server.pool.query("SELECT via_microsoft FROM sessions");
    assert.equal(microsoftSessions, 1);
    assert.equal(rows.length, 1);
    assert.ok(rows.every(row => row.via_microsoft), "only the Microsoft session is left");
  });
});
