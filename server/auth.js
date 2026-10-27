const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);

const SESSION_COOKIE = "sp_session";
const SESSION_DAYS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const MIN_PASSWORD_LENGTH = 8;
const USERNAME_PATTERN = /^[a-z0-9._@-]{3,60}$/;

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

async function verifyPassword(password, stored) {
  const [algorithm, N, r, p, saltBase64, hashBase64] = String(stored || "").split("$");
  if (algorithm !== "scrypt" || !saltBase64 || !hashBase64) return false;
  const expected = Buffer.from(hashBase64, "base64");
  const actual = await scrypt(String(password), Buffer.from(saltBase64, "base64"), expected.length, {
    N: Number(N), r: Number(r), p: Number(p)
  });
  return crypto.timingSafeEqual(actual, expected);
}

// Used when the username does not exist, so a login takes the same time either way.
let dummyHashPromise = null;
function getDummyHash() {
  dummyHashPromise ??= hashPassword(crypto.randomBytes(12).toString("hex"));
  return dummyHashPromise;
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function validateUsername(username) {
  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(400, "Användarnamnet måste vara 3–60 tecken och får bara innehålla a–z, siffror, punkt, bindestreck, understreck och @.");
  }
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Lösenordet måste vara minst ${MIN_PASSWORD_LENGTH} tecken.`);
  }
  if (password.length > 200) throw new HttpError(400, "Lösenordet är för långt.");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseCookies(header) {
  const cookies = {};
  String(header || "").split(";").forEach(part => {
    const index = part.indexOf("=");
    if (index === -1) return;
    const name = part.slice(0, index).trim();
    if (!name) return;
    try {
      cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      // Ignore malformed cookies.
    }
  });
  return cookies;
}

function setSessionCookie(req, res, token, maxAgeSeconds) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ];
  if (req.secure) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

// dismissedMessages carries "hidden this time" choices over when a session is replaced
// without a new login (password change).
async function createSession(db, req, res, userId, dismissedMessages = []) {
  const token = crypto.randomBytes(32).toString("base64url");
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  await db.query(
    "INSERT INTO sessions (token_hash, user_id, expires_at, dismissed_messages) VALUES ($1, $2, now() + make_interval(secs => $3), $4)",
    [hashToken(token), userId, maxAge, dismissedMessages]
  );
  setSessionCookie(req, res, token, maxAge);
  return hashToken(token);
}

async function destroySession(db, req, res) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) await db.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  setSessionCookie(req, res, "", 0);
}

// Loads req.user from the session cookie. Does not reject anonymous requests.
function loadUser(pool) {
  return async (req, res, next) => {
    req.user = null;
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!token) return next();
    const tokenHash = hashToken(token);
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.role, u.must_change_password, u.person_id, p.shift_id, p.name,
              u.dismissed_messages, s.dismissed_messages AS session_dismissed_messages, u.preferences,
              s.last_seen_at < now() - interval '1 hour' AS needs_refresh
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         JOIN people p ON p.id = u.person_id
        WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [tokenHash]
    );
    const row = rows[0];
    if (!row) return next();
    req.sessionTokenHash = tokenHash;
    req.user = {
      id: row.id,
      username: row.username,
      role: row.role,
      mustChangePassword: row.must_change_password,
      personId: row.person_id,
      shiftId: row.shift_id,
      name: row.name,
      dismissedMessages: row.dismissed_messages,
      sessionDismissedMessages: row.session_dismissed_messages,
      preferences: row.preferences
    };
    if (row.needs_refresh) {
      // Sliding expiry: an active session stays valid.
      const maxAge = SESSION_DAYS * 24 * 60 * 60;
      await pool.query(
        "UPDATE sessions SET last_seen_at = now(), expires_at = now() + make_interval(secs => $2) WHERE token_hash = $1",
        [tokenHash, maxAge]
      );
      setSessionCookie(req, res, token, maxAge);
    }
    next();
  };
}

function requireUser(req, res, next) {
  if (!req.user) throw new HttpError(401, "Du är inte inloggad.");
  if (req.user.mustChangePassword && !req.allowWithoutPasswordChange) {
    throw new HttpError(403, "Du måste byta lösenord innan du fortsätter.", { code: "password_change_required" });
  }
  next();
}

function allowWithoutPasswordChange(req, res, next) {
  req.allowWithoutPasswordChange = true;
  next();
}

// Browsers only send custom headers cross-site after a CORS preflight, which this
// server never approves, so the header blocks cross-site form posts.
function requireAppHeader(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("X-Requested-With") !== "StaffPlanner") throw new HttpError(403, "Ogiltig förfrågan.");
  next();
}

// Simple in-memory limit for failed logins (and other guesses, with their own message).
function createLoginLimiter({
  maxFailures = 10, windowMs = 15 * 60 * 1000, message = "För många misslyckade inloggningar. Vänta en stund och försök igen."
} = {}) {
  const failures = new Map();
  const keyFor = (ip, username) => `${ip}|${username}`;
  const prune = now => {
    for (const [key, entry] of failures) if (now - entry.first > windowMs) failures.delete(key);
  };
  return {
    check(ip, username) {
      const now = Date.now();
      prune(now);
      const entry = failures.get(keyFor(ip, username));
      if (entry && entry.count >= maxFailures) {
        throw new HttpError(429, message);
      }
    },
    fail(ip, username) {
      const key = keyFor(ip, username);
      const entry = failures.get(key) || { count: 0, first: Date.now() };
      entry.count += 1;
      failures.set(key, entry);
    },
    reset(ip, username) {
      failures.delete(keyFor(ip, username));
    }
  };
}

module.exports = {
  HttpError,
  hashPassword,
  verifyPassword,
  getDummyHash,
  normalizeUsername,
  validateUsername,
  validatePassword,
  createSession,
  destroySession,
  loadUser,
  requireUser,
  allowWithoutPasswordChange,
  requireAppHeader,
  createLoginLimiter,
  hashToken,
  MIN_PASSWORD_LENGTH
};
