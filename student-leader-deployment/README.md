# Student Leader Deployment Dashboard

Two versions of the same tracker, for a shared drive:

- **HTML app** (`student-leader-deployment.html`): one self-contained file
  that opens in any browser and needs no internet connection. The data is
  stored inside the file itself; see [HTML version](#html-version) below.
- **Excel workbook** (`student-leader-deployment.xlsx`): see
  [Excel version](#excel-version).

## HTML version

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

## Excel version

An Excel workbook for tracking which student leaders are deployed to which
school activities. Put one copy on the shared drive (OneDrive/SharePoint, or
Google Drive via **File › Save as Google Sheets**) and have everyone edit
that copy. The Dashboard is built entirely from formulas, so it stays up to
date as people add rows.

| File | What it is |
|---|---|
| `student-leader-deployment.xlsx` | Workbook with sample data (28 leaders, 12 activities, 72 deployments), so you can see how the dashboard looks |
| `student-leader-deployment-template.xlsx` | The same workbook, with one example row on each input sheet: the one to put on the drive |
| `build_workbook.py` | Builds both files (`python build_workbook.py [--template]`; needs `openpyxl`) |

## Sheets

- **Dashboard**: read-only. Headline figures (leaders, deployed / not yet
  deployed, high load, activities, active deployments and leader-hours,
  open slots, data issues). It also shows leader load, a form-class
  breakdown, a category breakdown, two charts, the 10 most-deployed
  leaders, a list of leaders not yet deployed, and a staffing table of
  every activity sorted by date (needed / assigned / open / fill % / status).
- **Deployments**: one row per student per activity. Activity, student,
  role and status are picked from dropdowns. The grey columns fill in the
  date, category, form class and hours credited, plus a **Check** column
  that flags unknown names, duplicates and same-day clashes.
- **Activities**: one row per activity, with date, times, venue,
  teacher-in-charge and leaders needed. Staffing status and timing
  (Past / Upcoming / Later) are calculated.
- **Students**: one row per leader (Full Name, preferred Name, Form Class,
  Leadership Group). Deployment count, leader-hours, latest activity and a
  load status (Not deployed / Deployed / High load) are calculated.
- **Setup**: the dropdown lists, plus two settings: the high-load
  threshold (default 4) and the "upcoming" window (default 14 days).
- **Read Me**: instructions for colleagues.

Navy column headers are for input; grey ones are calculated. Withdrawn
deployments stay on record but are left out of every count.
Capacity: 300 students, 200 activities, 1,000 deployments.
