// Struck vs. Damaged - Milestone 3, Observable Notebooks 2.0 (plain JavaScript cells).
// Cell 1 is a Markdown cell; all others are JavaScript cells. Paste in order.

// ---- cell 1: Title (markdown cell)
# Struck vs. Damaged

**Team 10: Flight Risk** · Simranjeet Singh (xs2797) · Astha Vairat (aav7237)
CS-GY 6313 Information Visualization, NYU Tandon, Fall 2026 · Milestone 3: first D3 draft

Wildlife strikes are a growing aviation hazard. The FAA National Wildlife Strike Database holds 357,987 reports
filed between 1990 and October 2026, and the number filed each year is at a record high. Airports have limited
budgets for wildlife control, so knowing *what gets hit most* is less useful than knowing *what actually damages
aircraft*. This draft shows that these two rankings are close to unrelated, then breaks the gap down by
aircraft component, flight phase and height, season and time of day, and airport, and finally asks where
reported damaging strikes are concentrated.

**How to read the charts.**
- *Damage rate* = damaging strikes (FAA damage level M, M?, S or D) ÷ strikes whose damage level was recorded
  ("damage-coded"). Each rate is shown with a 95% Wilson confidence interval.
- Missing values are never dropped. "Not reported" rows, "Damage not coded" bars and "Unknown bird" markers stay
  on the charts, mostly with hatching or hollow marks.
- **Hover any bar, dot or cell** to see the exact counts, the denominator and the interval behind it.

**Changes since Milestone 2.**
- All views are now built in D3.
- The Q2 region filter became its own panel, so a region's species mix is readable.
- Cross-view linking (brushing species in View A to filter Views C and E) is moved to Milestone 4. The processed
  tables are aggregated separately for each view, so linking them needs one combined table of species group ×
  phase × season × month, which we will build next.
- Every view already has its own working controls.

Repository: https://github.com/simranmultani197/struck-vs-damaged · Milestone 2 record: https://github.com/simranmultani197/struck-vs-damaged/blob/main/milestones/milestone2.md

// ---- cell 2: Q1
{
  // Q1: controls re-draw the chart(s) in place
  const mode = Inputs.radio(new Map([["Counts", "count"], ["Share of reports", "share"]]), {label: "Y-axis", value: "count"});
  const out = document.createElement("div");
  const draw = () => out.replaceChildren(...[V.viewB(data.annual, {width, mode: mode.value})]);
  [mode].forEach(c => c.addEventListener("input", draw));
  draw();
  const head = document.createElement("div"); head.innerHTML = "<h2>Q1 · View B</h2>\n<p><strong>Question.</strong> How many wildlife strikes are reported each year, and how has that changed from 1990 to 2025?</p>";
  const foot = document.createElement("div"); foot.innerHTML = "<ul>\n<li>\n<p><strong>Top panel:</strong> stacked bars of reports per year, split into damaging (red), not damaging (blue) and\n  damage not coded (hatched).</p>\n</li>\n<li>\n<p><strong>Bottom panel:</strong> the damage rate per year with its 95% interval (red), plus the FAA's own convention of\n  damaging ÷ all reports (dashed).</p>\n</li>\n</ul>\n<p><strong>What it shows.</strong></p>\n<ul>\n<li><strong>Reports rose 11.5×</strong>, from 2,120 in 1990 to 24,457 in 2025, with a visible dip in 2020 (COVID traffic).</li>\n<li>\n<p><strong>The damage rate fell</strong> over the same period, from 21.8% to 5.6% (FAA convention: 17.5% to 3.7%).\n  The rise in volume is therefore not a rise in severity. It fits the FAA's reading that small, harmless strikes\n  are now reported far more often.</p>\n</li>\n<li>\n<p><strong>The hatched share grows over time.</strong> Damage was coded for 80% of reports in 1990 but only 51% in 2020 and\n  66% in 2025, which is why every later rate uses coded records as its denominator.</p>\n</li>\n<li>\n<p>2026 is drawn with a dashed outline and a hollow rate point because it is incomplete.</p>\n</li>\n</ul>\n<p><strong>Interaction:</strong> toggle the y-axis between counts and share of reports, and hover a year for all of its counts\nand rates.</p>\n<p><em>D3 code:</em> V.viewB in the <strong>D3 code</strong> cell at the end of this notebook.</p>";
  const controls = html`<div style="display:flex;flex-wrap:wrap;gap:4px 24px;margin:8px 0">${[mode]}</div>`;
  display(html`<div>${head}${controls}${out}${foot}</div>`);
}

// ---- cell 3: Q2–Q3
{
  // Q2–Q3: controls re-draw the chart(s) in place
  const level = Inputs.radio(["Species", "Family"], {label: "Level", value: "Species"});
  const facet = Inputs.toggle({label: "Facet by size", value: false});
  const highlight = Inputs.text({label: "Highlight", placeholder: "e.g. goose"});
  const region = Inputs.select([...new Set(data.byRegion.map(d => d.faa_region))], {label: "FAA region (bottom panel)", value: "AEA"});
  const out = document.createElement("div");
  const draw = () => out.replaceChildren(...[V.viewA(data.species, data.family, {width, level: level.value, facet: facet.value, highlight: highlight.value}), V.viewASlope(data.species, {width: Math.min(width, 640)}), V.viewARegion(data.byRegion, {width, region: region.value})]);
  [level, facet, highlight, region].forEach(c => c.addEventListener("input", draw));
  draw();
  const head = document.createElement("div"); head.innerHTML = "<h2>Q2–Q3 · View A</h2>\n<p><strong>Question.</strong> Which species are struck most often, which most often damage the aircraft when struck, and how different are the two rankings? Does the species mix differ across FAA regions?</p>";
  const foot = document.createElement("div"); foot.innerHTML = "<ul>\n<li>\n<p><strong>Main scatter:</strong> each of the 236 species with at least 30 damage-coded reports is one mark.</p>\n<ul>\n<li>x = how often it is struck (log scale); y = how often its strikes cause damage, with a 95% interval.</li>\n<li>Shape and color both show the bird's most frequently reported size.</li>\n<li>Hollow rings are the \"Unknown bird\" categories, shown for reference but not ranked.</li>\n</ul>\n</li>\n<li>\n<p><strong>Slope chart:</strong> re-ranks the 15 most-struck species by damage rate.</p>\n</li>\n<li><strong>Region panel:</strong> a selected FAA region's species-group mix, with each group's damage rate.</li>\n</ul>\n<p><strong>What it shows.</strong></p>\n<ul>\n<li>\n<p><strong>The two rankings are unrelated</strong> (Spearman ρ = 0.00).</p>\n<ul>\n<li>The most-struck birds sit bottom right: mourning dove (18,788 reports, 5.7% damaging) and barn swallow\n  (12,233 reports, 0.8%).</li>\n<li>The most damaging sit top left and centre: white-tailed deer (1,404 reports, 86.4%), black vulture (69.8%),\n  Canada goose (55.1%).</li>\n</ul>\n</li>\n<li>\n<p><strong>Bird size explains part of the gap but not all of it.</strong> Faceting by size shows that species within each size\n  class still spread widely.</p>\n</li>\n<li>\n<p><strong>In the slope chart only two of the 15 most-struck species rank in the top 50 by damage rate:</strong> Canada goose\n  (#13) and red-tailed hawk (#45). Barn swallow drops to #201.</p>\n</li>\n<li>\n<p><strong>The unknown rings matter.</strong> \"Unknown bird – medium\" (12.7% damaging) and \"– large\" (38.9%) together hold a\n  large share of damaging strikes that have no species attached.</p>\n</li>\n<li>\n<p><strong>In the region panel, waterfowl's share varies widely by region:</strong> 12.2% of Alaskan reports, but under 1% in\n  the Southern and Southwest regions. Their damage rate stays at 33–62% everywhere, so region changes the mix\n  more than the severity.</p>\n</li>\n</ul>\n<p><strong>Interaction:</strong></p>\n<ul>\n<li>Switch between species and family level.</li>\n<li>Facet by size.</li>\n<li>Type a name in <em>Highlight</em> to dim everything else.</li>\n<li>Hover for counts, intervals and both ranks.</li>\n<li>Pick a region in the region panel.</li>\n</ul>\n<p><em>D3 code:</em> V.viewA, V.viewASlope, V.viewARegion in the <strong>D3 code</strong> cell at the end of this notebook.</p>";
  const controls = html`<div style="display:flex;flex-wrap:wrap;gap:4px 24px;margin:8px 0">${[level, facet, highlight, region]}</div>`;
  display(html`<div>${head}${controls}${out}${foot}</div>`);
}

