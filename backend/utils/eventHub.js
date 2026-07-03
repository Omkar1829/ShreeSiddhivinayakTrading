let clients = [];

const addClient = (res) => {
  clients.push(res);
  console.log(`[EventHub] Client connected. Total clients: ${clients.length}`);
};

const removeClient = (res) => {
  clients = clients.filter(c => c !== res);
  console.log(`[EventHub] Client disconnected. Total clients: ${clients.length}`);
};

const broadcast = (event, data) => {
  console.log(`[EventHub] Broadcasting event: ${event} to ${clients.length} clients`);
  clients.forEach((c) => {
    try {
      c.write(`event: ${event}\n`);
      c.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('[EventHub] Failed to write to client:', err.message);
    }
  });
};

module.exports = {
  addClient,
  removeClient,
  broadcast
};
