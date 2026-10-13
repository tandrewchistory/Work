"""Build the Student Leader Deployment workbook.

    python build_workbook.py              # sample data  -> student-leader-deployment.xlsx
    python build_workbook.py --template   # one example row per sheet -> student-leader-deployment-template.xlsx

The workbook is meant to live on a shared drive (OneDrive/SharePoint/Google
Drive). Teachers edit the three input sheets; the Dashboard is all formulas.
"""
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.formatting.rule import CellIsRule, DataBarRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

TEMPLATE = "--template" in sys.argv
OUT = Path(__file__).with_name(
    "student-leader-deployment-template.xlsx" if TEMPLATE else "student-leader-deployment.xlsx"
)

# Capacity of each input sheet (data rows). Formulas are pre-filled to these limits.
N_STU, N_ACT, N_DEP = 300, 200, 1000
STU_END, ACT_END, DEP_END = N_STU + 1, N_ACT + 1, N_DEP + 1
N_FORM, N_CAT = 15, 8

# ----------------------------------------------------------------------------- styles
FONT = "Arial"
NAVY, INK, MUTED = "1F3A5F", "1F2430", "6B7280"
F_BASE = Font(name=FONT, size=10, color=INK)
F_HEAD_IN = Font(name=FONT, size=10, bold=True, color="FFFFFF")
F_HEAD_CALC = Font(name=FONT, size=10, bold=True, color=INK)
F_CALC = Font(name=FONT, size=10, color="404654")
F_TITLE = Font(name=FONT, size=18, bold=True, color=NAVY)
F_SUB = Font(name=FONT, size=10, italic=True, color=MUTED)
F_SECTION = Font(name=FONT, size=12, bold=True, color=NAVY)
F_KPI_LABEL = Font(name=FONT, size=9, bold=True, color=MUTED)
F_KPI_VALUE = Font(name=FONT, size=22, bold=True, color=NAVY)
F_KPI_SUB = Font(name=FONT, size=9, color=MUTED)
F_TH = Font(name=FONT, size=9, bold=True, color=MUTED)

FILL_IN_HEAD = PatternFill("solid", fgColor=NAVY)
FILL_CALC_HEAD = PatternFill("solid", fgColor="D9DEE7")
FILL_CALC = PatternFill("solid", fgColor="F2F4F7")
FILL_TILE = PatternFill("solid", fgColor="F2F5FA")
FILL_TH = PatternFill("solid", fgColor="EEF1F6")
FILL_EXAMPLE = PatternFill("solid", fgColor="FFF8DB")

THIN = Side(style="thin", color="D5DAE1")
B_BOTTOM = Border(bottom=THIN)
B_TILE = Border(left=Side(style="thick", color=NAVY))

C_GREEN, C_GREEN_BG = "1E7B34", "DCF2E1"
C_AMBER, C_AMBER_BG = "8A5A00", "FDEFCF"
C_RED, C_RED_BG = "A61E1E", "FBE0E0"
C_BLUE, C_BLUE_BG = "1F4FA6", "DCE7FA"

DATE_FMT = "dd mmm yyyy"
TIME_FMT = "h:mm AM/PM"

from sample_data import (ACTIVITIES, HIGH_LOAD, LISTS, ROLE_BY_CAT, STUDENTS, TODAY,  # noqa: E402,F401
                         UPCOMING_DAYS, sample_deployments)


def style_header(ws, row, headers, calc_from=None, widths=None):
    """Write a header row; columns at/after calc_from are auto-calculated (grey)."""
    for i, h in enumerate(headers, start=1):
        c = ws.cell(row=row, column=i, value=h)
        calc = calc_from is not None and i >= calc_from
        c.font = F_HEAD_CALC if calc else F_HEAD_IN
        c.fill = FILL_CALC_HEAD if calc else FILL_IN_HEAD
        c.alignment = Alignment(vertical="center", wrap_text=True)
        if widths:
            ws.column_dimensions[get_column_letter(i)].width = widths[i - 1]
    ws.row_dimensions[row].height = 30
    ws.freeze_panes = ws.cell(row=row + 1, column=2)


def fill_calc(ws, col, first, last, formula_fn, fmt=None):
    for r in range(first, last + 1):
        c = ws.cell(row=r, column=col, value=formula_fn(r))
        c.font = F_CALC
        c.fill = FILL_CALC
        if fmt:
            c.number_format = fmt


def base_font(ws, max_row, max_col):
    for row in ws.iter_rows(min_row=1, max_row=max_row, max_col=max_col):
        for c in row:
            if c.font == Font():  # untouched default font
                c.font = F_BASE


def add_list_validation(ws, rng, source, prompt=None):
    dv = DataValidation(type="list", formula1=source, allow_blank=True, showErrorMessage=True,
                        errorTitle="Pick from the list", error="Choose a value from the dropdown.")
    if prompt:
        dv.promptTitle, dv.prompt, dv.showInputMessage = "Tip", prompt, True
    ws.add_data_validation(dv)
    dv.add(rng)


