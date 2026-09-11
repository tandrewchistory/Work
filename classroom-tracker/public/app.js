'use strict';

const app = document.getElementById('app');
const STATUSES = ['present', 'absent', 'tardy', 'excused'];

const DAYS = [
  { code: 'Mon', label: 'Monday' },
  { code: 'Tue', label: 'Tuesday' },
  { code: 'Wed', label: 'Wednesday' },
  { code: 'Thu', label: 'Thursday' },
  { code: 'Fri', label: 'Friday' },
];

// Period start times: 20-minute steps from 8:00am to 3:20pm inclusive.
const TIMES = (() => {
  const times = [];
  for (let mins = 8 * 60; mins <= 15 * 60 + 20; mins += 20) {
    times.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
  }
  return times;
})();

// Period end times: 20-minute steps from 8:20am to 3:40pm inclusive (one step
// past every possible start, so the last period can end at 3:40pm).
const END_TIMES = (() => {
  const times = [];
  for (let mins = 8 * 60 + 20; mins <= 15 * 60 + 40; mins += 20) {
    times.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
  }
  return times;
})();

function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')}${period}`;
}

function addMinutes(hhmm, delta) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + delta;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatSlots(slots) {
  if (!slots) return '';
  if (typeof slots === 'string') return slots; // data saved before the day/time picker existed
  return slots.length
    ? slots.map((s) => `${s.day} ${formatTime(s.time)}${s.end ? '–' + formatTime(s.end) : ''}`).join(', ')
    : '';
}

/* ---------- tiny DOM helper (keeps all user data out of innerHTML) ---------- */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

/* ---------- API wrapper ---------- */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || (data.details && data.details.map((d) => d.msg).join(', ')) || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

function showError(container, err) {
  container.appendChild(el('div', { class: 'error' }, err.message));
}

/* ---------- router ---------- */
function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  return parts.length ? parts : ['classes'];
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  if (!location.hash) location.hash = '#/classes';
  render();
});

function render() {
  const parts = currentRoute();
  document.querySelectorAll('nav a').forEach((a) => {
    a.classList.toggle('active', parts[0] && a.getAttribute('href') === `#/${parts[0]}`);
  });
  clear(app);

  if (parts[0] === 'classes' && parts[1]) {
    renderClassDetail(Number(parts[1]), parts[2] || 'roster');
  } else if (parts[0] === 'students' && parts[1]) {
    renderStudentDetail(Number(parts[1]));
  } else if (parts[0] === 'students') {
    renderStudentsList();
  } else {
    renderClassesList();
  }
}

/* ---------- Classes list ---------- */
async function renderClassesList() {
  clear(app);
  const panel = el('div', { class: 'panel' }, [el('h2', {}, 'Classes')]);
  app.appendChild(panel);

  const form = el('form', {});
  const topRow = el('div', { class: 'row' });
  const subject = el('input', { placeholder: 'Subject', maxlength: '200' });
  const name = el('input', { placeholder: 'Class', required: 'true', maxlength: '200' });
  const venue = el('input', { placeholder: 'Venue', maxlength: '50' });
  topRow.append(
    el('div', {}, [el('label', {}, 'Subject'), subject]),
    el('div', {}, [el('label', {}, 'Class'), name]),
    el('div', {}, [el('label', {}, 'Venue'), venue])
  );

  const oddPicker = buildSlotPicker();
  const evenPicker = buildSlotPicker();
  const slotsRow = el('div', { class: 'row' });
  slotsRow.append(
    el('div', {}, [el('label', {}, 'Odd week slots'), oddPicker.element]),
    el('div', {}, [el('label', {}, 'Even week slots'), evenPicker.element])
  );

  const submit = el('button', { type: 'submit' }, 'Add class');
  const errBox = el('div', {});
  form.append(topRow, slotsRow, submit, errBox);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clear(errBox);
    try {
      await api('/api/classes', {
        method: 'POST',
        body: {
          name: name.value, subject: subject.value, venue: venue.value,
          odd_week_slots: oddPicker.getSlots(), even_week_slots: evenPicker.getSlots(),
        },
      });
      renderClassesList();
    } catch (err) { showError(errBox, err); }
  });
  panel.append(form);

  const listPanel = el('div', { class: 'panel' });
  app.appendChild(listPanel);

  try {
    const classes = await api('/api/classes');
    if (!classes.length) {
      listPanel.appendChild(el('p', { class: 'muted' }, 'No classes yet. Add one above.'));
      return;
    }
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {}, [
      el('th', {}, 'Subject'), el('th', {}, 'Class'), el('th', {}, 'Venue'),
      el('th', {}, 'Odd Week Slots'), el('th', {}, 'Even Week Slots'),
      el('th', {}, 'Students'), el('th', {}, ''),
    ])));
    const tbody = el('tbody');
    for (const c of classes) {
      const del = el('button', { class: 'danger' }, 'Delete');
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${c.name}"? This removes its roster, attendance, and grades.`)) return;
        await api(`/api/classes/${c.id}`, { method: 'DELETE' });
        renderClassesList();
      });
      const tr = el('tr', { class: 'clickable' }, [
        el('td', {}, c.subject || ''), el('td', {}, c.name), el('td', {}, c.venue || ''),
        el('td', { class: 'form-class' }, formatSlots(c.odd_week_slots)), el('td', { class: 'form-class' }, formatSlots(c.even_week_slots)),
        el('td', {}, String(c.student_count)), el('td', {}, del),
      ]);
      tr.addEventListener('click', () => { location.hash = `#/classes/${c.id}`; });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    listPanel.appendChild(table);
  } catch (err) { showError(listPanel, err); }
}

