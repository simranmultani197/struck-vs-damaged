"""Build the Milestone 3 deliverables from views.js + content.py:

  milestone3/observable/cells.js  - the Observable notebook, as 13 cells to paste in order
  milestone3/README.md            - the write-up (question, screenshot, description, where the code is, AI statement)

Usage: python milestone3/build_notebook.py
"""
import json
import re
from pathlib import Path

import content as C

HERE = Path(__file__).resolve().parent
SRC = (HERE / "views.js").read_text()
RAW = "https://raw.githubusercontent.com/simranmultani197/struck-vs-damaged/main/data/processed/"
M2_URL = C.REPO + "/blob/main/milestones/milestone2.md"
VIEWS = ["viewB", "viewA", "viewASlope", "viewARegion", "viewC1", "viewC2", "viewC3", "viewD", "viewE"]

DATA = {
    "annual": "q1_annual.csv", "species": "q2q3_species.csv", "family": "q2_family.csv",
    "byRegion": "q2_group_by_region.csv", "components": "q4_components.csv", "phase": "q5_phase.csv",
    "phaseHeight": "q5_phase_height.csv", "month": "q6_month.csv", "monthTod": "q6_month_time_of_day.csv",
    "airports": "q7_airports.csv", "combos": "q8_combinations.csv",
}

# Per question: control declarations (JS), the control variable names, and the chart calls.
SPEC = {
    "Q1": (['const mode = Inputs.radio(new Map([["Counts", "count"], ["Share of reports", "share"]]), {label: "Y-axis", value: "count"});'],
           ["mode"], ["V.viewB(data.annual, {width, mode: mode.value})"]),
    "Q2–Q3": (['const level = Inputs.radio(["Species", "Family"], {label: "Level", value: "Species"});',
               'const facet = Inputs.toggle({label: "Facet by size", value: false});',
               'const highlight = Inputs.text({label: "Highlight", placeholder: "e.g. goose"});',
               'const region = Inputs.select([...new Set(data.byRegion.map(d => d.faa_region))], {label: "FAA region (bottom panel)", value: "AEA"});'],
              ["level", "facet", "highlight", "region"],
              ["V.viewA(data.species, data.family, {width, level: level.value, facet: facet.value, highlight: highlight.value})",
               "V.viewASlope(data.species, {width: Math.min(width, 640)})",
               "V.viewARegion(data.byRegion, {width, region: region.value})"]),
    "Q4": (['const sortBy = Inputs.select(new Map([["Reports struck", "n_struck"], ["Damage rate", "component_damage_rate"]]), {label: "Sort by"});'],
           ["sortBy"], ["V.viewC1(data.components, {width, sortBy: sortBy.value})"]),
    "Q5": (['const group = Inputs.select(["Departure", "Arrival", "En route", "Local"], {label: "Phase group (height profile)"});'],
           ["group"], ["V.viewC2(data.phase, data.phaseHeight, {width, group: group.value})"]),
    "Q6": (['const metric = Inputs.select(new Map([["Damage rate", "damage_rate"], ["Reports", "n_reports"]]), {label: "Heatmap shows"});'],
           ["metric"], ["V.viewC3(data.month, data.monthTod, {width, metric: metric.value})"]),
    "Q7": (['const sortBy = Inputs.select(new Map([["Reports", "n_reports"], ["% damage-coded", "pct_damage_coded"], ["Damage rate", "damage_rate"]]), {label: "Sort by"});'],
           ["sortBy"], ["V.viewD(data.airports, {width, sortBy: sortBy.value})"]),
    "Q8": (['const season = Inputs.select(["All", "Winter", "Spring", "Summer", "Fall"], {label: "Season"});',
            'const phaseGroup = Inputs.select(["All", "Arrival", "Departure", "En route", "Local", "Ground"], {label: "Phase group"});'],
           ["season", "phaseGroup"], ["V.viewE(data.combos, {width, season: season.value, phaseGroup: phaseGroup.value})"]),
}


def esc(text):
    """Escape text for use inside an md`...` template literal."""
    return text.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def md_cell(text):
    return "md`" + esc(text) + "`"


