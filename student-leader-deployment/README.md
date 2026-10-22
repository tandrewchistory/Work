# Student Leader Deployment Dashboard

A single, self-contained HTML file for tracking which student leaders are
deployed to which school activities. Keep it on a shared drive: it opens in
any browser, needs no internet connection, and stores its data inside the
file itself.

## Files

| File | What it is |
|---|---|
| `student-leader-deployment.html` | App with sample data (28 leaders, 12 activities, 72 deployments) |
| `student-leader-deployment-template.html` | Empty copy: the one to put on the drive |
| `build_html.py` | Puts the sample data into the HTML and writes the empty template (`python build_html.py`) |

- **Dashboard**: headline figures, a date-range and form-class filter,
  leader-load and category charts, activity staffing by date, a
  form-class breakdown, the most-deployed leaders, and a list of leaders
  not yet deployed.
- **Activities**: open an activity to see who is assigned, change roles,
  statuses and hours, and **assign leaders**. Candidates are listed
  fewest-deployments-first, with warnings for high load and same-day
  clashes.
- **Students / Deployments**: searchable and filterable lists, student
  profiles with deployment history, and CSV export. Each student has a
  full name, preferred name, form class (301–305 by default), leadership
  group and one or more **CCAs**, which you tick from a list. You can
  filter by CCA on the dashboard, the Students tab and the Assign leaders
  list, and the dashboard has a **By CCA** breakdown.
- **Settings & Help**: title, high-load threshold, "upcoming" window and
  dropdown lists (including form classes and CCAs). Also paste-import of
  students from Excel/Sheets (Full name, Preferred name, Form class,
  Leadership group, CCAs, with several CCAs separated by `;`),
  backup and restore (.json), clearing data for a new year, and
  instructions for colleagues.

**How saving works.** Clicking **Save** writes a copy of the page,
with the updated data inside it, back to the file. In Chrome or Edge on a
computer, the first save asks you to pick the file on the shared drive;
after that it saves straight to the file. Before overwriting, it warns if
someone else saved after you opened the file. Other browsers download
the updated file, which you then use to replace the copy on the drive.
Unsaved edits are kept as a draft in the browser in case the tab closes.
Each save records the editor's name and the time. The file has to be
opened from a synced folder or mapped drive: the Google Drive or
SharePoint website shows HTML files as code instead of running them.