/* ---------- Class detail ---------- */
async function renderClassDetail(id, subtab) {
  clear(app);
  let cls;
  try {
    cls = await api(`/api/classes/${id}`);
  } catch (err) {
    app.appendChild(el('div', { class: 'panel' }, [showErrorInline(err)]));
    return;
  }

  app.appendChild(el('div', { class: 'crumbs' }, [
    linkBack('Classes', '#/classes'), ' / ', el('strong', {}, cls.name),
  ]));

  if (subtab === 'edit') {
    const editPanel = el('div', { class: 'panel' });
    app.appendChild(editPanel);
    renderClassEdit(editPanel, cls, id);
    return;
  }

  const infoItems = [
    cls.subject ? el('span', {}, ['Subject ', el('strong', {}, cls.subject)]) : null,
    cls.venue ? el('span', {}, ['Venue ', el('strong', {}, cls.venue)]) : null,
    cls.odd_week_slots && cls.odd_week_slots.length ? el('span', {}, ['Odd wk ', el('strong', {}, formatSlots(cls.odd_week_slots))]) : null,
    cls.even_week_slots && cls.even_week_slots.length ? el('span', {}, ['Even wk ', el('strong', {}, formatSlots(cls.even_week_slots))]) : null,
  ].filter(Boolean);
  const editBtn = el('button', { class: 'secondary' }, 'Edit class');
  editBtn.addEventListener('click', () => { location.hash = `#/classes/${id}/edit`; });
  app.appendChild(el('div', { class: 'class-header-row' }, [
    infoItems.length ? el('div', { class: 'profile-meta' }, infoItems) : el('div', {}),
    editBtn,
  ]));

  const subtabs = el('div', { class: 'subtabs' });
  for (const [key, label] of [['roster', 'Roster'], ['attendance', 'Attendance'], ['gradebook', 'Gradebook'], ['lessons', 'Lesson Plans']]) {
    const btn = el('button', { class: key === subtab ? 'active' : '' }, label);
    btn.addEventListener('click', () => { location.hash = `#/classes/${id}/${key}`; });
    subtabs.appendChild(btn);
  }
  app.appendChild(subtabs);

  const panel = el('div', { class: 'panel' });
  app.appendChild(panel);

  if (subtab === 'attendance') return renderAttendance(panel, cls);
  if (subtab === 'gradebook') return renderGradebook(panel, cls, id);
  if (subtab === 'lessons') return renderLessons(panel, cls, id);
  return renderRoster(panel, cls, id);
}