def status_rules(ws, rng, mapping):
    for text, (fg, bg) in mapping.items():
        ws.conditional_formatting.add(
            rng, CellIsRule(operator="equal", formula=[f'"{text}"'],
                            font=Font(name=FONT, bold=True, color=fg),
                            fill=PatternFill("solid", fgColor=bg)))


STAFF_COLORS = {
    "Fully staffed": (C_GREEN, C_GREEN_BG),
    "Short": (C_AMBER, C_AMBER_BG),
    "Unstaffed": (C_RED, C_RED_BG),
    "Over-staffed": (C_BLUE, C_BLUE_BG),
}
LOAD_COLORS = {
    "Not deployed": (C_RED, C_RED_BG),
    "High load": (C_AMBER, C_AMBER_BG),
    "Deployed": (C_GREEN, C_GREEN_BG),
}

if TEMPLATE:
    STUDENTS = STUDENTS[:1]
    ACTIVITIES = ACTIVITIES[3:4]
    DEPLOYMENTS = [(ACTIVITIES[0][0], STUDENTS[0][0], "Emcee", "Confirmed", None, "Example row — overwrite or delete")]
else:
    DEPLOYMENTS = sample_deployments()

# ----------------------------------------------------------------------------- workbook
wb = Workbook()
ws_dash = wb.active
ws_dash.title = "Dashboard"
ws_dep = wb.create_sheet("Deployments")
ws_act = wb.create_sheet("Activities")
ws_stu = wb.create_sheet("Students")
ws_set = wb.create_sheet("Setup")
ws_help = wb.create_sheet("Read Me")

ws_dash.sheet_properties.tabColor = NAVY
for ws in (ws_dep, ws_act, ws_stu):
    ws.sheet_properties.tabColor = "3B5BDB"
ws_set.sheet_properties.tabColor = "9AA3B2"
ws_help.sheet_properties.tabColor = "9AA3B2"

# ---------------------------------------------------------------- Setup
set_cols = list(LISTS.keys())
for i, key in enumerate(set_cols, start=1):
    c = ws_set.cell(row=1, column=i, value=key)
    c.font, c.fill = F_HEAD_IN, FILL_IN_HEAD
    ws_set.column_dimensions[get_column_letter(i)].width = 22
    for r, v in enumerate(LISTS[key], start=2):
        ws_set.cell(row=r, column=i, value=v).font = F_BASE
ws_set.column_dimensions["F"].width = 3
ws_set.column_dimensions["G"].width = 34
ws_set.column_dimensions["H"].width = 10
for col, h in (("G", "Setting"), ("H", "Value")):
    c = ws_set[f"{col}1"]
    c.value, c.font, c.fill = h, F_HEAD_IN, FILL_IN_HEAD
ws_set["G2"], ws_set["H2"] = "High-load threshold (deployments)", HIGH_LOAD
ws_set["G3"], ws_set["H3"] = "\"Upcoming\" window (days)", UPCOMING_DAYS
for ref in ("G2", "G3", "H2", "H3"):
    ws_set[ref].font = F_BASE
ws_set["G5"] = ("Add or rename items in any list above; dropdowns on the input sheets update "
                "automatically. Categories feed the Dashboard (first 8 shown); Form Classes "
                "feed the Dashboard (first 15 shown).")
ws_set["G5"].font = F_SUB
ws_set["G5"].alignment = Alignment(wrap_text=True, vertical="top")
ws_set.merge_cells("G5:H10")
ws_set.freeze_panes = "A2"
HIGH = "Setup!$H$2"
WINDOW = "Setup!$H$3"

# ---------------------------------------------------------------- Students
stu_headers = ["Full Name", "Name (preferred)", "Form Class", "Leadership Group", "Notes",
               "Deployments", "Leader-Hours", "Latest Activity", "Load Status",
               "Rank key (auto)", "Undeployed # (auto)"]
style_header(ws_stu, 1, stu_headers, calc_from=6, widths=[30, 16, 13, 20, 26, 13, 13, 15, 14, 11, 11])
for r, (full, name, form, grp) in enumerate(STUDENTS, start=2):
    for col, v in enumerate((full, name, form, grp), start=1):
        ws_stu.cell(row=r, column=col, value=v)
D_ACT, D_STU, D_STAT = (f"Deployments!${c}$2:${c}${DEP_END}" for c in "ABD")
D_DATE, D_CAT, D_HRS, D_CHECK = (f"Deployments!${c}$2:${c}${DEP_END}" for c in "GHKL")
fill_calc(ws_stu, 6, 2, STU_END, lambda r: f'=IF($A{r}="","",COUNTIFS({D_STU},$A{r},{D_STAT},"<>Withdrawn"))', "0")
fill_calc(ws_stu, 7, 2, STU_END, lambda r: f'=IF($A{r}="","",SUMIFS({D_HRS},{D_STU},$A{r}))', "0.0")
fill_calc(ws_stu, 8, 2, STU_END,
          lambda r: f'=IF(N(F{r})=0,"",IF(_xlfn.MAXIFS({D_DATE},{D_STU},$A{r},{D_STAT},"<>Withdrawn")=0,"",'
                    f'_xlfn.MAXIFS({D_DATE},{D_STU},$A{r},{D_STAT},"<>Withdrawn")))', DATE_FMT)
