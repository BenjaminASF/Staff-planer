const { createPool, runMigrations } = require("./db");
const { createApp } = require("./app");

const AUDIT_RETENTION_DAYS = 30;

async function cleanup(pool) {
  await pool.query("DELETE FROM sessions WHERE expires_at < now()");
  await pool.query("DELETE FROM audit_events WHERE created_at < now() - make_interval(days => $1)", [AUDIT_RETENTION_DAYS]);
}

async function main() {
  const pool = createPool();
  await runMigrations(pool);
  await cleanup(pool);
  setInterval(() => cleanup(pool).catch(error => console.error("Cleanup failed:", error)), 6 * 60 * 60 * 1000).unref();

  if (!process.env.SETUP_CODE) {
    console.warn("SETUP_CODE är inte satt. Det första admin-kontot kan inte skapas förrän variabeln finns.");
  }

  const port = Number(process.env.PORT) || 3000;
  const server = createApp({ pool }).listen(port, () => console.log(`Staff Planner listening on port ${port}`));

  const shutdown = () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch(error => {
  console.error("Staff Planner could not start:", error);
  process.exit(1);
});
