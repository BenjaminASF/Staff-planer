const { ACCOUNT_ACTIVE_SQL } = require("../auth");
const express = require("express");
const { HttpError, requireUser } = require("../auth");
const { CHAT_ROLES, canUseChat, canMakeHandover, HANDOVER_RECIPIENT_ROLE, canDeleteChatMessage } = require("../permissions");
const { parseHandover } = require("../handover");
const { cleanText } = require("../validation");
const { queueChatMessage } = require("../push");

const MAX_TEXT_LENGTH = 2000;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const PAGE_SIZE = 50;

// The declared type must match the file's own signature.
function imageMatchesType(buffer, type) {
  const startsWith = (...bytes) => bytes.every((byte, index) => buffer[index] === byte);
  switch (type) {
    case "image/jpeg": return startsWith(0xff, 0xd8, 0xff);
    case "image/png": return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/gif": return buffer.subarray(0, 4).toString("latin1") === "GIF8";
    case "image/webp": return buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP";
    default: return false;
  }
}

function parseImage(image) {
  if (!image) return null;
  const type = String(image.type || "");
  const data = typeof image.data === "string" ? image.data.replace(/^data:[^,]*,/, "") : "";
  const buffer = Buffer.from(data, "base64");
  if (!buffer.length) throw new HttpError(400, "Bilden kunde inte läsas.");
  if (buffer.length > MAX_IMAGE_BYTES) throw new HttpError(413, "Bilden är för stor. Välj en bild under 3 MB.");
  if (!imageMatchesType(buffer, type)) throw new HttpError(400, "Endast JPEG-, PNG-, WebP- och GIF-bilder kan skickas.");
  return { buffer, type };
}

const MESSAGE_COLUMNS = "id, user_id, author_name, recipient_id, recipient_name, body, image IS NOT NULL AS has_image, handover, created_at";
// Messages to everyone, plus private ones the user sent or received. $1 is the user's id.
const VISIBLE = "(recipient_id IS NULL OR recipient_id = $1 OR user_id = $1)";

function serializeMessage(row) {
  const id = String(row.id);
  return {
    id,
    userId: row.user_id,
    authorName: row.author_name,
    recipientId: row.recipient_id ?? null,
    recipientName: row.recipient_name ?? null,
    text: row.body,
    imageUrl: row.has_image ? `/api/chat/images/${id}` : null,
    handover: row.handover ?? null,
    createdAt: row.created_at
  };
}

function parseMessageId(value) {
  const id = String(value ?? "");
  return /^\d{1,18}$/.test(id) ? id : null;
}

// Users who can be written to: active, and temporary accounts only with the chat ticked.
const CHAT_MEMBER_SQL = `${ACCOUNT_ACTIVE_SQL} AND (NOT u.temporary OR 'chat' = ANY(u.features))`;

