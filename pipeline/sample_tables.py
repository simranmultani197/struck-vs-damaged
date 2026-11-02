"""Print the report's sample tables as Markdown from data/processed (so report numbers = code output).

    python pipeline/sample_tables.py > docs/sample_tables.md
"""
import os
import sys

import pandas as pd

P = sys.argv[1] if len(sys.argv) > 1 else "data/processed"
r = lambda n: pd.read_csv(os.path.join(P, n))
pct = lambda x: "" if pd.isna(x) else f"{100 * x:.1f}%"
num = lambda x: "" if pd.isna(x) else f"{int(x):,}"
ci = lambda lo, hi: "" if pd.isna(lo) else f"{100 * lo:.1f}–{100 * hi:.1f}%"


def md(df):
    cols = list(df.columns)
    out = ["| " + " | ".join(cols) + " |", "| " + " | ".join("---" for _ in cols) + " |"]
    out += ["| " + " | ".join(str(v) for v in row) + " |" for row in df.itertuples(index=False)]
    return "\n".join(out)


def rate_cols(t):
    return dict(n_reports=t.n_reports.map(num), n_damage_coded=t.n_damage_coded.map(num),
                n_damaging=t.n_damaging.map(num), damage_rate=t.damage_rate.map(pct),
                ci95=[ci(a, b) for a, b in zip(t.ci95_lo, t.ci95_hi)])


def section(title, df):
    print(f"\n### {title}\n\n{md(df)}\n")


# Q1
t = r("q1_annual.csv")
t = t[t.year.isin([1990, 2000, 2009, 2010, 2020, 2023, 2024, 2025, 2026])]
section("Q1 annual (sample years)", pd.DataFrame(dict(
    year=t.year, **{k: v for k, v in rate_cols(t).items() if k != "ci95"},
    pct_damage_coded=t.pct_damage_coded.map(pct), n_not_coded=t.n_status_not_coded.map(num),
    rate_all_reports_FAA=t.damage_rate_all_reports.map(pct), partial=t.partial_year)))

# Q2/Q3 species
sp = r("q2q3_species.csv")
pick = ["Mourning dove", "Barn swallow", "Killdeer", "American kestrel", "Horned lark", "Red-tailed hawk",
        "Canada goose", "Turkey vulture", "White-tailed deer", "Black vulture", "Snow goose",
        "Unknown bird - small", "Unknown bird - medium", "Unknown bird - large", "Unknown bird"]
s = sp.set_index("species_label").loc[pick].reset_index()
section("Q2/Q3 species", pd.DataFrame(dict(
    species=s.species_label, family=s.family, size=s.modal_size, id_level=s.id_level,
    **rate_cols(s), share_of_reports=s.share_of_all_reports.map(pct),
    share_of_damaging=s.share_of_damaging.map(pct),
    freq_rank=s.frequency_rank.map(num), damage_rank=s.damage_rate_rank.map(num))))

fam = r("q2_family.csv").head(10)
section("Q2 family", pd.DataFrame(dict(family=fam.family, group=fam.species_group,
                                       n_reports=fam.n_reports.map(num),
                                       share=fam.share_of_all_reports.map(pct),
                                       damage_rate=fam.damage_rate.map(pct),
                                       pct_coded=fam.pct_damage_coded.map(pct))))

reg = r("q2_group_by_region.csv")
reg = reg[reg.species_group.isin(["Waterfowl", "Gulls & terns", "Raptors & vultures", "Unknown bird"])]
reg = reg[reg.faa_region.isin(["AAL", "AEA", "ASO", "AWP", "Not reported"])]
section("Q2 region filter", pd.DataFrame(dict(region=reg.faa_region, group=reg.species_group,
                                              n_reports=reg.n_reports.map(num),
                                              share_within_region=reg.share_within_region.map(pct),
                                              damage_rate=reg.damage_rate.map(pct))))

# Q4
c = r("q4_components.csv")
section("Q4 components", pd.DataFrame(dict(
    component=c.component, n_struck=c.n_struck.map(num), n_component_damaged=c.n_component_damaged.map(num),
    component_damage_rate=c.component_damage_rate.map(pct), ci95=[ci(a, b) for a, b in zip(c.ci95_lo, c.ci95_hi)],
    aircraft_damage_rate_when_struck=c.aircraft_damage_rate_when_struck.map(pct))))

# Q5
ph = r("q5_phase.csv")
section("Q5 phase", pd.DataFrame(dict(phase_group=ph.phase_group, phase=ph.phase, **rate_cols(ph),
                                      pct_coded=ph.pct_damage_coded.map(pct))))
hb = r("q5_phase_height.csv")
hb = hb[hb.phase_group.isin(["Departure", "Arrival"])]
order = ["0 ft (on ground)", "1–500 ft", "501–1,500 ft", "1,501–3,500 ft", ">3,500 ft", "Not reported"]
hb["o"] = hb.height_band.map(order.index)
hb = hb.sort_values(["phase_group", "o"])
section("Q5 phase x height", pd.DataFrame(dict(phase_group=hb.phase_group, height_band=hb.height_band,
                                               **rate_cols(hb))))

# Q6
m = r("q6_month.csv")
section("Q6 month", pd.DataFrame(dict(month=m.INCIDENT_MONTH, season=m.season, window=m.migration_window,
                                      **rate_cols(m), pct_coded=m.pct_damage_coded.map(pct))))
mt = r("q6_month_time_of_day.csv")
mt = mt[mt.INCIDENT_MONTH.isin([1, 7, 10])]
section("Q6 month x time of day", pd.DataFrame(dict(month=mt.INCIDENT_MONTH, time_of_day=mt.time_of_day,
                                                    **rate_cols(mt))))

# Q7
a = r("q7_airports.csv").head(10)
section("Q7 airports", pd.DataFrame(dict(airport=a.airport_id, name=a.airport_name, state=a.state,
                                         n_reports=a.n_reports.map(num), pct_coded=a.pct_damage_coded.map(pct),
                                         damage_rate=a.damage_rate.map(pct),
                                         ops_2016_2025="(ATADS)", per_100k_ops="(join)")))

# Q8
q = r("q8_combinations.csv")
q8 = pd.concat([q.head(10), q.tail(1)])
section("Q8 combinations", pd.DataFrame(dict(
    species_group=q8.species_group, season=q8.season, phase=q8.phase_group,
    n_damaging=q8.n_damaging.map(num), share_of_all_damaging=q8.share_of_all_damaging.map(pct),
    cumulative=q8.cumulative_share.map(pct), damage_rate_in_cell=q8.damage_rate_in_cell.map(pct),
    n_coded_in_cell=q8.n_damage_coded_cell.map(num))))
