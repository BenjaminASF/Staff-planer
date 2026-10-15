const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { ROLES, PERSONAL_SCOPE_PREFIX, hasPersonalList } = require("../permissions");

// Each to-do item lists the user ids it is shared with in `sharedWith`. Nobody
// else's list is ever read whole: these routes hand out only the items shared
// with the signed-in user, read-only.
function todoRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser);
  router.use((req, res, next) => {
    if (!hasPersonalList(req.user)) throw new HttpError(403, "Du har ingen att göra-lista.");
    next();
  });

  // Who a task can be shared with: everyone else who has a list of their own.
  router.get("/recipients", async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.id, p.name FROM users u JOIN people p ON p.id = u.person_id
        WHERE u.role <> $1 AND u.id <> $2 ORDER BY lower(p.name)`,
      [ROLES.OPERATOR, req.user.id]
    );
    res.json({ recipients: rows.map(row => ({ id: row.id, name: row.name })) });
  });

  // Tasks other users have shared with me. Owners who have since lost their
  // list (for example by becoming operators) no longer share anything.
  router.get("/shared", async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.id AS owner_id, p.name AS owner_name, d.value
         FROM documents d
         JOIN users u ON d.scope = $1 || u.id
         JOIN people p ON p.id = u.person_id
        WHERE d.key = 'todos' AND u.id <> $2 AND u.role <> $3
          AND jsonb_typeof(d.value) = 'array'
          AND d.value @> jsonb_build_array(jsonb_build_object('sharedWith', jsonb_build_array($2::text)))
        ORDER BY lower(p.name)`,
      [PERSONAL_SCOPE_PREFIX, req.user.id, ROLES.OPERATOR]
    );
    const items = rows.flatMap(row => row.value
      .filter(item => Array.isArray(item?.sharedWith) && item.sharedWith.includes(req.user.id))
      .map(item => ({
        id: String(item.id || ""),
        text: String(item.text || ""),
        createdAt: item.createdAt || "",
        createdWeek: item.createdWeek || "",
        completedAt: item.completedAt || "",
        completedDay: item.completedDay || "",
        ownerId: row.owner_id,
        ownerName: row.owner_name
      })));
    res.json({ items });
  });

  return router;
}

module.exports = { todoRoutes };
