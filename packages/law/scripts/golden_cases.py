"""Writes test/golden.cases.ts. Expected line dates are worked out by hand
(calendar month arithmetic); day counts use Python's datetime as an oracle
independent of the engine's date library."""
from datetime import date
import json, pathlib

T = "2026-11-15"

def S(act, *secs, **kw):
    return [dict(act=act, section=s, **kw) for s in secs]

C = []
def case(id, title, sections, custody, ft="false", other="false", verdict=None, line=None, ftline=None, today=T, **extra):
    C.append(dict(id=id, title=title, input=dict(sections=sections, custodyStart=custody, firstTimeOffender=ft, otherPendingCases=other, **{k: v for k, v in extra.items() if k in ("accusedDelayDays", "registeredOn", "maxTermOverrideMonths")}), today=today, expect=dict(verdict=verdict, lineDate=line, firstTimeLineDate=ftline, **{k: v for k, v in extra.items() if k in ("beyondMaximum", "pastIfFirstTime", "maxTermMonths", "provision")})))

case("G01", "NLU Delhi 2011 regression: theft, 2 years in custody", S("IPC", "379"), "2009-06-01", ft="unknown", verdict="PAST_THE_LINE", line="2010-12-01", ftline="2010-06-01", today="2011-06-09")
case("G02", "Theft, not first-time, long past", S("IPC", "379"), "2023-03-12", verdict="PAST_THE_LINE", line="2024-09-12")
case("G03", "Theft, first-time: one-third", S("IPC", "379"), "2025-03-12", ft="true", verdict="PAST_THE_LINE", line="2026-03-12", ftline="2026-03-12")
case("G04", "Theft, not yet", S("IPC", "379"), "2025-12-01", verdict="NOT_YET", line="2027-06-01")
case("G05", "First-time unknown: past one-third, not half", S("IPC", "379"), "2025-10-01", ft="unknown", verdict="NOT_YET", line="2027-04-01", ftline="2026-10-01", pastIfFirstTime=True)
case("G06", "Murder excluded", S("IPC", "302"), "2015-01-01", verdict="EXCLUDED")
case("G07", "379 + 411: two offences, flagged", S("IPC", "379", "411"), "2023-01-10", verdict="PAST_FLAGGED", line="2024-07-10")
case("G08", "323/504/506: 7-year max, flagged", S("IPC", "323/504/506"), "2022-01-01", verdict="PAST_FLAGGED", line="2025-07-01", maxTermMonths=84)
case("G09", "No custody date", S("IPC", "379"), None, verdict="CANT_TELL")
case("G10", "Unknown section", S("IPC", "999"), "2020-01-01", verdict="CANT_TELL")
case("G11", "Rape, no custody date: excluded beats can't-tell", S("IPC", "376"), None, verdict="EXCLUDED")
case("G12", "Leap day landing", S("IPC", "379"), "2022-08-29", verdict="PAST_THE_LINE", line="2024-02-29")
case("G13", "Month-end clamp: 31 Aug + 42 months", S("IPC", "420"), "2021-08-31", verdict="PAST_THE_LINE", line="2025-02-28")
case("G14", "Cheating, first-time: 28 months", S("IPC", "420"), "2024-01-31", ft="true", verdict="PAST_THE_LINE", line="2026-05-31", ftline="2026-05-31")
case("G15", "One-month offence: half = 16 days (rounded up)", S("IPC", "341"), "2026-01-10", verdict="PAST_THE_LINE", line="2026-01-26", beyondMaximum=True)
case("G16", "One-month offence, first-time: 11 days", S("IPC", "341"), "2026-01-10", ft="true", verdict="PAST_THE_LINE", line="2026-01-21", ftline="2026-01-21", beyondMaximum=True)
case("G17", "Three-month offence: half crosses February", S("IPC", "186"), "2026-01-10", verdict="PAST_THE_LINE", line="2026-02-24", beyondMaximum=True)
case("G18", "Six-month offence from 31 May", S("IPC", "188"), "2026-05-31", ft="unknown", verdict="PAST_THE_LINE", line="2026-08-31", ftline="2026-07-31", other="false")
case("G19", "Accused delay pushes the line", S("IPC", "379"), "2024-01-01", verdict="PAST_THE_LINE", line="2025-07-31", accusedDelayDays=30)
case("G20", "NDPS 8/20 small quantity", S("NDPS", "8/20", quantity="small"), "2026-01-01", verdict="PAST_THE_LINE", line="2026-07-01", maxTermMonths=12)
case("G21", "NDPS 20, quantity not stated", S("NDPS", "20"), "2026-01-01", verdict="CANT_TELL")
case("G22", "NDPS 21 commercial", S("NDPS", "21", quantity="commercial"), "2020-01-01", verdict="NOT_YET", line="2030-01-01", maxTermMonths=240)
case("G23", "Arms 3/25 read together", S("ARMS", "3/25"), "2025-06-01", verdict="NOT_YET", line="2027-12-01", maxTermMonths=60)
case("G24", "Arms bare s.25", S("ARMS", "25"), "2025-06-01", verdict="CANT_TELL")
case("G25", "Arms 4/25", S("ARMS", "4/25"), "2021-06-01", verdict="PAST_THE_LINE", line="2023-12-01")
case("G26", "Arms prohibited arms 25(1AA)", S("ARMS", "25(1-aa)"), "2024-06-01", verdict="EXCLUDED")
case("G27", "BNS theft, first-time", S("BNS", "303(2)"), "2025-01-15", ft="true", verdict="PAST_THE_LINE", line="2026-01-15", ftline="2026-01-15", provision="BNSS_479")
case("G28", "BNS bare 303 reads as 303(2)", S("BNS", "303"), "2025-01-15", verdict="PAST_THE_LINE", line="2026-07-15", maxTermMonths=36)
case("G29", "BNS bare 318 reads as 318(4)", S("BNS", "318"), "2024-08-01", verdict="NOT_YET", line="2028-02-01", maxTermMonths=84)
case("G30", "BNS bare 103 (murder)", S("BNS", "103"), "2024-08-01", verdict="EXCLUDED")
case("G31", "BNS hurt + intimidation: flagged", S("BNS", "115(2)", "351(2)"), "2024-08-01", verdict="PAST_FLAGGED", line="2025-08-01")
case("G32", "Conspiracy alone: main offence missing", S("IPC", "120B"), "2024-01-01", verdict="CANT_TELL")
case("G33", "420 + 120B: two offences", S("IPC", "420", "120B"), "2021-01-01", verdict="PAST_FLAGGED", line="2024-07-01")
case("G34", "379 r/w 34: one offence", S("IPC", "379 r/w 34"), "2024-01-01", verdict="PAST_THE_LINE", line="2025-07-01")
case("G35", "Attempted theft 379/511 uses the full term", S("IPC", "379/511"), "2024-01-01", verdict="PAST_THE_LINE", line="2025-07-01")
case("G36", "Struck-down section alone", S("IPC", "497"), "2024-01-01", verdict="CANT_TELL")
case("G37", "Struck-down section plus theft", S("IPC", "497", "379"), "2024-01-01", verdict="PAST_THE_LINE", line="2025-07-01")
case("G38", "Excise with lawyer-entered max", S("EXCISE", "60"), "2025-01-01", verdict="PAST_THE_LINE", line="2026-07-01", maxTermOverrideMonths=36)
case("G39", "Excise without max", S("EXCISE", "60"), "2025-01-01", verdict="CANT_TELL")
case("G40", "Other cases pending", S("IPC", "379"), "2023-01-01", other="true", verdict="PAST_FLAGGED", line="2024-07-01")
case("G41", "Other cases not stated", S("IPC", "379"), "2023-01-01", other="unknown", verdict="PAST_FLAGGED", line="2024-07-01")
case("G42", "Detained beyond the maximum", S("IPC", "341"), "2025-01-01", verdict="PAST_THE_LINE", line="2025-01-17", beyondMaximum=True)
case("G43", "Custody date in the future", S("IPC", "379"), "2027-01-01", verdict="CANT_TELL")
case("G44", "Impossible custody date", S("IPC", "379"), "2023-02-30", verdict="CANT_TELL")
case("G45", "Devanagari digits", S("IPC", "३७९"), "2023-03-12", verdict="PAST_THE_LINE", line="2024-09-12")
case("G46", "Devanagari letter suffix 304-ख", S("IPC", "304-ख"), "2020-01-01", verdict="EXCLUDED")
case("G47", "498ए + 323", S("IPC", "498ए", "323"), "2024-01-01", verdict="PAST_FLAGGED", line="2025-07-01")
case("G48", "POCSO 7/8", S("POCSO", "7/8"), "2024-03-01", verdict="PAST_THE_LINE", line="2026-09-01")
case("G49", "POCSO 4", S("POCSO", "4"), "2024-03-01", verdict="EXCLUDED")
case("G50", "SC/ST 3(1)(r) + IPC 323", S("SCST", "3(1)(r)") + S("IPC", "323"), "2023-01-01", verdict="PAST_FLAGGED", line="2025-07-01", maxTermMonths=60)
case("G51", "IT 66A struck down", S("IT", "66A"), "2024-01-01", verdict="CANT_TELL")
case("G52", "Line falls on today", S("IT", "67"), "2025-03-15", ft="true", verdict="PAST_THE_LINE", line="2026-11-15", ftline="2026-11-15")
case("G53", "One day short", S("IPC", "379"), "2025-05-16", verdict="NOT_YET", line="2026-11-16")
case("G54", "Dowry s.3 has no written maximum", S("DOWRY", "3"), "2024-01-01", verdict="CANT_TELL")
case("G55", "Gambling s.13, one month, November", S("GAMBLING", "13"), "2026-11-01", verdict="NOT_YET", line="2026-11-16")
case("G56", "Gangsters Act s.3", S("GANGSTERS", "3"), "2024-01-01", verdict="CANT_TELL")
case("G57", "Registered after BNSS with IPC numbers", S("IPC", "379"), "2024-09-01", verdict="PAST_THE_LINE", line="2026-03-01", registeredOn="2024-09-01", provision="BNSS_479")
case("G58", "Robbery 14 years, line today", S("IPC", "392"), "2019-11-15", verdict="PAST_THE_LINE", line="2026-11-15")
case("G59", "Bare BNS 309 is ambiguous", S("BNS", "309"), "2024-08-01", verdict="CANT_TELL")
case("G60", "Sub-clauses read under parent: 376(2)(n)", S("IPC", "376(2)(n)"), "2020-01-01", verdict="EXCLUDED")
case("G61", "Unlisted law", S("OTHER", "12"), "2020-01-01", verdict="CANT_TELL")
case("G62", "Override never beats life", S("IPC", "307"), "2020-01-01", verdict="EXCLUDED", maxTermOverrideMonths=36)
case("G63", "SC/ST 3(2)(va) with IPC 324", S("SCST", "3(2)(va)") + S("IPC", "324"), "2024-01-01", verdict="PAST_FLAGGED", line="2025-07-01", maxTermMonths=36)
case("G64", "From a leap day, first-time", S("IPC", "379"), "2024-02-29", ft="true", verdict="PAST_THE_LINE", line="2025-02-28", ftline="2025-02-28")
case("G65", "Registered before BNSS with BNS numbers", S("BNS", "303(2)"), "2024-06-20", verdict="PAST_THE_LINE", line="2025-12-20", registeredOn="2024-06-20", provision="BNSS_479_PRE_JULY_2024")
case("G66", "Hurt only, first-time unknown, past half", S("IPC", "323"), "2025-01-01", ft="unknown", verdict="PAST_THE_LINE", line="2025-07-01", ftline="2025-05-01")

def d(s): return date.fromisoformat(s)
for c in C:
    e = c["expect"]
    if e["lineDate"] and e["verdict"] in ("PAST_THE_LINE", "PAST_FLAGGED"):
        e["daysPast"] = (d(c["today"]) - d(e["lineDate"])).days
        assert e["daysPast"] >= 0, c["id"]
    if e["lineDate"] and e["verdict"] == "NOT_YET":
        e["daysToGo"] = (d(e["lineDate"]) - d(c["today"])).days
        assert e["daysToGo"] > 0, c["id"]
    for k in [k for k, v in e.items() if v is None]:
        del e[k]

out = pathlib.Path(__file__).resolve().parent.parent / "test" / "golden.cases.ts"
out.write_text("// Generated by scripts/golden_cases.py. Do not edit by hand.\nimport type { CaseInput, Evaluation } from \"../src/types.js\";\n\nexport interface GoldenCase {\n  id: string;\n  title: string;\n  today: string;\n  input: CaseInput;\n  expect: Partial<Evaluation>;\n}\n\nexport const GOLDEN: GoldenCase[] = " + json.dumps(C, ensure_ascii=False, indent=2) + ";\n")
print(len(C), "golden cases")
