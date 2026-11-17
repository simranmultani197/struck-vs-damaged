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
