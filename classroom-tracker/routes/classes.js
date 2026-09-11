'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).toInt();

const DAY_CODES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// Period start times: 20-minute steps from 8:00am to 3:20pm inclusive.
const TIME_CODES = (() => {
  const times = [];
  for (let mins = 8 * 60; mins <= 15 * 60 + 20; mins += 20) {
    times.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
  }
  return times;
})();

// Period end times: 20-minute steps from 8:20am to 3:40pm inclusive (one step
// past every possible start, so the last period can end at 3:40pm).
const END_TIME_CODES = (() => {
  const times = [];
  for (let mins = 8 * 60 + 20; mins <= 15 * 60 + 40; mins += 20) {
    times.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
  }
  return times;
})();

const slotField = (field) => [
  body(field).optional().isArray({ max: 20 }).withMessage(`${field} must be an array`),
  body(`${field}.*.day`).isIn(DAY_CODES).withMessage(`${field} day must be one of ${DAY_CODES.join(', ')}`),
  body(`${field}.*.time`).isIn(TIME_CODES).withMessage(`${field} time must be a valid start time between 8:00am and 3:20pm`),
  body(`${field}.*.end`).isIn(END_TIME_CODES).withMessage(`${field} end must be a valid end time between 8:20am and 3:40pm`),
  body(field).custom((value) => {
    if (!Array.isArray(value)) return true;
    const bad = value.find((s) => s && s.time && s.end && s.end <= s.time);
    if (bad) throw new Error(`${field} end time must be after the start time`);
    return true;
  }),
];

const classBody = [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('name is required (max 200 chars)'),
  body('subject').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('venue').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  ...slotField('odd_week_slots'),
  ...slotField('even_week_slots'),
];

// De-dupes and sorts a slot list by day order, then time. Assumes entries
// already passed the isIn() validators above.
function normalizeSlots(list) {
  const arr = Array.isArray(list) ? list : [];
  const seen = new Set();
  const deduped = arr.filter((s) => {
    const key = `${s.day}:${s.time}:${s.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.sort((a, b) =>
    DAY_CODES.indexOf(a.day) - DAY_CODES.indexOf(b.day) || a.time.localeCompare(b.time)
  );
}

// Slots are stored as JSON text in a TEXT column (SQLite has no array type);
// parse them back out for every response that includes a class row.
function parseClass(cls) {
  return {
    ...cls,
    odd_week_slots: JSON.parse(cls.odd_week_slots || '[]'),
    even_week_slots: JSON.parse(cls.even_week_slots || '[]'),
  };
}

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
  res.json(classes.map(parseClass));
}));

// POST /api/classes - create a class
router.post('/', classBody, validate, asyncHandler(async (req, res) => {
  const { name, subject = null, venue = null, odd_week_slots, even_week_slots } = req.body;
  const info = db.prepare(
    'INSERT INTO classes (name, subject, venue, odd_week_slots, even_week_slots) VALUES (?, ?, ?, ?, ?)'
  ).run(name, subject, venue, JSON.stringify(normalizeSlots(odd_week_slots)), JSON.stringify(normalizeSlots(even_week_slots)));
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(parseClass(cls));
}));

// GET /api/classes/:id - class detail with roster
router.get('/:id', idParam, validate, asyncHandler(async (req, res) => {
  const cls = getClassOr404(req.params.id, res);
  if (!cls) return;
  const roster = db.prepare(`
    SELECT e.id AS enrollment_id, s.id AS student_id, s.full_name, s.name, s.form_class, s.email
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    WHERE e.class_id = ?
    ORDER BY s.full_name COLLATE NOCASE
  `).all(cls.id);
  res.json({ ...parseClass(cls), roster });
}));

// PUT /api/classes/:id - update a class
router.put('/:id', [idParam, ...classBody], validate, asyncHandler(async (req, res) => {
  const cls = getClassOr404(req.params.id, res);
  if (!cls) return;
  const { name, subject = null, venue = null, odd_week_slots, even_week_slots } = req.body;
  db.prepare('UPDATE classes SET name = ?, subject = ?, venue = ?, odd_week_slots = ?, even_week_slots = ? WHERE id = ?')
    .run(name, subject, venue, JSON.stringify(normalizeSlots(odd_week_slots)), JSON.stringify(normalizeSlots(even_week_slots)), cls.id);
  res.json(parseClass(db.prepare('SELECT * FROM classes WHERE id = ?').get(cls.id)));
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
