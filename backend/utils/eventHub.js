let clients = [];
const { getIO } = require('../config/socket');

const addClient = (res) => {
  clients.push(res);
  console.log(`[EventHub] Client connected. Total clients: ${clients.length}`);
};

const removeClient = (res) => {
  clients = clients.filter(c => c !== res);
  console.log(`[EventHub] Client disconnected. Total clients: ${clients.length}`);
};

/**
 * Unified Broadcast Event Handler
 * Dispatches real-time updates to both SSE HTTP streams and Socket.IO WebSockets.
 */
const broadcast = (event, data) => {
  console.log(`[EventHub] Unified Broadcast event: '${event}' to ${clients.length} SSE clients`);
  
  // 1. Broadcast to SSE Clients
  clients.forEach((c) => {
    try {
      c.write(`event: ${event}\n`);
      c.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('[EventHub] Failed to write to SSE client:', err.message);
    }
  });

  // 2. Broadcast to Socket.IO WebSockets if initialized
  try {
    const io = getIO();
    if (io) {
      io.emit(event, data);
      console.log(`[EventHub] Dispatched event '${event}' to Socket.IO channel.`);
    }
  } catch (err) {
    // Socket.IO may not be initialized in standalone background scripts
  }
};

// Heartbeat ping every 30 seconds to prevent connection drops by proxies/gateways
setInterval(() => {
  clients.forEach((c) => {
    try {
      c.write(':ping\n\n');
    } catch (err) {
      // Client likely disconnected; cleanup will handle on close
    }
  });
}, 30000);

module.exports = {
  addClient,
  removeClient,
  broadcast
};