fill_calc(ws_stu, 9, 2, STU_END,
          lambda r: f'=IF($A{r}="","",IF(F{r}=0,"Not deployed",IF(F{r}>={HIGH},"High load","Deployed")))')
# Rank key: deployments, then hours, then sheet order as tiebreak — feeds "Most deployed".
fill_calc(ws_stu, 10, 2, STU_END,
          lambda r: f'=IF(N(F{r})=0,"",F{r}+MIN(G{r},999)/1000+(1000-ROW())/10000000)', "0.000")
fill_calc(ws_stu, 11, 2, STU_END,
          lambda r: f'=IF(I{r}="Not deployed",COUNTIF($I$2:I{r},"Not deployed"),"")', "0")
add_list_validation(ws_stu, f"C2:C{STU_END}", f"=Setup!$E$2:$E$60")
add_list_validation(ws_stu, f"D2:D{STU_END}", f"=Setup!$D$2:$D$60")
status_rules(ws_stu, f"I2:I{STU_END}", LOAD_COLORS)
dup_stu = FormulaRule(formula=[f'AND($A2<>"",COUNTIF($A$2:$A${STU_END},$A2)>1)'],
                      font=Font(name=FONT, bold=True, color=C_RED), fill=PatternFill("solid", fgColor=C_RED_BG))
ws_stu.conditional_formatting.add(f"A2:A{STU_END}", dup_stu)
ws_stu.auto_filter.ref = f"A1:I{STU_END}"
base_font(ws_stu, STU_END, 11)

# ---------------------------------------------------------------- Activities
act_headers = ["Activity", "Category", "Date", "Start", "End", "Venue", "Teacher-in-Charge",
               "Leaders Needed", "Hours (auto)", "Assigned", "Open Slots", "Fill %",
               "Staffing Status", "Timing", "Sort key (auto)"]
style_header(ws_act, 1, act_headers, calc_from=9,
             widths=[34, 18, 14, 11, 11, 20, 18, 10, 9, 10, 10, 9, 15, 13, 11])
for r, row in enumerate(ACTIVITIES, start=2):
    for col, v in enumerate(row, start=1):
        c = ws_act.cell(row=r, column=col, value=v)
        if col == 3:
            c.number_format = DATE_FMT
        elif col in (4, 5):
            c.number_format = TIME_FMT
for r in range(len(ACTIVITIES) + 2, ACT_END + 1):
    ws_act.cell(row=r, column=3).number_format = DATE_FMT
    ws_act.cell(row=r, column=4).number_format = TIME_FMT
    ws_act.cell(row=r, column=5).number_format = TIME_FMT
fill_calc(ws_act, 9, 2, ACT_END, lambda r: f'=IF(OR(D{r}="",E{r}=""),"",ROUND(MOD(E{r}-D{r},1)*24,2))', "0.0")
fill_calc(ws_act, 10, 2, ACT_END, lambda r: f'=IF($A{r}="","",COUNTIFS({D_ACT},$A{r},{D_STAT},"<>Withdrawn"))', "0")
fill_calc(ws_act, 11, 2, ACT_END, lambda r: f'=IF($A{r}="","",MAX(0,N(H{r})-J{r}))', "0")
fill_calc(ws_act, 12, 2, ACT_END, lambda r: f'=IF(OR($A{r}="",N(H{r})=0),"",J{r}/H{r})', "0%")
fill_calc(ws_act, 13, 2, ACT_END,
          lambda r: f'=IF($A{r}="","",IF(N(H{r})=0,"No target",IF(J{r}>H{r},"Over-staffed",'
                    f'IF(J{r}=H{r},"Fully staffed",IF(J{r}=0,"Unstaffed","Short")))))')
fill_calc(ws_act, 14, 2, ACT_END,
          lambda r: f'=IF(OR($A{r}="",C{r}=""),"",IF(C{r}<TODAY(),"Past",IF(C{r}-TODAY()<={WINDOW},"Upcoming","Later")))')
fill_calc(ws_act, 15, 2, ACT_END,
          lambda r: f'=IF($A{r}="","",IF(C{r}="",100000,C{r})+ROW()/100000)', "0.00000")
add_list_validation(ws_act, f"B2:B{ACT_END}", "=Setup!$A$2:$A$60")
dv_date = DataValidation(type="date", operator="greaterThan", formula1="36526", allow_blank=True,
                         showErrorMessage=True, error="Enter a date, e.g. 16/10/2026.")
