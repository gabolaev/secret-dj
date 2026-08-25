# Secret DJ — "Redaction" redesign: handoff

Design source of truth: `Secret DJ - Redaction.dc.html` in this project. Open it and
read the values off the elements — it is a working HTML file, not a picture. Every
hex, size and duration below appears in it.

**The governing idea.** This game is made of things that exist and are being withheld —
the DJ's identity, their claim, everyone's answers — and then handed over all at once
with names attached. So the design has one job before all others: a rendering mode for
*withheld* that is visibly distinct from *absent*. That mode is **redaction**: a solid
ink bar with a 45° hatch, occupying exactly the space the secret will occupy when it is
told, wiped away left-to-right at the reveal. Nothing reflows, nothing appears from
nowhere; the page just stops covering things up.

Two rejected directions, for the record: *Lights Down* (withheld = unlit / out of focus)
failed accessibility — a blur is not information and has no non-visual equivalent.
*Static* (withheld = live grain) was the most alive and least disciplined — persistent
sidebar motion pulls the eye off the track you are meant to be listening to.

---

## 1. Tokens

Replace the contents of `frontend/src/styles/theme.css`. The old file's structure is
fine; the values and the rationale comments all go.

```css
:root {
  color-scheme: light;

  /* surfaces — paper, not panels */
  --bone:      #EAE6DD;   /* page */
  --paper:     #F5F2EC;   /* raised rows, cards, inputs */
  --ink:       #171614;   /* text, filled keys, the reversed band */
  --ink-2:     #4A473E;   /* secondary text, all mono annotation */
  --rule:      #CFC9BB;   /* hairlines */
  --rule-soft: #B9B3A4;   /* dashed "not here yet" outlines */

  /* the one hot colour */
  --signal:      #B8391F; /* fills only: primary key, timer over, avatar */
  --signal-ink:  #FFFFFF; /* on --signal */
  --signal-text: #8F2A12; /* the same red as words at small sizes */

  /* redaction */
  --redact: #16150F;
  --redact-hatch: repeating-linear-gradient(45deg,#16150F 0 4px,#2B2921 4px 8px);
  --redact-label: #8A8474; /* the "SEALED" legend on top of a bar */
  --on-ink:  #F5F2EC;      /* text on --ink */
  --on-ink-2:#A09A8B;      /* secondary text on --ink */
}
```

### Measured contrast (WCAG 2.1, sRGB)

| pair | ratio | verdict |
|---|---|---|
| `--ink` #171614 on `--bone` #EAE6DD | **14.5:1** | AAA, body text |
| `--ink` on `--paper` #F5F2EC | **15.2:1** | AAA |
| `--ink-2` #4A473E on `--paper` | **8.3:1** | AAA, all 11px mono annotation |
| `--signal` #B8391F on `--bone` | **4.6:1** | AA for ≥19px and for non-text (fills, borders) — **never small text** |
| `--signal-text` #8F2A12 on `--paper` | **7.4:1** | AA/AAA, red as words |
| `--signal-ink` #FFFFFF on `--signal` | **5.8:1** | AA — the primary key's label |
| `--on-ink` #F5F2EC on `--ink` | **15.2:1** | AAA, the reversed DJ band |
| `--on-ink-2` #A09A8B on `--ink` | **6.4:1** | AA, secondary text on ink |
| `--redact-label` #8A8474 on `--redact` #16150F | **5.1:1** | AA, the "SEALED" legend |

**Never colour alone.** Every state carries a word or a mark as well as a colour:
`HERE / GONE / YOU`, `SEALED`, `✓` on a correct guess, `LANDED · ×1.5`. A correct guess
is fill + tick + weight — three signals, so it survives greyscale.

## 2. Type

```css
--font-ui:   'Archivo', -apple-system, 'Segoe UI', system-ui, sans-serif;
--font-num:  'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace;
--font-disp: 'Instrument Serif', Georgia, 'Times New Roman', serif;
```

- **Archivo** — everything you read. Grotesque, wide apertures, holds up at 13px and
  survives Cyrillic (it ships a full Cyrillic set — check before you cut over).
- **IBM Plex Mono** — every number, every label, every annotation. Mono is earned here:
  the product's payoff is an arithmetic receipt, and tabular figures are why `27 → 4.5`
  reads at four feet.