function renderClassEdit(panel, cls, id) {
  panel.appendChild(el('h2', {}, `Edit ${cls.name}`));

  const form = el('form', {});
  const topRow = el('div', { class: 'row' });
  const subject = el('input', { placeholder: 'Subject', maxlength: '200', value: cls.subject || '' });
  const name = el('input', { placeholder: 'Class', required: 'true', maxlength: '200', value: cls.name });
  const venue = el('input', { placeholder: 'Venue', maxlength: '50', value: cls.venue || '' });
  topRow.append(
    el('div', {}, [el('label', {}, 'Subject'), subject]),
    el('div', {}, [el('label', {}, 'Class'), name]),
    el('div', {}, [el('label', {}, 'Venue'), venue])
  );

  const oddPicker = buildSlotPicker(cls.odd_week_slots);
  const evenPicker = buildSlotPicker(cls.even_week_slots);
  const slotsRow = el('div', { class: 'row' });
  slotsRow.append(
    el('div', {}, [el('label', {}, 'Odd week slots'), oddPicker.element]),
    el('div', {}, [el('label', {}, 'Even week slots'), evenPicker.element])
  );

  const errBox = el('div', {});
  const saveBtn = el('button', { type: 'submit' }, 'Save');
  const cancelBtn = el('button', { type: 'button', class: 'secondary' }, 'Cancel');
  form.append(topRow, slotsRow, el('div', { class: 'edit-actions' }, [saveBtn, cancelBtn]));

  cancelBtn.addEventListener('click', () => { location.hash = `#/classes/${id}/roster`; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clear(errBox);
    try {
      await api(`/api/classes/${id}`, {
        method: 'PUT',
        body: {
          name: name.value, subject: subject.value, venue: venue.value,
          odd_week_slots: oddPicker.getSlots(), even_week_slots: evenPicker.getSlots(),
        },
      });
      location.hash = `#/classes/${id}/roster`;
    } catch (err) { showError(errBox, err); }
  });

  panel.append(form, errBox);
}

function linkBack(label, href) {
  const a = el('a', {}, label);
  a.addEventListener('click', () => { location.hash = href; });
  return a;
}
function studentLink(label, studentId) {
  const a = el('a', { class: 'student-link' }, label);
  a.addEventListener('click', (e) => { e.stopPropagation(); location.hash = `#/students/${studentId}`; });
  return a;
}

function showErrorInline(err) {
  return el('div', { class: 'error' }, err.message);
}

// Day + time dropdown pair with an "Add slot" button and removable chips.
// Returns { element, getSlots() } so a form can pull the current list on submit.
function buildSlotPicker(initialSlots = []) {
  // Lenient on the way in (silently drops anything malformed, e.g. slots
  // saved before the end-time picker existed) — the server is the strict
  // gate on save.
  let slots = (Array.isArray(initialSlots) ? initialSlots : []).filter((s) => s && DAYS.some((d) => d.code === s.day) && TIMES.includes(s.time) && END_TIMES.includes(s.end) && s.end > s.time);
  const daySelect = el('select');
  for (const d of DAYS) daySelect.appendChild(el('option', { value: d.code }, d.label));
  const startSelect = el('select');
  for (const t of TIMES) startSelect.appendChild(el('option', { value: t }, formatTime(t)));
  const endSelect = el('select');
  const addBtn = el('button', { type: 'button', class: 'secondary' }, '+ Add');
  const chipRow = el('div', { class: 'slot-chips' });

  function refreshEndOptions() {
    const previous = endSelect.value;
    clear(endSelect);
    const options = END_TIMES.filter((t) => t > startSelect.value);
    for (const t of options) endSelect.appendChild(el('option', { value: t }, formatTime(t)));
    const defaultEnd = addMinutes(startSelect.value, 20);
    endSelect.value = options.includes(previous) ? previous : (options.includes(defaultEnd) ? defaultEnd : options[0]);
  }
  startSelect.addEventListener('change', refreshEndOptions);
  refreshEndOptions();

  function renderChips() {
    clear(chipRow);
    if (!slots.length) {
      chipRow.appendChild(el('span', { class: 'muted' }, 'No slots added yet'));
      return;
    }
    slots.forEach((s, i) => {
      const remove = el('button', { type: 'button', class: 'chip-remove' }, '×');
      remove.addEventListener('click', () => { slots.splice(i, 1); renderChips(); });
      chipRow.appendChild(el('span', { class: 'chip' }, [`${s.day} ${formatTime(s.time)}–${formatTime(s.end)}`, remove]));
    });
  }
  renderChips();

  addBtn.addEventListener('click', () => {
    const slot = { day: daySelect.value, time: startSelect.value, end: endSelect.value };
    if (slots.some((s) => s.day === slot.day && s.time === slot.time && s.end === slot.end)) return;
    slots.push(slot);
    renderChips();
  });

  const element = el('div', {}, [
    el('div', { class: 'row slot-row' }, [daySelect, startSelect, el('span', { class: 'slot-to' }, 'to'), endSelect, addBtn]),
    chipRow,
  ]);
  return { element, getSlots: () => slots };
}

