"""Sample data used by build_html.py."""
import datetime as dt
import random

LISTS = {
    "Categories": ["Ceremony", "School Event", "Assembly", "Sports", "Values in Action (VIA)", "CCA Event",
                   "Open House", "Camp", "External"],
    "Roles": ["Emcee", "Usher", "Marshal", "Registration", "Logistics", "Facilitator",
              "Group Leader", "Photographer", "Tech Crew"],
    "Statuses": ["Confirmed", "Tentative", "Completed", "Withdrawn"],
    # Damai Secondary student leadership bodies (councillors, CCA leaders, Peer Support Leaders) plus class leaders.
    "Leadership Groups": ["Student Councillor", "CCA Leader", "Peer Support Leader", "Class Chairperson",
                          "Class Vice-Chairperson"],
    "Form Classes": ["301", "302", "303", "304", "305"],
    # Damai Secondary CCAs, grouped as on the school website.
    "CCAs": ["Canoeing (Girls)", "Dragon Boat (Boys)", "Netball (Girls)", "Rugby (Boys)",
             "Choir", "Drama", "Ethnic Dance", "Guzheng", "Modern Dance", "Symphonic Band", "Art Club",
             "Girl Guides", "NCC (Land)", "NPCC",
             "Info-Comm Club"],
}
HIGH_LOAD = 4  # deployments at which a leader is flagged "High load"
UPCOMING_DAYS = 14

STUDENTS = [
    ("Tan Wei Ling", "Wei Ling", "303", "Student Councillor", ["Choir"]),
    ("Muhammad Irfan bin Rahman", "Irfan", "303", "Student Councillor", ["Drama", "NPCC"]),
    ("Priya d/o Subramaniam", "Priya", "304", "Peer Support Leader", ["Ethnic Dance"]),
    ("Lim Jun Hao", "Jun Hao", "301", "Student Councillor", ["Guzheng"]),
    ("Nur Aisyah binte Hamzah", "Aisyah", "301", "Student Councillor", ["Modern Dance"]),
    ("Chen Yu Xuan", "Yu Xuan", "305", "CCA Leader", ["Symphonic Band"]),
    ("Arjun Nair", "Arjun", "302", "Class Vice-Chairperson", ["Art Club", "Choir"]),
    ("Goh Hui Min", "Hui Min", "301", "Class Chairperson", ["NPCC"]),
    ("Siti Nurhaliza binte Osman", "Siti", "304", "Student Councillor", ["Info-Comm Club"]),
    ("Ong Kai Xiang", "Kai Xiang", "302", "Student Councillor", ["Choir"]),
    ("Rachel Lee Shu Fen", "Rachel", "303", "CCA Leader", ["Drama"]),
    ("Daniel Wong Zhi Hao", "Daniel", "302", "Class Chairperson", ["Ethnic Dance", "Ethnic Dance"]),
    ("Kavitha d/o Ramasamy", "Kavitha", "301", "Peer Support Leader", ["Guzheng"]),
    ("Ahmad Danish bin Ismail", "Danish", "305", "Class Vice-Chairperson", ["Modern Dance"]),
    ("Koh Jia Yi", "Jia Yi", "301", "Peer Support Leader", ["Symphonic Band"]),
    ("Ethan Teo Jun Wei", "Ethan", "302", "Student Councillor", ["Art Club"]),
    ("Low Xin Yi", "Xin Yi", "304", "Student Councillor", ["NPCC", "Modern Dance"]),
    ("Hafiz bin Abdullah", "Hafiz", "302", "Class Vice-Chairperson", ["Info-Comm Club"]),
    ("Chua Min Jie", "Min Jie", "305", "Student Councillor", ["Choir"]),
    ("Sarah Ng Hui Wen", "Sarah", "301", "CCA Leader", ["Drama"]),
    ("Vikram s/o Pillai", "Vikram", "303", "Peer Support Leader", ["Ethnic Dance"]),
    ("Yeo Shi Ting", "Shi Ting", "301", "Student Councillor", ["Guzheng", "Art Club"]),
    ("Nurul Huda binte Salleh", "Huda", "302", "Class Chairperson", ["Modern Dance"]),
    ("Ryan Lau Wen Jie", "Ryan", "302", "CCA Leader", ["Symphonic Band"]),
    ("Tay Pei Shan", "Pei Shan", "304", "Class Chairperson", ["Art Club"]),
    ("Joshua Seah", "Joshua", "305", "Student Councillor", ["NPCC"]),
    ("Aaliyah Rahim", "Aaliyah", "301", "Student Councillor", ["Info-Comm Club", "Info-Comm Club"]),
    ("Ho Zi Xuan", "Zi Xuan", "301", "Class Vice-Chairperson", ["Choir"]),
]

