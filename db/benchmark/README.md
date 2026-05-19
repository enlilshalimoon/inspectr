# Lookover AI benchmark

Calibration test set for the finding-generation prompt. Built from **InterNACHI Standards of Practice (§3.1–3.10)**, the published baseline most U.S. home inspectors are trained to.

The benchmark exists so we can **design prompts to pass it**, not write prompts and hope they're good. Every test case is a synthetic `(photo vision analysis + voice note transcript) → expected finding` pair that mirrors what an inspector would dictate on a real walkthrough.

---

## Why this is the right thing to validate

Per the build spec, every finding the AI drafts has four fields:

| Field | What good looks like | Why it matters |
|---|---|---|
| **Severity** | Matches inspector convention (info / monitor / minor_repair / major_repair / safety_hazard) | Drives client urgency. Wrong severity = lawsuit risk or lost trust. |
| **Title** | 5-10 word professional defect name | Goes in the table of contents. Sets the tone of the report. |
| **Description** | 2-4 sentences. Observation → why it matters → context. No alarmist language. | This is 80% of what the inspector reviews and edits. |
| **Recommended action** | "Recommend [licensed trade] evaluate and [repair / replace]." No cost estimates. | Defines the liability boundary. |

The benchmark scores each output on these four axes.

---

## What this is NOT

- **Not real reports.** Public inspection reports don't exist (client-private documents). Cases are synthetic but defect language is drawn from the InterNACHI SoP and common-defect lists.
- **Not an automated grade.** The runner gives a quantitative score, but the final pass/fail is human judgment. The point is to compare prompt versions to each other and to a baseline, not to produce a single "AI accuracy %".
- **Not exhaustive.** ~30 cases covering high-frequency findings. We'll grow it from real beta-tester edits in weeks 8+ (every finding an inspector edits is a candidate test case).

---

## Schema

Each case file (`cases/<section>.json`) is an array of objects:

```jsonc
{
  "id": "elec-001",                       // stable id, never reuse
  "section": "electrical",
  "source": "InterNACHI SoP §3.7",        // where the defect rule comes from
  "input": {
    "vision_analysis": { /* same shape AI vision returns */ },
    "transcript": "Inspector's voice note as Whisper would return it"
  },
  "expected": {
    "severity": "safety_hazard",
    "title_must_include": ["GFCI", "kitchen"],
    "description_must_include": ["GFCI", "water"],
    "description_must_not_include": ["dangerous", "$"],
    "action_must_include": ["licensed electrician"],
    "rationale": "Why this is the right answer, for a human reviewing the case"
  }
}
```

Scoring is keyword-presence rather than exact match — that's brittle, and good descriptions vary in wording.

---

## Severity rubric

The 5-tier system from the build spec, with concrete examples from the SoP:

| Severity | When to use | Example |
|---|---|---|
| **info** | Observation, no action | "Roof is asphalt shingle, est. age 8 yrs based on data plate." |
| **monitor** | Watch over time | "Hairline crack in foundation, no movement, recommend re-checking annually." |
| **minor_repair** | Cosmetic / low cost | "Loose handrail at front steps — secure with screws." |
| **major_repair** | Significant cost or risk if ignored | "Active water leak under kitchen sink — recommend plumber repair before closing." |
| **safety_hazard** | Immediate safety concern | "Missing GFCI at kitchen counter outlet within 6 ft of sink — code violation, shock/electrocution risk." |

When in doubt, the SoP says: be conservative on severity. Default to `monitor` or `info` if unclear.

---

## Hard rules the prompt must follow (tested as cases)

From the spec's prompt design (§8) and inspector liability norms:

1. **Trust the inspector over the vision AI** when they conflict. If voice note says "this is fine," severity is `info` regardless of what the photo shows.
2. **No dollar amounts.** Ever. Inspectors don't quote repair costs; contractors do.
3. **No "dangerous."** Use "safety concern" or "safety hazard."
4. **No specific contractors or brands** in recommended actions.
5. **Defer to specialty trades.** Recommend "licensed electrician / plumber / HVAC technician / structural engineer" — not "fix this yourself."
6. **No diagnosis of latent issues.** "Indicates possible…" not "this is caused by…"

Specific cases test each of these rules.

---

## Running the benchmark

```bash
npm run benchmark              # runs all cases against the current prompt
npm run benchmark -- --section=electrical
npm run benchmark -- --mode=stub  # runner sanity-check, no AI calls
```

Output goes to `db/benchmark/results/<timestamp>.md` and a summary to stdout.

---

## Updating the benchmark

When a beta inspector edits a finding heavily during review, that's a signal the prompt is wrong on that case. Capture it:

1. Add a new case to the appropriate `cases/<section>.json`
2. Write the `expected` based on what the inspector ended up with
3. Add `source` linking to the inspection ID (private)
4. Re-run the benchmark; if the new case fails, tune the prompt; if it passes, the prompt is robust