async function renderRoster(panel, cls, classId) {
  panel.appendChild(el('h2', {}, 'Roster'));

  const table = el('table');
  table.appendChild(el('thead', {}, el('tr', {}, [el('th', {}, 'Name'), el('th', {}, 'Full Name'), el('th', {}, 'Form Class'), el('th', {}, 'Email'), el('th', {}, '')])));
  const tbody = el('tbody');
  for (const s of cls.roster) {
    const remove = el('button', { class: 'secondary' }, 'Remove');
    remove.addEventListener('click', async () => {
      await api(`/api/enrollments/${s.enrollment_id}`, { method: 'DELETE' });
      renderClassDetail(classId, 'roster');
    });
    tbody.appendChild(el('tr', {}, [
      el('td', {}, studentLink(s.name, s.student_id)),
      el('td', {}, s.full_name),
      el('td', { class: 'form-class' }, s.form_class),
      el('td', {}, s.email || ''),
      el('td', {}, remove),
    ]));
  }
  table.appendChild(tbody);
  panel.appendChild(table);
  if (!cls.roster.length) panel.appendChild(el('p', { class: 'muted' }, 'No students enrolled yet.'));

  panel.appendChild(el('h3', {}, 'Enroll a student'));
  const enrollRow = el('div', { class: 'row' });
  const select = el('select');
  select.appendChild(el('option', { value: '' }, 'Loading students…'));
  const enrollBtn = el('button', {}, 'Enroll');
  const enrollErr = el('div', {});
  enrollRow.append(el('div', {}, [el('label', {}, 'Existing student'), select]), enrollBtn);
  panel.append(enrollRow, enrollErr);

  try {
    const allStudents = await api('/api/students');
    const enrolledIds = new Set(cls.roster.map((s) => s.student_id));
    const available = allStudents.filter((s) => !enrolledIds.has(s.id));
    clear(select);
    if (!available.length) {
      select.appendChild(el('option', { value: '' }, 'No available students'));
    } else {
      for (const s of available) {
        select.appendChild(el('option', { value: String(s.id) }, `${s.name} — ${s.full_name} (${s.form_class})`));
      }
    }
  } catch (err) { showError(enrollErr, err); }

  enrollBtn.addEventListener('click', async () => {
    clear(enrollErr);
    if (!select.value) return;
    try {
      await api(`/api/classes/${classId}/enrollments`, { method: 'POST', body: { student_id: Number(select.value) } });
      renderClassDetail(classId, 'roster');
    } catch (err) { showError(enrollErr, err); }
  });

  panel.appendChild(el('p', { class: 'muted' }, ['Need a new student? Add them on the ', linkBack('Students', '#/students'), ' page, then enroll them here.']));
}

async function renderAttendance(panel, cls) {
  panel.appendChild(el('h2', {}, 'Attendance'));

  const today = new Date().toISOString().slice(0, 10);
  const dateInput = el('input', { type: 'date', value: today });
  const row = el('div', { class: 'row' }, [el('div', {}, [el('label', {}, 'Date'), dateInput])]);
  panel.appendChild(row);

  const tableWrap = el('div');
  panel.appendChild(tableWrap);
  const saveBtn = el('button', {}, 'Save attendance');
  const errBox = el('div', {});
  panel.append(saveBtn, errBox);

  let currentRoster = [];

  async function loadForDate() {
    clear(tableWrap);
    clear(errBox);
    try {
      const data = await api(`/api/classes/${cls.id}/attendance?date=${dateInput.value}`);
      currentRoster = data.roster;
      const table = el('table');
      table.appendChild(el('thead', {}, el('tr', {}, [el('th', {}, 'Student'), el('th', {}, 'Status'), el('th', {}, 'Notes')])));
      const tbody = el('tbody');
      for (const r of currentRoster) {
        const btnGroup = el('div', { class: 'status-btns' });
        for (const status of STATUSES) {
          const b = el('button', { type: 'button', class: status === r.status ? `selected ${status}` : '' }, status);
          b.addEventListener('click', () => {
            r.status = status;
            btnGroup.querySelectorAll('button').forEach((x) => { x.className = x.textContent === status ? `selected ${status}` : ''; });
          });
          btnGroup.appendChild(b);
        }
        const notesInput = el('input', { value: r.notes || '', maxlength: '500' });
        notesInput.addEventListener('input', () => { r.notes = notesInput.value; });
        tbody.appendChild(el('tr', {}, [el('td', {}, studentLink(r.name, r.student_id)), el('td', {}, btnGroup), el('td', {}, notesInput)]));
      }
      table.appendChild(tbody);
      tableWrap.appendChild(table);
      if (!currentRoster.length) tableWrap.appendChild(el('p', { class: 'muted' }, 'No students enrolled in this class yet.'));
    } catch (err) { showError(errBox, err); }
  }

  dateInput.addEventListener('change', loadForDate);
  saveBtn.addEventListener('click', async () => {
    clear(errBox);
    const records = currentRoster.filter((r) => r.status).map((r) => ({ enrollment_id: r.enrollment_id, status: r.status, notes: r.notes || undefined }));
    if (!records.length) { showError(errBox, new Error('Mark at least one status before saving.')); return; }
    try {
      await api(`/api/classes/${cls.id}/attendance`, { method: 'POST', body: { date: dateInput.value, records } });
      loadForDate();
    } catch (err) { showError(errBox, err); }
  });

  await loadForDate();
}

