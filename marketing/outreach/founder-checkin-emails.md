# Founder check-in emails — lifecycle outreach

> Personal founder-to-user email sent ~2–3 days after signup. The whole point is that it
> reads like a real 26-year-old solo founder typed it in his inbox — NOT a drip campaign.
> Send from Enlil's actual Gmail (or Reply-To it) so replies land in a real inbox.
> At current volume (~2 signups/week) send these BY HAND — it beats any automation for
> trust and reply rate. Automate later (Resend + Supabase cron, same infra as the
> lead-magnet drip) once volume justifies it.

## Voice rules
- Short. 4–7 sentences. Long = reads like marketing = ignored.
- One genuine question. Make replying easy.
- "I built this, I'm 26, it's just me, I read every reply." That solo-founder honesty is
  the differentiator vs Spectora (faceless company).
- No hard sell. Don't mention it was an ad that brought them (creepy).
- Address people by their NAME, not the email prefix (e.g. Robert, not scott@).

---

## Branching logic (which template fires)

Trigger: 2 days after signup. Branch on account state:

| State | Template |
|---|---|
| Didn't finish onboarding | **A — "did something trip you up?"** |
| Onboarded, 0 inspections | **B — "how's it going + nudge first inspection"** |
| Onboarded, ≥1 inspection | **C — "what'd you think of the report?"** |
| Trial expired, no conversion | **D — winback / reset trial** |

---

## Template A — didn't finish onboarding

**Subject:** did something trip you up?

Hey {first_name},

Enlil here — I built Lookover (I'm 26, solo founder, real person on the other end of this).

Saw you signed up a few days ago but didn't quite finish setting things up. No worries at all — but I'm curious: did something get confusing or annoying? That's genuinely useful for me to hear, because if setup lost you, it's probably losing other inspectors too.

If you just got busy, all good — your trial's still open and setup takes about 5 minutes. If something broke or didn't make sense, hit reply and tell me what happened. I'll fix it.

Either way, thanks for trying it.

— Enlil
Founder, Lookover

---

## Template B — onboarded, hasn't run an inspection

**Subject:** how's it going, {first_name}?

Hey {first_name},

Enlil here — I'm the guy who actually built Lookover (I'm 26, it's just me for now).

Saw you got {company} set up a couple days ago — thanks for giving it a shot. Looks like you haven't run your first inspection through it yet, which is really the moment it either clicks or it doesn't. If you've got a walkthrough coming up, try talking through it on your phone and letting it draft the report — should be ~30 min to review instead of the usual evening of typing.

If anything's confusing about getting that first one going, just reply — I read every one of these myself and I'll walk you through it (or hop on a 15-min call if that's easier).

How's it felt so far? Genuinely want your honest take.

— Enlil
Founder, Lookover

---

## Template C — onboarded and ran a report

**Subject:** what'd you think?

Hey {first_name},

Enlil here — founder of Lookover (I'm 26, built the whole thing myself).

Saw you actually ran an inspection through it — that means more to me than a hundred signups who never tried it. So I have to ask: what did you think of the report it drafted? Close to what you'd have written yourself, or way off?

Honest answer helps me way more than a nice one. If there was a finding it botched or a section it missed, tell me — that's exactly the stuff I'm trying to fix.

Would genuinely love 10 minutes of your time if you're open to it.

— Enlil
Founder, Lookover

---

## Template D — trial expired, winback

**Subject:** what'd you think?

Hey {first_name},

Enlil here — founder of Lookover (I'm 26, built it myself).

Saw you actually ran an inspection through it before your trial ran out — that means more to me than a hundred signups who never tried it. So I have to ask: what did you think of the report it drafted? Close to what you'd have written, or way off?

Honest answer helps me more than a nice one. And if it was even half useful, I'd happily reset your trial so you can run a few more on the house — just say the word.

Would love 10 minutes of your time if you're open to it.

— Enlil
Founder, Lookover

---

## Ready-to-send — current 3 signups (as of Jul 28)

### 1. Robert Baimbridge — Golden Home Services (TX) — onboarded, 0 inspections → Template B
**To:** scott@goldenhomeservicestx.com
**Subject:** how's it going, Robert?

Hey Robert,

Enlil here — I'm the guy who actually built Lookover (I'm 26, it's just me for now).

Saw you got Golden Home Services set up a couple days ago — thanks for giving it a shot. Looks like you haven't run your first inspection through it yet, which is really the moment it either clicks or it doesn't. If you've got a walkthrough coming up, try talking through it on your phone and letting it draft the report — should be ~30 min to review instead of the usual evening of typing.

If anything's confusing about getting that first one going, just reply — I read every one of these myself and I'll walk you through it (or hop on a 15-min call if that's easier).

How's it felt so far? Genuinely want your honest take.

— Enlil
Founder, Lookover

### 2. Sigifredo Santana — no company — didn't finish onboarding → Template A
**To:** sigifredosantana550@gmail.com
**Subject:** did something trip you up?

Hey Sigifredo,

Enlil here — I built Lookover (I'm 26, solo founder, real person on the other end of this email).

Saw you signed up a few days ago but didn't quite finish setting things up. No worries at all — but I'm curious: did something get confusing or annoying? That's genuinely useful for me to hear, because if the setup lost you, it's probably losing other inspectors too.

If you just got busy, all good — your trial's still open and setup takes about 5 minutes. If something broke or didn't make sense, hit reply and tell me what happened. I'll fix it.

Either way, thanks for trying it.

— Enlil
Founder, Lookover

### 3. Joseph Paull — JP Services Group (AR) — ran 1 inspection, trial EXPIRED → Template D
**To:** jpaull.ica@gmail.com
**Subject:** what'd you think?

Hey Joseph,

Enlil here — founder of Lookover (I'm 26, built it myself).

Saw you actually ran an inspection through it before your trial ran out — that means more to me than a hundred signups who never tried it. So I have to ask: what did you think of the report it drafted? Close to what you'd have written, or way off?

Honest answer helps me more than a nice one. And if it was even half useful, I'd happily reset your trial so you can run a few more on the house — just say the word.

Would love 10 minutes of your time if you're open to it.

— Enlil
Founder, Lookover
