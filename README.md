# Struck vs. Damaged

**What gets hit most is not what brings aircraft down:** 357,987 FAA wildlife strike reports, 1990–2026.

Team 10 (Flight Risk): Simranjeet Singh (xs2797), Astha Vairat (aav7237). CS-GY 6313 Information Visualization, NYU Tandon, Fall 2026.

We separate how often a species is struck (frequency) from how likely a reported strike is to damage the aircraft (severity). Across the 236 species with at least 30 damage-coded reports, the two rankings are uncorrelated (Spearman ρ = 0.00).

## Repository layout

```
pipeline/
  accdb_reader.py    # reads the FAA Access file (Public.accdb) -> CSV, pure Python, no installs
  build.py           # cleaning, derived fields, one processed table per view
  sample_tables.py   # prints the report's sample tables as Markdown
data/
  raw/               # NOT committed: put Public.accdb / strikes.csv here
  processed/         # committed: the per-view tables used by the visualizations
docs/
  sample_tables.md   # output of sample_tables.py (the tables in the M2 report)
sketches/            # hand-drawn sketches for Milestone 2
```

## How to run

Requires Python 3.9+ with pandas and numpy (`pip install -r requirements.txt`).

```bash
# 1. get the data (see "Data access" below), then:
python pipeline/accdb_reader.py data/raw/Public.accdb data/raw/strikes.csv   # ~40 s, 357,987 rows x 103 cols
#    (equivalent, if you have mdbtools: mdb-export data/raw/Public.accdb STRIKE_REPORTS > data/raw/strikes.csv)

# 2. build the processed tables (~30 s)
python pipeline/build.py --raw data/raw/strikes.csv --out data/processed

# 3. optional: add airport operations for View D (Q7)
python pipeline/build.py --atads data/raw/atads_2016_2025.csv

# 4. regenerate the report's sample tables
python pipeline/sample_tables.py > docs/sample_tables.md
```

## Processed tables → views → questions

| File | View | Question | Unit (one row =) |
| --- | --- | --- | --- |
| `q1_annual.csv` | B | Q1 | incident year |
| `q2q3_species.csv` | A | Q2, Q3 | species or group label (incl. "Unknown bird" variants) |
| `q2_family.csv` | A (family toggle) | Q2 | family (from hierarchical `SPECIES_ID`) |
| `q2_group_by_region.csv` | A (region filter) | Q2 | FAA region × species group |
| `q4_components.csv` | C | Q4 | aircraft component |
| `q5_phase.csv`, `q5_phase_height.csv` | C | Q5 | phase / phase group × FAA height band |
| `q6_month.csv`, `q6_month_time_of_day.csv` | C | Q6 | month / month × time of day |
| `q7_airports.csv` | D (stretch) | Q7 | airport (top 40 + UNKNOWN) |
| `q8_combinations.csv` | E | Q8 | species group × season × phase group |
| `coverage.csv`, `sensitivity.csv`, `size_class.csv`, `damage_level_counts.csv` | report | all | field / check |

Every rate table has `n_reports`, `n_damage_coded`, `n_damaging`, `pct_damage_coded`, `damage_rate` (damaging ÷ damage-coded), a Wilson 95% interval (`ci95_lo`, `ci95_hi`), and `damage_rate_all_reports` (the FAA annual-report convention, damaging ÷ all reports).

**Definitions.** We count a strike as damaging when `DAMAGE_LEVEL` ∈ {M, M?, S, D}, following the FAA. This flag agrees with the FAA's `INDICATED_DAMAGE` on all but 4 records. Blank damage levels are "Damage not coded" and are excluded from rate denominators, but always shown. 2026 is a partial year (`partial_year = True`).

## Data access

| Dataset | Access | Used for |
| --- | --- | --- |
| FAA National Wildlife Strike Database | <https://wildlife.faa.gov/> → *Download* → full database (`Public.accdb`, ~375 MB, inside `database.zip`). Our extract was refreshed October 2026. Save to `data/raw/`. Field definitions: <https://wildlife.faa.gov/assets/fieldlist.pdf> (also `read_me.xls` in the download). | All views |
| FAA ATADS airport operations | <https://aspm.faa.gov/opsnet/sys/main.asp> → *Airport Operations*. Select the 40 airports in `q7_airports.csv`, set calendar years 2016–2025, group by Facility and Date, then *Output → Excel*. Save as CSV with columns `LOC_ID, YEAR, TOTAL_OPS` to `data/raw/atads_2016_2025.csv`. Step-by-step guide: <https://faa.gov/newsroom/airport-operations-and-ranking-reports-using-air-traffic-activity-data-system-atads> | View D (Q7, stretch) |
| FAA annual report, *Wildlife Strikes to Civil Aircraft in the U.S., 1990–2025* | <https://www.faa.gov/airports/airport_safety/wildlife/arp-Wildlife-Strike-Report-1990-2025.pdf> | Definitions, benchmark figures |

The OurAirports coordinate join from Milestone 1 has been dropped: the descoped Q7 view has no map.

## Observable notebooks

None yet. If we use Observable for Milestone 3, each notebook URL (public or unlisted) will be listed here with its purpose.
