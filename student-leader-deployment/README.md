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

**How saving works.** Clicking **Save** writes a copy of the page, with
the updated data inside it, back to the file on the shared drive.

- **Chrome or Edge on a computer:** the first Save (or **Get latest**)
  asks you to select the file on the shared drive. After that, the page
  saves straight to the file. It also checks the file every 20 seconds
  and shows a notice when a colleague saves.
- **Other browsers:** Save asks you to select the current file on the
  drive, merges it, then downloads an updated copy, which you use to
  replace the old file. Get latest reopens the file.
- Unsaved edits are kept as a draft in the browser. **Restore my
  changes** merges them back into the latest file.

**Several teachers at once.** Saving never overwrites a colleague's
work: the page reads the latest file first and merges both sets of
changes.

- Every student, activity and deployment records when it was last
  changed and by whom. If two teachers change the same record, the most
  recent change wins.
- Deletions leave a dated marker for a year, so an older copy can't
  bring a deleted record back.
- Duplicate assignments (the same leader added to the same activity by
  two teachers) are collapsed into one.
- Settings and each dropdown list merge the same way, newest change wins.
- `tests/test_merge.js` simulates several teachers saving to the same
  file and checks all of the above.

The file has to be opened from a synced folder or mapped drive: the
Google Drive or SharePoint website shows HTML files as code instead of
running them.

## School details

The defaults are set up for **Damai Secondary School**: the maroon-and-white
school colours, the motto *Aspire · Explore · Achieve*, its CCAs (Sports &
Games, Visual & Performing Arts, Uniformed Groups, Clubs & Societies), its
student leadership bodies (Student Councillors, CCA Leaders, Peer Support
Leaders, plus class leaders) and a Values in Action (VIA) activity category.
The details come from the school's public pages (CCA page, Student
Leaders' Investiture news, crest and handbook) as shown in web search
results. The school name, motto, CCA list and leadership groups can all be
edited under **Settings & Help**. The sample students, activities and
deployments are made up.