ws_act.add_data_validation(dv_date)
dv_date.add(f"C2:C{ACT_END}")
dv_need = DataValidation(type="whole", operator="between", formula1="0", formula2="500", allow_blank=True,
                         showErrorMessage=True, error="Enter a whole number of leaders.")
ws_act.add_data_validation(dv_need)
dv_need.add(f"H2:H{ACT_END}")
status_rules(ws_act, f"M2:M{ACT_END}", STAFF_COLORS)
ws_act.conditional_formatting.add(f"L2:L{ACT_END}", DataBarRule(start_type="num", start_value=0, end_type="num",
                                                              end_value=1, color="5B8DEF"))
ws_act.conditional_formatting.add(f"A2:A{ACT_END}", FormulaRule(
    formula=[f'AND($A2<>"",COUNTIF($A$2:$A${ACT_END},$A2)>1)'],
    font=Font(name=FONT, bold=True, color=C_RED), fill=PatternFill("solid", fgColor=C_RED_BG)))
ws_act.auto_filter.ref = f"A1:N{ACT_END}"
base_font(ws_act, ACT_END, 15)

# ---------------------------------------------------------------- Deployments
dep_headers = ["Activity", "Student (Full Name)", "Role", "Status", "Hours Override", "Remarks",
               "Date", "Category", "Form Class", "Name", "Hours Credited", "Check"]
style_header(ws_dep, 1, dep_headers, calc_from=7, widths=[34, 30, 15, 12, 10, 28, 14, 18, 12, 12, 10, 16])
for r, row in enumerate(DEPLOYMENTS, start=2):
    for col, v in enumerate(row, start=1):
        if v not in (None, ""):
            ws_dep.cell(row=r, column=col, value=v)
A_NAME, A_CAT, A_DATE, A_HRS = (f"Activities!${c}$2:${c}${ACT_END}" for c in "ABCI")
S_NAME, S_FORM, S_PREF = (f"Students!${c}$2:${c}${STU_END}" for c in "ACB")


def lookup(r, key_col, key_rng, val_rng):
    m = f"MATCH(${key_col}{r},{key_rng},0)"
    return f'=IF(${key_col}{r}="","",IFERROR(IF(INDEX({val_rng},{m})="","",INDEX({val_rng},{m})),""))'


fill_calc(ws_dep, 7, 2, DEP_END, lambda r: lookup(r, "A", A_NAME, A_DATE), DATE_FMT)
fill_calc(ws_dep, 8, 2, DEP_END, lambda r: lookup(r, "A", A_NAME, A_CAT))
fill_calc(ws_dep, 9, 2, DEP_END, lambda r: lookup(r, "B", S_NAME, S_FORM))
fill_calc(ws_dep, 10, 2, DEP_END, lambda r: lookup(r, "B", S_NAME, S_PREF))
fill_calc(ws_dep, 11, 2, DEP_END,
          lambda r: f'=IF($A{r}="","",IF(D{r}="Withdrawn",0,IF(E{r}<>"",N(E{r}),'
                    f'IFERROR(N(INDEX({A_HRS},MATCH($A{r},{A_NAME},0))),0))))', "0.0")
fill_calc(ws_dep, 12, 2, DEP_END,
          lambda r: (f'=IF(AND($A{r}="",$B{r}=""),"",'
                     f'IF(ISNA(MATCH($A{r},{A_NAME},0)),"Unknown activity",'
                     f'IF(ISNA(MATCH($B{r},{S_NAME},0)),"Unknown student",'
                     f'IF(D{r}="","No status",'
                     f'IF(COUNTIFS($A$2:$A${DEP_END},$A{r},$B$2:$B${DEP_END},$B{r})>1,"Duplicate",'
                     f'IF(AND(D{r}<>"Withdrawn",G{r}<>"",COUNTIFS($B$2:$B${DEP_END},$B{r},$G$2:$G${DEP_END},G{r},'
                     f'$D$2:$D${DEP_END},"<>Withdrawn")>1),"Same-day clash","OK"))))))'))
add_list_validation(ws_dep, f"A2:A{DEP_END}", f"=Activities!$A$2:$A${ACT_END}",
                    "Pick an activity listed on the Activities sheet.")
add_list_validation(ws_dep, f"B2:B{DEP_END}", f"=Students!$A$2:$A${STU_END}",
                    "Pick a student listed on the Students sheet (start typing to search).")
add_list_validation(ws_dep, f"C2:C{DEP_END}", "=Setup!$B$2:$B$60")
add_list_validation(ws_dep, f"D2:D{DEP_END}", "=Setup!$C$2:$C$60")
dv_hrs = DataValidation(type="decimal", operator="between", formula1="0", formula2="24", allow_blank=True,
                        showErrorMessage=True, error="Hours must be between 0 and 24.",
                        promptTitle="Optional", prompt="Leave blank to credit the activity's own duration.",
                        showInputMessage=True)
ws_dep.add_data_validation(dv_hrs)
dv_hrs.add(f"E2:E{DEP_END}")
for r in range(2, DEP_END + 1):
    ws_dep.cell(row=r, column=5).number_format = "0.0"
