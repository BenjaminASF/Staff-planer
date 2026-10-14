const path = require("node:path");
const express = require("express");
const { HttpError, loadUser, requireAppHeader, createLoginLimiter } = require("./auth");
const { authRoutes } = require("./routes/auth");
const { peopleRoutes } = require("./routes/people");
const { shiftRoutes } = require("./routes/shifts");
const { documentRoutes } = require("./routes/documents");
const { adminRoutes } = require("./routes/admin");

const PUBLIC_DIR = path.join(__dirname, "..", "public");

function createApp({ pool, setupCode = process.env.SETUP_CODE || "", trustProxy = true } = {}) {
  const app = express();
  // Railway terminates HTTPS in front of the app; this makes req.secure and req.ip correct.
  if (trustProxy) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    next();
  });

  const api = express.Router();
  api.use((req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
  api.use("/admin", express.json({ limit: "20mb" }));
  api.use(express.json({ limit: "5mb" }));
  api.use(requireAppHeader);
  api.use(loadUser(pool));
  api.use(authRoutes({ pool, setupCode, loginLimiter: createLoginLimiter() }));
  api.use("/people", peopleRoutes({ pool }));
  api.use("/shifts", shiftRoutes({ pool }));
  api.use("/admin", adminRoutes({ pool }));
  api.use(documentRoutes({ pool }));
  api.use((req, res) => res.status(404).json({ error: "Okänd adress." }));
  // eslint-disable-next-line no-unused-vars
  api.use((error, req, res, next) => {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message, ...error.extra });
    if (error.type === "entity.too.large") return res.status(413).json({ error: "Datan är för stor." });
    if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Ogiltig JSON." });
    console.error(error);
    res.status(500).json({ error: "Något gick fel på servern. Försök igen." });
  });
  app.use("/api", api);

  app.use(express.static(PUBLIC_DIR, {
    extensions: ["html"],
    setHeaders(res) {
      // The pages are small and versioned by query string; always revalidate.
      res.setHeader("Cache-Control", "no-cache");
    }
  }));

  return app;
}

module.exports = { createApp };
