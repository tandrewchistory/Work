'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const classesRouter = require('./routes/classes');
const studentsRouter = require('./routes/students');
const enrollmentsRouter = require('./routes/enrollments');
const attendanceRouter = require('./routes/attendance');
const assignmentsRouter = require('./routes/assignments');
const gradesRouter = require('./routes/grades');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1'; // bind to loopback only by default

app.disable('x-powered-by'); // also handled by helmet(), kept explicit
app.use(helmet());

// No CORS middleware is installed on purpose: the API is same-origin only,
// so browsers block cross-origin fetches to it by default.

// Body size cap guards against oversized-payload abuse; this app has no
// file uploads and no field should ever need to be this large.
app.use(express.json({ limit: '100kb' }));

// Generic API rate limit. This app has no auth, so this is the only backstop
// against a runaway client hammering the local SQLite file.
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/api/classes', classesRouter);
app.use('/api/students', studentsRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api', attendanceRouter);
app.use('/api', assignmentsRouter);
app.use('/api', gradesRouter);

app.use(express.static(path.join(__dirname, 'public')));

// Central error handler: never leak stack traces or raw error messages to
// the client, but keep them in the server log for debugging.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, HOST, () => {
  console.log(`Classroom Tracker running at http://${HOST}:${PORT}`);
});
