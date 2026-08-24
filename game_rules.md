# Secret DJ — the rules

A real-time listening party. Everyone queues music in secret, the room listens
together, says what it honestly thought, and tries to work out who put it on.

Available in English and Russian; the toggle is in the header.

---

## Rule zero

**Never lie in your answers.**

Whether you had heard a track before, whether you reckon everybody knows it,
whether it got to you — none of that can be checked by anything except the
people sitting with you. There is no clever mechanism that could verify it, and
there never will be. The game is a room of people describing honestly what music
did to them; strip that out and there is nothing left to play.

Two things back it up rather than nagging about it. Every answer is **printed
with your name on it at the reveal**, so a lie is something you have to say out
loud to your friends. And every number in the scoring is a **share of the room**
rather than a threshold, so one dishonest answer moves any of it by a fraction —
in a room of six, by a sixth. Lying is visible and it is barely worth telling.

---

## The night, in order

### 1. The room

The first person to create a room is the **host**. Everyone else joins with a
five-character room code (or the invite link, which carries the code in the
URL fragment).

- Names must be unique within a room, compared case-insensitively.
- Up to 16 people.
- **Nobody can join once the music has started.**

### 2. Queueing

Everyone — the host included — queues the number of tracks the host sets. But
**only some of them play**, chosen at random. The default is queue three, play
two.

That gap is deliberate. If every DJ contributed exactly the same, known number
of tracks, the last rounds would be solvable by elimination: once someone's
tracks had all been revealed, they were out of the running, and the final track
was a free point for everybody. Queueing more than plays means you can never be
sure a DJ is spent.

- Supported: Spotify, YouTube, YouTube Music, Apple Music, Deezer, SoundCloud,
  TIDAL, Bandcamp and Yandex Music.
- The same song cannot be queued twice **in the whole room**, no matter how the
  link was shared. `?si=` tokens and locale prefixes don't fool it.
- You can add and remove your own tracks freely until the game starts, and
  nobody else's — ever.
- **Every track carries a claim.** See below; it is the one decision you make
  before the night begins, and it is worth more than the tracks themselves.
- **You never see another player's queue.** Only the tracks that actually got
  played become public — and at the very end, the ones that didn't.

The host can start once every player has finished queueing. Guessing needs at
least two DJs; a listening party can be played solo.

### 3. Claims

Each track you queue carries a **claim**: what you are betting it will do to the
room. **Nobody else sees it until the reveal** — it multiplies whatever the room
gives you, and then they find out what you were playing for.

| Claim | Multiplier | How many |
|---|---|---|
| · **No claim** | ×1 | as many as you like |
| ☄ **You've never heard this** | ×0.5–1.5 on the share it was new to | one a night |
| ♡ **Everyone will like this** | ×0.5–1.5 on the share who gave it 4+ | one a night |
| ⚡ **This will get to you** | ×0.5–1.5 on the share it moved | one a night |
| ◈ **You will know it was me** | ×0.5–1.5 on the share who named you | one a night |
| ◑ **This will split the room** | ×0.5–1.5 on how evenly it divided them | one a night |

**No claim is the floor, and that is the whole point.** It asks nothing of the
music and can never lose you anything — but it can never win you anything
either. Every other claim pays up to half again, and halves your take if it
misses. Queueing something everybody will mildly enjoy is therefore never the
strongest line available.

A few notes on what lands:

- **This will split the room** needs both camps. Loved is a 4 or 5; not-loved is
  a 0 or a 1. Unanimous praise scores nothing here, and so does unanimous
  contempt — you cannot farm it with something merely annoying.
- **This will get to you** is not the same bet as *everyone will like this*.
  A track can wreck somebody who gives it a 1.
- **You will know it was me** is the one claim that costs you on the other side
  of the game: the easier you are to name, the worse you do at being the Ghost.
- Claims that would give the game away are simply not offered — identification
  needs guessing switched on, and "everyone", "split" and "recognise me" all
  need at least three at the table to mean anything.

Claims are locked when the music starts. It is a bet, made blind, or it is
nothing.

**And it stays secret while the track plays**, for two reasons. Each claim is
one a night, so a claim on screen would narrow who the DJ is by elimination —
a second *you've never heard this* says "not whoever played the first". Worse,
announcing it leans on the very answers it is scored on: told that a track is
obscure, people are slower to admit they knew it. A bet nobody can hear cannot
bend the answers it depends on.

### 4. The setlist

The running order is built **once**, when the game starts:

- each DJ contributes a random subset of what they queued;
- the order is shuffled, then rearranged so the **same DJ never plays twice in a
  row** whenever that's mathematically possible.

### 5. Each round

One track plays. Everyone can see it, open it, and hear it.

#### Answer, honestly

Four questions, and only the first one is about the score.

| | |
|---|---|
| **How much did you like it?** | 0–5. Zero is a real answer, not a shrug. |
| **Heard it before?** | Had you come across it before tonight? |
| **Everyone knows this?** | Is it a well-known track, whatever you think of it? |
| **It got to you?** | Did it move you? Liking it is a separate question. |

