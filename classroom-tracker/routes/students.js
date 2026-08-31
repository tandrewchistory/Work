'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).toInt();

const studentBody = [
  body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('first_name is required (max 100 chars)'),
  body('last_name').trim().isLength({ min: 1, max: 100 }).withMessage('last_name is required (max 100 chars)'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('email must be valid').isLength({ max: 254 }),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
];

function getStudentOr404(id, res) {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return null;
  }
  return student;
}

// GET /api/students?q=search - list/search students
router.get('/', query('q').optional().trim().isLength({ max: 200 }), validate, asyncHandler(async (req, res) => {
  const { q } = req.query;
  const students = q
    ? db.prepare(`
        SELECT * FROM students
        WHERE first_name LIKE ? ESCAPE '\\' OR last_name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\'
        ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE
      `).all(...Array(3).fill(`%${q.replace(/[%_\\]/g, '\\$&')}%`))
    : db.prepare('SELECT * FROM students ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE').all();
  res.json(students);
}));

// POST /api/students - create a student
router.post('/', studentBody, validate, asyncHandler(async (req, res) => {
  const { first_name, last_name, email = null, notes = null } = req.body;
  try {
    const info = db.prepare(
      'INSERT INTO students (first_name, last_name, email, notes) VALUES (?, ?, ?, ?)'
    ).run(first_name, last_name, email, notes);
    res.status(201).json(db.prepare('SELECT * FROM students WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'A student with that email already exists' });
    }
    throw err;
  }
}));

// GET /api/students/:id - student detail with enrolled classes
router.get('/:id', idParam, validate, asyncHandler(async (req, res) => {
  const student = getStudentOr404(req.params.id, res);
  if (!student) return;
  const classes = db.prepare(`
    SELECT c.id, c.name, c.subject, c.period, e.id AS enrollment_id
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE e.student_id = ?
    ORDER BY c.name COLLATE NOCASE
  `).all(student.id);
  res.json({ ...student, classes });
}));

// PUT /api/students/:id - update a student
router.put('/:id', [idParam, ...studentBody], validate, asyncHandler(async (req, res) => {
  const student = getStudentOr404(req.params.id, res);
  if (!student) return;
  const { first_name, last_name, email = null, notes = null } = req.body;
  try {
    db.prepare('UPDATE students SET first_name = ?, last_name = ?, email = ?, notes = ? WHERE id = ?')
      .run(first_name, last_name, email, notes, student.id);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'A student with that email already exists' });
    }
    throw err;
  }
  res.json(db.prepare('SELECT * FROM students WHERE id = ?').get(student.id));
}));

// DELETE /api/students/:id - delete a student (cascades to enrollments/attendance/grades)
router.delete('/:id', idParam, validate, asyncHandler(async (req, res) => {
  const student = getStudentOr404(req.params.id, res);
  if (!student) return;
  db.prepare('DELETE FROM students WHERE id = ?').run(student.id);
  res.status(204).end();
}));

module.exports = router;