// ---- cell 4: Q4
{
  // Q4: controls re-draw the chart(s) in place
  const sortBy = Inputs.select(new Map([["Reports struck", "n_struck"], ["Damage rate", "component_damage_rate"]]), {label: "Sort by"});
  const out = document.createElement("div");
  const draw = () => out.replaceChildren(...[V.viewC1(data.components, {width, sortBy: sortBy.value})]);
  [sortBy].forEach(c => c.addEventListener("input", draw));
  draw();
  const head = document.createElement("div"); head.innerHTML = "<h2>Q4 · View C1</h2>\n<p><strong>Question.</strong> Which aircraft components are struck most often, and which strikes most often damage that component?</p>";
  const foot = document.createElement("div"); foot.innerHTML = "<ul>\n<li><strong>Left:</strong> reports in which each component was struck.</li>\n<li><strong>Right:</strong> the share of those strikes that damaged the component, with a 95% interval.</li>\n</ul>\n<p><strong>What it shows.</strong> The frequency–severity split repeats on the aircraft itself.</p>\n<ul>\n<li>\n<p><strong>Most struck, least damaged:</strong> the wing/rotor, windshield and nose are struck most (41,000–45,000 reports\n  each), yet are damaged in only 3.7–14.9% of those strikes.</p>\n</li>\n<li>\n<p><strong>Engines</strong> are struck less often (30,130 reports) but damaged 19.8% of the time; the tail 28.9%.</p>\n</li>\n<li><strong>Lights</strong> show 63.9%, probably because a light strike is mostly reported when the light breaks.</li>\n<li><strong>109,403 reports flag no component.</strong> They are stated in the subtitle because they have no rate to plot.</li>\n</ul>\n<p><strong>Interaction:</strong> sort by reports struck or by damage rate; hover for the part-level and whole-aircraft damage\nrates.</p>\n<p><em>D3 code:</em> V.viewC1 in the <strong>D3 code</strong> cell at the end of this notebook.</p>";
  const controls = html`<div style="display:flex;flex-wrap:wrap;gap:4px 24px;margin:8px 0">${[sortBy]}</div>`;
  display(html`<div>${head}${controls}${out}${foot}</div>`);
}

// ---- cell 5: Q5
{
  // Q5: controls re-draw the chart(s) in place
  const group = Inputs.select(["Departure", "Arrival", "En route", "Local"], {label: "Phase group (height profile)"});
  const out = document.createElement("div");
  const draw = () => out.replaceChildren(...[V.viewC2(data.phase, data.phaseHeight, {width, group: group.value})]);
  [group].forEach(c => c.addEventListener("input", draw));
  draw();
  const head = document.createElement("div"); head.innerHTML = "<h2>Q5 · View C2</h2>\n<p><strong>Question.</strong> In which phase of flight and at what height do strikes occur, and how does the damage rate change across them?</p>";
  const foot = document.createElement("div"); foot.innerHTML = "<ul>\n<li><strong>Top:</strong> every phase of flight, with bars for reports and dots for damage rate.</li>\n<li><strong>Bottom:</strong> the FAA height bands for a selected phase group, drawn ground-up like an altitude profile, with a\n  500 ft reference line.</li>\n</ul>\n<p><strong>What it shows.</strong></p>\n<ul>\n<li>\n<p><strong>Approach</strong> has by far the most reports (91,534) but a 9.0% damage rate. <strong>En route</strong> strikes are rare\n  (6,457) but damaging 30.3% of the time. Climb (16.0%) is clearly worse than the take-off run (9.5%).</p>\n</li>\n<li>\n<p><strong>Damage rises with height.</strong> On departure the rate climbs from 9.5% on the ground to 23.8% at 501–1,500 ft.\n  On arrival it rises from 6.1% to about 11–12% above 500 ft. This matches the FAA's finding that strikes above\n  500 ft are more often damaging.</p>\n</li>\n<li>\n<p><strong>The hatched \"Not reported\" phase is the largest single row</strong> (141,726 reports), and only 28% of it is\n  damage-coded.</p>\n</li>\n</ul>\n<p><strong>Interaction:</strong> choose the phase group (departure, arrival, en route, local) for the height profile; hover any\nrow for counts and intervals.</p>\n<p><em>D3 code:</em> V.viewC2 in the <strong>D3 code</strong> cell at the end of this notebook.</p>";
  const controls = html`<div style="display:flex;flex-wrap:wrap;gap:4px 24px;margin:8px 0">${[group]}</div>`;
  display(html`<div>${head}${controls}${out}${foot}</div>`);
}

// ---- cell 6: Q6
{
  // Q6: controls re-draw the chart(s) in place
  const metric = Inputs.select(new Map([["Damage rate", "damage_rate"], ["Reports", "n_reports"]]), {label: "Heatmap shows"});
  const out = document.createElement("div");
  const draw = () => out.replaceChildren(...[V.viewC3(data.month, data.monthTod, {width, metric: metric.value})]);
  [metric].forEach(c => c.addEventListener("input", draw));
  draw();
  const head = document.createElement("div"); head.innerHTML = "<h2>Q6 · View C3</h2>\n<p><strong>Question.</strong> What is the seasonal and time-of-day signature of strikes, and does it line up with migration?</p>";
  const foot = document.createElement("div"); foot.innerHTML = "<ul>\n<li>\n<p><strong>Top:</strong> reports per month (bars) and damage rate per month (line with a 95% band), with the\n  spring and fall migration windows shaded.</p>\n</li>\n<li>\n<p><strong>Bottom:</strong> a month × light-condition heatmap. The \"Not reported\" row is outlined, and cells with fewer than 30\n  coded reports are greyed out.</p>\n</li>\n</ul>\n<p><strong>What it shows.</strong></p>\n<ul>\n<li>\n<p><strong>Peak volume and peak damage fall in different seasons.</strong> Reports peak July–September (about\n  46,000–49,000 a month) when the damage rate is lowest (6–8%). The damage rate peaks December–March (16–17%)\n  when reports are fewest.</p>\n</li>\n<li>\n<p><strong>Fall migration sees severity rise</strong> toward November (15%).</p>\n</li>\n<li>\n<p><strong>The heatmap points to winter nights:</strong> December night strikes are damaging 24.5% of the time and January\n  nights 20.8%. November dusk is also high (20.9%).</p>\n</li>\n<li>\n<p><strong>Our reading is that this is a change in species mix</strong> (fewer small birds, more waterfowl and deer), which\n  linked filtering will test in Milestone 4.</p>\n</li>\n</ul>\n<p><strong>Interaction:</strong> switch the heatmap between damage rate and report counts; hover any month or cell.</p>\n<p><em>D3 code:</em> V.viewC3 in the <strong>D3 code</strong> cell at the end of this notebook.</p>";
  const controls = html`<div style="display:flex;flex-wrap:wrap;gap:4px 24px;margin:8px 0">${[metric]}</div>`;
  display(html`<div>${head}${controls}${out}${foot}</div>`);
}

// ---- cell 7: Q7
{
  // Q7: controls re-draw the chart(s) in place
  const sortBy = Inputs.select(new Map([["Reports", "n_reports"], ["% damage-coded", "pct_damage_coded"], ["Damage rate", "damage_rate"]]), {label: "Sort by"});
  const out = document.createElement("div");
  const draw = () => out.replaceChildren(...[V.viewD(data.airports, {width, sortBy: sortBy.value})]);
  [sortBy].forEach(c => c.addEventListener("input", draw));
  draw();
  const head = document.createElement("div"); head.innerHTML = "<h2>Q7 · View D</h2>\n<p><strong>Question.</strong> (Stretch) Which airports have the most reports, and how much of that reflects reporting practice rather than hazard?</p>";
  const foot = document.createElement("div"); foot.innerHTML = "<ul>\n<li>The 40 airports with the most reports, as bars.</li>\n<li>The share of each airport's reports that are damage-coded, as rings.</li>\n<li>The \"UNKNOWN\" airport, stated above the chart and not ranked.</li>\n</ul>\n<p><strong>What it shows.</strong></p>\n<ul>\n<li><strong>Denver has the most reports (12,030), but only 43% are damage-coded.</strong></li>\n<li>\n<p><strong>Coding completeness ranges from 26% (Teterboro) to 87% (Sacramento).</strong> Raw counts therefore largely measure\n  how thoroughly an airport reports.</p>\n</li>\n<li>\n<p><strong>48,465 reports (13.5%) have no airport at all.</strong></p>\n</li>\n<li><strong>This is the fallback version.</strong> The FAA ATADS operations join, which would turn counts into strikes per\n  100,000 operations, is still pending, so the chart makes no safety ranking.</li>\n</ul>\n<p><strong>Interaction:</strong> sort by reports, % damage-coded or damage rate; hover for details.</p>\n<p><em>D3 code:</em> V.viewD in the <strong>D3 code</strong> cell at the end of this notebook.</p>";
  const controls = html`<div style="display:flex;flex-wrap:wrap;gap:4px 24px;margin:8px 0">${[sortBy]}</div>`;
  display(html`<div>${head}${controls}${out}${foot}</div>`);
}

