/**
 * Structured HTTP Request/Response Logger Middleware
 * Logs ISO timestamp, log level, HTTP method, URL, status code, response time in ms, and client IP.
 */
const httpLogger = (req, res, next) => {
  const startTime = performance.now();

  res.on('finish', () => {
    const duration = (performance.now() - startTime).toFixed(2);
    const status = res.statusCode;
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    const clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'unknown';
    const url = req.originalUrl || req.url;

    console.log(`[${new Date().toISOString()}] [${level}] ${req.method} ${url} ${status} - ${duration}ms - IP: ${clientIp}`);
  });

  next();
};

module.exports = httpLogger;
