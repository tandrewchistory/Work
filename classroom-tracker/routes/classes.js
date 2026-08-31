'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).toInt();

const classBody = [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('name is required (max 200 chars)'),
  body('subject').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('period').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('room').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
];

function getClassOr404(id, res) {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
  if (!cls) {
    res.status(404).json({ error: 'Class not found' });
    return null;
  }
  return cls;
}

// GET /api/classes - list all classes with student counts
router.get('/', asyncHandler(async (req, res) => {
  const classes = db.prepare(`
    SELECT c.*, COUNT(e.id) AS student_count
    FROM classes c
    LEFT JOIN enrollments e ON e.class_id = c.id
    GROUP BY c.id
    ORDER BY c.name COLLATE NOCASE
  `).all();
  res.json(classes);
}));

// POST /api/classes - create a class
router.post('/', classBody, validate, asyncHandler(async (req, res) => {
  const { name, subject = null, period = null, room = null } = req.body;
  const info = db.prepare(
    'INSERT INTO classes (name, subject, period, room) VALUES (?, ?, ?, ?)'
  ).run(name, subject, period, room);
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(cls);
}));

// GET /api/classes/:id - class detail with roster
router.get('/:id', idParam, validate, asyncHandler(async (req, res) => {
  const cls = getClassOr404(req.params.id, res);
  if (!cls) return;
  const roster = db.prepare(`
    SELECT e.id AS enrollment_id, s.id AS student_id, s.first_name, s.last_name, s.email
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    WHERE e.class_id = ?
    ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE
  `).all(cls.id);
  res.json({ ...cls, roster });
}));

// PUT /api/classes/:id - update a class
router.put('/:id', [idParam, ...classBody], validate, asyncHandler(async (req, res) => {
  const cls = getClassOr404(req.params.id, res);
  if (!cls) return;
  const { name, subject = null, period = null, room = null } = req.body;
  db.prepare('UPDATE classes SET name = ?, subject = ?, period = ?, room = ? WHERE id = ?')
    .run(name, subject, period, room, cls.id);
  res.json(db.prepare('SELECT * FROM classes WHERE id = ?').get(cls.id));
}));

// DELETE /api/classes/:id - delete a class (cascades to enrollments/attendance/assignments/grades)
router.delete('/:id', idParam, validate, asyncHandler(async (req, res) => {
  const cls = getClassOr404(req.params.id, res);
  if (!cls) return;
  db.prepare('DELETE FROM classes WHERE id = ?').run(cls.id);
  res.status(204).end();
}));

// POST /api/classes/:id/enrollments - enroll an existing student in this class
router.post('/:id/enrollments', [
  idParam,
  body('student_id').isInt({ min: 1 }).toInt(),
], validate, asyncHandler(async (req, res) => {
  const cls = getClassOr404(req.params.id, res);
  if (!cls) return;
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.body.student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const existing = db.prepare(
    'SELECT * FROM enrollments WHERE class_id = ? AND student_id = ?'
  ).get(cls.id, student.id);
  if (existing) return res.status(409).json({ error: 'Student already enrolled in this class' });

  const info = db.prepare(
    'INSERT INTO enrollments (class_id, student_id) VALUES (?, ?)'
  ).run(cls.id, student.id);
  const enrollment = db.prepare('SELECT * FROM enrollments WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(enrollment);
}));

module.exports = router;
