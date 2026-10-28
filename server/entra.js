const crypto = require("node:crypto");

// Sign-in with Microsoft Entra ID: the OpenID Connect authorization code flow with PKCE,
// for one organisation (tenant). Only the protocol lives here; which user a Microsoft
// account signs in as is decided in routes/auth.js.
const AUTHORITY = "https://login.microsoftonline.com";
// Authorities that let accounts from any organisation in. Never accepted.
const MULTI_TENANT = new Set(["common", "organizations", "consumers"]);
const SCOPES = "openid profile email";
const CLOCK_SKEW_SECONDS = 5 * 60;
const CACHE_MS = 24 * 60 * 60 * 1000;
const KEY_REFETCH_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const randomToken = () => crypto.randomBytes(32).toString("base64url");
const decodeSegment = segment => JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));

function createEntraClient({
  tenantId = process.env.ENTRA_TENANT_ID,
  clientId = process.env.ENTRA_CLIENT_ID,
  clientSecret = process.env.ENTRA_CLIENT_SECRET,
  allowedDomain = process.env.ENTRA_ALLOWED_DOMAIN,
  fetch = globalThis.fetch
} = {}) {
  const tenant = String(tenantId || "").trim();
  const id = String(clientId || "").trim();
  const secret = String(clientSecret || "");
  const domain = String(allowedDomain || "").trim().toLowerCase().replace(/^@/, "");
  const configured = Boolean(tenant && id && secret && !MULTI_TENANT.has(tenant.toLowerCase()));

  let metadata = null;
  let keys = null;

  async function getJson(url, options = {}) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Microsoft svarade ${response.status} på ${url}: ${data?.error_description || data?.error || "okänt fel"}`);
    }
    return data;
  }

  async function getMetadata() {
    if (metadata && Date.now() - metadata.fetchedAt < CACHE_MS) return metadata.value;
    const value = await getJson(`${AUTHORITY}/${encodeURIComponent(tenant)}/v2.0/.well-known/openid-configuration`);
    if (!value?.issuer || value.issuer.includes("{tenantid}") || !value.authorization_endpoint || !value.token_endpoint || !value.jwks_uri) {
      throw new Error(`Microsoft har inga fullständiga inloggningsuppgifter för ENTRA_TENANT_ID ${tenant}.`);
    }
    metadata = { value, fetchedAt: Date.now() };
    return value;
  }

  async function fetchKeys() {
    const { jwks_uri: jwksUri } = await getMetadata();
    const value = new Map();
    for (const jwk of (await getJson(jwksUri))?.keys || []) {
      if (jwk.kty !== "RSA" || !jwk.kid || (jwk.use && jwk.use !== "sig")) continue;
      try {
        value.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: "jwk" }));
      } catch {
        // A key this server cannot read is never the one that signed a token it accepts.
      }
    }
    return { value, fetchedAt: Date.now() };
  }

  async function getSigningKey(kid) {
    const fresh = keys && Date.now() - keys.fetchedAt < CACHE_MS;
    if (fresh && keys.value.has(kid)) return keys.value.get(kid);
    // Microsoft rotates its keys, so an unknown key id means fetching them again (at most once a minute).
    if (!fresh || Date.now() - keys.fetchedAt > KEY_REFETCH_MS) keys = await fetchKeys();
    return keys.value.get(kid) || null;
  }

  // Checks the ID token as OpenID Connect requires: signed by Microsoft, issued by this
  // tenant to this app, still valid, and made for this very sign-in (the nonce).
  async function verifyIdToken(idToken, nonce) {
    const parts = String(idToken || "").split(".");
    if (parts.length !== 3) throw new Error("Microsoft skickade ingen giltig ID-token.");
    const header = decodeSegment(parts[0]);
    const claims = decodeSegment(parts[1]);
    if (header.alg !== "RS256") throw new Error(`ID-token med okänd algoritm ${header.alg}.`);
    const key = await getSigningKey(header.kid);
    if (!key) throw new Error("ID-token signerad med en okänd nyckel.");
    if (!crypto.verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], "base64url"))) {
      throw new Error("ID-tokens signatur stämmer inte.");
    }
    const { issuer } = await getMetadata();
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== issuer) throw new Error(`ID-token från en annan organisation (${claims.iss}).`);
    if (claims.aud !== id) throw new Error("ID-token utfärdad till en annan app.");
    if (typeof claims.exp !== "number" || claims.exp < now - CLOCK_SKEW_SECONDS) throw new Error("ID-token har gått ut.");
    if (typeof claims.nbf === "number" && claims.nbf > now + CLOCK_SKEW_SECONDS) throw new Error("ID-token gäller inte än.");
    if (!nonce || claims.nonce !== nonce) throw new Error("ID-token hör inte till den här inloggningen.");
    if (typeof claims.oid !== "string" || !claims.oid) throw new Error("ID-token saknar konto-id (oid).");
    return claims;
  }

  return {
    configured,
    allowedDomain: domain,

    // Where to send the browser, and the secrets the callback needs to finish the sign-in.
    // No prompt: someone already signed in to Microsoft in the browser gets straight in.
    async start(redirectUri) {
      const { authorization_endpoint: endpoint } = await getMetadata();
      const flow = { state: randomToken(), nonce: randomToken(), verifier: randomToken() };
      const url = new URL(endpoint);
      url.search = new URLSearchParams({
        client_id: id,
        response_type: "code",
        response_mode: "query",
        redirect_uri: redirectUri,
        scope: SCOPES,
        state: flow.state,
        nonce: flow.nonce,
        code_challenge: crypto.createHash("sha256").update(flow.verifier).digest("base64url"),
        code_challenge_method: "S256"
      }).toString();
      return { url: url.toString(), flow };
    },

    // Trades the code from the callback for tokens and returns the verified ID token's claims.
    async finish({ code, redirectUri, flow }) {
      const { token_endpoint: endpoint } = await getMetadata();
      const tokens = await getJson(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: id,
          client_secret: secret,
          grant_type: "authorization_code",
          code: String(code || ""),
          redirect_uri: redirectUri,
          code_verifier: flow.verifier,
          scope: SCOPES
        })
      });
      return verifyIdToken(tokens?.id_token, flow.nonce);
    },

    // Where to send the browser to sign out of Microsoft as well. Microsoft then returns it to
    // postLogoutRedirectUri. Without the login_hint Microsoft asks which account to sign out.
    async logoutUrl({ postLogoutRedirectUri, loginHint }) {
      const { end_session_endpoint: endpoint } = await getMetadata();
      if (!endpoint) return "";
      const url = new URL(endpoint);
      url.search = new URLSearchParams({
        post_logout_redirect_uri: postLogoutRedirectUri,
        ...(loginHint ? { logout_hint: loginHint } : {})
      }).toString();
      return url.toString();
    },

    // The account's e-mail addresses, only those in ENTRA_ALLOWED_DOMAIN when it is set.
    emailsOf(claims) {
      const emails = [claims.email, claims.preferred_username]
        .map(value => String(value || "").trim().toLowerCase())
        .filter(value => EMAIL_PATTERN.test(value) && (!domain || value.endsWith(`@${domain}`)));
      return [...new Set(emails)];
    }
  };
}

module.exports = { createEntraClient };
