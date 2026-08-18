/**
 * Standardized API Response Utilities
 * Provides consistent HTTP success and error JSON structures across all backend endpoints.
 */

const successResponse = (res, data = {}, message = null, statusCode = 200) => {
  const payload = { success: true, ...data };
  if (message) payload.message = message;
  return res.status(statusCode).json(payload);
};

const errorResponse = (res, message = 'An unexpected error occurred.', code = 'BAD_REQUEST', statusCode = 400, details = []) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
};

module.exports = {
  successResponse,
  errorResponse
};
