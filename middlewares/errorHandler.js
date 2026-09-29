/**
 * Global Error Handler Middleware
 * Catches thrown errors and returns a consistent JSON response.
 * Placeholder — to be implemented.
 */

// TODO: implement errorHandler(err, req, res, next)
// - Handle Mongoose validation errors (ValidationError)
// - Handle CastError (invalid ObjectId)
// - Handle duplicate key errors (code 11000)
// - Default: 500 Internal Server Error

module.exports = (err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};