T = dt.time
ACTIVITIES = [
    ("Teachers' Day Celebration", "Ceremony", dt.date(2026, 9, 3), T(7, 30), T(10, 30), "School Hall", "Mr Lim K. H.", 8),
    ("Mid-Autumn Lantern Walk", "School Event", dt.date(2026, 9, 24), T(17, 0), T(20, 0), "Parade Square", "Ms Wong S. M.", 10),
    ("Children's Day Primary School Visit", "Values in Action (VIA)", dt.date(2026, 10, 9), T(8, 0), T(12, 0), "Sunrise Primary", "Mdm Noraini", 6),
    ("Speech Day & Prize Giving", "Ceremony", dt.date(2026, 10, 16), T(8, 0), T(11, 30), "School Hall", "Mr Lim K. H.", 12),
    ("Sec 4 Graduation Assembly", "Assembly", dt.date(2026, 10, 21), T(9, 0), T(11, 0), "School Hall", "Ms Kaur P.", 6),
    ("Inter-House Games Day", "Sports", dt.date(2026, 10, 23), T(7, 30), T(13, 0), "School Field", "Mr Rizal", 14),
    ("Zonal Debate Championship (Host)", "External", dt.date(2026, 10, 27), T(14, 0), T(18, 0), "LT 1", "Ms Chan Y. L.", 4),
    ("Parent Engagement Night", "School Event", dt.date(2026, 10, 28), T(18, 30), T(21, 0), "Canteen", "Ms Wong S. M.", 6),
    ("Senior Citizens' Home Visit", "Values in Action (VIA)", dt.date(2026, 10, 30), T(9, 0), T(12, 0), "Kampung Care Home", "Mdm Noraini", 5),
    ("Recycling Drive", "Values in Action (VIA)", dt.date(2026, 11, 2), T(8, 0), T(11, 0), "Void Deck Blk 512", "Mr Tan B. C.", 6),
    ("Open House 2026", "Open House", dt.date(2026, 11, 7), T(8, 30), T(13, 0), "Whole School", "Ms Kaur P.", 16),
    ("Leadership Training Camp", "Camp", dt.date(2026, 11, 12), T(8, 0), T(17, 0), "Outdoor Centre", "Mr Rizal", 8),
]
ROLE_BY_CAT = {
    "Ceremony": ["Emcee", "Usher", "Usher", "Marshal", "Tech Crew", "Registration"],
    "School Event": ["Marshal", "Logistics", "Usher", "Photographer"],
    "Assembly": ["Emcee", "Usher", "Tech Crew"],
    "Sports": ["Marshal", "Logistics", "Group Leader", "Registration"],
    "Values in Action (VIA)": ["Group Leader", "Facilitator", "Logistics"],
    "Open House": ["Usher", "Registration", "Facilitator", "Photographer", "Marshal"],
    "Camp": ["Facilitator", "Group Leader"],
    "External": ["Usher", "Registration", "Tech Crew"],
}
TODAY = dt.date(2026, 10, 13)  # fixes which sample deployments are "Completed"


def sample_deployments():
    rng = random.Random(7)
    names = [s[0] for s in STUDENTS]
    # Weight a few students heavily and leave a few out entirely so the dashboard shows spread.
    weights = {n: 1.0 for n in names}
    for n in names[:4]:
        weights[n] = 3.0
    for n in names[-4:]:
        weights[n] = 0.0
    fill_rate = [1.0, 0.9, 1.0, 0.75, 1.0, 0.7, 0.5, 0.5, 1.0, 0.0, 0.6, 0.5]
    rows = []
    for (act, cat, date, *_rest, need), rate in zip(ACTIVITIES, fill_rate):
        k = round(need * rate)
        pool = [n for n in names if weights[n] > 0]
        chosen = []
        while len(chosen) < k:
            pick = rng.choices(pool, [weights[p] for p in pool])[0]
            if pick not in chosen:
                chosen.append(pick)
        for i, name in enumerate(chosen):
            role = ROLE_BY_CAT[cat][i % len(ROLE_BY_CAT[cat])]
            if date < TODAY:
                status = "Withdrawn" if rng.random() < 0.06 else "Completed"
            else:
                status = "Tentative" if rng.random() < 0.25 else "Confirmed"
            remark = "MC'd — excused" if status == "Withdrawn" else ""
            rows.append((act, name, role, status, None, remark))
    # One override example: a leader stayed back for teardown.
    a = rows[0]
    rows[0] = (a[0], a[1], a[2], a[3], 4, "Stayed back for teardown")
    return rows
