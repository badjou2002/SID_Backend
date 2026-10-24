const { validationResult } = require('express-validator');

/**
 * Runs the express-validator chains attached to the request and returns a
 * 400 JSON payload when any check failed.
 */
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: result.array().map((e) => ({ field: e.path, message: e.msg }))
  });
};
