"""Fill student-leader-deployment.html with sample data, and write an empty template copy.

    python build_html.py

The HTML file is its own template: only the JSON inside <script id="sld-data"> is replaced.
"""
import json
import re
from pathlib import Path

from sample_data import ACTIVITIES, HIGH_LOAD, LISTS, STUDENTS, UPCOMING_DAYS, sample_deployments

HERE = Path(__file__).parent
SRC = HERE / "student-leader-deployment.html"
TEMPLATE_OUT = HERE / "student-leader-deployment-template.html"
DATA_RE = re.compile(r'(<script type="application/json" id="sld-data"[^>]*>)(.*?)(</script>)', re.S)


def base():
    return {
        "version": 1, "revision": 0, "savedAt": None, "savedBy": None,
        "settings": {"title": "Student Leader Deployment", "highLoad": HIGH_LOAD, "upcomingDays": UPCOMING_DAYS},
        "lists": {
            "categories": LISTS["Categories"],
            "roles": LISTS["Roles"],
            "groups": LISTS["Leadership Groups"],
            "formClasses": LISTS["Form Classes"],
            "ccas": LISTS["CCAs"],
        },
        "students": [], "activities": [], "deployments": [],
    }


def sample():
    d = base()
    sid = {}
    for i, (full, name, form, group, ccas) in enumerate(STUDENTS, start=1):
        sid[full] = f"s{i}"
        d["students"].append({"id": f"s{i}", "fullName": full, "name": name, "formClass": form, "group": group,
                              "ccas": ccas, "notes": ""})
    aid = {}
    for i, (name, cat, date, start, end, venue, teacher, need) in enumerate(ACTIVITIES, start=1):
        aid[name] = f"a{i}"
        d["activities"].append({
            "id": f"a{i}", "name": name, "category": cat, "date": date.isoformat(),
            "start": start.strftime("%H:%M"), "end": end.strftime("%H:%M"),
            "venue": venue, "teacher": teacher, "needed": need, "notes": "",
        })
    for i, (act, full, role, status, hours, remark) in enumerate(sample_deployments(), start=1):
        d["deployments"].append({
            "id": f"d{i}", "activityId": aid[act], "studentId": sid[full], "role": role,
            "status": status, "hours": hours, "remarks": remark,
        })
    return d


def write(path, data):
    html = SRC.read_text(encoding="utf-8")
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    out, n = DATA_RE.subn(lambda m: m.group(1) + payload + m.group(3), html, count=1)
    assert n == 1, "data block not found"
    path.write_text(out, encoding="utf-8")
    print(f"wrote {path.name}")


if __name__ == "__main__":
    write(SRC, sample())
    write(TEMPLATE_OUT, base())
