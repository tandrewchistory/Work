'use strict';

// Wraps an async route handler so a rejected promise reaches Express's
// error handler instead of crashing the process as an unhandled rejection.
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
