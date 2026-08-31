-- Classroom Tracker schema
-- SQLite enforces these constraints at the DB layer as a second line of
-- defense beyond the application-level validation in routes/.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS classes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 200),
  subject     TEXT CHECK (length(subject) <= 200),
  period      TEXT CHECK (length(period) <= 50),
  room        TEXT CHECK (length(room) <= 50),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS students (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name  TEXT NOT NULL CHECK (length(trim(first_name)) > 0 AND length(first_name) <= 100),
  last_name   TEXT NOT NULL CHECK (length(trim(last_name)) > 0 AND length(last_name) <= 100),
  email       TEXT UNIQUE CHECK (email IS NULL OR length(email) <= 254),
  notes       TEXT CHECK (notes IS NULL OR length(notes) <= 2000),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- A student can be enrolled in many classes; a class has many students.
CREATE TABLE IF NOT EXISTS enrollments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);

-- One attendance record per enrollment per calendar date.
CREATE TABLE IF NOT EXISTS attendance (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  date          TEXT NOT NULL CHECK (date LIKE '____-__-__'),
  status        TEXT NOT NULL CHECK (status IN ('present', 'absent', 'tardy', 'excused')),
  notes         TEXT CHECK (notes IS NULL OR length(notes) <= 500),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (enrollment_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_enrollment ON attendance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

CREATE TABLE IF NOT EXISTS assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 200),
  category    TEXT CHECK (category IS NULL OR length(category) <= 100),
  max_points  REAL NOT NULL DEFAULT 100 CHECK (max_points > 0),
  due_date    TEXT CHECK (due_date IS NULL OR due_date LIKE '____-__-__'),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);

-- One grade per assignment per enrollment.
CREATE TABLE IF NOT EXISTS grades (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id  INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  enrollment_id  INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  score          REAL CHECK (score IS NULL OR score >= 0),
  notes          TEXT CHECK (notes IS NULL OR length(notes) <= 500),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (assignment_id, enrollment_id)
);

CREATE INDEX IF NOT EXISTS idx_grades_assignment ON grades(assignment_id);
CREATE INDEX IF NOT EXISTS idx_grades_enrollment ON grades(enrollment_id);
