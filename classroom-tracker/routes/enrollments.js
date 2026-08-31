'use strict';

const express = require('express');
const { param } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// DELETE /api/enrollments/:id - unenroll a student from a class
// (cascades to that enrollment's attendance and grade records)
router.delete('/:id', param('id').isInt({ min: 1 }).toInt(), validate, asyncHandler(async (req, res) => {
  const enrollment = db.prepare('SELECT * FROM enrollments WHERE id = ?').get(req.params.id);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  db.prepare('DELETE FROM enrollments WHERE id = ?').run(enrollment.id);
  res.status(204).end();
}));

module.exports = router;