async function renderGradebook(panel, cls, classId) {
  panel.appendChild(el('h2', {}, 'Gradebook'));

  panel.appendChild(el('h3', {}, 'New assignment'));
  const form = el('form', { class: 'row' });
  const name = el('input', { placeholder: 'Assignment name', required: 'true', maxlength: '200' });
  const category = el('input', { placeholder: 'Category', maxlength: '100' });
  const maxPoints = el('input', { type: 'number', value: '100', min: '0.01', step: '0.01' });
  const dueDate = el('input', { type: 'date' });
  const addBtn = el('button', { type: 'submit' }, 'Add assignment');
  form.append(
    el('div', {}, [el('label', {}, 'Name'), name]),
    el('div', {}, [el('label', {}, 'Category'), category]),
    el('div', {}, [el('label', {}, 'Max points'), maxPoints]),
    el('div', {}, [el('label', {}, 'Due date'), dueDate]),
    addBtn
  );
  const addErr = el('div', {});
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clear(addErr);
    try {
      await api(`/api/classes/${classId}/assignments`, {
        method: 'POST',
        body: { name: name.value, category: category.value, max_points: Number(maxPoints.value) || 100, due_date: dueDate.value || undefined },
      });
      renderClassDetail(classId, 'gradebook');
    } catch (err) { showError(addErr, err); }
  });
  panel.append(form, addErr);

  const tableWrap = el('div');
  const saveBtn = el('button', {}, 'Save grades');
  const errBox = el('div', {});
  panel.append(tableWrap, saveBtn, errBox);

  let assignments = [];
  let students = [];
  const pendingScores = new Map(); // key `${assignmentId}:${enrollmentId}` -> value

  try {
    const gb = await api(`/api/classes/${classId}/gradebook`);
    assignments = gb.assignments;
    students = gb.students;
  } catch (err) { showError(errBox, err); return; }

  if (!assignments.length) {
    tableWrap.appendChild(el('p', { class: 'muted' }, 'No assignments yet. Add one above.'));
  } else if (!students.length) {
    tableWrap.appendChild(el('p', { class: 'muted' }, 'No students enrolled in this class yet.'));
  } else {
    const table = el('table');
    const headRow = el('tr', {}, [el('th', {}, 'Student')]);
    for (const a of assignments) {
      const del = el('button', { class: 'secondary' }, '×');
      del.title = `Delete ${a.name}`;
      del.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm(`Delete assignment "${a.name}"?`)) return;
        await api(`/api/assignments/${a.id}`, { method: 'DELETE' });
        renderClassDetail(classId, 'gradebook');
      });
      headRow.appendChild(el('th', {}, [`${a.name} (/${a.max_points})`, ' ', del]));
    }
    table.appendChild(el('thead', {}, headRow));

    const tbody = el('tbody');
    for (const s of students) {
      const row = el('tr', {}, [el('td', {}, studentLink(s.name, s.student_id))]);
      for (const a of assignments) {
        const val = s.scores[a.id];
        const input = el('input', { class: 'score-input', type: 'number', min: '0', step: '0.01', value: val === null || val === undefined ? '' : String(val) });
        input.addEventListener('input', () => {
          const key = `${a.id}:${s.enrollment_id}`;
          pendingScores.set(key, { assignment_id: a.id, enrollment_id: s.enrollment_id, score: input.value === '' ? null : Number(input.value) });
        });
        row.appendChild(el('td', {}, input));
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  saveBtn.addEventListener('click', async () => {
    clear(errBox);
    if (!pendingScores.size) return;
    const byAssignment = new Map();
    for (const rec of pendingScores.values()) {
      if (!byAssignment.has(rec.assignment_id)) byAssignment.set(rec.assignment_id, []);
      byAssignment.get(rec.assignment_id).push({ enrollment_id: rec.enrollment_id, score: rec.score });
    }
    try {
      for (const [assignmentId, records] of byAssignment) {
        await api(`/api/assignments/${assignmentId}/grades`, { method: 'POST', body: { records } });
      }
      renderClassDetail(classId, 'gradebook');
    } catch (err) { showError(errBox, err); }
  });
}

/* ---------- Lesson plans ---------- */
async function renderLessons(panel, cls, classId) {
  panel.appendChild(el('h2', {}, 'Lesson Plans'));

  const listWrap = el('div');
  panel.appendChild(listWrap);
  try {
    const lessons = await api(`/api/classes/${classId}/lessons`);
    if (!lessons.length) {
      listWrap.appendChild(el('p', { class: 'muted' }, 'No lesson plans yet. Add one below.'));
    } else {
      for (const lesson of lessons) {
        listWrap.appendChild(buildLessonCard(lesson, () => renderClassDetail(classId, 'lessons')));
      }
    }
  } catch (err) {
    listWrap.appendChild(showErrorInline(err));
  }

  panel.appendChild(el('h3', {}, 'New lesson'));
  const { form, errBox } = buildNewLessonForm(classId, () => renderClassDetail(classId, 'lessons'));
  panel.append(form, errBox);
}

function lessonField(label, text) {
  return el('div', { class: 'lesson-field' }, [
    el('span', { class: 'lesson-field-label' }, label),
    el('div', { class: 'lesson-field-text' }, text),
  ]);
}

// Self-contained card: toggles between a view and an edit form in place,
// so editing one lesson never disturbs the rest of the list.
function buildLessonCard(lesson, onChange) {
  const card = el('div', { class: 'lesson-card' });

  function renderView() {
    clear(card);
    const editBtn = el('button', { class: 'secondary' }, 'Edit');
    const delBtn = el('button', { class: 'danger' }, 'Delete');
    editBtn.addEventListener('click', renderEdit);
    delBtn.addEventListener('click', async () => {
      if (!confirm(`Delete lesson "${lesson.topic}"?`)) return;
      await api(`/api/lessons/${lesson.id}`, { method: 'DELETE' });
      onChange();
    });
    card.appendChild(el('div', { class: 'lesson-card-header' }, [
      el('div', {}, [
        lesson.date ? el('span', { class: 'lesson-date' }, lesson.date) : null,
        el('h4', {}, lesson.topic),
      ].filter(Boolean)),
      el('div', { class: 'edit-actions' }, [editBtn, delBtn]),
    ]));
    if (lesson.objectives) card.appendChild(lessonField('Objectives', lesson.objectives));
    if (lesson.resources) card.appendChild(lessonField('Resources', lesson.resources));
    if (lesson.notes) card.appendChild(lessonField('Notes', lesson.notes));
  }

  function renderEdit() {
    clear(card);
    const form = el('form', { class: 'row' });
    const date = el('input', { type: 'date', value: lesson.date || '' });
    const topic = el('input', { value: lesson.topic, required: 'true', maxlength: '200' });
    const objectives = el('textarea', { maxlength: '2000' }, lesson.objectives || '');
    const resources = el('input', { value: lesson.resources || '', maxlength: '500' });
    const notes = el('textarea', { maxlength: '2000' }, lesson.notes || '');
    form.append(
      el('div', {}, [el('label', {}, 'Date'), date]),
      el('div', {}, [el('label', {}, 'Topic'), topic]),
      el('div', { style: 'flex-basis:100%' }, [el('label', {}, 'Objectives'), objectives]),
      el('div', {}, [el('label', {}, 'Resources'), resources]),
      el('div', { style: 'flex-basis:100%' }, [el('label', {}, 'Notes'), notes])
    );
    const errBox = el('div', {});
    const saveBtn = el('button', { type: 'submit' }, 'Save');
    const cancelBtn = el('button', { type: 'button', class: 'secondary' }, 'Cancel');
    form.appendChild(el('div', { class: 'edit-actions' }, [saveBtn, cancelBtn]));
    cancelBtn.addEventListener('click', renderView);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clear(errBox);
      try {
        const updated = await api(`/api/lessons/${lesson.id}`, {
          method: 'PUT',
          body: {
            date: date.value || undefined, topic: topic.value,
            objectives: objectives.value || undefined, resources: resources.value || undefined, notes: notes.value || undefined,
          },
        });
        Object.assign(lesson, updated);
        renderView();
      } catch (err) { showError(errBox, err); }
    });
    card.append(form, errBox);
  }

  renderView();
  return card;
}

