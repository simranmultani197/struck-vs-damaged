"""
Milestone 2 data pipeline: raw FAA strike CSV -> cleaned record table + one processed table per view.

    python pipeline/build.py --raw data/raw/strikes.csv --out data/processed

Every rate table carries its denominators (n_reports, n_damage_coded, n_damaging) and a Wilson 95%
interval, and every categorical field keeps an explicit "Not reported" / "Unknown" level instead of
dropping rows (Milestone 1 feedback, point 2).
"""
import argparse
import math
import os

import numpy as np
import pandas as pd

# ---------------------------------------------------------------- definitions
DAMAGING = {"M", "M?", "S", "D"}          # FAA: any reported damage (matches INDICATED_DAMAGE)
DAMAGING_STRICT = {"M", "S", "D"}         # sensitivity check: drop "undetermined level" M?
LAST_COMPLETE_YEAR = 2025                 # 2026 is partial (validation lags to late Aug 2026)
MIN_CODED_FOR_RANKING = 30                # species need >= 30 damage-coded reports to be ranked

PHASE_GROUP = {
    "Take-off Run": "Departure", "Climb": "Departure", "Departure": "Departure",
    "Approach": "Arrival", "Landing Roll": "Arrival", "Descent": "Arrival", "Arrival": "Arrival",
    "En Route": "En route", "Local": "Local", "Taxi": "Ground", "Parked": "Ground",
}
PHASE_ORDER = ["Taxi", "Take-off Run", "Climb", "Departure", "En Route", "Local", "Descent",
               "Arrival", "Approach", "Landing Roll", "Parked", "Not reported"]
HEIGHT_BINS = [-0.5, 0.5, 500, 1500, 3500, np.inf]
HEIGHT_LABELS = ["0 ft (on ground)", "1–500 ft", "501–1,500 ft", "1,501–3,500 ft", ">3,500 ft"]
SEASON = {12: "Winter", 1: "Winter", 2: "Winter", 3: "Spring", 4: "Spring", 5: "Spring",
          6: "Summer", 7: "Summer", 8: "Summer", 9: "Fall", 10: "Fall", 11: "Fall"}
# Broad North American migration windows (spring Mar–May, fall Aug–Nov); used only as a shaded overlay.
MIGRATION = {3: "Spring migration", 4: "Spring migration", 5: "Spring migration",
             8: "Fall migration", 9: "Fall migration", 10: "Fall migration", 11: "Fall migration"}
COMPONENTS = {  # label -> (struck columns, damaged columns)
    "Radome": (["STR_RAD"], ["DAM_RAD"]),
    "Windshield": (["STR_WINDSHLD"], ["DAM_WINDSHLD"]),
    "Nose": (["STR_NOSE"], ["DAM_NOSE"]),
    "Engine (any)": (["STR_ENG1", "STR_ENG2", "STR_ENG3", "STR_ENG4"],
                     ["DAM_ENG1", "DAM_ENG2", "DAM_ENG3", "DAM_ENG4"]),
    "Propeller": (["STR_PROP"], ["DAM_PROP"]),
    "Wing / rotor": (["STR_WING_ROT"], ["DAM_WING_ROT"]),
    "Fuselage": (["STR_FUSE"], ["DAM_FUSE"]),
    "Landing gear": (["STR_LG"], ["DAM_LG"]),
    "Tail": (["STR_TAIL"], ["DAM_TAIL"]),
    "Lights": (["STR_LGHTS"], ["DAM_LGHTS"]),
    "Other": (["STR_OTHER"], ["DAM_OTHER"]),
}
# Names for family codes that have no row of their own in the export.
FAMILY_FALLBACK = {"K2": "Osprey", "J2": "Ducks, geese, swans", "E1": "Loons", "F1": "Grebes", "1G1": "Deer", "1F1": "Canids (coyote, fox, dog)",
                   "1F4": "Skunks", "1A1": "Opossums", "1F2": "Raccoons", "1F3": "Weasels, badgers",
                   "1E1": "Squirrels", "1D1": "Hares", "1D2": "Rabbits", "1C2": "Microbats",
                   "YH": "Larks", "YL": "Starlings, mynas", "ZT": "Blackbirds, meadowlarks",
                   "ZX": "New World sparrows", "Z6": "Thrushes", "K3": "Hawks, eagles, kites",
                   "N6": "Sandpipers, allies", "NE": "Gulls, terns", "O2": "Pigeons, doves"}


