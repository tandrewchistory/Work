'use strict';

const express = require('express');
const { param, body } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).toInt();

const lessonBody = [
  body('date').optional({ values: 'falsy' }).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
  body('topic').trim().isLength({ min: 1, max: 200 }).withMessage('topic is required (max 200 chars)'),
  body('objectives').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  body('resources').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
];

// GET /api/classes/:id/lessons - list lesson plans for a class
router.get('/classes/:id/lessons', param('id').isInt({ min: 1 }).toInt(), validate, asyncHandler(async (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const lessons = db.prepare(
    'SELECT * FROM lessons WHERE class_id = ? ORDER BY date IS NULL, date, id'
  ).all(cls.id);
  res.json(lessons);
}));

// POST /api/classes/:id/lessons - create a lesson plan
router.post('/classes/:id/lessons', [param('id').isInt({ min: 1 }).toInt(), ...lessonBody], validate, asyncHandler(async (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const { date = null, topic, objectives = null, resources = null, notes = null } = req.body;
  const info = db.prepare(
    'INSERT INTO lessons (class_id, date, topic, objectives, resources, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(cls.id, date, topic, objectives, resources, notes);
  res.status(201).json(db.prepare('SELECT * FROM lessons WHERE id = ?').get(info.lastInsertRowid));
}));

// PUT /api/lessons/:id - update a lesson plan
router.put('/lessons/:id', [idParam, ...lessonBody], validate, asyncHandler(async (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const { date = null, topic, objectives = null, resources = null, notes = null } = req.body;
  db.prepare('UPDATE lessons SET date = ?, topic = ?, objectives = ?, resources = ?, notes = ? WHERE id = ?')
    .run(date, topic, objectives, resources, notes, lesson.id);
  res.json(db.prepare('SELECT * FROM lessons WHERE id = ?').get(lesson.id));
}));

// DELETE /api/lessons/:id - delete a lesson plan
router.delete('/lessons/:id', idParam, validate, asyncHandler(async (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  db.prepare('DELETE FROM lessons WHERE id = ?').run(lesson.id);
  res.status(204).end();
}));

module.exports = router;
