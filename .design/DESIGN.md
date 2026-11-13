# HalfTime design system

## Taste
- **IS** — *Urgent*: a clock that keeps ticking, numbers that move. *Precise*: legal exactness, ruled lines, monospace dates. *Humane*: people behind case numbers, warm paper against a cold institution.
- **NEVER** — *Pity-porn*: no bars, shadows, handcuffs, no faces. *Corporate legal-tech*: no navy-and-gold, no gavels, no scales of justice. *Cute*: no mascots, no emoji.
- **Material**: court paper (off-white, faint grain, ruled margin), carbon-copy blue ink, red court stamps, typewriter and Devanagari type, the jail register's grid.
- **Feel in motion**: a precise mechanical tick for data (split-flap, date-stamp); slow, heavy paper movement for story. UI 180–240 ms; story reveals 700–1100 ms with a heavy ease.
- **Lines not to cross**: never a flat "ELIGIBLE"; never "will be released"; every number comes from `facts.json`; constructed samples are labelled as constructed; names stay masked.

## Concept: "The line"
Section 479 is a line drawn through a person's time in custody. The whole site is cut by that line: a hard diagonal splits paper (time served) from ink (time owed). When the count crosses it, a red 479(3) stamp comes down.

## Tokens (see `apps/web/src/app/globals.css`)
| token | value | use |
|---|---|---|
| `--paper` | `#F1ECE0` | page ground, court paper |
| `--paper-2` | `#E6DFCE` | ruled panels, card ground |
| `--ink` | `#121315` | body text, ink plane |
| `--carbon` | `#23306B` | carbon-copy blue, links, rules |
| `--carbon-soft` | `#8FA2CF` | ruled lines, secondary |
| `--stamp` | `#C2362B` | the 479(3) stamp graphic, large display only |
| `--stamp-text` | `#A82A20` | past-the-line text |
| `--flag` | `#8A5A12` | flagged / lawyer decides |
| `--mark` | `#F3DC6B` | highlighted source spans |
| `--ok` | `#2F6B4F` | verified checks |

Contrast (measured): ink on paper 15.8:1, carbon 10.4:1, stamp-text 5.9:1, flag 5.0:1, ok 5.3:1, ink on mark 13.5:1. `--stamp` (4.6:1) and `--carbon-soft` (2.2:1) are for graphics and large display only, never body text.

Type: **Archivo** (variable wdth 62–125, wght 100–900; OFL) for display and UI, **Tiro Devanagari Hindi** (OFL) for editorial and Hindi text, **IBM Plex Mono** (OFL) for dates, section numbers and the counter. Fluid scale: `--step--1` … `--step-6` via clamp.

Radius by hierarchy: 0 for paper and documents, 2px for index cards, 999px only for the stamp ring and pills. Grid: 12 columns, 16px gutters mobile, 24px desktop, max 1440px.

## Motion
- Durations: `tick` 180ms, `ui` 240ms, `story` 900ms, `slam` 420ms.
- Easings: `snap` cubic-bezier(.2,.9,.1,1) for UI; `paper` cubic-bezier(.65,0,.15,1) heavy for story; `slam` back-out with slight overshoot for the stamp only.
- Scroll: one pinned signature section (Ledger of Days, scrubbed); everything else reveals once, never re-animates. Lenis smooth scroll on desktop pointer devices only.
- Reduced motion: no pinning, no scrub, no travel. Counter shows the final number, the stamp is already down, ticker is static.

## Signature moment: the Ledger of Days
Trigger: scroll into the section (pinned for ~200vh on desktop, ~120vh on mobile).
1. A masked order sits on the paper. A split-flap counter reads days in custody, ticking up with scroll.
2. A diagonal half-line sweeps across the document as the count approaches the line.
3. On crossing, the stamp "479(3) PAST THE LINE" slams (420ms, slight overshoot, 2° rotation), the page darkens to ink, and the four lanes rise.
Fallback: reduced motion or no JS → static final state.

## Components
Ticker strip · tab nav (folder tabs) · diagonal hero with order card · Ledger section · lanes as index-card drawers · case drawer (document with marked spans, fields, rejected claims, typed rule trace) · split-flap counter · stamp · footer with cropped wordmark.
