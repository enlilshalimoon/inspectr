# Ad creatives

Paid-ad creative library for Lookover Meta campaigns. **All files here are served live at `https://www.uselookover.com/marketing/ads/<filename>` after each Vercel deploy** — pass those URLs directly to the Meta Marketing API (`/act_{ad_account_id}/adimages?url=...`) instead of uploading binary.

## Active ad set (3 concepts × 2 aspect ratios = 6 ads)

| Variant | 1:1 (Feed) | 9:16 (Stories/Reels) | Funnel stage |
|---|---|---|---|
| **Finding hero** | `ad-finding-hero-1x1.png` | `ad-finding-hero-9x16.png` | Audience filter — "GFCI MISSING" + SOP recommended action. Reads as inspection-software to inspectors, gibberish to everyone else. |
| **Stat + phone** | `ad-stat-phone-1x1.png` | `ad-stat-phone-9x16.png` | Conversion — "3 HRS → 30 MIN" stat hero with a readable phone UI mockup showing real inspection finding. |
| **Procore-style** | `ad-procore-style-1x1.png` | `ad-procore-style-9x16.png` | Cold awareness — photo (truck tailgate + laptop + hard hat) with bold "30 MIN REPORTS. STILL YOUR LICENSE." overlay. |

Full operational playbook for the campaign (audience, budgets, decision rules, iteration logic, kill criteria) lives at `marketing/ads/campaign-agent-prompt.md`.

## Adding a new ad creative

When the campaign agent iterates (replaces a fatigued variant or scales a winner with evolutions):

1. Generate via Higgsfield `nano_banana_pro` in **both** aspect ratios (`1:1` and `9:16`)
2. Name following the pattern: `ad-{concept}-{aspectratio}.png` — e.g. `ad-voice-waveform-1x1.png`
3. Drop in this folder, commit, push → Vercel serves it
4. Reference by URL in Meta Marketing API: `https://www.uselookover.com/marketing/ads/ad-voice-waveform-1x1.png`

## Archive

`archive/` contains creative concepts that were generated but not selected for the active campaign (variants 1-6 from the first two iteration rounds). Kept for reference / future re-use, not in active rotation.
