const {
  canReadDocument, canUseChat, weekRequiringShare, sharedFlagKey, personalScopeOwner, hasPersonalList
} = require("./permissions");
const { readDocuments } = require("./store");

const CHANNEL = "app_changes";
const HEARTBEAT_MS = 25 * 1000;
// Streams are closed now and then so the browser reconnects and the session and
// role are checked again.
const STREAM_LIFETIME_MS = 10 * 60 * 1000;
const RECONNECT_DELAY_MS = 2000;

function canReceive(user, change) {
  if (change.type === "document") return canReadDocument(user, change.scope, change.key);
  if (change.type === "chat") return canUseChat(user);
  if (change.type === "notification") return Boolean(user?.id) && change.userId === user.id;
  return change.type === "people" || change.type === "shifts";
}

// When someone else's to-do list changes, the others with a list are only told
// to look again for tasks shared with them. Which list changed, and what is in
// it, is not sent.
function sharedTodosHint(user, change) {
  const owner = change.type === "document" && change.key === "todos" ? personalScopeOwner(change.scope) : null;
  return owner && owner !== user.id && hasPersonalList(user) ? { type: "sharedTodos" } : null;
}

// Sends database change notifications to open pages as Server-Sent Events.
// One pooled connection LISTENs, started when the first page connects.
function createRealtimeHub(pool) {
  const subscribers = new Set();
  let client = null;
  let connecting = null;
  let reconnectTimer = null;
  let lostConnection = false;
  let closed = false;

  function send(subscriber, event, data) {
    subscriber.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // Operators only hear about a week's schedule once it has been shared with them.
  // The shared flag is looked up once per change, and only when someone needs it.
  async function deliver(change) {
    let shared;
    for (const subscriber of [...subscribers]) {
      if (!subscribers.has(subscriber)) continue;
      if (!canReceive(subscriber.user, change)) {
        const hint = sharedTodosHint(subscriber.user, change);
        if (hint) send(subscriber, "change", hint);
        continue;
      }
      const week = change.type === "document" ? weekRequiringShare(subscriber.user, change.scope, change.key) : null;
      if (week) {
        shared ??= await readDocuments(pool, change.scope, [sharedFlagKey(week)])
          .then(flags => flags[sharedFlagKey(week)]?.value?.shared === true)
          .catch(error => {
            console.warn("Realtime could not check whether the week is shared:", error.message);
            return false;
          });
        if (!shared || !subscribers.has(subscriber)) continue;
      }
      send(subscriber, "change", change);
    }
  }

  // Changes are delivered one at a time so pages get them in order.
  let delivery = Promise.resolve();
  function broadcast(change) {
    delivery = delivery.then(() => deliver(change)).catch(error => console.warn("Realtime delivery failed:", error.message));
  }

  function handleConnectionLost(error) {
    console.warn("Realtime listener lost its database connection:", error?.message || error);
    const lost = client;
    client = null;
    lostConnection = true;
    lost?.removeAllListeners("notification");
    lost?.removeListener("error", handleConnectionLost);
    lost?.release(error || true);
    scheduleReconnect();
  }

  function scheduleReconnect() {
    if (closed || reconnectTimer || !subscribers.size) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void ensureListening();
    }, RECONNECT_DELAY_MS);
    reconnectTimer.unref?.();
  }

  async function ensureListening() {
    if (closed || client) return;
    connecting ??= (async () => {
      const connection = await pool.connect();
      connection.on("notification", message => {
        let change;
        try { change = JSON.parse(message.payload); } catch { return; }
        broadcast(change);
      });
      connection.on("error", handleConnectionLost);
      try {
        await connection.query(`LISTEN ${CHANNEL}`);
      } catch (error) {
        connection.removeAllListeners("notification");
        connection.removeListener("error", handleConnectionLost);
        connection.release(error);
        throw error;
      }
      if (closed) {
        connection.removeAllListeners("notification");
        connection.removeListener("error", handleConnectionLost);
        connection.release(true);
        return;
      }
      client = connection;
      // Changes made while nobody was listening were missed: let pages reload.
      if (lostConnection) {
        lostConnection = false;
        for (const subscriber of subscribers) send(subscriber, "resync", {});
      }
    })().catch(error => {
      console.warn("Realtime listener could not connect:", error.message);
      lostConnection = true;
      scheduleReconnect();
    }).finally(() => { connecting = null; });
    return connecting;
  }

  // GET /api/events
  function handler(req, res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write("retry: 3000\n\n");
    const subscriber = { user: req.user, res };
    subscribers.add(subscriber);
    send(subscriber, "ready", {});
    void ensureListening();

    const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);
    const lifetime = setTimeout(() => {
      send(subscriber, "renew", {});
      res.end();
    }, STREAM_LIFETIME_MS);
    const cleanup = () => {
      clearInterval(heartbeat);
      clearTimeout(lifetime);
      subscribers.delete(subscriber);
    };
    req.on("close", cleanup);
    res.on("close", cleanup);
  }

  async function close() {
    closed = true;
    clearTimeout(reconnectTimer);
    for (const subscriber of subscribers) subscriber.res.end();
    subscribers.clear();
    await connecting;
    if (client) {
      const connection = client;
      client = null;
      connection.removeAllListeners("notification");
      connection.removeListener("error", handleConnectionLost);
      // Not returned to the pool, so no other query inherits the LISTEN.
      connection.release(true);
    }
  }

  return { handler, close, get subscriberCount() { return subscribers.size; } };
}

module.exports = { createRealtimeHub };