def question_cell(q):
    decls, names, calls = SPEC[q["id"]]
    funcs = ", ".join(f"V.{v}" for v in q["cells"])
    head = f"## {q['id']} · View {q['view']}\n\n**Question.** {q['q']}"
    foot = q["shows"] + f"\n\n*D3 code:* {funcs} in the **D3 code** cell at the end of this notebook."
    body = "\n  ".join(decls)
    charts = ", ".join(calls)
    return f"""{{
  // {q['id']}: controls re-draw the chart(s) in place
  {body}
  const out = html`<div></div>`;
  const draw = () => out.replaceChildren(...[{charts}]);
  [{", ".join(names)}].forEach(c => c.addEventListener("input", draw));
  draw();
  return html`<div>
    ${{md`{esc(head)}`}}
    <div style="display:flex;flex-wrap:wrap;gap:4px 24px;margin:8px 0">${{[{", ".join(names)}]}}</div>
    ${{out}}
    ${{md`{esc(foot)}`}}
  </div>`;
}}"""


def data_cell():
    files = json.dumps(DATA, indent=4).replace("\n", "\n  ")
    return f"""data = {{
  // Processed tables, read straight from the public GitHub repository (no file uploads needed)
  const base = "{RAW}";
  const files = {files};
  const tables = await Promise.all(Object.entries(files).map(async ([k, f]) => [k, await d3.csv(base + f, d3.autoType)]));
  return Object.fromEntries(tables);
}}"""


def code_cell():
    body = "\n".join("  " + l if l.strip() else "" for l in SRC.strip().split("\n"))
    return f"""V = {{
  // ===== D3 code for every view (same as milestone3/views.js in the repository) =====
{body}

  return {{{", ".join(VIEWS)}}};
}}"""


def notebook_cells():
    cells = [("Title and introduction", md_cell(
        "# Struck vs. Damaged\n\n" + C.INTRO +
        f"\n\nRepository: {C.REPO} · Milestone 2 record: {M2_URL}"))]
    for q in C.QUESTIONS:
        cells.append((f"{q['id']}: question, controls, chart(s), description", question_cell(q)))
    cells.append(("Next steps", md_cell(C.NEXT)))
    cells.append(("AI-use statement", md_cell("## AI-use statement\n\n" + C.AI_STATEMENT)))
    cells.append(("Data (loads the processed CSVs)", data_cell()))
    cells.append(("D3 code - PIN THIS CELL so the code is visible", code_cell()))
    return cells


def write_cells():
    out = ["// Struck vs. Damaged - Milestone 3 Observable notebook (generated by milestone3/build_notebook.py).",
           "// 12 cells. Paste each block between `// ---- cell` markers into its own notebook cell, in order.",
           "// d3, Inputs, md, html and width are built into Observable notebooks: nothing to import.", ""]
    cells = notebook_cells()
    for i, (label, code) in enumerate(cells, 1):
        out += [f"// ---- cell {i}: {label}", code, ""]
    (HERE / "observable").mkdir(exist_ok=True)
    (HERE / "observable" / "cells.js").write_text("\n".join(out))
    return cells


def write_readme():
    r = ["# Milestone 3 — First D3 draft", "",
         f"> The Milestone 2 record is kept unchanged at [milestones/milestone2.md]({M2_URL}).", "",
         C.INTRO, "",
         "## How to view and run", "",
         f"1. **Observable notebook (main delivery):** {C.NOTEBOOK_URL}. The notebook runs every view live, with its "
         "controls, and contains all of the D3 code in its last cell (the *D3 code* cell). It loads data straight from this repository.",
         "2. **Run it locally (no Observable needed):**",
         "   ```bash",
         "   git clone " + C.REPO + ".git",
         "   cd struck-vs-damaged",
         "   python3 -m http.server 8000",
         "   # open http://localhost:8000/milestone3/index.html",
         "   ```",
         "   The page loads d3 v7 from jsDelivr and the CSVs from `data/processed/`.",
         "3. **Rebuild the notebook cells and this write-up** after editing `views.js` or `content.py`: "
         "`python3 milestone3/build_notebook.py`.",
         "",
         "| File | Purpose |", "| --- | --- |",
         "| `milestone3/views.js` | All D3 view functions (one per chart) and shared helpers |",
         "| `milestone3/index.html` | Local page that renders every view with its controls |",
         "| `milestone3/observable/cells_notebook2.js` | The cells of the published notebook (Observable Notebooks 2.0, plain-JavaScript cells), in order |",
         "| `milestone3/observable/cells.js` | The same notebook in classic Observable syntax (for classic notebooks) |",
         "| `milestone3/content.py`, `build_notebook.py` | Write-up text and the script that builds `cells.js` and this README |",
         "| `milestone3/screenshots/` | Static captures of each view, used below |",
         ""]
    for q in C.QUESTIONS:
        r += [f"## {q['id']} · View {q['view']}", "", f"**Question.** {q['q']}", ""]
        for v in q["cells"]:
            r += [f"![{v}](screenshots/{v}.png)", ""]
        r += [q["shows"], ""]
        refs = []
        for v in q["cells"]:
            line = SRC[:SRC.index(f"function {v}(")].count("\n") + 1
            refs.append(f"`{v}` ([views.js line {line}](views.js#L{line}))")
        r += [f"**D3 code:** {', '.join(refs)}, also in the notebook's *D3 code* cell.", ""]
    r += ["## Next steps", "", C.NEXT, "", "## AI-use statement", "", C.AI_STATEMENT, ""]
    (HERE / "README.md").write_text("\n".join(r))