ws_dep.conditional_formatting.add(f"L2:L{DEP_END}", FormulaRule(
    formula=['AND($L2<>"",$L2<>"OK")'], font=Font(name=FONT, bold=True, color=C_RED),
    fill=PatternFill("solid", fgColor=C_RED_BG)))
ws_dep.conditional_formatting.add(f"L2:L{DEP_END}", CellIsRule(
    operator="equal", formula=['"OK"'], font=Font(name=FONT, color=C_GREEN)))
status_rules(ws_dep, f"D2:D{DEP_END}", {
    "Completed": (C_GREEN, C_GREEN_BG), "Confirmed": (C_BLUE, C_BLUE_BG),
    "Tentative": (C_AMBER, C_AMBER_BG), "Withdrawn": (MUTED, "EEEEEE")})
ws_dep.auto_filter.ref = f"A1:L{DEP_END}"
base_font(ws_dep, DEP_END, 12)
if TEMPLATE:
    for ws in (ws_stu, ws_act, ws_dep):
        for c in ws[2]:
            if c.fill != FILL_CALC:
                c.fill = FILL_EXAMPLE

# ---------------------------------------------------------------- Dashboard
d = ws_dash
d.sheet_view.showGridLines = False
widths = {"A": 2, "B": 32, "C": 18, "D": 13, "E": 13, "F": 11, "G": 10, "H": 10, "I": 10, "J": 15,
          "K": 3, "L": 30, "M": 13, "N": 12, "O": 12, "P": 13}
for col, w in widths.items():
    d.column_dimensions[col].width = w

d["B1"] = "Student Leader Deployment Dashboard"
d["B1"].font = F_TITLE
d.row_dimensions[1].height = 30
d["B2"] = '="Updated automatically from the Deployments, Activities and Students sheets  ·  As of "&TEXT(TODAY(),"d mmm yyyy")'
d["B2"].font = F_SUB


def section(cell, text):
    d[cell] = text
    d[cell].font = F_SECTION


def th(row, cols_labels):
    for col, label in cols_labels:
        c = d[f"{col}{row}"]
        c.value, c.font, c.fill = label, F_TH, FILL_TH
        c.alignment = Alignment(horizontal="left" if col in ("B", "L") else "center", vertical="center",
                                wrap_text=True)
    d.row_dimensions[row].height = 26


def td(ref, value, fmt=None, align="center", bold=False):
    c = d[ref]
    c.value = value
    c.font = Font(name=FONT, size=10, color=INK, bold=bold)
    c.border = B_BOTTOM
    c.alignment = Alignment(horizontal=align, vertical="center")
    if fmt:
        c.number_format = fmt


# KPI tiles: (anchor range, label, value formula, sub formula, value format)
S_LOAD, S_FULL, S_FORMC = (f"Students!${c}$2:${c}${STU_END}" for c in "IAC")
A_OPEN, A_STATUS, A_TIMING = (f"Activities!${c}$2:${c}${ACT_END}" for c in "KMN")
kpis = [
    ("B", "B", "STUDENT LEADERS", f'=COUNTIF({S_FULL},"?*")',
     f'=COUNTIF(Setup!$E$2:$E$60,"?*")&" form classes"', "0"),
    ("C", "D", "DEPLOYED AT LEAST ONCE", f'=COUNTIF({S_LOAD},"Deployed")+COUNTIF({S_LOAD},"High load")',
     f'=IF(B5=0,"",TEXT(C5/B5,"0%")&" of leaders")', "0"),
    ("E", "F", "NOT YET DEPLOYED", f'=COUNTIF({S_LOAD},"Not deployed")',
     f'=IF(B5=0,"",TEXT(E5/B5,"0%")&" of leaders")', "0"),
    ("G", "H", "HIGH LOAD", f'=COUNTIF({S_LOAD},"High load")',
     f'="at "&{HIGH}&"+ deployments"', "0"),
    ("I", "J", "ACTIVITIES", f'=COUNTIF({A_NAME},"?*")',
     f'=COUNTIF({A_TIMING},"Upcoming")&" in next "&{WINDOW}&" days"', "0"),
    ("L", "L", "ACTIVE DEPLOYMENTS", f'=COUNTIFS({D_ACT},"?*",{D_STAT},"<>Withdrawn")',
     f'=TEXT(SUM({D_HRS}),"#,##0.0")&" leader-hours"', "0"),
    ("M", "N", "OPEN SLOTS", f'=SUM({A_OPEN})',
     f'=(COUNTIF({A_STATUS},"Short")+COUNTIF({A_STATUS},"Unstaffed"))&" activities short"', "0"),
    ("O", "P", "DATA ISSUES", f'=COUNTIFS({D_CHECK},"?*",{D_CHECK},"<>OK")',
     '="see Deployments › Check"', "0"),
]
for c0, c1, label, val, sub, fmt in kpis:
    for row, content, font in ((4, label, F_KPI_LABEL), (5, val, F_KPI_VALUE), (6, sub, F_KPI_SUB)):
        if c0 != c1:
            d.merge_cells(f"{c0}{row}:{c1}{row}")
        cell = d[f"{c0}{row}"]
        cell.value, cell.font = content, font
        cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        for col in range(d[f"{c0}{row}"].column, d[f"{c1}{row}"].column + 1):
            d.cell(row=row, column=col).fill = FILL_TILE
        d[f"{c0}{row}"].border = B_TILE
        if row == 5:
            cell.number_format = fmt
