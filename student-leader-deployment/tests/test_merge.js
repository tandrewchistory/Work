// Two-teacher merge test. Usage: node tests/test_merge.js <scratch-dir> <path-to-student-leader-deployment.html>
// Needs Playwright installed globally (npm i -g playwright) and a Chromium browser.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const SP = process.argv[2], SRC = process.argv[3];
const SHARED = SP + '/shared/student-leader-deployment.html';
fs.mkdirSync(SP + '/shared', { recursive: true });
fs.copyFileSync(SRC, SHARED);
const errors = [];
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) process.exitCode = 1; };

async function teacher(browser, name, { fsa = true } = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(name + ': ' + e.message));
  p.on('dialog', d => d.accept(d.type() === 'prompt' ? name : undefined));
  await ctx.exposeFunction('__readShared', () => ({ text: fs.readFileSync(SHARED, 'utf8'), mtime: fs.statSync(SHARED).mtimeMs }));
  await ctx.exposeFunction('__writeShared', t => { fs.writeFileSync(SHARED, t); });
  await ctx.addInitScript(({ fsa, name }) => {
    try { localStorage.setItem('sld-user-name', name); } catch (_) {}
    if (!fsa) { delete window.showOpenFilePicker; delete window.showSaveFilePicker; return; }
    const handle = {
      name: 'student-leader-deployment.html',
      async getFile() { const r = await window.__readShared(); return { lastModified: r.mtime, text: async () => r.text }; },
      async queryPermission() { return 'granted'; },
      async requestPermission() { return 'granted'; },
      async createWritable() { let buf = ''; return { write: async t => { buf = t; }, close: async () => { await window.__writeShared(buf); } }; },
    };
    window.showOpenFilePicker = async () => [handle];
  }, { fsa, name });
  await p.goto('file://' + SHARED);
  return p;
}
const state = p => p.evaluate(() => ({
  students: data.students.map(s => s.fullName), deps: data.deployments.length, rev: data.revision,
  dep1: data.deployments.find(d => d.id === 'd1')?.status,
  recycling: data.deployments.filter(d => d.activityId === 'a10').map(d => d.studentId).sort(),
}));
const disk = () => { const m = fs.readFileSync(SHARED, 'utf8').match(/id="sld-data"[^>]*>([\s\S]*?)<\/script>/); return JSON.parse(m[1]); };
const save = async p => { await p.click('.topbar button.primary'); await p.waitForFunction(() => !dirty); };