function buildNewLessonForm(classId, onCreated) {
  const form = el('form', { class: 'row' });
  const date = el('input', { type: 'date' });
  const topic = el('input', { placeholder: 'Topic', required: 'true', maxlength: '200' });
  const objectives = el('textarea', { placeholder: 'Learning objectives', maxlength: '2000' });
  const resources = el('input', { placeholder: 'Resources', maxlength: '500' });
  const notes = el('textarea', { placeholder: 'Notes / activities', maxlength: '2000' });
  const submit = el('button', { type: 'submit' }, 'Add lesson');
  form.append(
    el('div', {}, [el('label', {}, 'Date'), date]),
    el('div', {}, [el('label', {}, 'Topic'), topic]),
    el('div', { style: 'flex-basis:100%' }, [el('label', {}, 'Objectives'), objectives]),
    el('div', {}, [el('label', {}, 'Resources'), resources]),
    el('div', { style: 'flex-basis:100%' }, [el('label', {}, 'Notes'), notes]),
    submit
  );
  const errBox = el('div', {});
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clear(errBox);
    try {
      await api(`/api/classes/${classId}/lessons`, {
        method: 'POST',
        body: {
          date: date.value || undefined, topic: topic.value,
          objectives: objectives.value || undefined, resources: resources.value || undefined, notes: notes.value || undefined,
        },
      });
      onCreated();
    } catch (err) { showError(errBox, err); }
  });
  return { form, errBox };
}

