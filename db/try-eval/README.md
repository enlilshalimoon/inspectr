# /try real-photo accuracy eval

Checks what the public /try demo says about real photos, for the old two-stage
pipeline (Haiku reads the photo, Sonnet writes the finding without seeing it)
and the new one-step `draftFindingFromImage`. Unlike `db/benchmark/` (synthetic
text cases), every case here is a photo.

```bash
npx tsx -r dotenv/config scripts/try-eval.ts dotenv_config_path=.env.local --cases db/try-eval/cases.json
# add a private set too:  --cases db/try-eval/local/cases.json
# skip the old pipeline:  --new-only
```

Needs `ANTHROPIC_API_KEY` in `.env.local`. No database, rate limit or email. It
prints a per-photo table and a summary, writes `db/try-eval/results/<time>.md`,
and exits 1 if NEW misses the pass bar.

## Pass bar

NEW must get **>= 80% of cases correct** and make **0 confident wrong defects**.
Scoring is in `lib/try/eval-score.ts` (unit-tested):

- **correct**: section is one the label accepts, result (`defect` / `no_defect`
  / `unclear`) is one the label accepts, and for a defect the title +
  description + evidence name the labeled condition (`defect_keywords`) and
  the title claims nothing in `forbidden_in_title`.
- **confident wrong defect**: shown as a defect above `info` when the label
  doesn't allow a defect, or the defect isn't the one in the photo. That's the
  complaint we're fixing.

The old pipeline has no `result` field; a finding with severity `info` counts as
`no_defect`, anything else as `defect`.

## Cases

`cases.json`: the five /try sample photos (`public/try-samples/`) plus five
derived from them in `photos/`: a crop with no defect in frame, a plain
strip, and two photos blurred until nothing can be judged (right answer:
"unclear"). The derived ones test the new "no defect" / "unclear" paths,
which the samples don't.

Inspector photos are not committed: the repo is public, and /try never stores
photos. To score photos an inspector shared with permission, put them in
`db/try-eval/local/` (gitignored) with a `cases.json` in the same format (paths
relative to the repo root) and pass `--cases db/try-eval/local/cases.json`.

## Credits

Sample photos are from Wikimedia Commons (credits in `app/try/try-client.tsx`).
The derived photos are crops/rescales of them and carry the same license:

| File | Derived from | Author | License |
| --- | --- | --- | --- |
| `photos/wh-label-only.jpg` | Rheem home gas water heater tank - top of tank.jpg | Infrogmation of New Orleans | CC BY-SA 4.0 |
| `photos/roof-intact-crop.jpg` | Asphalt shingles damage.jpg | Samuel Bolton | CC BY-SA 4.0 |
| `photos/ceiling-plain-strip.jpg`, `photos/ceiling-unreadable.jpg` | Ceiling sheetrock damaged by water so paint was peeling.jpg | Tomwsulcer | CC0 |
| `photos/siding-unreadable.jpg` | Termite damage.JPG | Alton | CC BY-SA 3.0 |
