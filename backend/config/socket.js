const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_siddhivinayak_jwt_access_secret';

let io = null;

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Restrict to frontends in production
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  });

  // Authentication Middleware for Socket Connection
  io.use((socket, next) => {
    let token = socket.handshake.auth?.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;
    jwt.verify(tokenString, JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    console.log(`[Socket.IO] Client connected: user=${userId}, role=${socket.user.role}`);

    // Join room for user's own notifications
    socket.join(userId);

    // If user is admin, join admin broadcast room
    if (socket.user.isAdmin || socket.user.role === 'ADMIN') {
      socket.join('admins');
      console.log(`[Socket.IO] Admin joined 'admins' room: user=${userId}`);
    }

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: user=${userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call init(server) first.');
  }
  return io;
};

const emitToAdmins = (event, data) => {
  if (io) {
    io.to('admins').emit(event, data);
    console.log(`[Socket.IO] Event '${event}' broadcasted to admins room.`);
  }
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(userId).emit(event, data);
    console.log(`[Socket.IO] Event '${event}' sent to user room: ${userId}`);
  }
};

module.exports = {
  init,
  getIO,
  emitToAdmins,
  emitToUser
};
