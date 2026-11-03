"""Small CSVs for the Observable sketch notebook (subsets of data/processed, so sketches stay light).

    python observable/make_sketch_data.py          # writes observable/data/*.csv

Booleans are written lowercase (true/false) so FileAttachment(...).csv({typed: true}) parses them.
"""
import os

import pandas as pd

SRC, OUT = "data/processed", "observable/data"
os.makedirs(OUT, exist_ok=True)
r = lambda n: pd.read_csv(os.path.join(SRC, n))


def save(df, name):
    df = df.copy()
    for c in df.columns:
        if df[c].dtype == bool:
            df[c] = df[c].map({True: "true", False: "false"})
    df.to_csv(os.path.join(OUT, name), index=False)
    print(f"{name:28s} {len(df):>4} rows")


RATE = ["n_reports", "n_damage_coded", "n_damaging", "damage_rate", "ci95_lo", "ci95_hi"]

# View A: ranked species with >=100 damage-coded reports (a subset of the 236) + the unknown-bird rows
sp = r("q2q3_species.csv")
keep = (sp.rankable & (sp.n_damage_coded >= 100)) | (sp.id_level == "Unknown")
a = sp.loc[keep, ["species_label", "family", "species_group", "id_level", "modal_size", *RATE,
                  "frequency_rank", "damage_rate_rank"]].rename(columns={"species_label": "species"})
a = a[a.species != "Unknown bird or bat"]
save(a, "sketch_species.csv")

# View B: one row per year x damage status (long format for stacking) + the rate table
y = r("q1_annual.csv")
long = y.melt(id_vars=["year", "partial_year"],
              value_vars=["n_status_damaging", "n_status_not_damaging", "n_status_not_coded"],
              var_name="status", value_name="n")
long["status"] = long.status.map({"n_status_damaging": "Damaging (M, M?, S, D)",
                                  "n_status_not_damaging": "Not damaging (N)",
                                  "n_status_not_coded": "Damage not coded"})
save(long, "sketch_annual_status.csv")
save(y[["year", "partial_year", *RATE, "damage_rate_all_reports"]], "sketch_annual_rate.csv")

# View C1: components
c = r("q4_components.csv")
save(c[["component", "n_struck", "n_component_damaged", "component_damage_rate", "ci95_lo", "ci95_hi"]],
     "sketch_components.csv")

# View C2: departure/arrival x height band, and all phases
hb = r("q5_phase_height.csv")
save(hb[hb.phase_group.isin(["Departure", "Arrival"])][["phase_group", "height_band", *RATE]],
     "sketch_phase_height.csv")
save(r("q5_phase.csv")[["phase_group", "phase", *RATE, "pct_damage_coded"]], "sketch_phase.csv")

# View C3: month, month x time of day
m = r("q6_month.csv").rename(columns={"INCIDENT_MONTH": "month"})
save(m[["month", "season", "migration_window", *RATE]], "sketch_month.csv")
mt = r("q6_month_time_of_day.csv").rename(columns={"INCIDENT_MONTH": "month"})
save(mt[["month", "time_of_day", *RATE]], "sketch_month_tod.csv")

# View D: top 15 airports + UNKNOWN
ap = r("q7_airports.csv")
ap = pd.concat([ap[ap.airport_id == "UNKNOWN"], ap[ap.airport_id != "UNKNOWN"].head(15)])
save(ap[["airport_id", "airport_name", "state", "n_reports", "pct_damage_coded", "damage_rate"]],
     "sketch_airports.csv")

# View E: top 15 cells + the 'not reported' block
q = r("q8_combinations.csv")
known = q[q.season != "—"]
e = known.head(15).copy()
e["label"] = e.species_group + " · " + e.season + " · " + e.phase_group
save(e[["label", "species_group", "season", "phase_group", "n_damaging", "share_of_all_damaging",
        "cumulative_share", "damage_rate_in_cell", "n_damage_coded_cell"]], "sketch_combinations.csv")
miss = q[q.season == "—"].iloc[0]
whole = pd.DataFrame([
    dict(part="Top 15 cells", share=known.head(15).share_of_all_damaging.sum()),
    dict(part="Other known cells", share=known.share_of_all_damaging.sum() - known.head(15).share_of_all_damaging.sum()),
    dict(part="Species or phase not reported", share=miss.share_of_all_damaging),
])
save(whole, "sketch_damaging_whole.csv")
