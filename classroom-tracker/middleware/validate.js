'use strict';

const { validationResult } = require('express-validator');

// Runs after express-validator check(...) middlewares; short-circuits the
// request with a 400 instead of letting bad input reach a route handler.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input', details: errors.array() });
  }
  next();
}

module.exports = validate;