// ---- cell 8: Q8
{
  // Q8: controls re-draw the chart(s) in place
  const season = Inputs.select(["All", "Winter", "Spring", "Summer", "Fall"], {label: "Season"});
  const phaseGroup = Inputs.select(["All", "Arrival", "Departure", "En route", "Local", "Ground"], {label: "Phase group"});
  const out = document.createElement("div");
  const draw = () => out.replaceChildren(...[V.viewE(data.combos, {width, season: season.value, phaseGroup: phaseGroup.value})]);
  [season, phaseGroup].forEach(c => c.addEventListener("input", draw));
  draw();
  const head = document.createElement("div"); head.innerHTML = "<h2>Q8 · View E</h2>\n<p><strong>Question.</strong> Taken together, which combinations of species group, season and flight phase account for the largest share of reported damaging strikes?</p>";
  const foot = document.createElement("div"); foot.innerHTML = "<ul>\n<li>\n<p><strong>Ranked bars:</strong> the top 15 species-group × season × phase cells, as a share of all 22,290 damaging\n  strikes, with the running cumulative share.</p>\n</li>\n<li>\n<p><strong>Dots:</strong> the damage rate inside each cell (dot area ∝ coded reports), so common-and-mild cells can be told\n  apart from rare-and-severe ones.</p>\n</li>\n<li>\n<p><strong>Bottom bar:</strong> all damaging strikes split into the top cells, the other known cells, and the block with no\n  species or phase.</p>\n</li>\n</ul>\n<p><strong>What it shows.</strong></p>\n<ul>\n<li><strong>Waterfowl on arrival lead</strong> in fall, winter and spring.</li>\n<li><strong>Raptors and vultures</strong> appear in almost every season, at lower damage rates (17–37%).</li>\n<li><strong>Arrival cells account for 28.7% of all damaging strikes</strong> and departure cells 20.3%.</li>\n<li><strong>The top 15 cells hold only 23.4%.</strong></li>\n<li><strong>The largest block, 46.3%, has no species or no phase reported.</strong> That limits any recommendation, so the\n  caption keeps the claim to <em>reported</em> damaging strikes.</li>\n</ul>\n<p><strong>Interaction:</strong> filter by season and phase group, and the ranking and the 100% bar recompute; hover for counts\nand in-cell rates.</p>\n<p><em>D3 code:</em> V.viewE in the <strong>D3 code</strong> cell at the end of this notebook.</p>";
  const controls = html`<div style="display:flex;flex-wrap:wrap;gap:4px 24px;margin:8px 0">${[season, phaseGroup]}</div>`;
  display(html`<div>${head}${controls}${out}${foot}</div>`);
}

// ---- cell 9: Next steps
{
  const el = document.createElement("div");
  el.innerHTML = "<p><strong>Next (Milestone 4).</strong></p>\n<ul>\n<li>Build the linked filter state (species ↔ phase ↔ season) on a combined aggregate table.</li>\n<li>Add a Pareto line to View E.</li>\n<li>Join the ATADS operations for View D.</li>\n<li>Polish layout, color and annotations, and write the narrative article.</li>\n</ul>";
  display(el);
}

// ---- cell 10: AI-use statement
{
  const el = document.createElement("div");
  el.innerHTML = "<h2>AI-use statement</h2>\n<p><strong>Tools.</strong> Claude (Anthropic), the Claude Opus model, used through the Claude desktop app (Cowork mode). No other\nAI tools were used for this milestone.</p>\n<p><strong>Where we used AI.</strong></p>\n<ol>\n<li>\n<p><em>Coding.</em> From our Milestone 2 sketch specifications, Claude generated the first version of all D3 view code:</p>\n<ul>\n<li><code>milestone3/views.js</code></li>\n<li>the local preview page <code>milestone3/index.html</code></li>\n<li>the notebook build script, and the Observable cell file it produces.</li>\n</ul>\n<p>We specified each view (encodings, interactions, missing-data handling), ran the code, reviewed the output,\n and asked for fixes where labels overlapped or encodings were unclear.</p>\n</li>\n<li>\n<p><em>Writing.</em> Claude drafted the per-question descriptions in this write-up from the processed tables. We checked\n   every number against <code>data/processed/*.csv</code> and edited the wording.</p>\n</li>\n<li>\n<p><em>Earlier milestones.</em> We used AI to brainstorm project ideas, review the proposal and the instructor feedback,\n   check FAA definitions, draft parts of the data pipeline and report text, debug code, and draft README sections.</p>\n</li>\n</ol>\n<p><strong>What is our own work.</strong></p>\n<ul>\n<li>\n<p>The project question and the analysis decisions: denominators, the damaging-strike definition, handling of\n  missing data, descoping.</p>\n</li>\n<li>\n<p>The data pipeline design and its outputs.</p>\n</li>\n<li>The choice of views and interactions.</li>\n<li>Testing and verification of the visualizations.</li>\n</ul>\n<p>In this milestone most of the D3 code was AI-generated from our specifications, and the review, testing and\ndecisions were ours.</p>\n<p><strong>Verification.</strong> Every figure quoted here can be reproduced from the CSVs in <code>data/processed/</code>, which are produced\nby <code>pipeline/build.py</code> from the FAA download.</p>";
  display(el);
}

// ---- cell 11: Data
const data = await (async () => {
  // Processed tables, read straight from the public GitHub repository (no file uploads needed)
  const base = "https://raw.githubusercontent.com/simranmultani197/struck-vs-damaged/main/data/processed/";
  const files = {
  "annual": "q1_annual.csv",
  "species": "q2q3_species.csv",
  "family": "q2_family.csv",
  "byRegion": "q2_group_by_region.csv",
  "components": "q4_components.csv",
  "phase": "q5_phase.csv",
  "phaseHeight": "q5_phase_height.csv",
  "month": "q6_month.csv",
  "monthTod": "q6_month_time_of_day.csv",
  "airports": "q7_airports.csv",
  "combos": "q8_combinations.csv"
};
  const tables = await Promise.all(Object.entries(files).map(async ([k, f]) => [k, await d3.csv(base + f, d3.autoType)]));
  return Object.fromEntries(tables);
})();

