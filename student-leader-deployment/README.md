# Student Leader Deployment Dashboard

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
