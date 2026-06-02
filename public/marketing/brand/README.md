# Brand assets

Public brand identity files for Lookover. **Everything here is served live at `https://www.uselookover.com/marketing/brand/<filename>` after each Vercel deploy** — use those URLs for IG bio links, FB Page profile pic uploads, email signatures, deck inserts, etc.

## Files

| File | Use it for |
|---|---|
| `logo-profile.png` (1024×1024, navy bg) | **Primary profile picture.** IG, FB Page, anywhere the avatar gets cropped to a circle. "L" monogram with an orange severity-pill dot — readable at thumbnail sizes. |
| `logo-wordmark.png` (1024×1024, navy bg) | Twitter/X avatar, LinkedIn company logo, anywhere a square avatar shows full and the wordmark stays visible. Wordmark + orange chevron. |
| `logo-lockup-horizontal.jpeg` (1024×1024, cream bg, horizontal lockup) | Website footer, email signature, business cards, deck headers. **Do not use as a profile picture** — wordmark gets cropped off in circular crops. |
| `cover-facebook.jpeg` (1376×768, 16:9) | FB Page cover photo. Upload directly; FB will auto-fit to 1640×856. Contains wordmark + tagline + product visual. |

## Color tokens (use these everywhere)

| Name | Hex | Use |
|---|---|---|
| Navy | `#0f172a` | Primary dark, backgrounds |
| Cream | `#fef9f3` | Primary light, backgrounds |
| Hot orange | `#f97316` | Single accent. Severity-pill, chevron, key highlights. |
| Charcoal | `#1e293b` | Secondary dark, depth |

## Tagline / bio copy

- **Tagline (~50 chars):** `30-minute inspection reports. Still your license.`
- **IG bio (~150 chars):** `AI-assisted inspection reports for residential home inspectors. Photo + voice in, SOP-language report out. You approve every finding. → uselookover.com`
- **FB short about (~255 chars):** see `marketing/ads/campaign-agent-prompt.md` § Appendix A for the long-form Page description.

## Adding new brand assets

1. Drop the file here with a clear name (`logo-{usage}.{ext}`, `cover-{platform}.{ext}`, etc.)
2. Update the table above
3. Commit + push → Vercel deploys → URL is live within ~50 seconds

## Archive

Anything prefixed `_archive-` is retired and shouldn't be used. Keep them for reference only.