/* ---------- Students list ---------- */
async function renderStudentsList() {
  clear(app);
  const panel = el('div', { class: 'panel' }, [el('h2', {}, 'Students')]);
  app.appendChild(panel);

  const form = el('form', { class: 'row' });
  const fullName = el('input', { placeholder: 'Full name', required: 'true', maxlength: '200' });
  const name = el('input', { placeholder: 'Name (preferred)', required: 'true', maxlength: '100' });
  const formClass = el('input', { placeholder: 'Form class', required: 'true', maxlength: '50' });
  const email = el('input', { type: 'email', placeholder: 'Email (optional)', maxlength: '254' });
  const submit = el('button', { type: 'submit' }, 'Add student');
  form.append(
    el('div', {}, [el('label', {}, 'Full name'), fullName]),
    el('div', {}, [el('label', {}, 'Name'), name]),
    el('div', {}, [el('label', {}, 'Form class'), formClass]),
    el('div', {}, [el('label', {}, 'Email'), email]),
    submit
  );
  const errBox = el('div', {});
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clear(errBox);
    try {
      await api('/api/students', { method: 'POST', body: { full_name: fullName.value, name: name.value, form_class: formClass.value, email: email.value || undefined } });
      renderStudentsList();
    } catch (err) { showError(errBox, err); }
  });
  panel.append(form, errBox);

  const searchBox = el('input', { placeholder: 'Search students…', style: 'margin-bottom:12px;width:100%' });
  const listPanel = el('div', { class: 'panel' });
  app.append(searchBox, listPanel);

  async function load(q) {
    clear(listPanel);
    try {
      const students = await api(`/api/students${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      if (!students.length) {
        listPanel.appendChild(el('p', { class: 'muted' }, 'No students found.'));
        return;
      }
      const table = el('table');
      table.appendChild(el('thead', {}, el('tr', {}, [el('th', {}, 'Name'), el('th', {}, 'Full Name'), el('th', {}, 'Form Class'), el('th', {}, '')])));
      const tbody = el('tbody');
      for (const s of students) {
        const del = el('button', { class: 'danger' }, 'Delete');
        del.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm(`Delete ${s.full_name}? This removes their enrollments, attendance, and grades.`)) return;
          await api(`/api/students/${s.id}`, { method: 'DELETE' });
          load(searchBox.value);
        });
        const tr = el('tr', { class: 'clickable' }, [
          el('td', {}, studentLink(s.name, s.id)),
          el('td', {}, s.full_name),
          el('td', { class: 'form-class' }, s.form_class),
          el('td', {}, del),
        ]);
        tr.addEventListener('click', () => { location.hash = `#/students/${s.id}`; });
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      listPanel.appendChild(table);
    } catch (err) { showError(listPanel, err); }
  }

  let debounceTimer;
  searchBox.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => load(searchBox.value), 250);
  });
  await load('');
}

