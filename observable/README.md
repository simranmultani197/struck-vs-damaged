# Observable sketch notebook (Milestone 2)

The Milestone 2 sketches are built in Observable Plot from small, sketch-sized subsets of the processed tables.

## Set up the notebook (about 10 minutes)

1. On observablehq.com, create a new notebook (**New → Notebook**). Title it *Struck vs. Damaged: M2 sketches*.
2. **Attach the data.** Click the paperclip icon (File attachments) and upload all 11 CSVs from `observable/data/`.
3. **Paste the cells.** Open `cells.js`. Each block between `// ---- cell` markers is one notebook cell. Paste them **in order**: first the 11 data cells, then `sizes`, then the view cells.
   - Paste only the code under each marker. The `// ---- cell` line can be left out.
   - `Plot`, `d3`, `html` and `width` are built into Observable notebooks, so nothing needs importing.
4. Set sharing to **public or unlisted**, and put the URL in the repo `README.md` (course requirement).

Each view cell renders a chart with a title, axis labels, legend, denominators, and an "INTERACTION (planned)" caption. To save a sketch as an image, click the cell's ⋮ menu → **Download PNG**.

## Cells → views → questions

| Cell | View | Question |
| --- | --- | --- |
| `viewA`, `viewASlope` | A: frequency vs. damage rate, plus re-ranking slope chart | Q2, Q3 |
| `viewB`, `viewBRate` | B: reports per year by damage status, plus damage rate | Q1 |
| `viewC1` | C1: components struck vs. damage rate | Q4 |
| `viewC2`, `viewC2Phases` | C2: phase × height band, plus all phases | Q5 |
| `viewC3`, `viewC3Heat` | C3: month strip, plus month × light-condition heatmap | Q6 |
| `viewD` | D (stretch): airports | Q7 |
| `viewE` | E: where damaging strikes concentrate | Q8 |

## The sketch data

`make_sketch_data.py` cuts `data/processed/` down to sketch size:

- **View A:** 140 rows instead of 974. It keeps species with at least 100 damage-coded reports, plus the "Unknown bird" rows. Ranks still refer to all 236 ranked species.
- **Views D and E:** the top 15 airports and top 15 combinations only.
- **The other views:** already small, so they use their full aggregates.

To regenerate after the pipeline changes:

```bash
python observable/make_sketch_data.py
```

## Notebooks 2.0 (Observable Desktop / Notebook Kit)

If you use the newer notebook format, paste from `cells_notebook2.js` instead. It has the same charts, written as `const name = …;` declarations with `display(…)` and `htl.html`. Use **JavaScript** cells, the default. Notebooks 2.0 also offers TypeScript cells, but these sketches don't need them.