function chatRoutes({ pool }) {
  const router = express.Router();
  router.use(requireUser, (req, res, next) => {
    if (!canUseChat(req.user)) throw new HttpError(403, "Chatten är bara för admin, skiftledare, höger hand och senior operatörer.");
    next();
  });

  // Newest page by default; ?before=<id> for older messages, ?after=<id> for new ones.
  router.get("/messages", async (req, res) => {
    const after = parseMessageId(req.query.after);
    const before = parseMessageId(req.query.before);
    let rows;
    if (after) {
      ({ rows } = await pool.query(`SELECT ${MESSAGE_COLUMNS} FROM chat_messages WHERE ${VISIBLE} AND id > $2 ORDER BY id LIMIT 200`, [req.user.id, after]));
    } else {
      ({ rows } = await pool.query(
        `SELECT ${MESSAGE_COLUMNS} FROM chat_messages WHERE ${VISIBLE} AND ($2::bigint IS NULL OR id < $2) ORDER BY id DESC LIMIT $3`,
        [req.user.id, before, PAGE_SIZE + 1]
      ));
      rows = rows.reverse();
    }
    const hasOlder = !after && rows.length > PAGE_SIZE;
    if (hasOlder) rows = rows.slice(1);
    res.json({ messages: rows.map(serializeMessage), hasOlder });
  });

  // The people a message can be sent to privately. Role and shift tell which of them
  // are shift leaders, who can receive a handover, and of which shift.
  router.get("/members", async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.id, p.name, u.role, p.shift_id FROM users u JOIN people p ON p.id = u.person_id
        WHERE u.role = ANY($1) AND u.id <> $2 AND ${CHAT_MEMBER_SQL} ORDER BY lower(p.name)`,
      [CHAT_ROLES, req.user.id]
    );
    res.json({ members: rows.map(row => ({ id: row.id, name: row.name, role: row.role, shiftId: row.shift_id ?? null })) });
  });

  // A handover is a message to everyone, shown as a card and marked for the chosen
  // shift leaders, who also get a notice of their own.
  async function sendHandover(req, res) {
    if (!canMakeHandover(req.user)) throw new HttpError(403, "Bara admin, skiftledare och höger hand kan göra överlämningar.");
    const [leaders, shifts] = await Promise.all([
      pool.query(
        `SELECT u.id, p.name FROM users u JOIN people p ON p.id = u.person_id
          WHERE u.role = $1 AND ${CHAT_MEMBER_SQL}`,
        [HANDOVER_RECIPIENT_ROLE]
      ),
      pool.query("SELECT id, name FROM shifts")
    ]);
    const handover = parseHandover(req.body.handover, { user: req.user, leaders: leaders.rows, shifts: shifts.rows });
    const { rows } = await pool.query(
      `INSERT INTO chat_messages (user_id, author_name, handover) VALUES ($1, $2, $3::jsonb) RETURNING ${MESSAGE_COLUMNS}`,
      [req.user.id, req.user.name, JSON.stringify(handover)]
    );
    await pool.query(
      `INSERT INTO chat_reads (user_id, last_read_id) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET last_read_id = GREATEST(chat_reads.last_read_id, EXCLUDED.last_read_id)`,
      [req.user.id, rows[0].id]
    );
    await queueChatMessage(pool, { messageId: rows[0].id, authorId: req.user.id, chatRoles: CHAT_ROLES, handoverTo: handover.to.map(item => item.id) });
    res.status(201).json({ message: serializeMessage(rows[0]) });
  }

  router.post("/messages", async (req, res) => {
    if (req.body?.handover !== undefined) return sendHandover(req, res);
    const text = cleanText(req.body?.text, MAX_TEXT_LENGTH + 1);
    if (text.length > MAX_TEXT_LENGTH) throw new HttpError(400, `Meddelandet får vara högst ${MAX_TEXT_LENGTH} tecken.`);
    const image = parseImage(req.body?.image);
    if (!text && !image) throw new HttpError(400, "Skriv ett meddelande eller välj en bild.");
    let recipient = null;
    if (req.body?.recipientId) {
      const result = await pool.query(
        `SELECT u.id, p.name FROM users u JOIN people p ON p.id = u.person_id WHERE u.id = $1 AND u.role = ANY($2) AND ${CHAT_MEMBER_SQL}`,
        [String(req.body.recipientId), CHAT_ROLES]
      );
      recipient = result.rows[0];
      if (!recipient || recipient.id === req.user.id) throw new HttpError(400, "Mottagaren finns inte i chatten.");
    }
    const { rows } = await pool.query(
      `INSERT INTO chat_messages (user_id, author_name, recipient_id, recipient_name, body, image, image_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${MESSAGE_COLUMNS}`,
      [req.user.id, req.user.name, recipient?.id ?? null, recipient?.name ?? null, text, image?.buffer ?? null, image?.type ?? null]
    );
    // Your own message is never unread.
    await pool.query(
      `INSERT INTO chat_reads (user_id, last_read_id) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET last_read_id = GREATEST(chat_reads.last_read_id, EXCLUDED.last_read_id)`,
      [req.user.id, rows[0].id]
    );
    await queueChatMessage(pool, { messageId: rows[0].id, recipientId: recipient?.id, authorId: req.user.id, chatRoles: CHAT_ROLES });
    res.status(201).json({ message: serializeMessage(rows[0]) });
  });

  router.get("/images/:id", async (req, res) => {
    const id = parseMessageId(req.params.id);
    const { rows } = id ? await pool.query(`SELECT image, image_type FROM chat_messages WHERE ${VISIBLE} AND id = $2 AND image IS NOT NULL`, [req.user.id, id]) : { rows: [] };
    if (!rows[0]) throw new HttpError(404, "Bilden finns inte.");
    res.setHeader("Content-Type", rows[0].image_type);
    // Images never change, so the browser may keep them; "private" keeps them out of shared caches.
    res.setHeader("Cache-Control", "private, max-age=604800, immutable");
    res.setHeader("Content-Disposition", "inline");
    res.send(rows[0].image);
  });

  router.delete("/messages/:id", async (req, res) => {
    const id = parseMessageId(req.params.id);
    const { rows } = id ? await pool.query(`SELECT id, user_id FROM chat_messages WHERE ${VISIBLE} AND id = $2`, [req.user.id, id]) : { rows: [] };
    if (!rows[0]) throw new HttpError(404, "Meddelandet finns inte.");
    if (!canDeleteChatMessage(req.user, rows[0])) throw new HttpError(403, "Du kan bara ta bort dina egna meddelanden.");
    await pool.query("DELETE FROM chat_messages WHERE id = $1", [id]);
    res.json({ ok: true });
  });

  // Unread messages from others. Before someone has opened the chat, only messages
  // sent after their account was created count.
  router.get("/unread", async (req, res) => {
    const { rows } = await pool.query(
      `WITH seen AS (
         SELECT COALESCE((SELECT last_read_id FROM chat_reads WHERE user_id = $1),
                         (SELECT COALESCE(max(m.id), 0) FROM chat_messages m, users u WHERE u.id = $1 AND m.created_at < u.created_at)) AS id
       )
       SELECT count(*)::int AS count, max(m.id) AS latest_id
         FROM chat_messages m, seen
        WHERE m.id > seen.id AND m.user_id IS DISTINCT FROM $1 AND (m.recipient_id IS NULL OR m.recipient_id = $1)`,
      [req.user.id]
    );
    let latest = null;
    if (rows[0].latest_id) {
      const result = await pool.query(`SELECT ${MESSAGE_COLUMNS} FROM chat_messages WHERE id = $1`, [rows[0].latest_id]);
      latest = result.rows[0] ? serializeMessage(result.rows[0]) : null;
    }
    res.json({ count: rows[0].count, latest });
  });

  router.post("/read", async (req, res) => {
    const lastId = parseMessageId(req.body?.lastId);
    if (!lastId) throw new HttpError(400, "Ogiltigt meddelande.");
    await pool.query(
      `INSERT INTO chat_reads (user_id, last_read_id)
       VALUES ($1, LEAST($2::bigint, (SELECT COALESCE(max(id), 0) FROM chat_messages)))
       ON CONFLICT (user_id) DO UPDATE SET last_read_id = GREATEST(chat_reads.last_read_id, EXCLUDED.last_read_id)`,
      [req.user.id, lastId]
    );
    res.json({ ok: true });
  });

  return router;
}

module.exports = { chatRoutes };