def wilson(k, n, z=1.96):
    """95% Wilson score interval for k successes in n trials (returns lo, hi)."""
    if n == 0:
        return (np.nan, np.nan)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))


def rate_table(df, keys, strict=False):
    """Count reports / damage-coded / damaging per group and attach rates + CIs."""
    g = df.groupby(keys, observed=True, dropna=False)
    out = g.agg(n_reports=("INDEX_NR", "size"),
                n_damage_coded=("damage_coded", "sum"),
                n_damaging=("is_damaging", "sum")).reset_index()
    if strict:
        out["n_damaging_strict"] = g["is_damaging_strict"].sum().values
    out["pct_damage_coded"] = out.n_damage_coded / out.n_reports
    out["damage_rate"] = np.where(out.n_damage_coded > 0, out.n_damaging / out.n_damage_coded.replace(0, np.nan), np.nan)
    ci = [wilson(k, n) for k, n in zip(out.n_damaging, out.n_damage_coded)]
    out["ci95_lo"] = [c[0] for c in ci]
    out["ci95_hi"] = [c[1] for c in ci]
    out["damage_rate_all_reports"] = out.n_damaging / out.n_reports   # FAA annual-report convention
    return out


# ---------------------------------------------------------------- cleaning
def load_and_clean(raw_path):
    df = pd.read_csv(raw_path, dtype=str, keep_default_na=False, low_memory=False)
    for c in df.columns:
        df[c] = df[c].str.strip()
    df = df.replace({"": np.nan})

    df["INCIDENT_YEAR"] = df.INCIDENT_YEAR.astype(int)
    df["INCIDENT_MONTH"] = df.INCIDENT_MONTH.astype(int)
    df["partial_year"] = df.INCIDENT_YEAR > LAST_COMPLETE_YEAR

    # --- outcome
    lvl = df.DAMAGE_LEVEL
    df["damage_coded"] = lvl.notna()
    df["is_damaging"] = lvl.isin(DAMAGING)
    df["is_damaging_strict"] = lvl.isin(DAMAGING_STRICT)
    df["damage_status"] = np.select([lvl.isin(DAMAGING), lvl.eq("N")], ["Damaging", "Not damaging"],
                                    "Damage not coded")
    df["damage_level"] = lvl.fillna("Not coded")

    eff = df.EFFECT.fillna("")
    df["effect_status"] = np.select(
        [eff.eq(""), eff.eq("None")], ["Not reported", "No effect"], "Negative effect")

    # --- taxon
    sid = df.SPECIES_ID.fillna("UNK")
    df["is_unknown_taxon"] = sid.str.startswith("UNK")
    is_digit = sid.str[0].str.isdigit()
    df["family_code"] = np.where(df.is_unknown_taxon, "UNK", np.where(is_digit, sid.str[:3], sid.str[:2]))
    species_len = np.where(sid.str.startswith("1C"), 6, np.where(is_digit, 4, 5))
    group_level = sid.str.endswith("000")
    df["id_level"] = np.select(
        [df.is_unknown_taxon, (sid.str.len() >= species_len) & ~group_level],
        ["Unknown", "Species"], "Group only")

    df["species_group"] = species_group(sid)
    names = df.groupby("SPECIES_ID").SPECIES.first().to_dict()
    def fam_name(c):
        order = c[:2] if c[0].isdigit() else c[:1]
        return names.get(c) or FAMILY_FALLBACK.get(c) or names.get(order)
    fam_names = {c: fam_name(c) for c in df.family_code.unique()}
    fam_names["UNK"] = "Unknown bird"
    df["family"] = df.family_code.map(lambda c: fam_names.get(c) or f"Other (code {c})")
    # keep the "Unknown bird – small/medium/large" variants as labeled categories
    df["species_label"] = df.SPECIES.fillna("Unknown bird")

    df["size"] = df.SIZE.fillna("Not reported")

    # --- operational context
    df["phase"] = df.PHASE_OF_FLIGHT.replace({"Unknown": np.nan}).fillna("Not reported")
    df["phase_group"] = df.phase.map(PHASE_GROUP).fillna("Not reported")
    h = pd.to_numeric(df.HEIGHT, errors="coerce")
    df["height_ft"] = h
    df["height_band"] = pd.cut(h, HEIGHT_BINS, labels=HEIGHT_LABELS).astype(object).fillna("Not reported")
    df["time_of_day"] = df.TIME_OF_DAY.fillna("Not reported")
    df["hour"] = pd.to_numeric(df.TIME.str.split(":").str[0], errors="coerce")
    df["season"] = df.INCIDENT_MONTH.map(SEASON)
    df["migration_window"] = df.INCIDENT_MONTH.map(MIGRATION).fillna("Outside migration")

    # --- place
    df["airport_id"] = df.AIRPORT_ID.replace({"ZZZZ": "UNKNOWN"}).fillna("UNKNOWN")
    df["airport_name"] = df.AIRPORT.fillna("UNKNOWN")
    df["faa_region"] = df.FAAREGION.fillna("Not reported")
    df["state"] = df.STATE.fillna("Not reported")
    return df