**The number is the signature on your whole answer.** Until you pick one, the
three toggles count for nothing — and if you say nothing at all, you are simply
not counted. Staying quiet is an honest thing to do if you stepped out, and it
is worth knowing that it is also *neutral*: the scoring averages over whoever
answered and scales back up to the whole table, so silence neither helps nor
hurts a DJ.

While the round is open the room sees only **how many people have answered**,
never what they said. Publishing the running score would anchor everyone still
deciding, and with two answers in it would give away what the first one was.

#### What a track is worth

Per listener who answered:

```
their like  +1 if it was new to them  +2 if it got to them
```

averaged, then scaled to the size of the table. Then two multipliers:

- **the tax on the obvious** — the more of the room that calls it well known,
  the less it scores, down to half. A famous banger is never the easy winning
  move, but a beloved classic still keeps half of what it earned.
- **the claim** — the DJ's own bet, from ×0.5 to ×1.5.

#### Guess the DJ

Everyone except the DJ picks a name. Change your guess as often as you like —
nothing is locked until the host reveals.

Guessing **wins you no points**. It feeds the DJ's *you will know it was me*
claim, and it decides two of the trophies at the end. It is played for the fun
of being right, which turns out to be enough.

#### If it's your track: set a decoy

The DJ can't vote and can't answer on their own track, so instead they get a
move nobody else has: **secretly name the player you want the room to blame.**
Every listener who guesses your decoy is **+1** to you.

A decoy pointing at the real answer scores nothing, obviously. If your decoy
leaves the room mid-round, it's dropped.

---

Once everyone still connected has voted, the round is marked ready. The host can
reveal at any point regardless, so one person walking away from their laptop can
never freeze the game.

### 6. The reveal

Everyone sees who the DJ was, what they claimed, every guess, who fell for the
decoy, whether the claim landed — and **every answer, with a name against it**. That attribution is
not decoration; it is the only thing holding rule zero up.

The score shows its working in three lines: what the room gave, what calling it
obvious took back, and what the claim did to the remainder.

---

## One score

Everything you score, you score as a DJ: what your tracks did to the room, put
through your claim, plus the decoys you got away with. Reading the room is still
played and still wins trophies — it no longer pays.

## What you take home

The setlist is a record of the night; it is nobody's playlist. So the finale
also hands each player **their own takeaway** — every track *they* rated four or
more, with who played it, copyable in one click. That is the part you keep.

## Awards

Seven at the end. **Ties are shared, never broken arbitrarily**, and an award
nobody earned simply isn't given.

| Award | Won by |
|---|---|
| ♥ **Crowd Favourite** | Scored the most across the night |
| ★ **Track of the Night** | The single track the room rated highest |
| ☄ **Deep Cut** | Brought the track fewest people had heard — and it landed |
| ⚡ **Gut Punch** | Played the track that got to the most people |
| ◎ **Human Shazam** | Named the most DJs correctly |
| ☾ **The Ghost** | Lowest *rate* of being correctly identified |
| ⌘ **Puppet Master** | Sent the most people chasing the wrong DJ |

Track of the Night is judged on what the room gave, **before** the DJ's claim
touches it, so a lucky bet can never crown a track the room liked less. The
Ghost is scored as a percentage, not a count, so it can't be won by simply
queueing more tracks than everyone else.

---

## Fair play, and how it's enforced

Everything the server *can* check, it does — and it is honest about the one
thing it can't.

- **Your identity is a token, not a name.** The server issues a secret when you
  join and derives who you are from your connection. No client message carries
  a username, so "vote as someone else" is not a request the protocol can
  express.
- **Only the host** can change settings, start the game, reveal a round or
  advance — checked on the server, on every command.
- **Secrets are withheld, not hidden.** The DJ's identity, their decoy, their
  claim, individual votes and every answer are simply not in the data your
  browser receives until the reveal — only a count of how many have answered.
- **Claims are locked at the drop**, one of each per player, and a claim the
  table can no longer support falls back to no claim rather than stranding you.
- **Every limit is server-side**: track counts, duplicates, name rules, who may
  answer and when, and what a like is allowed to be.
- **What the server cannot check is rule zero.** Whether you had heard it,
  whether it moved you, whether you think it's obvious — those are self-reports,
  and no amount of engineering changes that. What the code does instead is print
  them with your name on them, and make sure a single lie is worth almost
  nothing.

## Coming and going

- **Disconnecting keeps your seat.** Your tracks, scores, ratings and guesses
  survive a refresh, a closed tab, a dead train tunnel.
- **Multiple tabs are fine.** You show as present until the last one closes.
- **Leaving is deliberate.** Press Leave and your seat is released: your
  unplayed tracks come out of the setlist, while everything already played stays
  in the history with your name on it.
- **The crown always moves.** If the host leaves, it passes immediately. If the
  host merely vanishes, it passes after a short grace period.
- **Rooms clean themselves up** once everyone has gone.