d.row_dimensions[4].height = 18
d.row_dimensions[5].height = 34
d.row_dimensions[6].height = 18
d.conditional_formatting.add("E5", CellIsRule(operator="greaterThan", formula=["0"],
                                              font=Font(name=FONT, size=22, bold=True, color=C_RED)))
d.conditional_formatting.add("O5", CellIsRule(operator="greaterThan", formula=["0"],
                                              font=Font(name=FONT, size=22, bold=True, color=C_RED)))

# Leader load distribution (rows 8-14)
section("B8", "Leader load — how evenly are leaders deployed?")
th(9, [("B", "Deployments per leader"), ("C", "Leaders"), ("D", "% of roster")])
buckets = [("0 — not yet deployed", "0"), ("1", "1"), ("2", "2"), ("3", "3"), ("4 or more", ">=4")]
S_DEPS = f"Students!$F$2:$F${STU_END}"
for i, (label, crit) in enumerate(buckets):
    r = 10 + i
    td(f"B{r}", label, align="left")
    td(f"C{r}", f'=COUNTIFS({S_FULL},"?*",{S_DEPS},"{crit}")', "0")
    td(f"D{r}", f'=IF($B$5=0,0,C{r}/$B$5)', "0%")

# By category (rows 17-26)
section("B17", "By activity category")
th(18, [("B", "Category"), ("C", "Activities"), ("D", "Deployments"), ("E", "Leader-hours"), ("F", "Open slots")])
A_CATR = f"Activities!$B$2:$B${ACT_END}"
for k in range(N_CAT):
    r = 19 + k
    td(f"B{r}", f'=IF(Setup!$A${k + 2}="","",Setup!$A${k + 2})', align="left")
    td(f"C{r}", f'=IF($B{r}="","",COUNTIF({A_CATR},$B{r}))', "0")
    td(f"D{r}", f'=IF($B{r}="","",COUNTIFS({D_CAT},$B{r},{D_STAT},"<>Withdrawn"))', "0")
    td(f"E{r}", f'=IF($B{r}="","",SUMIF({D_CAT},$B{r},{D_HRS}))', "0.0")
    td(f"F{r}", f'=IF($B{r}="","",SUMIF({A_CATR},$B{r},{A_OPEN}))', "0")
d.conditional_formatting.add("F19:F26", CellIsRule(operator="greaterThan", formula=["0"],
                                                   font=Font(name=FONT, bold=True, color=C_RED)))

# By form class (rows 8-24, right)
section("L8", "By form class")
th(9, [("L", "Form class"), ("M", "Leaders"), ("N", "Deployed"), ("O", "Not yet"), ("P", "Deployments")])
for k in range(N_FORM):
    r = 10 + k
    td(f"L{r}", f'=IF(Setup!$E${k + 2}="","",Setup!$E${k + 2})', align="left")
    td(f"M{r}", f'=IF($L{r}="","",COUNTIF({S_FORMC},$L{r}))', "0")
    td(f"N{r}", f'=IF($L{r}="","",COUNTIFS({S_FORMC},$L{r},{S_DEPS},">0"))', "0")
    td(f"O{r}", f'=IF($L{r}="","",M{r}-N{r})', "0")
    td(f"P{r}", f'=IF($L{r}="","",SUMIF({S_FORMC},$L{r},{S_DEPS}))', "0")
d.conditional_formatting.add("O10:O24", CellIsRule(operator="greaterThan", formula=["0"],
                                                   font=Font(name=FONT, bold=True, color=C_RED)))

# Charts (rows 28-44)
section("B28", "Charts")
ch1 = BarChart()
ch1.type = "bar"
ch1.title = "Leaders by number of deployments"
ch1.style = 10
ch1.add_data(Reference(d, min_col=3, min_row=9, max_row=14), titles_from_data=True)
ch1.set_categories(Reference(d, min_col=2, min_row=10, max_row=14))
ch1.legend = None
ch1.y_axis.majorGridlines = None
ch1.x_axis.scaling.orientation = "maxMin"
ch1.series[0].graphicalProperties.solidFill = "3B5BDB"
ch1.series[0].graphicalProperties.line.noFill = True
ch1.dataLabels = DataLabelList()
ch1.dataLabels.showVal = True
ch1.dataLabels.showCatName = False
ch1.dataLabels.showSerName = False
ch1.dataLabels.showLegendKey = False
ch1.x_axis.delete = False
ch1.y_axis.delete = False
ch1.height, ch1.width = 7.5, 15
d.add_chart(ch1, "B29")

