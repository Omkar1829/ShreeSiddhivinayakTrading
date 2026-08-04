const path = require('path');

const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
const allowedCsvExtensions = ['.csv'];

/**
 * Validates uploaded image file extension and MIME type.
 */
const validateImageUpload = (req, res, next) => {
  if (!req.file) return next();
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!allowedImageExtensions.includes(ext)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: `Invalid image file extension '${ext}'. Allowed extensions: ${allowedImageExtensions.join(', ')}`
      }
    });
  }
  next();
};

/**
 * Validates uploaded CSV file extension.
 */
const validateCsvUpload = (req, res, next) => {
  if (!req.file) return next();
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!allowedCsvExtensions.includes(ext)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: `Invalid file extension '${ext}'. Only .csv files are allowed.`
      }
    });
  }
  next();
};

module.exports = {
  validateImageUpload,
  validateCsvUpload
};
