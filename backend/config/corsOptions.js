/**
 * Dynamic CORS Origin Security & Configuration Module
 */

const getCorsOrigin = () => {
  const rawOrigins = process.env.CORS_ORIGIN;
  if (!rawOrigins || rawOrigins.trim() === '*' || rawOrigins.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[CORS Warning] CORS_ORIGIN is unset or wildcard in production. Restrict CORS_ORIGIN in .env to your frontend domains.');
    }
    return '*';
  }
  return rawOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowed = getCorsOrigin();
    if (allowed === '*' || !origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy rejection: Origin '${origin}' is not allowed.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

module.exports = {
  getCorsOrigin,
  corsOptions
};