/* ---------- Student detail ---------- */
async function renderStudentDetail(id) {
  clear(app);
  let student;
  try {
    student = await api(`/api/students/${id}`);
  } catch (err) {
    app.appendChild(el('div', { class: 'panel' }, [showErrorInline(err)]));
    return;
  }

  app.appendChild(el('div', { class: 'crumbs' }, [linkBack('Students', '#/students'), ' / ', el('strong', {}, student.name)]));

  const panel = el('div', { class: 'panel' });
  app.appendChild(panel);
  renderStudentView(panel, id, student);
}

function renderStudentView(panel, id, student) {
  clear(panel);

  const editBtn = el('button', { class: 'secondary' }, 'Edit');
  editBtn.addEventListener('click', () => renderStudentEdit(panel, id, student));
  panel.appendChild(el('div', { class: 'panel-header' }, [el('h2', {}, student.name), editBtn]));

  panel.appendChild(el('div', { class: 'profile-meta' }, [
    el('span', {}, ['Full name ', el('strong', {}, student.full_name)]),
    el('span', {}, ['Form class ', el('strong', {}, student.form_class)]),
  ]));
  if (student.email) panel.appendChild(el('p', { class: 'muted' }, student.email));
  if (student.notes) panel.appendChild(el('p', {}, student.notes));

  panel.appendChild(el('h3', {}, 'Enrolled classes'));
  if (!student.classes.length) {
    panel.appendChild(el('p', { class: 'muted' }, 'Not enrolled in any classes yet.'));
  } else {
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {}, [el('th', {}, 'Subject'), el('th', {}, 'Class'), el('th', {}, 'Venue'), el('th', {}, '')])));
    const tbody = el('tbody');
    for (const c of student.classes) {
      const remove = el('button', { class: 'secondary' }, 'Unenroll');
      remove.addEventListener('click', async () => {
        await api(`/api/enrollments/${c.enrollment_id}`, { method: 'DELETE' });
        renderStudentDetail(id);
      });
      const tr = el('tr', {}, [el('td', {}, c.subject || ''), el('td', {}, c.name), el('td', {}, c.venue || ''), el('td', {}, remove)]);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    panel.appendChild(table);
  }
}

function renderStudentEdit(panel, id, student) {
  clear(panel);
  panel.appendChild(el('h2', {}, `Edit ${student.name}`));

  const form = el('form', { class: 'row' });
  const fullName = el('input', { value: student.full_name, required: 'true', maxlength: '200' });
  const name = el('input', { value: student.name, required: 'true', maxlength: '100' });
  const formClass = el('input', { value: student.form_class, required: 'true', maxlength: '50' });
  const email = el('input', { type: 'email', value: student.email || '', maxlength: '254' });
  const notes = el('textarea', { maxlength: '2000' }, student.notes || '');

  form.append(
    el('div', {}, [el('label', {}, 'Full name'), fullName]),
    el('div', {}, [el('label', {}, 'Name'), name]),
    el('div', {}, [el('label', {}, 'Form class'), formClass]),
    el('div', {}, [el('label', {}, 'Email'), email]),
    el('div', { style: 'flex-basis:100%' }, [el('label', {}, 'Notes'), notes])
  );

  const errBox = el('div', {});
  const saveBtn = el('button', { type: 'submit' }, 'Save');
  const cancelBtn = el('button', { type: 'button', class: 'secondary' }, 'Cancel');
  form.appendChild(el('div', { class: 'edit-actions' }, [saveBtn, cancelBtn]));

  cancelBtn.addEventListener('click', () => renderStudentView(panel, id, student));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clear(errBox);
    try {
      await api(`/api/students/${id}`, {
        method: 'PUT',
        body: {
          full_name: fullName.value, name: name.value, form_class: formClass.value,
          email: email.value || undefined, notes: notes.value || undefined,
        },
      });
      const refreshed = await api(`/api/students/${id}`);
      renderStudentView(panel, id, refreshed);
    } catch (err) { showError(errBox, err); }
  });

  panel.append(form, errBox);
}