(async () => {
  const b = await chromium.launch();
  const A = await teacher(b, 'Ms Ang'), B = await teacher(b, 'Mr Bala');

  // 1. Different edits by two teachers, saved one after the other.
  await A.evaluate(() => { saveStudent(null, { fullName: 'Alice Koh', name: 'Alice', formClass: '302', group: 'CCA Leader', ccas: ['Choir'], notes: '' }); commit(); });
  await B.evaluate(() => {
    data.deployments.push(touch({ id: 'dB1', activityId: 'a10', studentId: 's27', role: 'Logistics', status: 'Confirmed', hours: null, remarks: '' }));
    removeRecords('students', s => s.id === 's28'); removeRecords('deployments', d => d.studentId === 's28');
    commit();
  });
  await save(B);
  await save(A);
  let d = disk();
  ok(d.students.some(s => s.fullName === 'Alice Koh'), 'A’s new student kept after both saved');
  ok(d.deployments.some(x => x.id === 'dB1'), 'B’s new deployment kept after A saved');
  ok(!d.students.some(s => s.id === 's28') && !d.deployments.some(x => x.studentId === 's28'), 'B’s deletion not undone by A’s older copy');
  ok(d.revision === 2, 'revision counts both saves (got ' + d.revision + ')');
  const sa = await state(A);
  ok(sa.students.includes('Alice Koh') && !sa.students.includes('Ho Zi Xuan') && sa.recycling.includes('s27'), 'A’s page now shows B’s changes too');

  // 2. Same record edited by both: the later edit wins.
  await B.click('.topbar button:has-text("Get latest")');
  await B.waitForFunction(() => data.revision === 2);
  await A.evaluate(() => { const x = data.deployments.find(d => d.id === 'd1'); x.status = 'Withdrawn'; touch(x); commit(); });
  await new Promise(r => setTimeout(r, 20));
  await B.evaluate(() => { const x = data.deployments.find(d => d.id === 'd1'); x.status = 'Tentative'; touch(x); commit(); });
  await save(B); await save(A);
  ok(disk().deployments.find(x => x.id === 'd1').status === 'Tentative', 'later edit (B) wins even though A saved last');

  // 3. Both assign the same leader to the same activity: no duplicate.
  await A.evaluate(() => { data.deployments.push(touch({ id: 'dupA', activityId: 'a12', studentId: 's26', role: '', status: 'Confirmed', hours: null, remarks: '' })); commit(); });
  await B.evaluate(() => { data.deployments.push(touch({ id: 'dupB', activityId: 'a12', studentId: 's26', role: 'Facilitator', status: 'Confirmed', hours: null, remarks: '' })); commit(); });
  await save(A); await save(B);
  d = disk();
  ok(d.deployments.filter(x => x.activityId === 'a12' && x.studentId === 's26').length === 1, 'duplicate assignment collapsed to one');

  // 4. Settings / lists merge.
  await A.evaluate(() => { data.lists.ccas.push('Robotics Club'); touchList('ccas'); commit(); });
  await B.evaluate(() => { data.settings.highLoad = 5; touchSettings(); commit(); });
  await save(A); await save(B);
  d = disk();
  ok(d.lists.ccas.includes('Robotics Club') && d.settings.highLoad === 5, 'list change and settings change both kept');

  // 5. Background check shows a notice on A when B saves (poll every 20 s).
  await A.click('.topbar button:has-text("Get latest")');
  await B.evaluate(() => { saveStudent(null, { fullName: 'Ben Lim', name: 'Ben', formClass: '305', group: '', ccas: [], notes: '' }); commit(); });
  await save(B);
  await A.waitForSelector('#remote-notice', { timeout: 30000 });
  ok(/Mr Bala saved changes/.test(await A.textContent('#remote-notice')), 'A sees “Mr Bala saved changes” notice');
  await A.screenshot({ path: SP + '/m-notice.png' });
  await A.click('#remote-notice button');
  ok((await state(A)).students.includes('Ben Lim'), '“Get their changes” brings in B’s new student');

  // 6. Browser without file access (Safari/Firefox): pick current file, merge, download.
  const C = await teacher(b, 'Mdm Chua', { fsa: false });
  await C.evaluate(() => { saveStudent(null, { fullName: 'Cara Tan', name: 'Cara', formClass: '301', group: '', ccas: [], notes: '' }); commit(); });
  await A.evaluate(() => { saveStudent(null, { fullName: 'Dev Raj', name: 'Dev', formClass: '303', group: '', ccas: [], notes: '' }); commit(); });
  await save(A);                                  // A saves after C opened the file
  const chooser = C.waitForEvent('filechooser');
  const dl = C.waitForEvent('download');
  await C.click('.topbar button.primary');
  await (await chooser).setFiles(SHARED);
  const file = await (await dl).path();
  const m = JSON.parse(fs.readFileSync(file, 'utf8').match(/id="sld-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
  ok(m.students.some(s => s.fullName === 'Cara Tan') && m.students.some(s => s.fullName === 'Dev Raj'), 'download copy contains both C’s and A’s new students');

  // 7. Draft restore merges with the newer file instead of replacing it.
  const D = await teacher(b, 'Mr Dass');
  await D.evaluate(() => { saveStudent(null, { fullName: 'Eve Ong', name: 'Eve', formClass: '304', group: '', ccas: [], notes: '' }); commit(); });
  await A.evaluate(() => { saveStudent(null, { fullName: 'Faiz Ali', name: 'Faiz', formClass: '302', group: '', ccas: [], notes: '' }); commit(); });
  await save(A);
  await D.evaluate(() => { leaving = true; });
  await D.reload();
  await D.click('button:has-text("Restore my changes")');
  const sd = await state(D);
  ok(sd.students.includes('Eve Ong') && sd.students.includes('Faiz Ali'), 'restored draft keeps own change and colleague’s newer change');

  console.log('ERRORS:', errors);
  if (errors.length) process.exitCode = 1;
  await b.close();
})();
