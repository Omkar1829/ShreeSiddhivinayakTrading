/**
 * Middleware wrapper for Yup schema validation.
 * @param {object} schema - Yup schema object.
 * @param {string} property - Request property to validate ('body', 'query', or 'params').
 */
const validate = (schema, property = 'body') => {
  return async (req, res, next) => {
    try {
      // Validate schema and strip extra properties not defined in the schema
      req[property] = await schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
      });
      next();
    } catch (error) {
      // Format validation errors
      const details = error.inner ? error.inner.map((err) => ({
        field: err.path,
        message: err.message,
      })) : [{
        field: error.path || 'unknown',
        message: error.message
      }];

      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Input validation errors occurred.',
          details,
        },
      });
    }
  };
};

module.exports = validate;