ch2 = BarChart()
ch2.type = "col"
ch2.title = "Deployments by category"
ch2.style = 10
ch2.add_data(Reference(d, min_col=4, min_row=18, max_row=18 + N_CAT), titles_from_data=True)
ch2.set_categories(Reference(d, min_col=2, min_row=19, max_row=18 + N_CAT))
ch2.legend = None
ch2.y_axis.majorGridlines = None
ch2.series[0].graphicalProperties.solidFill = "1F3A5F"
ch2.series[0].graphicalProperties.line.noFill = True
ch2.dataLabels = DataLabelList()
ch2.dataLabels.showVal = True
ch2.dataLabels.showCatName = False
ch2.dataLabels.showSerName = False
ch2.dataLabels.showLegendKey = False
ch2.x_axis.delete = False
ch2.y_axis.delete = False
ch2.height, ch2.width = 7.5, 17
d.add_chart(ch2, "G29")

# Most deployed (rows 46-57) and not yet deployed (right)
section("B46", "Most deployed — check for over-reliance")
th(47, [("B", "Leader"), ("C", "Form class"), ("D", "Deployments"), ("E", "Leader-hours"), ("F", "Latest")])
S_KEY = f"Students!$J$2:$J${STU_END}"
for k in range(1, 11):
    r = 47 + k
    m = f"MATCH(LARGE({S_KEY},{k}),{S_KEY},0)"
    td(f"B{r}", f'=IFERROR(INDEX({S_FULL},{m}),"")', align="left")
    for col, src, fmt in (("C", "C", None), ("D", "F", "0"), ("E", "G", "0.0"), ("F", "H", "d mmm")):
        td(f"{col}{r}", f'=IF($B{r}="","",INDEX(Students!${src}$2:${src}${STU_END},{m}))', fmt)
d.conditional_formatting.add("D48:D57", FormulaRule(formula=[f'AND(D48<>"",D48>={HIGH})'],
                                                    font=Font(name=FONT, bold=True, color=C_AMBER),
                                                    fill=PatternFill("solid", fgColor=C_AMBER_BG)))

section("L46", "Not yet deployed — give them a turn")
th(47, [("L", "Leader"), ("M", "Form class"), ("N", "Group")])
d.merge_cells("N47:P47")
S_IDX = f"Students!$K$2:$K${STU_END}"
for k in range(1, 16):
    r = 47 + k
    m = f"MATCH({k},{S_IDX},0)"
    td(f"L{r}", f'=IFERROR(INDEX({S_FULL},{m}),"")', align="left")
    td(f"M{r}", f'=IF($L{r}="","",INDEX({S_FORMC},{m}))')
    d.merge_cells(f"N{r}:P{r}")
    td(f"N{r}", f'=IF($L{r}="","",INDEX(Students!$D$2:$D${STU_END},{m}))', align="left")
td("L63", f'=IF(E5>15,"+ "&(E5-15)&" more — filter Students › Load Status","")', align="left")
d["L63"].font = F_SUB
d["L63"].border = Border()

# Activity staffing board (rows 66+)
N_BOARD = 50
section("B66", "Activity staffing — all activities by date")
d["F66"] = '=IF(I5>' + str(N_BOARD) + ',"Showing first ' + str(N_BOARD) + ' of "&I5&" activities","")'
d["F66"].font = F_SUB
th(67, [("B", "Activity"), ("C", "Category"), ("D", "Date"), ("E", "Timing"), ("F", "Needed"),
        ("G", "Assigned"), ("H", "Open"), ("I", "Fill %"), ("J", "Status")])
A_SORT = f"Activities!$O$2:$O${ACT_END}"
board_first, board_last = 68, 67 + N_BOARD
for k in range(1, N_BOARD + 1):
    r = 67 + k
    # Hidden helper in column R: row index of the k-th earliest activity.
    d[f"R{r}"] = f'=IFERROR(MATCH(SMALL({A_SORT},{k}),{A_SORT},0),"")'
    src = {"B": ("A", None, "left"), "C": ("B", None, "left"), "D": ("C", "d mmm (ddd)", "center"),
           "E": ("N", None, "center"), "F": ("H", "0", "center"), "G": ("J", "0", "center"),
           "H": ("K", "0", "center"), "I": ("L", "0%", "center"), "J": ("M", None, "center")}
    for col, (acol, fmt, align) in src.items():
        rng = f"Activities!${acol}$2:${acol}${ACT_END}"
        td(f"{col}{r}", f'=IF($R{r}="","",IF(INDEX({rng},$R{r})="","",INDEX({rng},$R{r})))', fmt, align)
d.column_dimensions["R"].hidden = True
board = f"B{board_first}:J{board_last}"
d.conditional_formatting.add(board, FormulaRule(formula=[f'$E{board_first}="Past"'],
                                                font=Font(name=FONT, color="9AA3B2")))