def species_group(sid):
    """FAA-annual-report style coarse groups from the hierarchical species code."""
    s = sid.fillna("UNK")
    conds = [
        s.str.startswith("UNK"),
        s.str.startswith("1C"),
        s.str.startswith("1"),
        s.str.startswith("2"),
        s.str.startswith("J"),
        s.str.startswith("K"),
        s.str.startswith("NE"),
        s.str.startswith("N"),
        s.str.startswith("O"),
        s.str.startswith("Y") | s.str.startswith("Z"),
        s.str.startswith("R"),
        s.str.startswith("I") | s.str.startswith("H"),
        s.str.startswith("T"),
    ]
    labels = ["Unknown bird", "Bats", "Terrestrial mammals", "Reptiles", "Waterfowl",
              "Raptors & vultures", "Gulls & terns", "Shorebirds", "Doves & pigeons",
              "Perching birds", "Owls", "Herons, pelicans & allies", "Swifts & hummingbirds"]
    return np.select(conds, labels, "Other birds")


# ---------------------------------------------------------------- per-view tables
def q1_annual(df):
    t = rate_table(df, ["INCIDENT_YEAR"], strict=True)
    st = df.pivot_table(index="INCIDENT_YEAR", columns="damage_status", values="INDEX_NR",
                        aggfunc="size", fill_value=0).reset_index()
    t = t.merge(st, on="INCIDENT_YEAR")
    t["partial_year"] = t.INCIDENT_YEAR > LAST_COMPLETE_YEAR
    return t.rename(columns={"INCIDENT_YEAR": "year", "Damaging": "n_status_damaging",
                             "Not damaging": "n_status_not_damaging",
                             "Damage not coded": "n_status_not_coded"})


def q23_species(df):
    t = rate_table(df, ["species_label", "SPECIES_ID", "family", "species_group", "id_level"], strict=True)
    sizes = (df[df["size"] != "Not reported"].groupby("species_label")["size"]
             .agg(lambda s: s.value_counts().idxmax()).rename("modal_size"))
    size_share = (df.groupby("species_label")["size"].apply(lambda s: (s != "Not reported").mean())
                  .rename("pct_size_reported"))
    t = t.merge(sizes, on="species_label", how="left").merge(size_share, on="species_label", how="left")
    t["modal_size"] = t.modal_size.fillna("Not reported")
    total_reports, total_damaging = len(df), df.is_damaging.sum()
    t["share_of_all_reports"] = t.n_reports / total_reports
    t["share_of_damaging"] = t.n_damaging / total_damaging
    t["rankable"] = (t.id_level == "Species") & (t.n_damage_coded >= MIN_CODED_FOR_RANKING)
    r = t[t.rankable].copy()
    r["frequency_rank"] = r.n_reports.rank(ascending=False, method="min").astype(int)
    r["damage_rate_rank"] = r.damage_rate.rank(ascending=False, method="min").astype(int)
    t = t.merge(r[["species_label", "frequency_rank", "damage_rate_rank"]], on="species_label", how="left")
    return t.sort_values("n_reports", ascending=False)


def q2_family(df):
    t = rate_table(df, ["family_code", "family", "species_group"])
    t["share_of_all_reports"] = t.n_reports / len(df)
    return t.sort_values("n_reports", ascending=False)


def q2_family_region(df):
    t = rate_table(df, ["faa_region", "species_group"])
    tot = df.groupby("faa_region").size().rename("region_reports")
    t = t.merge(tot, on="faa_region")
    t["share_within_region"] = t.n_reports / t.region_reports
    return t.sort_values(["faa_region", "n_reports"], ascending=[True, False])