// ---- cell 12: D3 code
const V = (() => {
  // ===== D3 code for every view (same as milestone3/views.js in the repository) =====
  // Struck vs. Damaged — Milestone 3 D3 views.
  // Every view is a plain function: viewX(data, options) -> DOM node (an <svg> or <div>).
  // The same functions are pasted into the Observable notebook (see observable/cells.js)
  // and used by the local page (index.html). Requires d3 v7 as a global `d3`.

  // ------------------------------------------------------------------ shared helpers
  const SIZE_STYLE = {
    Small: {color: "#4e79a7", symbol: d3.symbolCircle},
    Medium: {color: "#f28e2b", symbol: d3.symbolTriangle},
    Large: {color: "#59a14f", symbol: d3.symbolSquare},
    "Not reported": {color: "#9c9c9c", symbol: d3.symbolDiamond}
  };
  const C = {damaging: "#e15759", notDamaging: "#4e79a7", notCoded: "#d9d9d9", rate: "#e15759", count: "#4e79a7",
             grey: "#9c9c9c", ink: "#333"};
  const pct = d3.format(".1%");
  const pct0 = d3.format(".0%");
  const num = d3.format(",");
  const si = d3.format("~s");
  const UNK_LABEL = d => d.species_label === "Unknown bird" ? "Unknown (unsized)" : d.species_label.replace("Unknown bird - ", "Unknown – ").replace("Unknown bird or bat", "Unknown bird or bat");
  const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

  function hatch(svg, color = "#999") {
    const id = uid("hatch");
    svg.append("defs").append("pattern").attr("id", id).attr("patternUnits", "userSpaceOnUse")
      .attr("width", 6).attr("height", 6).attr("patternTransform", "rotate(45)")
      .call(p => p.append("rect").attr("width", 6).attr("height", 6).attr("fill", "#f2f2f2"))
      .call(p => p.append("line").attr("y2", 6).attr("stroke", color).attr("stroke-width", 2));
    return `url(#${id})`;
  }

  function title(svg, t, sub, x = 0) {
    svg.append("text").attr("x", x).attr("y", 16).attr("font-weight", 700).attr("font-size", 15).text(t);
    if (sub) svg.append("text").attr("x", x).attr("y", 34).attr("font-size", 11.5).attr("fill", "#555").text(sub);
  }

  function base(width, height) {
    return d3.create("svg").attr("viewBox", [0, 0, width, height]).attr("width", width)
      .attr("style", "max-width:100%;height:auto;font:11px system-ui,sans-serif;background:white");
  }

  // Adds a native SVG tooltip (<title>) to every element in a selection
  function tip(sel, f) { sel.append("title").text(f); }

  const rateTip = d => `${num(d.n_reports)} reports · ${num(d.n_damage_coded)} damage-coded (${pct0(d.pct_damage_coded)})\n` +
    `${num(d.n_damaging)} damaging → damage rate ${pct(d.damage_rate)} (95% CI ${pct(d.ci95_lo)}–${pct(d.ci95_hi)})`;

  // ------------------------------------------------------------------ View B · Q1
  // Reports per year by damage status (stacked) + damage rate with 95% CI.
  function viewB(annual, {width = 900, mode = "count"} = {}) {
    width = Math.max(width, 820);   // narrow screens: draw at a readable size, the SVG then scales down
    const data = annual.map(d => ({...d, partial: String(d.partial_year) === "True" || d.partial_year === true}));
    const H = 560, m = {l: 64, r: 24}, top = {t: 70, h: 300}, bot = {t: 420, h: 110};
    const svg = base(width, H);
    title(svg, "B · Reports keep rising; the share that damages aircraft does not",
      "FAA wildlife strike reports per year, 1990–2026 · 2026 is partial (through Oct, validated to late Aug)");
    const fill = {damaging: C.damaging, not_damaging: C.notDamaging, not_coded: hatch(svg)};
    const keys = ["damaging", "not_damaging", "not_coded"];
    const val = (d, k) => ({damaging: d.n_status_damaging, not_damaging: d.n_status_not_damaging, not_coded: d.n_status_not_coded})[k];
    const series = d3.stack().keys(keys).value((d, k) => mode === "share" ? val(d, k) / d.n_reports : val(d, k))(data);
    const x = d3.scaleBand(data.map(d => d.year), [m.l, width - m.r]).padding(0.15);
    const y = d3.scaleLinear([0, mode === "share" ? 1 : d3.max(data, d => d.n_reports) * 1.08], [top.t + top.h, top.t]);
    svg.append("g").selectAll("g").data(series).join("g").attr("fill", s => fill[s.key])
      .selectAll("rect").data(s => s).join("rect")
      .attr("x", d => x(d.data.year)).attr("width", x.bandwidth())
      .attr("y", d => y(d[1])).attr("height", d => y(d[0]) - y(d[1]))
      .attr("stroke", d => d.data.partial ? "#000" : null).attr("stroke-dasharray", "3,2");
    svg.append("g").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(mode === "share" ? pct0 : si)).call(g => g.select(".domain").remove());
    svg.append("text").attr("x", 12).attr("y", top.t + top.h / 2).attr("transform", `rotate(-90,12,${top.t + top.h / 2})`)
      .attr("text-anchor", "middle").text(mode === "share" ? "Share of reports" : "Reports per year");
    // annotations (count mode only)
    if (mode === "count") {
      const ann = [[2009, "2009: US Airways 1549; database opened to the public"], [2020, "2020: COVID traffic drop"]];
      for (const [yr, t] of ann) {
        const d = data.find(e => e.year === yr);
        const cx = x(yr) + x.bandwidth() / 2, cy = y(d.n_reports);
        svg.append("line").attr("x1", cx).attr("x2", cx).attr("y1", cy - 4).attr("y2", cy - 40).attr("stroke", "#777");
        svg.append("text").attr("x", cx).attr("y", cy - 44).attr("text-anchor", "middle").attr("font-size", 10).text(t);
      }
      const p = data.find(d => d.partial);
      const px = x(p.year) + x.bandwidth() / 2, py = y(p.n_reports) - 6;
      svg.append("text").attr("transform", `translate(${px + 3},${py}) rotate(-90)`).attr("font-size", 10).text("2026 partial");
    }
    // legend
    const lg = svg.append("g").attr("transform", `translate(${m.l + 8},${top.t + 4})`);
    [["Damaging (M, M?, S, D)", fill.damaging], ["Not damaging (N)", fill.not_damaging],
     ["Damage not coded (blank)", fill.not_coded]].forEach(([t, f], i) => {
      lg.append("rect").attr("y", i * 16).attr("width", 12).attr("height", 12).attr("fill", f).attr("stroke", "#999");
      lg.append("text").attr("x", 18).attr("y", i * 16 + 10).text(t);
    });
    // bottom: damage rate
    const yr = d3.scaleLinear([0, 0.25], [bot.t + bot.h, bot.t]);
    const full = data.filter(d => !d.partial);
    const xc = d => x(d.year) + x.bandwidth() / 2;
    svg.append("path").datum(full).attr("fill", C.rate).attr("opacity", 0.18)
      .attr("d", d3.area().x(xc).y0(d => yr(d.ci95_lo)).y1(d => yr(d.ci95_hi)));
    svg.append("path").datum(full).attr("fill", "none").attr("stroke", C.rate).attr("stroke-width", 2)
      .attr("d", d3.line().x(xc).y(d => yr(d.damage_rate)));
    svg.append("path").datum(full).attr("fill", "none").attr("stroke", "#555").attr("stroke-dasharray", "5,4")
      .attr("d", d3.line().x(xc).y(d => yr(d.damage_rate_all_reports)));
    const p = data.find(d => d.partial);
    svg.append("circle").attr("cx", xc(p)).attr("cy", yr(p.damage_rate)).attr("r", 4).attr("fill", "white").attr("stroke", C.rate);
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(yr).ticks(4).tickFormat(pct0))
      .call(g => g.select(".domain").remove());
    svg.append("g").attr("transform", `translate(0,${bot.t + bot.h})`)
      .call(d3.axisBottom(x).tickValues(x.domain().filter(y => y % 5 === 0)));
    svg.append("text").attr("x", 12).attr("y", bot.t + bot.h / 2).attr("transform", `rotate(-90,12,${bot.t + bot.h / 2})`)
      .attr("text-anchor", "middle").text("Damage rate");
    const l2 = svg.append("g").attr("transform", `translate(${width - 330},${bot.t})`);
    l2.append("line").attr("x2", 22).attr("stroke", C.rate).attr("stroke-width", 2);
    l2.append("text").attr("x", 28).attr("y", 4).text("damaging ÷ damage-coded, 95% CI (ours)");
    l2.append("line").attr("y1", 16).attr("y2", 16).attr("x2", 22).attr("stroke", "#555").attr("stroke-dasharray", "5,4");
    l2.append("text").attr("x", 28).attr("y", 20).text("damaging ÷ all reports (FAA convention)");
    // hover: one transparent column per year with a full tooltip
    const hover = svg.append("g");
    hover.selectAll("rect").data(data).join("rect")
      .attr("x", d => x(d.year)).attr("width", x.bandwidth()).attr("y", top.t).attr("height", bot.t + bot.h - top.t)
      .attr("fill", "transparent")
      .on("mouseenter", function () { d3.select(this).attr("fill", "rgba(0,0,0,0.06)"); })
      .on("mouseleave", function () { d3.select(this).attr("fill", "transparent"); })
      .call(tip, d => `${d.year}${d.partial ? " (partial)" : ""}\n${num(d.n_reports)} reports\n` +
        `${num(d.n_status_damaging)} damaging · ${num(d.n_status_not_damaging)} not damaging · ${num(d.n_status_not_coded)} not coded\n` +
        `damage rate ${pct(d.damage_rate)} (95% CI ${pct(d.ci95_lo)}–${pct(d.ci95_hi)}) · FAA convention ${pct(d.damage_rate_all_reports)}`);
    return svg.node();
  }

  // ------------------------------------------------------------------ View A · Q2, Q3
  // Frequency (x, log) vs damage rate (y) per species or family, with CI, size encoding,
  // "Unknown bird" reference rings, optional facets by size, and a search highlight.
  function viewA(species, family, {width = 900, level = "Species", facet = false, highlight = ""} = {}) {
    width = Math.max(width, 820);   // narrow screens: draw at a readable size, the SVG then scales down
    const isSp = level === "Species";
    const pts = isSp ? species.filter(d => String(d.rankable) === "True" || d.rankable === true)
                     : family.filter(d => d.family_code !== "UNK" && d.n_damage_coded >= 30);
    const unk = isSp ? species.filter(d => d.id_level === "Unknown") : [];
    const sizeOf = d => isSp ? (SIZE_STYLE[d.modal_size] ? d.modal_size : "Not reported") : "Not reported";
    const name = d => isSp ? d.species_label : d.family;
    const panels = facet && isSp ? ["Small", "Medium", "Large"] : ["All"];
    const gap = 24, m = {l: 58, r: 16, t: 92, b: 46}, H = facet && isSp ? 420 : 520;
    const pw = (width - m.l - m.r - gap * (panels.length - 1)) / panels.length;
    const svg = base(width, H);
    title(svg, `A · What gets hit most is not what does damage (${level.toLowerCase()} level)`,
      `${pts.length} ${isSp ? "species" : "families"} with ≥30 damage-coded reports · x = how often struck, y = how often damaging · ` +
      `Spearman ρ(frequency, rate) = 0.00 across 236 species`);
    const x = d3.scaleLog([25, 250000], [0, pw]).clamp(true);
    const y = d3.scaleLinear([0, 1], [H - m.b, m.t]);
    const xmed = d3.median(pts, d => d.n_reports), ymed = d3.median(pts, d => d.damage_rate);
    const q = highlight.trim().toLowerCase();
    // legend
    const lg = svg.append("g").attr("transform", `translate(${m.l},${56})`);
    const legendItems = isSp ? ["Small", "Medium", "Large"] : ["Not reported"];
    legendItems.forEach((s, i) => {
      lg.append("path").attr("transform", `translate(${i * 150 + 6},0)`)
        .attr("d", d3.symbol(SIZE_STYLE[s].symbol, 60)()).attr("fill", isSp ? SIZE_STYLE[s].color : "#76b7b2");
      lg.append("text").attr("x", i * 150 + 16).attr("y", 4).text(isSp ? `${s} (modal size)` : "family");
    });
    if (isSp) {
      lg.append("circle").attr("cx", 3 * 150 + 6).attr("r", 6).attr("fill", "none").attr("stroke", "#000");
      lg.append("text").attr("x", 3 * 150 + 16).attr("y", 4).text("Unknown bird (reference, not ranked)");
    }
    panels.forEach((panel, i) => {
      const g = svg.append("g").attr("transform", `translate(${m.l + i * (pw + gap)},0)`);
      const inP = d => panel === "All" || sizeOf(d) === panel;
      if (panel !== "All") g.append("text").attr("x", pw / 2).attr("y", m.t - 8).attr("text-anchor", "middle")
        .attr("font-weight", 700).attr("fill", SIZE_STYLE[panel].color).text(`${panel} birds`);
      g.append("g").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5, "~s"));
      g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(pct0)).call(a => i > 0 && a.selectAll("text").remove());
      g.append("line").attr("x1", x(xmed)).attr("x2", x(xmed)).attr("y1", m.t).attr("y2", H - m.b).attr("stroke", "#bbb").attr("stroke-dasharray", "2,3");
      g.append("line").attr("x1", 0).attr("x2", pw).attr("y1", y(ymed)).attr("y2", y(ymed)).attr("stroke", "#bbb").attr("stroke-dasharray", "2,3");
      g.append("text").attr("x", 4).attr("y", m.t + 10).attr("fill", "#777").attr("font-style", "italic").text("rare but damaging");
      g.append("text").attr("x", pw - 4).attr("y", y(0.2)).attr("text-anchor", "end").attr("fill", "#777").attr("font-style", "italic").text("common, rarely damaging ↓");
      // context points from other panels in grey
      const ctx = pts.filter(d => !inP(d));
      g.append("g").selectAll("circle").data(ctx).join("circle").attr("cx", d => x(d.n_reports)).attr("cy", d => y(d.damage_rate))
        .attr("r", 2).attr("fill", "#ddd");
      const P = pts.filter(inP);
      const dots = g.append("g").selectAll("g").data(P).join("g")
        .attr("transform", d => `translate(${x(d.n_reports)},${y(d.damage_rate)})`)
        .attr("opacity", d => !q || name(d).toLowerCase().includes(q) ? 1 : 0.12);
      dots.append("line").attr("y1", d => y(d.ci95_lo) - y(d.damage_rate)).attr("y2", d => y(d.ci95_hi) - y(d.damage_rate))
        .attr("stroke", d => isSp ? SIZE_STYLE[sizeOf(d)].color : "#76b7b2").attr("opacity", 0.35);
      dots.append("path").attr("d", d => d3.symbol(SIZE_STYLE[sizeOf(d)].symbol, 40)())
        .attr("fill", d => isSp ? SIZE_STYLE[sizeOf(d)].color : "#76b7b2").attr("stroke", "white").attr("stroke-width", 0.6);
      dots.call(tip, d => `${name(d)}${isSp ? ` (${d.family}, modal size ${d.modal_size})` : ` (${d.species_group})`}\n` + rateTip(d) +
        (isSp ? `\nfrequency rank ${d.frequency_rank} · damage-rate rank ${d.damage_rate_rank} of 236` : ""));
      dots.on("mouseenter", function () { d3.select(this).raise().select("path").attr("stroke", "#000").attr("stroke-width", 1.5); })
          .on("mouseleave", function () { d3.select(this).select("path").attr("stroke", "white").attr("stroke-width", 0.6); });
      // labels: searched items, or a fixed set of anchors
      const anchors = isSp ? ["White-tailed deer", "Canada goose", "Black vulture", "Turkey vulture", "Red-tailed hawk",
        "Mourning dove", "Barn swallow", "Killdeer", "Snow goose", "Rock pigeon"] : [];
      const lab = P.filter(d => q ? name(d).toLowerCase().includes(q) : (isSp ? anchors.includes(name(d)) :
        ((d.damage_rate > 0.45 && d.n_reports > 1000) || d.n_reports > 20000)));
      g.append("g").selectAll("text").data(lab.slice(0, 15)).join("text")
        .attr("x", d => x(d.n_reports) + 6).attr("y", d => y(d.damage_rate) - 4).attr("font-size", 10).text(name);
      // unknown reference rings
      const U = unk.filter(d => panel === "All" || d.modal_size === panel);
      g.append("g").selectAll("g").data(U).join("g").attr("transform", d => `translate(${x(d.n_reports)},${y(d.damage_rate)})`)
        .call(s => s.append("circle").attr("r", 6).attr("fill", "white").attr("stroke", "#000"))
        .call(s => s.append("text").attr("font-size", 9.5).attr("font-style", "italic")
          .attr("x", d => /small|unsized|bat/.test(UNK_LABEL(d)) ? 9 : -9).attr("y", d => /unsized/.test(UNK_LABEL(d)) ? -6 : /small/.test(UNK_LABEL(d)) ? 10 : -8)
          .attr("text-anchor", d => /small|unsized|bat/.test(UNK_LABEL(d)) ? "start" : "end").text(UNK_LABEL))
        .call(tip, d => `${d.species_label} (not ranked)\n` + rateTip(d));
      g.append("text").attr("x", pw / 2).attr("y", H - 10).attr("text-anchor", "middle").text("Reported strikes, 1990–2026 (log scale)");
    });
    svg.append("text").attr("x", 14).attr("y", (m.t + H - m.b) / 2).attr("text-anchor", "middle")
      .attr("transform", `rotate(-90,14,${(m.t + H - m.b) / 2})`).text("Damage rate among damage-coded reports");
    return svg.node();
  }

  // Companion: frequency rank vs damage-rate rank for the 15 most-struck ranked species.
  function viewASlope(species, {width = 420} = {}) {
    width = Math.max(width, 600);   // narrow screens: draw at a readable size, the SVG then scales down
    const top = species.filter(d => String(d.rankable) === "True" || d.rankable === true)
      .sort((a, b) => a.frequency_rank - b.frequency_rank).slice(0, 15);
    const H = 470, m = {t: 70, b: 30}, xL = 150, xR = width - 170;
    const svg = base(width, H);
    title(svg, "A · Re-ranking", "15 most-struck species: rank by frequency → rank by damage rate (of 236)");
    const yL = d3.scaleLinear([1, 15], [m.t, H - m.b]);
    const yR = d3.scaleLinear([1, 236], [m.t, H - m.b]);
    const g = svg.append("g").selectAll("g").data(top).join("g").call(tip, d => `${d.species_label}: #${d.frequency_rank} by frequency, ` +
      `#${d.damage_rate_rank} by damage rate (${pct(d.damage_rate)})`);
    g.append("line").attr("x1", xL).attr("x2", xR).attr("y1", d => yL(d.frequency_rank)).attr("y2", d => yR(d.damage_rate_rank))
      .attr("stroke", d => (SIZE_STYLE[d.modal_size] || SIZE_STYLE["Not reported"]).color).attr("stroke-width", 1.6);
    g.append("text").attr("x", xL - 6).attr("y", d => yL(d.frequency_rank) + 3).attr("text-anchor", "end")
      .text(d => `#${d.frequency_rank} ${d.species_label}`);
    // dodge right-hand labels so close ranks do not overlap
    const ry = new Map(); let last = -Infinity;
    top.slice().sort((a, b) => a.damage_rate_rank - b.damage_rate_rank).forEach(d => {
      const v = Math.max(yR(d.damage_rate_rank), last + 12); ry.set(d, v); last = v; });
    g.append("text").attr("x", xR + 6).attr("y", d => ry.get(d) + 3).text(d => `#${d.damage_rate_rank} ${d.species_label}`).attr("font-size", 10);
    g.on("mouseenter", function () { d3.select(this).select("line").attr("stroke-width", 4); })
     .on("mouseleave", function () { d3.select(this).select("line").attr("stroke-width", 1.6); });
    svg.append("text").attr("x", xL).attr("y", m.t - 14).attr("text-anchor", "middle").attr("font-weight", 700).text("by frequency");
    svg.append("text").attr("x", xR).attr("y", m.t - 14).attr("text-anchor", "middle").attr("font-weight", 700).text("by damage rate");
    return svg.node();
  }

  // Q2 region mix: species-group share within one FAA region, with damage rate.
  function viewARegion(byRegion, {width = 900, region = "AEA"} = {}) {
    width = Math.max(width, 820);   // narrow screens: draw at a readable size, the SVG then scales down
    const rows = byRegion.filter(d => d.faa_region === region).sort((a, b) => b.share_within_region - a.share_within_region);
    const H = 70 + rows.length * 22 + 40, m = {l: 190, t: 70}, mid = m.l + (width - m.l) * 0.55;
    const svg = base(width, H);
    title(svg, `A · Species-group mix in FAA region ${region}`,
      `${num(rows[0] ? rows[0].region_reports : 0)} reports in this region · bars = share of the region's reports · dot = damage rate with 95% CI`);
    const y = d3.scaleBand(rows.map(d => d.species_group), [m.t, H - 40]).padding(0.2);
    const x = d3.scaleLinear([0, d3.max(rows, d => d.share_within_region) || 1], [m.l, mid - 130]);
    const xr = d3.scaleLinear([0, 1], [mid, width - 20]);
    const unkFill = hatch(svg);
    svg.append("g").selectAll("rect").data(rows).join("rect").attr("x", m.l).attr("y", d => y(d.species_group))
      .attr("height", y.bandwidth()).attr("width", d => x(d.share_within_region) - m.l)
      .attr("fill", d => d.species_group === "Unknown bird" ? unkFill : C.count).call(tip, d => `${d.species_group}\n` + rateTip(d));
    svg.append("g").selectAll("text").data(rows).join("text").attr("x", d => x(d.share_within_region) + 4)
      .attr("y", d => y(d.species_group) + y.bandwidth() / 2 + 4).text(d => `${pct(d.share_within_region)} (${num(d.n_reports)})`);
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickSize(0)).call(g => g.select(".domain").remove());
    const r = svg.append("g").selectAll("g").data(rows.filter(d => d.n_damage_coded >= 30)).join("g");
    r.append("line").attr("x1", d => xr(d.ci95_lo)).attr("x2", d => xr(d.ci95_hi)).attr("y1", d => y(d.species_group) + y.bandwidth() / 2)
      .attr("y2", d => y(d.species_group) + y.bandwidth() / 2).attr("stroke", C.rate);
    r.append("circle").attr("cx", d => xr(d.damage_rate)).attr("cy", d => y(d.species_group) + y.bandwidth() / 2).attr("r", 4).attr("fill", C.rate);
    svg.append("g").attr("transform", `translate(0,${H - 40})`).call(d3.axisBottom(xr).ticks(5).tickFormat(pct0));
    svg.append("text").attr("x", (mid + width) / 2).attr("y", H - 8).attr("text-anchor", "middle").text("Damage rate (groups with ≥30 coded reports)");
    return svg.node();
  }

  // ------------------------------------------------------------------ View C1 · Q4 components
  function viewC1(components, {width = 900, sortBy = "n_struck"} = {}) {
    width = Math.max(width, 820);   // narrow screens: draw at a readable size, the SVG then scales down
    const rows = components.filter(d => d.component !== "No component flagged")
      .sort((a, b) => d3.descending(a[sortBy], b[sortBy]));
    const none = components.find(d => d.component === "No component flagged");
    const H = 90 + rows.length * 28 + 50, m = {l: 120, t: 80}, mid = m.l + (width - m.l) * 0.5;
    const svg = base(width, H);
    title(svg, "C1 · Where on the aircraft strikes do damage",
      `Bars = reports where the part was struck; dot = % of those where the part was damaged (95% CI). ` +
      (none ? `${num(none.n_struck)} reports flag no component and have no rate.` : ""));
    const y = d3.scaleBand(rows.map(d => d.component), [m.t, H - 50]).padding(0.25);
    const x = d3.scaleLinear([0, d3.max(rows, d => d.n_struck)], [m.l, mid - 60]);
    const xr = d3.scaleLinear([0, 0.8], [mid, width - 30]);
    svg.append("g").selectAll("rect").data(rows).join("rect").attr("x", m.l).attr("y", d => y(d.component))
      .attr("height", y.bandwidth()).attr("width", d => x(d.n_struck) - m.l).attr("fill", C.count)
      .call(tip, d => `${d.component}: struck in ${num(d.n_struck)} reports; part damaged in ${num(d.n_component_damaged)} ` +
        `(${pct(d.component_damage_rate)})\nwhole-aircraft damage rate when this part was struck: ${pct(d.aircraft_damage_rate_when_struck)}`);
    svg.append("g").selectAll("text").data(rows).join("text").attr("x", d => x(d.n_struck) + 4)
      .attr("y", d => y(d.component) + y.bandwidth() / 2 + 4).text(d => num(d.n_struck));
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickSize(0)).call(g => g.select(".domain").remove());
    const g = svg.append("g").selectAll("g").data(rows).join("g");
    const cy = d => y(d.component) + y.bandwidth() / 2;
    g.append("line").attr("x1", d => xr(d.ci95_lo)).attr("x2", d => xr(d.ci95_hi)).attr("y1", cy).attr("y2", cy).attr("stroke", C.rate);
    g.append("path").attr("transform", d => `translate(${xr(d.component_damage_rate)},${cy(d)})`)
      .attr("d", d3.symbol(d3.symbolDiamond, 50)()).attr("fill", C.rate);
    g.append("text").attr("x", d => xr(d.component_damage_rate) + 8).attr("y", d => cy(d) - 6).attr("font-size", 10)
      .text(d => pct(d.component_damage_rate));
    svg.append("g").attr("transform", `translate(0,${H - 50})`).call(d3.axisBottom(xr).ticks(4).tickFormat(pct0));
    svg.append("g").attr("transform", `translate(0,${H - 50})`).call(d3.axisBottom(x).ticks(4, "~s"));
    svg.append("text").attr("x", (m.l + mid) / 2).attr("y", H - 14).attr("text-anchor", "middle").text("Reports where part was struck");
    svg.append("text").attr("x", (mid + width) / 2).attr("y", H - 14).attr("text-anchor", "middle").text("% damaged when struck");
    return svg.node();
  }

  // ------------------------------------------------------------------ View C2 · Q5 phase & height
  const BANDS = ["0 ft (on ground)", "1–500 ft", "501–1,500 ft", "1,501–3,500 ft", ">3,500 ft"];
  function viewC2(phase, phaseHeight, {width = 900, group = "Departure"} = {}) {
    width = Math.max(width, 820);   // narrow screens: draw at a readable size, the SVG then scales down
    const H = 640, m = {l: 130, t: 70};
    const svg = base(width, H);
    title(svg, "C2 · Fewer strikes up high, but more of them do damage",
      "Top: every phase of flight. Bottom: height bands for the selected phase group (FAA bands, ground at the bottom). Bars = reports; dot = damage rate (95% CI).");
    const nrFill = hatch(svg);
    const mid = m.l + (width - m.l) * 0.5;
    // --- top: all phases
    const ph = phase.slice().sort((a, b) => (a.phase === "Not reported") - (b.phase === "Not reported") || b.n_reports - a.n_reports);
    const y1 = d3.scaleBand(ph.map(d => d.phase), [m.t, 330]).padding(0.2);
    const x1 = d3.scaleLinear([0, d3.max(ph, d => d.n_reports)], [m.l, mid - 70]);
    const xr = d3.scaleLinear([0, 0.4], [mid, width - 30]);
    const panel = (rows, y, key, x) => {
      const isNR = d => d[key] === "Not reported";
      const sel = d => key === "phase" && d.phase_group === group;
      svg.append("g").selectAll("rect").data(rows).join("rect").attr("x", m.l).attr("y", d => y(d[key])).attr("height", y.bandwidth())
        .attr("width", d => x(d.n_reports) - m.l).attr("fill", d => isNR(d) ? nrFill : C.count)
        .attr("stroke", d => sel(d) ? "#000" : isNR(d) ? "#999" : null).attr("stroke-dasharray", d => isNR(d) ? "3,2" : null)
        .call(tip, d => `${d[key]} (${d.phase_group})\n` + rateTip(d));
      svg.append("g").selectAll("text").data(rows).join("text").attr("x", d => x(d.n_reports) + 4)
        .attr("y", d => y(d[key]) + y.bandwidth() / 2 + 4).attr("font-size", 10)
        .text(d => `${num(d.n_reports)}${isNR(d) ? ` (${pct0(d.pct_damage_coded)} coded)` : ""}`);
      svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickSize(0)).call(g => g.select(".domain").remove());
      const g = svg.append("g").selectAll("g").data(rows.filter(d => d.n_damage_coded >= 30)).join("g");
      const cy = d => y(d[key]) + y.bandwidth() / 2;
      g.append("line").attr("x1", d => xr(Math.min(d.ci95_lo, 0.4))).attr("x2", d => xr(Math.min(d.ci95_hi, 0.4))).attr("y1", cy).attr("y2", cy).attr("stroke", C.rate);
      g.append("circle").attr("cx", d => xr(Math.min(d.damage_rate, 0.4))).attr("cy", cy).attr("r", 4).attr("fill", C.rate);
      g.append("text").attr("x", d => xr(Math.min(d.damage_rate, 0.4)) + 7).attr("y", d => cy(d) - 5).attr("font-size", 10).text(d => pct(d.damage_rate));
    };
    panel(ph, y1, "phase", x1);
    svg.append("g").attr("transform", "translate(0,330)").call(d3.axisBottom(xr).ticks(4).tickFormat(pct0));
    // --- bottom: height bands for the chosen group
    const rows = BANDS.map(b => phaseHeight.find(d => d.phase_group === group && d.height_band === b)).filter(Boolean).reverse();
    const nr = phaseHeight.find(d => d.phase_group === group && d.height_band === "Not reported");
    const all = nr ? [nr, ...rows].reverse() : rows; // ground at bottom, "Not reported" below a gap
    const ord = [...rows.map(d => d.height_band), ...(nr ? ["Not reported"] : [])];
    svg.append("text").attr("x", m.l).attr("y", 372).attr("font-weight", 700).text(`${group}: height above ground`);
    const y2 = d3.scaleBand(ord, [385, H - 50]).padding(0.2);
    const x2 = d3.scaleLinear([0, d3.max(all, d => d.n_reports)], [m.l, mid - 70]);
    panel(all, y2, "height_band", x2);
    const y500 = (y2("1–500 ft") + y2("501–1,500 ft") + y2.bandwidth()) / 2;
    if (y2("1–500 ft") !== undefined && y2("501–1,500 ft") !== undefined) {
      svg.append("line").attr("x1", m.l - 10).attr("x2", width - 20).attr("y1", y500).attr("y2", y500).attr("stroke", "#000").attr("stroke-dasharray", "4,3");
      svg.append("text").attr("x", width - 20).attr("y", y500 - 4).attr("text-anchor", "end").attr("font-size", 10)
        .text("500 ft — FAA: strikes above 500 ft are more often damaging");
    }
    svg.append("g").attr("transform", `translate(0,${H - 50})`).call(d3.axisBottom(xr).ticks(4).tickFormat(pct0));
    svg.append("text").attr("x", (mid + width) / 2).attr("y", H - 14).attr("text-anchor", "middle").text("Damage rate (rows with ≥30 coded reports)");
    svg.append("text").attr("x", (m.l + mid) / 2).attr("y", H - 14).attr("text-anchor", "middle").text("Reports");
    return svg.node();
  }

  // ------------------------------------------------------------------ View C3 · Q6 month & time of day
  function viewC3(month, monthTod, {width = 900, metric = "damage_rate"} = {}) {
    width = Math.max(width, 820);   // narrow screens: draw at a readable size, the SVG then scales down
    const H = 560, m = {l: 90, r: 20, t: 70};
    const svg = base(width, H);
    const M = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
    title(svg, "C3 · Strikes peak in summer; damage peaks in winter",
      "All years pooled · shaded = spring (Mar–May) and fall (Aug–Nov) migration · heatmap: " +
      (metric === "damage_rate" ? "damage rate by light condition (number = reports)" : "reports by light condition"));
    const x = d3.scaleBand(d3.range(1, 13), [m.l, width - m.r]).padding(0.12);
    const yb = d3.scaleLinear([0, d3.max(month, d => d.n_reports) * 1.1], [230, m.t + 10]);
    const yl = d3.scaleLinear([0, 0.2], [330, 250]);
    for (const [a, b, t] of [[3, 5, "spring migration"], [8, 11, "fall migration"]]) {
      svg.append("rect").attr("x", x(a) - 3).attr("width", x(b) + x.bandwidth() - x(a) + 6).attr("y", m.t).attr("height", 262).attr("fill", "#f1f1f1");
      svg.append("text").attr("x", (x(a) + x(b) + x.bandwidth()) / 2).attr("y", m.t + 12).attr("text-anchor", "middle").attr("fill", "#666").text(t);
    }
    svg.append("g").selectAll("rect").data(month).join("rect").attr("x", d => x(d.INCIDENT_MONTH)).attr("width", x.bandwidth())
      .attr("y", d => yb(d.n_reports)).attr("height", d => yb(0) - yb(d.n_reports)).attr("fill", C.count)
      .call(tip, d => `${M[d.INCIDENT_MONTH - 1]} (${d.season}, ${d.migration_window})\n` + rateTip(d));
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(yb).ticks(4, "~s")).call(g => g.select(".domain").remove());
    svg.append("text").attr("x", m.l - 50).attr("y", 150).attr("transform", `rotate(-90,${m.l - 50},150)`).attr("text-anchor", "middle").text("Reports");
    const cx = d => x(d.INCIDENT_MONTH) + x.bandwidth() / 2;
    svg.append("path").datum(month).attr("fill", C.rate).attr("opacity", 0.18).attr("d", d3.area().x(cx).y0(d => yl(d.ci95_lo)).y1(d => yl(d.ci95_hi)));
    svg.append("path").datum(month).attr("fill", "none").attr("stroke", C.rate).attr("stroke-width", 2).attr("d", d3.line().x(cx).y(d => yl(d.damage_rate)));
    svg.append("g").selectAll("text").data(month).join("text").attr("x", cx).attr("y", d => yl(d.damage_rate) - 7)
      .attr("text-anchor", "middle").attr("font-size", 9.5).text(d => pct0(d.damage_rate));
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(yl).ticks(3).tickFormat(pct0)).call(g => g.select(".domain").remove());
    svg.append("text").attr("x", m.l - 50).attr("y", 290).attr("transform", `rotate(-90,${m.l - 50},290)`).attr("text-anchor", "middle").text("Damage rate");
    // heatmap
    const tods = ["Dawn", "Day", "Dusk", "Night", "Not reported"];
    const yh = d3.scaleBand(tods, [370, H - 40]).padding(0.06);
    const color = metric === "damage_rate" ? d3.scaleSequential([0, 0.25], d3.interpolateOrRd)
                                           : d3.scaleSequentialLog([100, d3.max(monthTod, d => d.n_reports)], d3.interpolateBlues);
    const nrFill = hatch(svg, "#bbb");
    const cell = svg.append("g").selectAll("g").data(monthTod).join("g")
      .attr("transform", d => `translate(${x(d.INCIDENT_MONTH)},${yh(d.time_of_day)})`)
      .call(tip, d => `${M[d.INCIDENT_MONTH - 1]} · ${d.time_of_day}\n` + rateTip(d));
    cell.append("rect").attr("width", x.bandwidth()).attr("height", yh.bandwidth())
      .attr("fill", d => metric === "damage_rate" && d.n_damage_coded < 30 ? "#e6e6e6" : color(d[metric === "damage_rate" ? "damage_rate" : "n_reports"]))
      .attr("stroke", d => d.time_of_day === "Not reported" ? "#888" : "white").attr("stroke-dasharray", d => d.time_of_day === "Not reported" ? "3,2" : null);
    cell.append("text").attr("x", x.bandwidth() / 2).attr("y", yh.bandwidth() / 2 + 4).attr("text-anchor", "middle").attr("font-size", 9.5)
      .attr("fill", d => (metric === "damage_rate" ? d.damage_rate > 0.17 : d.n_reports > 8000) ? "white" : "#222")
      .text(d => metric === "damage_rate" ? (d.n_damage_coded < 30 ? "n<30" : pct0(d.damage_rate)) : si(d.n_reports));
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(yh).tickSize(0)).call(g => g.select(".domain").remove());
    svg.append("g").attr("transform", `translate(0,${H - 40})`).call(d3.axisBottom(x).tickFormat(i => M[i - 1]).tickSize(0)).call(g => g.select(".domain").remove());
    return svg.node();
  }

  // ------------------------------------------------------------------ View D · Q7 airports (fallback)
  function viewD(airports, {width = 900, sortBy = "n_reports", totalReports = 357987} = {}) {
    width = Math.max(width, 820);   // narrow screens: draw at a readable size, the SVG then scales down
    const unk = airports.find(d => d.airport_id === "UNKNOWN");
    const rows = airports.filter(d => d.airport_id !== "UNKNOWN").sort((a, b) => d3.descending(a[sortBy], b[sortBy]));
    const hasOps = rows.some(d => d.strikes_per_100k_ops);
    const H = 130 + rows.length * 17 + 40, m = {l: 230, t: 120}, mid = m.l + (width - m.l) * 0.55;
    const svg = base(width, H);
    title(svg, "D · Most reports ≠ most strikes per flight (stretch: reporting intensity)",
      hasOps ? "Top 40 airports by reports, with reports per 100,000 operations (ATADS 2016–2025)"
             : "Top 40 airports by reports · ATADS operations join pending, so this shows reporting intensity only — no safety ranking");
    if (unk) svg.append("text").attr("x", 0).attr("y", 60).attr("font-size", 11.5)
      .text(`Not ranked: ${num(unk.n_reports)} reports (${pct(unk.n_reports / totalReports)} of all reports) have no airport ("UNKNOWN"); ${pct0(unk.pct_damage_coded)} are damage-coded.`);
    const y = d3.scaleBand(rows.map(d => d.airport_id), [m.t, H - 40]).padding(0.18);
    const x = d3.scaleLinear([0, d3.max(rows, d => d.n_reports)], [m.l, mid - 50]);
    const xr = d3.scaleLinear([0, 1], [mid, width - 20]);
    svg.append("g").selectAll("rect").data(rows).join("rect").attr("x", m.l).attr("y", d => y(d.airport_id)).attr("height", y.bandwidth())
      .attr("width", d => x(d.n_reports) - m.l).attr("fill", C.count)
      .call(tip, d => `${d.airport_id} ${d.airport_name} (${d.state})\n` + rateTip(d));
    svg.append("g").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).tickSize(0).tickFormat(id => { const d = rows.find(r => r.airport_id === id); return `${id} · ${d.airport_name.slice(0, 24)}`; }))
      .call(g => g.select(".domain").remove()).call(g => g.selectAll("text").attr("font-size", 9));
    svg.append("g").selectAll("circle").data(rows).join("circle").attr("cx", d => xr(d.pct_damage_coded)).attr("cy", d => y(d.airport_id) + y.bandwidth() / 2)
      .attr("r", 4).attr("fill", "none").attr("stroke", C.ink);
    svg.append("g").attr("transform", `translate(0,${m.t - 4})`).call(d3.axisTop(xr).ticks(5).tickFormat(pct0));
    svg.append("g").attr("transform", `translate(0,${m.t - 4})`).call(d3.axisTop(x).ticks(4, "~s"));
    svg.append("text").attr("x", (m.l + mid) / 2).attr("y", m.t - 28).attr("text-anchor", "middle").text("Reports, 1990–2026");
    svg.append("text").attr("x", (mid + width) / 2).attr("y", m.t - 28).attr("text-anchor", "middle").text("% of reports damage-coded (○)");
    return svg.node();
  }

  // ------------------------------------------------------------------ View E · Q8 synthesis
  function viewE(combos, {width = 900, season = "All", phaseGroup = "All", topN = 15} = {}) {
    width = Math.max(width, 820);   // narrow screens: draw at a readable size, the SVG then scales down
    const missing = combos.find(d => d.season === "—");
    const known = combos.filter(d => d.season !== "—");
    const total = d3.sum(combos, d => d.n_damaging);
    const f = known.filter(d => (season === "All" || d.season === season) && (phaseGroup === "All" || d.phase_group === phaseGroup))
      .sort((a, b) => b.n_damaging - a.n_damaging);
    const top = f.slice(0, topN);
    const H = 120 + top.length * 24 + 90, m = {l: 280, t: 80}, mid = m.l + (width - m.l) * 0.58;
    const svg = base(width, H);
    title(svg, "E · Where reported damaging strikes concentrate",
      `Species group × season × phase cells · share of all ${num(total)} damaging strikes · filter: season = ${season}, phase = ${phaseGroup}`);
    const y = d3.scaleBand(top.map(d => `${d.species_group} · ${d.season} · ${d.phase_group}`), [m.t, m.t + top.length * 24]).padding(0.2);
    const key = d => `${d.species_group} · ${d.season} · ${d.phase_group}`;
    const x = d3.scaleLinear([0, Math.max(0.03, d3.max(top, d => d.n_damaging / total) || 0)], [m.l, mid - 70]);
    const xr = d3.scaleLinear([0, 1], [mid, width - 20]);
    let cum = 0;
    const rows = top.map(d => ({...d, share: d.n_damaging / total, cum: (cum += d.n_damaging / total)}));
    svg.append("g").selectAll("rect").data(rows).join("rect").attr("x", m.l).attr("y", d => y(key(d))).attr("height", y.bandwidth())
      .attr("width", d => x(d.share) - m.l).attr("fill", C.damaging)
      .call(tip, d => `${key(d)}\n${num(d.n_damaging)} damaging strikes = ${pct(d.share)} of all damaging\n` +
        `damage rate in cell ${pct(d.damage_rate_in_cell)} of ${num(d.n_damage_coded_cell)} coded reports`);
    svg.append("g").selectAll("text").data(rows).join("text").attr("x", d => x(d.share) + 4).attr("y", d => y(key(d)) + y.bandwidth() / 2 + 4)
      .attr("font-size", 10).text(d => `${pct(d.share)} · cum. ${pct(d.cum)}`);
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickSize(0)).call(g => g.select(".domain").remove());
    svg.append("g").selectAll("circle").data(rows).join("circle").attr("cx", d => xr(d.damage_rate_in_cell)).attr("cy", d => y(key(d)) + y.bandwidth() / 2)
      .attr("r", d => Math.max(2.5, Math.sqrt(d.n_damage_coded_cell) / 6)).attr("fill", "#333").attr("opacity", 0.8);
    svg.append("g").selectAll("text.r").data(rows).join("text").attr("x", d => xr(d.damage_rate_in_cell) + 8)
      .attr("y", d => y(key(d)) + y.bandwidth() / 2 + 4).attr("font-size", 9.5).text(d => `${pct0(d.damage_rate_in_cell)} of ${num(d.n_damage_coded_cell)}`);
    svg.append("g").attr("transform", `translate(0,${m.t - 4})`).call(d3.axisTop(xr).ticks(5).tickFormat(pct0));
    svg.append("text").attr("x", (mid + width) / 2).attr("y", m.t - 26).attr("text-anchor", "middle").text("Damage rate within cell (dot area ∝ coded n)");
    svg.append("text").attr("x", (m.l + mid) / 2).attr("y", m.t - 26).attr("text-anchor", "middle").text("Share of all damaging strikes");
    if (!top.length) svg.append("text").attr("x", m.l).attr("y", m.t + 20).text("No cells match this filter.");
    // 100% bar
    const by = m.t + top.length * 24 + 34;
    const parts = [["Top " + top.length + " cells (this filter)", d3.sum(rows, d => d.share), C.damaging],
      ["Other known cells", (d3.sum(known, d => d.n_damaging) / total) - d3.sum(rows, d => d.share), "#f3b6b7"],
      ["Species or phase not reported", missing ? missing.n_damaging / total : 0, hatch(svg)]];
    const xb = d3.scaleLinear([0, 1], [20, width - 20]);
    svg.append("text").attr("x", 20).attr("y", by - 8).attr("font-weight", 700).text("All damaging strikes = 100%");
    let acc = 0;
    for (const [t, v, fl] of parts) {
      svg.append("rect").attr("x", xb(acc)).attr("width", xb(v) - xb(0)).attr("y", by).attr("height", 26).attr("fill", fl).attr("stroke", "#999");
      svg.append("text").attr("x", xb(acc + v / 2)).attr("y", by + 17).attr("text-anchor", "middle").attr("font-size", 10).text(`${t} ${pct(v)}`);
      acc += v;
    }
    svg.append("text").attr("x", 20).attr("y", by + 46).attr("font-style", "italic").attr("fill", "#555")
      .text("Share of REPORTED damaging strikes; not a probability of damage per flight.");
    return svg.node();
  }

  return {viewB, viewA, viewASlope, viewARegion, viewC1, viewC2, viewC3, viewD, viewE};
})();
