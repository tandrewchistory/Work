'use strict';

const app = document.getElementById('app');
const STATUSES = ['present', 'absent', 'tardy', 'excused'];

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

  const form = el('form', { class: 'row' });
  const subject = el('input', { placeholder: 'Subject', maxlength: '200' });
  const name = el('input', { placeholder: 'Class', required: 'true', maxlength: '200' });
  const venue = el('input', { placeholder: 'Venue', maxlength: '50' });
  const oddSlots = el('input', { placeholder: 'e.g. Mon P1-P2, Wed P5', maxlength: '200' });
  const evenSlots = el('input', { placeholder: 'e.g. Tue P3-P4, Fri P1', maxlength: '200' });
  const submit = el('button', { type: 'submit' }, 'Add class');
  form.append(
    el('div', {}, [el('label', {}, 'Subject'), subject]),
    el('div', {}, [el('label', {}, 'Class'), name]),
    el('div', {}, [el('label', {}, 'Venue'), venue]),
    el('div', {}, [el('label', {}, 'Odd week slots'), oddSlots]),
    el('div', {}, [el('label', {}, 'Even week slots'), evenSlots]),
    submit
  );
  const errBox = el('div', {});
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clear(errBox);
    try {
      await api('/api/classes', {
        method: 'POST',
        body: { name: name.value, subject: subject.value, venue: venue.value, odd_week_slots: oddSlots.value, even_week_slots: evenSlots.value },
      });
      renderClassesList();
    } catch (err) { showError(errBox, err); }
  });
  panel.append(form, errBox);

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
        el('td', { class: 'form-class' }, c.odd_week_slots || ''), el('td', { class: 'form-class' }, c.even_week_slots || ''),
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

  const infoItems = [
    cls.subject ? el('span', {}, ['Subject ', el('strong', {}, cls.subject)]) : null,
    cls.venue ? el('span', {}, ['Venue ', el('strong', {}, cls.venue)]) : null,
    cls.odd_week_slots ? el('span', {}, ['Odd wk ', el('strong', {}, cls.odd_week_slots)]) : null,
    cls.even_week_slots ? el('span', {}, ['Even wk ', el('strong', {}, cls.even_week_slots)]) : null,
  ].filter(Boolean);
  if (infoItems.length) app.appendChild(el('div', { class: 'profile-meta' }, infoItems));

  const subtabs = el('div', { class: 'subtabs' });
  for (const [key, label] of [['roster', 'Roster'], ['attendance', 'Attendance'], ['gradebook', 'Gradebook']]) {
    const btn = el('button', { class: key === subtab ? 'active' : '' }, label);
    btn.addEventListener('click', () => { location.hash = `#/classes/${id}/${key}`; });
    subtabs.appendChild(btn);
  }
  app.appendChild(subtabs);

  const panel = el('div', { class: 'panel' });
  app.appendChild(panel);

  if (subtab === 'attendance') return renderAttendance(panel, cls);
  if (subtab === 'gradebook') return renderGradebook(panel, cls, id);
  return renderRoster(panel, cls, id);
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
  panel.appendChild(el('h2', {}, student.name));
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

  app.appendChild(panel);
}