- **Instrument Serif** — display only: "That was the night.", the join headline. One or
  two per screen, never in a table. Cyrillic is *not* covered — the RU locale falls back
  to Archivo at the same size; check the two side by side before shipping.

| step | size / line-height | use |
|---|---|---|
| micro | 10–11px / 1.6, `letter-spacing:.12–.14em`, uppercase | mono labels, annotations |
| body | 13–15px / 1.45 | rows, copy |
| lead | 16–17px / 1.5 | the one sentence that matters on a screen |
| figure | 17–22px mono 600 | ledger changes, rating keys |
| name | 40px / 1.05 (26px at 375) | the revealed DJ |
| display | 30–44px Instrument Serif | join, finale |

Tracking goes on uppercase mono labels only, never on a sentence — tracked-out Cyrillic
prose is what killed the last skin. Every centred tracked label needs
`text-indent: <same value>` or it sits left of optical centre.

**Russian.** Nothing may depend on a string being short. Every label is its own flex
item with `min-width:0`; rows use `overflow:hidden;text-overflow:ellipsis;white-space:nowrap`
only where a full value is available elsewhere (track titles, player names). Never
truncate a claim name, an error, or a ledger label — those wrap.

## 3. Spacing, radii, elevation

Spacing is a 4px grid: `4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 40`. Row padding is
`9–11px 12px`; card padding `13–16px`; screen padding `20px` desktop / `14px` at 375.

**Radii: 0 everywhere.** The only rounded things are the outer app frame (`4px`) and the
room-code chip (`2px`). Printed matter has no corner radius, and dropping radius entirely
is what stops the redaction bars reading as "chips".

**Elevation: none.** No shadows, no glass, no gradients anywhere in the product. Depth is
done with one hairline (`1px solid var(--rule)`) and with fill inversion (`--ink` block).
Lists are `display:flex;flex-direction:column;gap:1px` inside a bordered box — the gap
*is* the rule, so rows never double up borders.

## 4. Motion

One easing, `cubic-bezier(.2,.8,.2,1)`, everywhere. Three durations only:

| what | duration | notes |
|---|---|---|
| the wipe (any redaction uncovering) | **420ms** | `clip-path: inset(0 0 0 0)` → `inset(0 0 0 100%)` |
| state colour change (stamps, chips) | 420ms | rides along with the wipe |
| hover / press | 90ms | background only |

**What animates:** only covers. **What must never animate:** layout, position, opacity of
content, list reordering, the embed, and anything on an idle screen. If something is
moving, a secret is being opened — that is the whole rule, and it is what buys the motion
its meaning.

The ledger is **host-paced**, one row per press, not a timed cascade — a room that wants
to argue about a row can sit on it.

```css
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 1ms !important; animation-duration: 1ms !important; }
}
```
The reveal is *identical* under reduced motion — a cut instead of a wipe. Nothing is
communicated by the animation that is not also communicated by the end state plus its
label.

## 5. Iconography

