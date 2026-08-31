'use strict';

const express = require('express');
const { param, query, body } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const STATUSES = ['present', 'absent', 'tardy', 'excused'];
const dateField = (loc) => loc('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD');

// GET /api/classes/:id/attendance?date=YYYY-MM-DD - roster with attendance status for a date
router.get('/classes/:id/attendance', [
  param('id').isInt({ min: 1 }).toInt(),
  dateField(query),
], validate, asyncHandler(async (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const rows = db.prepare(`
    SELECT e.id AS enrollment_id, s.id AS student_id, s.first_name, s.last_name,
           a.status, a.notes
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    LEFT JOIN attendance a ON a.enrollment_id = e.id AND a.date = ?
    WHERE e.class_id = ?
    ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE
  `).all(req.query.date, cls.id);

  res.json({ class: cls, date: req.query.date, roster: rows });
}));

// POST /api/classes/:id/attendance - bulk upsert attendance for a date
// body: { date: 'YYYY-MM-DD', records: [{ enrollment_id, status, notes? }] }
router.post('/classes/:id/attendance', [
  param('id').isInt({ min: 1 }).toInt(),
  dateField(body),
  body('records').isArray({ min: 1 }).withMessage('records must be a non-empty array'),
  body('records.*.enrollment_id').isInt({ min: 1 }).toInt(),
  body('records.*.status').isIn(STATUSES).withMessage(`status must be one of ${STATUSES.join(', ')}`),
  body('records.*.notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
], validate, asyncHandler(async (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const { date, records } = req.body;

  // Every enrollment_id in the batch must actually belong to this class,
  // otherwise a caller could write attendance into another teacher's class.
  const validIds = new Set(
    db.prepare('SELECT id FROM enrollments WHERE class_id = ?').all(cls.id).map((r) => r.id)
  );
  const bad = records.find((r) => !validIds.has(r.enrollment_id));
  if (bad) {
    return res.status(400).json({ error: `enrollment_id ${bad.enrollment_id} is not enrolled in this class` });
  }

  const upsert = db.prepare(`
    INSERT INTO attendance (enrollment_id, date, status, notes)
    VALUES (@enrollment_id, @date, @status, @notes)
    ON CONFLICT (enrollment_id, date) DO UPDATE SET status = excluded.status, notes = excluded.notes
  `);

  const applyAll = db.transaction((recs) => {
    for (const r of recs) {
      upsert.run({
        enrollment_id: r.enrollment_id,
        date,
        status: r.status,
        notes: r.notes ?? null,
      });
    }
  });
  applyAll(records);

  const rows = db.prepare(`
    SELECT e.id AS enrollment_id, s.id AS student_id, s.first_name, s.last_name,
           a.status, a.notes
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    LEFT JOIN attendance a ON a.enrollment_id = e.id AND a.date = ?
    WHERE e.class_id = ?
    ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE
  `).all(date, cls.id);

  res.json({ class: cls, date, roster: rows });
}));

// GET /api/enrollments/:id/attendance - full attendance history for one student in one class
router.get('/enrollments/:id/attendance', param('id').isInt({ min: 1 }).toInt(), validate, asyncHandler(async (req, res) => {
  const enrollment = db.prepare('SELECT * FROM enrollments WHERE id = ?').get(req.params.id);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  const history = db.prepare(
    'SELECT date, status, notes FROM attendance WHERE enrollment_id = ? ORDER BY date'
  ).all(enrollment.id);
  res.json(history);
}));

module.exports = router;