if __name__ == "__main__":
    cells = write_cells()
    write_readme()
    print(f"cells.js: {len(cells)} cells · README.md written")


# ---------------------------------------------------------------- Observable Notebooks 2.0 (plain-JS cells)
def _html(md_text):
    import markdown
    import re as _re
    lines, out = md_text.split("\n"), []
    for ln in lines:   # python-markdown needs a blank line before a list that follows a paragraph
        is_item = bool(_re.match(r"^(- |\d+\. )", ln))
        if is_item and out and out[-1].strip() and not _re.match(r"^(- |\d+\. )", out[-1]):
            out.append("")
        out.append(ln)
    return markdown.markdown("\n".join(out), tab_length=2)


def kit_text_cell(md_text):
    """A JS cell that displays pre-rendered HTML (no md`` tag needed)."""
    return ("{\n  const el = document.createElement(\"div\");\n  el.innerHTML = " + json.dumps(_html(md_text), ensure_ascii=False)
            + ";\n  display(el);\n}")


def kit_question_cell(q):
    decls, names, calls = SPEC[q["id"]]
    funcs = ", ".join(f"V.{v}" for v in q["cells"])
    head = _html(f"## {q['id']} · View {q['view']}\n\n**Question.** {q['q']}")
    foot = _html(q["shows"] + f"\n\n*D3 code:* {funcs} in the **D3 code** cell at the end of this notebook.")
    body = "\n  ".join(decls)
    return f"""{{
  // {q['id']}: controls re-draw the chart(s) in place
  {body}
  const out = document.createElement("div");
  const draw = () => out.replaceChildren(...[{", ".join(calls)}]);
  [{", ".join(names)}].forEach(c => c.addEventListener("input", draw));
  draw();
  const head = document.createElement("div"); head.innerHTML = {json.dumps(head, ensure_ascii=False)};
  const foot = document.createElement("div"); foot.innerHTML = {json.dumps(foot, ensure_ascii=False)};
  const controls = html`<div style="display:flex;flex-wrap:wrap;gap:4px 24px;margin:8px 0">${{[{", ".join(names)}]}}</div>`;
  display(html`<div>${{head}}${{controls}}${{out}}${{foot}}</div>`);
}}"""


def kit_cells():
    cells = [("Title (markdown cell)", "# Struck vs. Damaged\n\n" + C.INTRO + f"\n\nRepository: {C.REPO} · Milestone 2 record: {M2_URL}")]
    for q in C.QUESTIONS:
        cells.append((f"{q['id']}", kit_question_cell(q)))
    cells.append(("Next steps", kit_text_cell(C.NEXT)))
    cells.append(("AI-use statement", kit_text_cell("## AI-use statement\n\n" + C.AI_STATEMENT)))
    files = json.dumps(DATA, indent=2)
    cells.append(("Data", f"""const data = await (async () => {{
  // Processed tables, read straight from the public GitHub repository (no file uploads needed)
  const base = "{RAW}";
  const files = {files};
  const tables = await Promise.all(Object.entries(files).map(async ([k, f]) => [k, await d3.csv(base + f, d3.autoType)]));
  return Object.fromEntries(tables);
}})();"""))
    body = "\n".join("  " + l if l.strip() else "" for l in SRC.strip().split("\n"))
    cells.append(("D3 code", f"""const V = (() => {{
  // ===== D3 code for every view (same as milestone3/views.js in the repository) =====
{body}

  return {{{", ".join(VIEWS)}}};
}})();"""))
    return cells


def write_kit():
    out = ["// Struck vs. Damaged - Milestone 3, Observable Notebooks 2.0 (plain JavaScript cells).",
           "// Cell 1 is a Markdown cell; all others are JavaScript cells. Paste in order.", ""]
    cells = kit_cells()
    for i, (label, code) in enumerate(cells, 1):
        out += [f"// ---- cell {i}: {label}", code, ""]
    (HERE / "observable" / "cells_notebook2.js").write_text("\n".join(out))
    return cells


if __name__ == "__main__":
    print("notebook 2.0 cells:", len(write_kit()))
