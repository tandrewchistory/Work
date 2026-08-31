'use strict';

const express = require('express');
const { param, body } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).toInt();

const assignmentBody = [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('name is required (max 200 chars)'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('max_points').optional().isFloat({ gt: 0 }).withMessage('max_points must be a positive number').toFloat(),
  body('due_date').optional({ values: 'falsy' }).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('due_date must be YYYY-MM-DD'),
];

// GET /api/classes/:id/assignments - list assignments for a class
router.get('/classes/:id/assignments', param('id').isInt({ min: 1 }).toInt(), validate, asyncHandler(async (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const assignments = db.prepare(
    'SELECT * FROM assignments WHERE class_id = ? ORDER BY due_date IS NULL, due_date, id'
  ).all(cls.id);
  res.json(assignments);
}));

// POST /api/classes/:id/assignments - create an assignment
router.post('/classes/:id/assignments', [param('id').isInt({ min: 1 }).toInt(), ...assignmentBody], validate, asyncHandler(async (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const { name, category = null, max_points = 100, due_date = null } = req.body;
  const info = db.prepare(
    'INSERT INTO assignments (class_id, name, category, max_points, due_date) VALUES (?, ?, ?, ?, ?)'
  ).run(cls.id, name, category, max_points, due_date);
  res.status(201).json(db.prepare('SELECT * FROM assignments WHERE id = ?').get(info.lastInsertRowid));
}));

// PUT /api/assignments/:id - update an assignment
router.put('/assignments/:id', [idParam, ...assignmentBody], validate, asyncHandler(async (req, res) => {
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  const { name, category = null, max_points = 100, due_date = null } = req.body;
  db.prepare('UPDATE assignments SET name = ?, category = ?, max_points = ?, due_date = ? WHERE id = ?')
    .run(name, category, max_points, due_date, assignment.id);
  res.json(db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignment.id));
}));

// DELETE /api/assignments/:id - delete an assignment (cascades to grades)
router.delete('/assignments/:id', idParam, validate, asyncHandler(async (req, res) => {
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  db.prepare('DELETE FROM assignments WHERE id = ?').run(assignment.id);
  res.status(204).end();
}));

module.exports = router;