status_rules(d, f"J{board_first}:J{board_last}", STAFF_COLORS)
d.conditional_formatting.add(f"E{board_first}:E{board_last}", CellIsRule(
    operator="equal", formula=['"Upcoming"'], font=Font(name=FONT, bold=True, color=C_BLUE)))
d.conditional_formatting.add(f"I{board_first}:I{board_last}", DataBarRule(
    start_type="num", start_value=0, end_type="num", end_value=1, color="5B8DEF"))
d.conditional_formatting.add(f"H{board_first}:H{board_last}", FormulaRule(
    formula=[f'AND(ISNUMBER(H{board_first}),H{board_first}>0)'], font=Font(name=FONT, bold=True, color=C_RED)))

d.freeze_panes = "A7"
d.page_setup.orientation = "landscape"
d.page_setup.fitToWidth = 1
d.page_setup.fitToHeight = 0
d.sheet_properties.pageSetUpPr.fitToPage = True
d.print_area = f"A1:P{board_last}"
d.print_title_rows = "1:2"

# ---------------------------------------------------------------- Read Me
h = ws_help
h.sheet_view.showGridLines = False
h.column_dimensions["A"].width = 2
h.column_dimensions["B"].width = 26
h.column_dimensions["C"].width = 90
h["B1"] = "How to use this workbook"
h["B1"].font = F_TITLE
rows = [
    ("WHAT IT IS", None),
    ("Purpose", "Tracks which student leaders are deployed to which school activities, so teachers can "
                "staff events fully and spread opportunities fairly. Keep ONE copy on the shared drive "
                "and have everyone edit that copy (Excel Online / Google Sheets allow simultaneous editing)."),
    ("WHERE TO TYPE", None),
    ("Navy column headers", "Input columns — type or pick from the dropdown."),
    ("Grey column headers", "Calculated automatically. Do not type over these cells."),
    ("Dashboard", "All formulas. Read-only — nothing to enter."),
    ("WORKFLOW", None),
    ("1. Students", "One row per student leader: Full Name (must be unique — it is the lookup key), "
                    "preferred Name, Form Class, Leadership Group. Duplicate names turn red."),
    ("2. Activities", "One row per activity: unique Activity name, Category, Date, Start/End time, Venue, "
                      "Teacher-in-Charge and Leaders Needed. Hours, staffing status and timing are worked out."),
    ("3. Deployments", "One row per student per activity. Pick the Activity and Student from the dropdowns, "
                       "then Role and Status. Leave Hours Override blank to credit the activity's duration. "
                       "The Check column flags unknown names, duplicates and same-day clashes."),
    ("Statuses", "Confirmed / Tentative / Completed all count as deployed. Withdrawn rows are kept for the "
                 "record but excluded from every count and from hours."),
    ("4. Setup", "Edit dropdown lists (categories, roles, statuses, leadership groups, form classes) and two "
                 "settings: the High-load threshold (default 4 deployments) and the Upcoming window (default 14 days)."),
    ("SHARED-DRIVE TIPS", None),
    ("Renaming", "If you rename an activity or student, also update their existing Deployments rows "
                 "(Check will show \"Unknown …\" until you do)."),
    ("Sorting / filtering", "Use the filter arrows on each input sheet. Sorting input sheets is safe; the "
                            "Dashboard re-sorts activities by date on its own."),
    ("Capacity", f"Formulas are pre-filled for {N_STU} students, {N_ACT} activities and {N_DEP} deployments. "
                 "To extend, copy the last grey row down."),
    ("Google Sheets", "Upload the .xlsx and choose File › Save as Google Sheets for live co-editing; all "
                      "formulas, dropdowns and colour rules carry over."),
    ("New year", "Save a copy for the new year, then clear the Deployments and Activities input columns and "
                 "update the Students list."),
]
r = 3
for label, text in rows:
    if text is None:
        r += 1
        h[f"B{r}"] = label
        h[f"B{r}"].font = F_SECTION
    else:
        h[f"B{r}"] = label
        h[f"B{r}"].font = Font(name=FONT, size=10, bold=True, color=INK)
        h[f"C{r}"] = text
        h[f"C{r}"].font = F_BASE
        h[f"C{r}"].alignment = Alignment(wrap_text=True, vertical="top")
        h[f"B{r}"].alignment = Alignment(vertical="top")
        h.row_dimensions[r].height = 14 * max(1, -(-len(text) // 95))
    r += 1
h[f"B{r + 1}"] = ("This file contains SAMPLE data — replace the rows on Students, Activities and Deployments "
                  "with your own." if not TEMPLATE else
                  "Row 2 on each input sheet (yellow) is an example — overwrite or delete it.")
h[f"B{r + 1}"].font = Font(name=FONT, size=10, bold=True, color=C_AMBER)
base_font(h, r + 2, 3)

wb.save(OUT)
print(f"wrote {OUT}")
