const path = require("node:path");
const express = require("express");
const { HttpError, loadUser, requireAppHeader, requireUser, createLoginLimiter } = require("./auth");
const { authRoutes } = require("./routes/auth");
const { peopleRoutes } = require("./routes/people");
const { shiftRoutes } = require("./routes/shifts");
const { documentRoutes } = require("./routes/documents");
const { adminRoutes, shiftBackupRoutes } = require("./routes/admin");
const { chatRoutes } = require("./routes/chat");
const { todoRoutes } = require("./routes/todos");
const { notificationRoutes } = require("./routes/notifications");
const { createMailer } = require("./mailer");
const { createRealtimeHub } = require("./realtime");

const PUBLIC_DIR = path.join(__dirname, "..", "public");

function createApp({ pool, setupCode = process.env.SETUP_CODE || "", trustProxy = true, mailer = createMailer(), appUrl = process.env.APP_URL || "" } = {}) {
  const app = express();
  const realtime = createRealtimeHub(pool);
  // Lets the server end open event streams when it shuts down.
  app.locals.realtime = realtime;
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
  api.get("/events", requireUser, realtime.handler);
  api.use(authRoutes({ pool, setupCode, loginLimiter: createLoginLimiter() }));
  api.use("/people", peopleRoutes({ pool }));
  api.use("/shifts", shiftRoutes({ pool }));
  api.use("/admin", adminRoutes({ pool }));
  api.use("/backup", shiftBackupRoutes({ pool }));
  api.use("/chat", chatRoutes({ pool }));
  api.use("/todos", todoRoutes({ pool }));
  api.use("/notifications", notificationRoutes({ pool }));
  api.use(documentRoutes({ pool, mailer, appUrl }));
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
    setHeaders(res, filePath) {
      // The pages load app.js, style.css and theme.js with ?v=<version>, bumped on every
      // change, so those URLs never change content and need no revalidation between
      // page changes. The pages themselves, and anything requested without ?v, are
      // always revalidated.
      const versioned = res.req.query?.v && /\.(?:js|css)$/.test(filePath) && !filePath.endsWith("service-worker.js");
      res.setHeader("Cache-Control", versioned ? "public, max-age=31536000, immutable" : "no-cache");
    }
  }));

  return app;
}

module.exports = { createApp };
