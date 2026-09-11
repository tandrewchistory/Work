# Classroom Tracker

A local-first web app for tracking classes, student rosters, attendance, and
grades. Node.js + Express backend, SQLite storage (via `better-sqlite3`), and
a small dependency-free vanilla JS frontend.

## Setup

```bash
cd classroom-tracker
npm install
npm start
```

Then open http://127.0.0.1:3000 in your browser. The database file is
created automatically at `classroom-tracker/data/classroom.db` on first run.

Optional environment variables:

- `PORT` — port to listen on (default `3000`)
- `HOST` — interface to bind (default `127.0.0.1`, i.e. loopback only)
- `DB_PATH` — path to the SQLite file (default `data/classroom.db`)

## Data model

- **classes** — a class/section you teach. Has a `name` (the class, e.g.
  "Sec 3 Amanah"), `subject`, `venue`, and `odd_week_slots`/`even_week_slots`
  — each a list of `{day, time, end}` picked from a Monday–Friday day
  dropdown and 20-minute-interval start/end time dropdowns (8:00am–3:20pm
  start, 8:20am–3:40pm end, end always after start — so a class can span
  more than one period), for a fortnightly odd/even-week timetable
  rotation. Stored as JSON in the database. Editable after creation via
  "Edit class" on the class detail page.
- **students** — a student, independent of any particular class. Has a
  `full_name` (legal/registered name), `name` (preferred/called name, shown
  in rosters), and `form_class` (homeroom/tutor group) — all required, and
  all editable after creation from the student's profile page
- **enrollments** — join table linking a student to a class (a student can be
  enrolled in multiple classes)
- **attendance** — one record per enrollment per date (present/absent/tardy/excused)
- **assignments** — belongs to a class
- **grades** — one score per assignment per enrollment

## Security notes

This app currently has **no authentication** — that was a deliberate choice
for a single-user, local-only setup. To keep it as safe as reasonably
possible under that constraint:

- The server binds to `127.0.0.1` by default, so it is not reachable from
  other devices on your network unless you explicitly change `HOST`.
- **Do not expose this app to the internet or a shared network as-is.** If
  you ever want to run it somewhere multiple people (or the public) can
  reach it, add authentication first (e.g. a login with hashed passwords and
  session cookies) — the route structure is already organized so that's a
  contained addition to `server.js` and each `routes/*.js` file.
- All SQL is written with parameterized queries via `better-sqlite3`
  (`db.prepare(...).run(...)`) — no string concatenation into SQL, which is
  what prevents SQL injection.
- All input is validated server-side with `express-validator` (types,
  lengths, enums, date formats) before it reaches the database, in addition
  to `CHECK` constraints in the SQLite schema itself as a second layer.
- The frontend builds all DOM nodes via `document.createElement` /
  `textContent` — it never uses `innerHTML` with server data, which
  prevents stored/reflected XSS from names, notes, etc.
- `helmet()` sets standard security headers, including a `Content-Security-Policy`
  that only allows same-origin scripts and styles.
- No CORS middleware is installed, so browsers will refuse cross-origin
  requests to the API by default.
- Request bodies are capped at 100kb and `/api` routes are rate-limited
  (300 requests/minute) as a backstop against runaway or abusive clients.
- `data/` (the SQLite file and its WAL/journal siblings) is excluded from
  git via `.gitignore` so student data is never accidentally committed.

## API overview

All endpoints are under `/api` and return JSON.

| Resource | Endpoints |
|---|---|
| Classes | `GET/POST /api/classes`, `GET/PUT/DELETE /api/classes/:id` |
| Students | `GET/POST /api/students`, `GET/PUT/DELETE /api/students/:id` |
| Enrollments | `POST /api/classes/:id/enrollments`, `DELETE /api/enrollments/:id` |
| Attendance | `GET/POST /api/classes/:id/attendance?date=YYYY-MM-DD`, `GET /api/enrollments/:id/attendance` |
| Assignments | `GET/POST /api/classes/:id/assignments`, `PUT/DELETE /api/assignments/:id` |
| Grades | `GET/POST /api/assignments/:id/grades`, `GET /api/classes/:id/gradebook` |

## Development

```bash
npm run dev   # restarts on file changes (Node's built-in --watch)
```
