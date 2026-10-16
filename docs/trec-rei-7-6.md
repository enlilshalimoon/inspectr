# Texas TREC REI 7-6 report

Texas inspectors (users.license_state = TX) deliver TREC's promulgated Property Inspection Report, REI 7-6 (8/9/21), instead of the Lookover PDF. 22 TAC §535.223 requires software to reproduce the form verbatim, with identical spacing, borders and text placement.

## How it works

- **Item list:** `lib/trec/rei76.ts` holds the six sections and 41 items, with labels copied verbatim from the form.
- **Drafting:** `lib/trec/form.ts` maps each finding to an item (by section and keywords; the inspector can move it). An item with an approved finding is drafted **I + D**, or just **I** if every finding on it is "Informational". The inspector sets every other item.
- **Saving:** state lives in `inspections.report_form` (migration 0005). The Review tab's "Texas TREC form" panel writes it through `patch_report_form()`, which updates one key at a time so concurrent edits don't overwrite each other.
- **Finalize:** blocked until every printed item has at least one box.
- **PDF:** `lib/pdf/trec/rei76-doc.tsx`.
  - Pages 1–2 and the header and footer of every form page are drawn from `rei76-layout.ts`, which holds each word's x position and baseline plus every rule and border, extracted from TREC's fillable PDF by `scripts/trec/extract-layout.py`.
  - Item pages flow, because the rule lets comment space grow. Their spacing was measured from TREC's pages 3–6.
  - Photos and overflowing page-2 text go on pages attached after the form.
- **No cost estimates:** dollar amounts and cost estimates are rejected in inspector-typed comments, fields and page-2 text. TREC's own boilerplate mentions "cost estimates" and stays verbatim.
- **Opt-out:** inspectors can untick "Use the TREC form" for exempt inspections (reinspection, lender or builder work) and send the standard report instead.

## Checking fidelity

```bash
npx tsx scripts/trec/render-sample.tsx /tmp/ours.pdf --blank
python3 -I scripts/trec/compare.py /tmp/rei76.pdf /tmp/ours.pdf /tmp/cmp 1,2,3
```

Last run (2026-10-15):

- **Pages 1–2:** 533 of 569 and 369 of 383 words match position by position. Page 1 moved 0.00pt. Page 2 moved at most 0.10pt vertically. The only horizontal difference is the Calibri heading below, at 21pt.
- **Unmatched words:** these are text-extraction artifacts, not visual differences. Words that sit with no space glyph between them get merged ("ALLof"), and TREC's own odd letter spacing gets split ("minim um").
- **Page 3 item rows:** within 0.2–0.7pt of TREC's.

## Known fidelity gaps

1. **Typeface.**
   - The form uses Times New Roman; we use the PDF base font Times-Roman. Its metrics are near-identical, every word starts at TREC's x position, and the rule allows a typeface change at 10pt or larger.
   - The bullets (Symbol and Wingdings in TREC's file) are Times "•".
2. **"ADDITIONAL INFORMATION PROVIDED BY INSPECTOR" (page 2)** is Calibri Bold 11 in TREC's file. Calibri isn't a PDF base font, so we use Helvetica Bold 11 centred on the same line. It runs about 21pt wider on each side.
3. **TREC logo.** It is removed, and the inspector's logo is used when one is set. Both are allowed.
4. **Item pages don't break where TREC's do.** Comments are allocated space under each item and pages are renumbered (allowed). Also allowed: empty "Other" items are left off, and deleted Section VI items re-letter the rest.
5. **Page 1 has no page number**, which matches TREC's own form. The rule says to number all pages; confirm with TREC whether page 1 needs one.
6. **Checked boxes** show a Helvetica-Bold "X" inside TREC's bevelled box.
7. **Page-2 overflow** is decided by a 1,400-character estimate, not measured text height.
8. **Form revision.** On 2026-08-10 TREC adopted an amendment to §535.223 that updates the form number. A draft "REI 7-7" dated 05-04-2026 exists, but trec.texas.gov still posts REI 7-6 (8/9/21) as the current form. When the new form is published, re-run `extract-layout.py` and diff the item list.
9. **The client web page** (/report/[slug]) still shows the Lookover layout. The PDF it links to is the TREC form.