def q4_components(df):
    rows = []
    for label, (s_cols, d_cols) in COMPONENTS.items():
        struck = df[s_cols].eq("True").any(axis=1)
        damaged = df[d_cols].eq("True").any(axis=1)
        sub = df[struck]
        k, n = int(damaged[struck].sum()), int(struck.sum())
        lo, hi = wilson(k, n)
        rows.append(dict(component=label, n_struck=n, n_component_damaged=k,
                         component_damage_rate=k / n if n else np.nan, ci95_lo=lo, ci95_hi=hi,
                         n_struck_damage_coded=int(sub.damage_coded.sum()),
                         aircraft_damage_rate_when_struck=sub.is_damaging.sum() / max(1, sub.damage_coded.sum()),
                         n_negative_effect=int((sub.effect_status == "Negative effect").sum())))
    any_flag = pd.concat([df[c].eq("True") for v in COMPONENTS.values() for c in v[0]], axis=1).any(axis=1)
    rows.append(dict(component="No component flagged", n_struck=int((~any_flag).sum()),
                     n_component_damaged=np.nan, component_damage_rate=np.nan, ci95_lo=np.nan, ci95_hi=np.nan,
                     n_struck_damage_coded=int(df[~any_flag].damage_coded.sum()),
                     aircraft_damage_rate_when_struck=df[~any_flag].is_damaging.sum() / max(1, df[~any_flag].damage_coded.sum()),
                     n_negative_effect=int((df[~any_flag].effect_status == "Negative effect").sum())))
    return pd.DataFrame(rows)


def q5_phase_height(df):
    a = rate_table(df, ["phase_group", "phase"])
    a["phase"] = pd.Categorical(a.phase, PHASE_ORDER, ordered=True)
    b = rate_table(df, ["phase_group", "height_band"])
    return a.sort_values("phase"), b


def q6_month_tod(df):
    m = rate_table(df, ["INCIDENT_MONTH", "season", "migration_window"])
    mt = rate_table(df, ["INCIDENT_MONTH", "time_of_day"])
    return m, mt


def q7_airports(df, top=40):
    t = rate_table(df, ["airport_id", "airport_name", "state"])
    t = t.sort_values("n_reports", ascending=False)
    keep = t.head(top)
    if "UNKNOWN" not in keep.airport_id.values:
        keep = pd.concat([keep, t[t.airport_id == "UNKNOWN"]])
    keep = keep.copy()
    keep["ops_2016_2025_atads"] = np.nan          # filled by join_operations() once ATADS is downloaded
    keep["strikes_per_100k_ops"] = np.nan
    keep["n_reports_complete_years"] = keep.airport_id.map(
        df[~df.partial_year].groupby("airport_id").size())
    window = df[(df.INCIDENT_YEAR >= 2016) & (df.INCIDENT_YEAR <= 2025)]
    keep["n_reports_2016_2025"] = keep.airport_id.map(window.groupby("airport_id").size())
    return keep


def join_operations(airports, atads_csv, years=(2016, 2025)):
    """ATADS export saved as CSV with columns LOC_ID, YEAR, TOTAL_OPS (see README).

    Operations are summed over `years`; the rate uses reports from the same years.
    """
    ops = pd.read_csv(atads_csv)
    ops = ops[(ops.YEAR >= years[0]) & (ops.YEAR <= years[1])]
    tot = ops.groupby("LOC_ID").TOTAL_OPS.sum()
    key = airports.airport_id.str.replace(r"^K(?=[A-Z0-9]{3}$)", "", regex=True)
    airports["ops_2016_2025_atads"] = key.map(tot)  # summed over the window
    return airports


def q8_combos(df):
    sub = df[df.is_damaging]
    known = (sub.species_group != "Unknown bird") & (sub.phase_group != "Not reported")
    t = (sub[known].groupby(["species_group", "season", "phase_group"]).size()
         .rename("n_damaging").reset_index())
    t["share_of_all_damaging"] = t.n_damaging / len(sub)
    t = t.sort_values("n_damaging", ascending=False)
    t["cumulative_share"] = t.share_of_all_damaging.cumsum()
    # denominators: damage-coded reports in the same cell -> conditional damage rate
    coded = (df[df.damage_coded].groupby(["species_group", "season", "phase_group"]).size()
             .rename("n_damage_coded_cell"))
    t = t.merge(coded, on=["species_group", "season", "phase_group"], how="left")
    t["damage_rate_in_cell"] = t.n_damaging / t.n_damage_coded_cell
    unk = pd.DataFrame([dict(species_group="(species or phase not reported)", season="—",
                             phase_group="—", n_damaging=int((~known).sum()),
                             share_of_all_damaging=(~known).sum() / len(sub))])
    return pd.concat([t, unk], ignore_index=True)


