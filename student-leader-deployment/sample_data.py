"""Sample data used by build_html.py."""
import datetime as dt
import random

LISTS = {
    "Categories": ["Ceremony", "School Event", "Assembly", "Sports", "Community Service",
                   "Open House", "Camp", "External"],
    "Roles": ["Emcee", "Usher", "Marshal", "Registration", "Logistics", "Facilitator",
              "Group Leader", "Photographer", "Tech Crew"],
    "Statuses": ["Confirmed", "Tentative", "Completed", "Withdrawn"],
    "Leadership Groups": ["Prefect", "Student Council", "Class Chairperson", "CCA Leader",
                          "Peer Support Leader", "Sports Leader"],
    "Form Classes": ["301", "302", "303", "304", "305"],
    "CCAs": ["Badminton", "Basketball", "Football", "Floorball", "Track & Field", "Choir", "Concert Band",
             "Chinese Orchestra", "Malay Dance", "Indian Dance", "Drama Club", "Scouts", "Girl Guides",
             "NCC (Land)", "NPCC", "St John Brigade", "Red Cross Youth", "Robotics Club", "Media Club",
             "Library Club"],
}
HIGH_LOAD = 4  # deployments at which a leader is flagged "High load"
UPCOMING_DAYS = 14

STUDENTS = [
    ("Tan Wei Ling", "Wei Ling", "303", "Prefect", ["Choir"]),
    ("Muhammad Irfan bin Rahman", "Irfan", "303", "Student Council", ["Football", "Media Club"]),
    ("Priya d/o Subramaniam", "Priya", "304", "Peer Support Leader", ["Indian Dance"]),
    ("Lim Jun Hao", "Jun Hao", "301", "Prefect", ["NCC (Land)"]),
    ("Nur Aisyah binte Hamzah", "Aisyah", "301", "Student Council", ["Malay Dance"]),
    ("Chen Yu Xuan", "Yu Xuan", "305", "CCA Leader", ["Chinese Orchestra"]),
    ("Arjun Nair", "Arjun", "302", "Sports Leader", ["Track & Field"]),
    ("Goh Hui Min", "Hui Min", "301", "Class Chairperson", ["Girl Guides"]),
    ("Siti Nurhaliza binte Osman", "Siti", "304", "Prefect", ["Red Cross Youth"]),
    ("Ong Kai Xiang", "Kai Xiang", "302", "Student Council", ["Robotics Club"]),
    ("Rachel Lee Shu Fen", "Rachel", "303", "CCA Leader", ["Concert Band", "Library Club"]),
    ("Daniel Wong Zhi Hao", "Daniel", "302", "Class Chairperson", ["Basketball"]),
    ("Kavitha d/o Ramasamy", "Kavitha", "301", "Peer Support Leader", ["St John Brigade"]),
    ("Ahmad Danish bin Ismail", "Danish", "305", "Sports Leader", ["Football"]),
    ("Koh Jia Yi", "Jia Yi", "301", "Peer Support Leader", ["Badminton"]),
    ("Ethan Teo Jun Wei", "Ethan", "302", "Prefect", ["NPCC"]),
    ("Low Xin Yi", "Xin Yi", "304", "Student Council", ["Drama Club"]),
    ("Hafiz bin Abdullah", "Hafiz", "302", "Sports Leader", ["Floorball"]),
    ("Chua Min Jie", "Min Jie", "305", "Prefect", ["Scouts"]),
    ("Sarah Ng Hui Wen", "Sarah", "301", "CCA Leader", ["Media Club"]),
    ("Vikram s/o Pillai", "Vikram", "303", "Peer Support Leader", ["Robotics Club"]),
    ("Yeo Shi Ting", "Shi Ting", "301", "Student Council", ["Choir"]),
    ("Nurul Huda binte Salleh", "Huda", "302", "Class Chairperson", ["Malay Dance"]),
    ("Ryan Lau Wen Jie", "Ryan", "302", "CCA Leader", ["Basketball", "Drama Club"]),
    ("Tay Pei Shan", "Pei Shan", "304", "Class Chairperson", ["Concert Band"]),
    ("Joshua Seah", "Joshua", "305", "Student Council", ["Track & Field"]),
    ("Aaliyah Rahim", "Aaliyah", "301", "Prefect", ["Library Club"]),
    ("Ho Zi Xuan", "Zi Xuan", "301", "Sports Leader", ["Badminton"]),
]

T = dt.time
ACTIVITIES = [
    ("Teachers' Day Celebration", "Ceremony", dt.date(2026, 9, 3), T(7, 30), T(10, 30), "School Hall", "Mr Lim K. H.", 8),
    ("Mid-Autumn Lantern Walk", "School Event", dt.date(2026, 9, 24), T(17, 0), T(20, 0), "Parade Square", "Ms Wong S. M.", 10),
    ("Children's Day Primary School Visit", "Community Service", dt.date(2026, 10, 9), T(8, 0), T(12, 0), "Sunrise Primary", "Mdm Noraini", 6),
    ("Speech Day & Prize Giving", "Ceremony", dt.date(2026, 10, 16), T(8, 0), T(11, 30), "School Hall", "Mr Lim K. H.", 12),
    ("Sec 4 Graduation Assembly", "Assembly", dt.date(2026, 10, 21), T(9, 0), T(11, 0), "School Hall", "Ms Kaur P.", 6),
    ("Inter-House Games Day", "Sports", dt.date(2026, 10, 23), T(7, 30), T(13, 0), "School Field", "Mr Rizal", 14),
    ("Zonal Debate Championship (Host)", "External", dt.date(2026, 10, 27), T(14, 0), T(18, 0), "LT 1", "Ms Chan Y. L.", 4),
    ("Parent Engagement Night", "School Event", dt.date(2026, 10, 28), T(18, 30), T(21, 0), "Canteen", "Ms Wong S. M.", 6),
    ("Senior Citizens' Home Visit", "Community Service", dt.date(2026, 10, 30), T(9, 0), T(12, 0), "Kampung Care Home", "Mdm Noraini", 5),
    ("Recycling Drive", "Community Service", dt.date(2026, 11, 2), T(8, 0), T(11, 0), "Void Deck Blk 512", "Mr Tan B. C.", 6),
    ("Open House 2026", "Open House", dt.date(2026, 11, 7), T(8, 30), T(13, 0), "Whole School", "Ms Kaur P.", 16),
    ("Leadership Training Camp", "Camp", dt.date(2026, 11, 12), T(8, 0), T(17, 0), "Outdoor Centre", "Mr Rizal", 8),
]
ROLE_BY_CAT = {
    "Ceremony": ["Emcee", "Usher", "Usher", "Marshal", "Tech Crew", "Registration"],
    "School Event": ["Marshal", "Logistics", "Usher", "Photographer"],
    "Assembly": ["Emcee", "Usher", "Tech Crew"],
    "Sports": ["Marshal", "Logistics", "Group Leader", "Registration"],
    "Community Service": ["Group Leader", "Facilitator", "Logistics"],
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
