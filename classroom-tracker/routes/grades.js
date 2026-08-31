'use strict';

const express = require('express');
const { param, body } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// GET /api/assignments/:id/grades - roster with each student's score for one assignment
router.get('/assignments/:id/grades', param('id').isInt({ min: 1 }).toInt(), validate, asyncHandler(async (req, res) => {
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const rows = db.prepare(`
    SELECT e.id AS enrollment_id, s.id AS student_id, s.first_name, s.last_name,
           g.score, g.notes
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    LEFT JOIN grades g ON g.enrollment_id = e.id AND g.assignment_id = ?
    WHERE e.class_id = ?
    ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE
  `).all(assignment.id, assignment.class_id);

  res.json({ assignment, roster: rows });
}));

// POST /api/assignments/:id/grades - bulk upsert scores for an assignment
// body: { records: [{ enrollment_id, score, notes? }] }
router.post('/assignments/:id/grades', [
  param('id').isInt({ min: 1 }).toInt(),
  body('records').isArray({ min: 1 }).withMessage('records must be a non-empty array'),
  body('records.*.enrollment_id').isInt({ min: 1 }).toInt(),
  body('records.*.score').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('score must be a non-negative number').toFloat(),
  body('records.*.notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
], validate, asyncHandler(async (req, res) => {
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const { records } = req.body;

  // Every enrollment_id must belong to this assignment's class.
  const validIds = new Set(
    db.prepare('SELECT id FROM enrollments WHERE class_id = ?').all(assignment.class_id).map((r) => r.id)
  );
  const bad = records.find((r) => !validIds.has(r.enrollment_id));
  if (bad) {
    return res.status(400).json({ error: `enrollment_id ${bad.enrollment_id} is not enrolled in this class` });
  }

  const upsert = db.prepare(`
    INSERT INTO grades (assignment_id, enrollment_id, score, notes)
    VALUES (@assignment_id, @enrollment_id, @score, @notes)
    ON CONFLICT (assignment_id, enrollment_id) DO UPDATE SET score = excluded.score, notes = excluded.notes
  `);

  const applyAll = db.transaction((recs) => {
    for (const r of recs) {
      upsert.run({
        assignment_id: assignment.id,
        enrollment_id: r.enrollment_id,
        score: r.score ?? null,
        notes: r.notes ?? null,
      });
    }
  });
  applyAll(records);

  const rows = db.prepare(`
    SELECT e.id AS enrollment_id, s.id AS student_id, s.first_name, s.last_name,
           g.score, g.notes
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    LEFT JOIN grades g ON g.enrollment_id = e.id AND g.assignment_id = ?
    WHERE e.class_id = ?
    ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE
  `).all(assignment.id, assignment.class_id);

  res.json({ assignment, roster: rows });
}));

// GET /api/classes/:id/gradebook - full assignments x students grade matrix
router.get('/classes/:id/gradebook', param('id').isInt({ min: 1 }).toInt(), validate, asyncHandler(async (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const students = db.prepare(`
    SELECT e.id AS enrollment_id, s.id AS student_id, s.first_name, s.last_name
    FROM enrollments e JOIN students s ON s.id = e.student_id
    WHERE e.class_id = ?
    ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE
  `).all(cls.id);

  const assignments = db.prepare(
    'SELECT * FROM assignments WHERE class_id = ? ORDER BY due_date IS NULL, due_date, id'
  ).all(cls.id);

  const grades = db.prepare(`
    SELECT g.enrollment_id, g.assignment_id, g.score
    FROM grades g JOIN assignments a ON a.id = g.assignment_id
    WHERE a.class_id = ?
  `).all(cls.id);

  const byEnrollment = new Map();
  for (const g of grades) {
    if (!byEnrollment.has(g.enrollment_id)) byEnrollment.set(g.enrollment_id, new Map());
    byEnrollment.get(g.enrollment_id).set(g.assignment_id, g.score);
  }

  const matrix = students.map((s) => ({
    ...s,
    scores: Object.fromEntries(assignments.map((a) => [a.id, byEnrollment.get(s.enrollment_id)?.get(a.id) ?? null])),
  }));

  res.json({ class: cls, assignments, students: matrix });
}));

module.exports = router;