def coverage(df):
    fields = {"Damage level": "DAMAGE_LEVEL", "Species identified (not 'Unknown bird')": None,
              "Size": "SIZE", "Phase of flight": "PHASE_OF_FLIGHT", "Height AGL": "HEIGHT",
              "Speed": "SPEED", "Time of day": "TIME_OF_DAY", "Effect on flight": "EFFECT",
              "Airport (not UNKNOWN)": None, "FAA region": "FAAREGION", "Repair cost": "COST_REPAIRS",
              "Airport latitude/longitude": "AIRPORT_LATITUDE"}
    rows = []
    for label, col in fields.items():
        if label.startswith("Species"):
            ok = ~df.is_unknown_taxon
        elif label.startswith("Airport (not"):
            ok = df.airport_id != "UNKNOWN"
        else:
            ok = df[col].notna()
        rows.append(dict(field=label, n_populated=int(ok.sum()), pct_populated=ok.mean(),
                         pct_populated_2016_2025=ok[(df.INCIDENT_YEAR >= 2016) & ~df.partial_year].mean()))
    return pd.DataFrame(rows)


def sensitivity(species):
    """Does dropping M? (undetermined) or using the FAA all-reports denominator reorder species?"""
    r = species[species.rankable].copy()
    r["rate_strict"] = r.n_damaging_strict / r.n_damage_coded
    out = dict(
        n_ranked_species=len(r),
        spearman_rate_vs_strict=r.damage_rate.corr(r.rate_strict, method="spearman"),
        spearman_rate_vs_all_reports=r.damage_rate.corr(r.damage_rate_all_reports, method="spearman"),
        spearman_frequency_vs_rate=r.n_reports.corr(r.damage_rate, method="spearman"),
    )
    return pd.DataFrame([out])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="data/raw/strikes.csv")
    ap.add_argument("--out", default="data/processed")
    ap.add_argument("--atads", default=None, help="optional ATADS CSV (LOC_ID, YEAR, TOTAL_OPS)")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    df = load_and_clean(a.raw)
    keep_cols = ["INDEX_NR", "INCIDENT_DATE", "INCIDENT_YEAR", "INCIDENT_MONTH", "partial_year", "hour",
                 "time_of_day", "season", "migration_window", "airport_id", "airport_name", "state",
                 "faa_region", "phase", "phase_group", "height_ft", "height_band", "SPECIES_ID",
                 "species_label", "family", "species_group", "id_level", "size", "damage_level",
                 "damage_status", "damage_coded", "is_damaging", "effect_status"]
    df[keep_cols].to_csv(os.path.join(a.out, "strikes_clean.csv.gz"), index=False, compression="gzip")

    sp = q23_species(df)
    tables = {
        "q1_annual.csv": q1_annual(df),
        "q2q3_species.csv": sp,
        "q2_family.csv": q2_family(df),
        "q2_group_by_region.csv": q2_family_region(df),
        "q4_components.csv": q4_components(df),
        "q6_month.csv": q6_month_tod(df)[0],
        "q6_month_time_of_day.csv": q6_month_tod(df)[1],
        "q8_combinations.csv": q8_combos(df),
        "coverage.csv": coverage(df),
        "sensitivity.csv": sensitivity(sp),
        "size_class.csv": rate_table(df, ["size"]),
        "damage_level_counts.csv": df.damage_level.value_counts().rename_axis("damage_level").reset_index(name="n"),
    }
    phase, height = q5_phase_height(df)
    tables["q5_phase.csv"] = phase
    tables["q5_phase_height.csv"] = height
    airports = q7_airports(df)
    if a.atads:
        airports = join_operations(airports, a.atads)
        airports["strikes_per_100k_ops"] = airports.n_reports_2016_2025 / airports.ops_2016_2025_atads * 1e5
    tables["q7_airports.csv"] = airports
    for name, t in tables.items():
        t.to_csv(os.path.join(a.out, name), index=False)
        print(f"{name:32s} {len(t):>6,} rows")


if __name__ == "__main__":
    main()