Effectively none. The product's marks are: `✓` (correct guess), `×` (remove), `♥` (what
the room gave), `★` (what the DJ banked), `☄ ⚡ ◎ ☾ ◇` (the five awards, one glyph each),
`▶ ■` (the fidget's transport). Text glyphs, `font-variant-emoji: text`, never colour
emoji, never an icon font. Service logos are the existing SVGs in
`frontend/src/assets/` — keep them, 14–15px, no recolouring.

No vinyl, no turntables, no waveforms, no headphones, no EQ bars.

## 6. The foreign embed

The Spotify/YouTube iframe is quarantined, not integrated: a `--ink` passe-partout with
a printed caption strip above it (`NOW PLAYING … SPOTIFY · EMBED`) and 10px of ink
around it. Framing a foreign object admits that it is foreign. Do not try to blend it —
that is how you get a design that only works for one provider. Bandcamp (which cannot
play inline) says so on its lobby row rather than failing at the drop.

## 7. Screen map — which design goes where

| screen | design (in the DC) | repo |
|---|---|---|
| Join | turn 3, 375px column | `screens/JoinScreen.tsx` |
| Lobby + claim hand | turn 3, `#3a` desktop + 375 sheet | `screens/LobbyScreen.tsx`, `components/ClaimPicker.tsx`, `UrlField.tsx`, `TrackList.tsx` |
| Round | turn 1, `#1a` desktop + 375 (your-own-track) | `screens/RoundScreen.tsx`, `AnswerBar.tsx`, `ChipPicker.tsx`, `TrackEmbed.tsx` |
| Reveal | turn 2, `#2a` desktop + 375 | `components/RevealPanel.tsx` |
| Finale | turn 3, `#3b` desktop + 375 | `screens/FinaleScreen.tsx`, `AwardCard.tsx` |
| Roster / setlist / fidget | turn 1 sidebar | `components/Sidebar.tsx`, `PlayerRoster.tsx`, `DrumMachine.tsx` |

**Delete:** `components/Bench.tsx`, `components/Cables.tsx`, `components/Window.tsx`
(the title-bar chrome), the `.bench__*`, `.dm__*`, `.win__*`, `.knob`, `.eq` rule blocks,
and the `body::before` wash. The whole hardware/Teenage-Engineering vocabulary goes:
no bevels, no keycaps, no readout panels, no `box-shadow` inset light edges.

## 8. Behaviour that isn't visible in a screenshot

These are the rules the design depends on. Getting them wrong breaks the game, not just
the look.

1. **During a round, publish counts only — never names.** No per-player answered/deciding
   state anywhere: the DJ is the one person who cannot answer, so a roster of
   `DONE / DECIDING` names them by omission. The round shows `6 OF 8 SEALED` and
   `2 STILL OUT`. The roster shows **presence only** (`HERE / GONE / YOU`). This is a
   change from today's `PlayerRoster`, and it is the most important item on this list.
2. **Names arrive with answers, together, at the reveal** — one wipe, not two stages.
3. **A redaction bar is sized by its content**, so the covered element must be rendered
   at full size underneath and covered by an absolutely-positioned sibling. Do not
   render a placeholder and swap it — the "no reflow" promise is the direction.
4. **Never send a secret to the client early.** `projectGame()` stays exactly as it is;
   the covers are a rendering of information the browser genuinely does not have. Do not
   be tempted to ship the payload and hide it in CSS.
5. **Claims are a hand, one use each.** A spent card leaves the hand and appears struck
   through with the track that took it. A claim the table cannot support (needs 3+
   players, or guessing off) is struck through **with the reason printed on it** — never
   hidden, never silently downgraded. No-claim is a legitimate finished state and the
   empty slot must never nag.
6. **The ledger never prints a bare multiplier.** Every step prints which number became
   which (`36 → 33`) plus one plain sentence naming the cause. Five steps, fixed order:
   sum → average over answerers → scale to table → popularity tax → claim.
7. **♥ and ★ stay apart, always.** ♥ (what the room gave, pre-tax pre-claim) ranks the
   finale; ★ (what the DJ banked) never ranks anything and is always set quieter.
8. **Ties share a rank** and an award nobody earned — or that the whole room ties for —
   is printed as "Not given" with the reason, not omitted.
9. **A failed metadata lookup is a designed state**: `--signal-text` label, the raw URL
   as the content, one line of copy taking the blame. Never invent a title.
10. **Disconnection is designed, not apologised for**: the dropped player leaves the
    answer count immediately so the round stays revealable, and their row reads
    `GONE` — their seat, tracks and answers are all still theirs.
11. **The fidget survives** (`DrumMachine`), rebuilt as a punched card: silent, local,
    worth no points, seeded with a pattern, and **it must not auto-run** — that is how it
    stays honest with `prefers-reduced-motion`.
12. **Hit targets ≥44px** on touch. The rating keys are 52px desktop / 56px at 375, six
    across, nothing hidden behind a sheet.

## 9. Suggested order of work

1. `theme.css` — tokens, then delete the hardware CSS. Everything else is easier after.
2. `PlayerRoster` + the round's counters — item 8.1, the game-logic fix.
3. `RoundScreen` — the redaction primitive lands here first (one `<Redacted>` component:
   renders children at full size, covers them, wipes on `revealed`).
4. `RevealPanel` — the DJ band, the attributed table, the stepped ledger.
5. `LobbyScreen` + `ClaimPicker` — the hand.
6. `FinaleScreen`, `JoinScreen`.
7. RU pass: 16 players, longest Cyrillic names, every screen at 375px.
