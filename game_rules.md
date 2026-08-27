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

| Claim | What it takes to land | Needs |
|---|---|---|
| **No claim** | nothing — you keep exactly what the room gave | any table |
| **You've never heard this** | the more of the room it was new to, the better — and it still has to land | any table |
| **Everyone will like this** | how many gave it 4 or 5; one holdout costs you | 3+ players |
| **This will get to you** | how many say it moved them, whether or not they liked it | any table |
| **You will know it was me** | how many named you correctly — and it makes you easier to name all night | 3+ players, guessing on |
| **You will never guess it was me** | how many looked elsewhere; nothing at all if the room never guessed | 3+ players, guessing on |
| **This will split the room** | how far apart the answers landed; agreement scores nothing | 3+ players |

Each claim is **one a night**, so the whole decision is which of your tracks
deserves which bet. A claim that came true completely pays **half as much
again**; one that half came true changes nothing; one that did not come true at
all leaves the track worth **half**. A track with no claim is left alone — which
is exactly what makes no claim the safe play.

**The safe play is the floor, and that is the whole point.** No claim can never
lose you anything, and can never win you anything either. Everything else pays
more only if the track really is new to them, really does land with all of them,
really moves them, really is recognisably yours, or really does divide them.
Queueing something everybody will mildly enjoy is therefore never the strongest
line available.

Three things worth knowing:

- **Splitting the room is measured, not counted.** It is the root-mean-square
  distance between the answers, so it reads the *size* of each disagreement
  rather than which side of a line it fell on: 5 against 1 beats 5 against 4, and
  a room that answered 5, 5, 3, 3 has still disagreed. A track everybody disliked
  barely pays — the spread is small, and it multiplies a base near zero anyway.
- **Getting to someone is not the same as being liked.** A track can wreck a
  listener who gives it a 1, and that still pays.
- **Being recognised cuts both ways.** *You will know it was me* costs you
  elsewhere: the easier you are to name, the worse you do at being the Ghost. Its
  mirror, *you will never guess it was me*, pays for exactly what the first one
  spends — and pays nothing at all if the room never guessed, because hiding from
  people who were not looking is not hiding.

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

Note what "no two in a row" does *not* mean: the order is not a rotation. Every
DJ contributes the same number of tracks, so a naive interleave would produce
ABCABC and hand the room the whole running order after one cycle. Ties are
broken at random at every step instead. With a small table the constraint still
forces some of the order — at three players, after two tracks the third is
determined — and the room gets less predictable the more people are in it.

### 5. Each round

One track plays. Everyone can see it, open it, and hear it.

#### Answer, honestly

Four questions, and only the first one is about the score.

| | |
|---|---|
| **How much did you like it?** | 0–5. Zero is a real answer, not a shrug. |
| **Heard it before?** | Had you come across it before tonight? |
| **Popular?** | Is it a well-known track, whatever you think of it? |
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

- **the popularity tax** — the more of the room that calls it popular, the less
  it scores, down to half. A famous banger is never the easy winning move, but a
  beloved classic still keeps half of what it earned.
- **the claim** — the DJ's own bet, from ×0.5 to ×1.5.

#### Where the points come from

| | |
|---|---|
| A listener liked it | 0 to 5 |
| They had not heard it before | +1 |
| It got to them | +2 |
| They called it popular | takes off up to half the track |
| Your claim landed | up to ×1.5 |
| Your claim missed | ×0.5 |
| You named the DJ correctly | nothing |

Everyone who answered is added up, averaged, and multiplied back by how many
listeners were at the table — so somebody staying quiet costs the DJ nothing.

**Worked example.** Four listeners, all four answer: 5, 4, 4 and 3 makes 16.
None of them had heard it, so +1 each — 20. Two of them were moved, +2 each —
24. Nobody called it popular, so it stays 24. The claim *you've never heard
this* came true completely, half as much again: 36 points. Had two of the
four called it popular, the 24 would have become 18, and 27 after the claim.

#### Guess the DJ

Everyone except the DJ picks a name. Change your guess as often as you like —
nothing is locked until the host reveals.

A correct guess is **+1 to you**. It also feeds the DJ's identity claims, and it decides two of the trophies at the end. It is played for the fun
of being right, which turns out to be enough.

#### If it's your track

Nothing to do. You can't answer and you can't guess, so you sit and listen to
the room work out what it makes of something you chose — which is its own kind
of tension, and the only round of the night you spend as the audience.

---

Each round carries **a minute on the clock**, shown in the header. Nothing
happens when it reaches zero: it keeps counting the other way and turns red, so
the room can see who it is waiting on without anybody being cut off mid-answer.

**The round ends when everybody presses Done.** No host action, no waiting on
somebody to notice — the last Done reveals the track.

The host can still reveal by hand, but **not until everyone still connected has
voted**. That is the fallback for a room where somebody never gets round to
pressing anything; cutting the room off mid-vote used to be possible and it threw
away real answers.

Waiting cannot strand the night either: anyone who closes their laptop drops out
of the count the moment their socket goes, so the round becomes revealable on its
own. Answers are *not* waited on — one person with the tab open and their phone
in their pocket would freeze the game with no way out — but the round header
shows how many are still deciding, so the host can choose to wait.

### 6. The reveal

Everyone sees who the DJ was, what they claimed, every guess, whether the claim
landed — and **every answer, with a name against it**. That attribution is not
decoration; it is the only thing holding rule zero up.

**The score shows every step of its working**, in the order it happens: what each
listener's answer came to, those added up, divided by how many answered and
scaled back to the table, then the popularity tax, then the claim, then the
total.

Each step that scales the running figure prints **which number became which** —
`10 → 8` — rather than the multiplier that did it. A bare "×0.5" never said half
of *what*, and left the reader to work out it meant the line above.

---

## One score, and nobody wins it

Most of what you score, you score as a DJ: what your tracks did to the room, put
through your claim. The one thing you also score as a listener is naming the DJ, worth a point. Reading the room
is still played and still wins trophies — it feeds the identity claims too.

**The finale has no leaderboard, and there is no trophy for the highest total.**
The score exists to make the choices during the night matter — which track, which
claim — not to rank the people at the end of it. What the finale shows instead is
the music: which tracks the room rated highest, and which ones you personally are
taking home.

## What you take home

The finale lists every track that played, **ranked by what the room gave it**
rather than by running order — each row still carries the position it played in,
and two separate numbers:

- **♥** what the room gave: the likes, plus novelty and emotion.
- **★** what the DJ banked: that same figure once the popularity tax and their
  claim had their say.

They are kept apart on purpose. The first is the room's honest verdict on the
music; the second is the result of a gamble the DJ took before the night began,
and it has no business moving a track up a chart of what people liked. The
ranking follows the first.

That is the night's chart, though, not anybody's playlist. So the finale also
hands each player **their own takeaway** — every track *they* rated four or
more, with who played it, copyable in one click. That is the part you keep.

## Awards

Five at the end. **Ties are shared, never broken arbitrarily**, an award nobody
earned simply isn't given — and neither is one the whole room ties for. "Deep
Cut, 100%, everybody" is a fact about the night, not a trophy.

| Award | Won by |
|---|---|
| ★ **Track of the Night** | The single track the room rated highest |
| ☄ **Deep Cut** | Brought the track fewest people had heard — and it landed |
| ⚡ **Gut Punch** | Played the track that got to the most people |
| ◎ **Human Shazam** | Named the most DJs correctly |
| ☾ **The Ghost** | Lowest *rate* of being correctly identified |

Every one of them is about a track or a knack, never about a total. Track of the
Night is judged on what the room gave **before** the DJ's claim touches it, so a
lucky bet can never crown a track the room liked less. The Ghost is scored as a
percentage, not a count, so it can't be won by simply queueing more tracks than
everyone else.

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
- **Secrets are withheld, not hidden.** The DJ's identity, their claim,
  individual votes and every answer are simply not in the data your
  browser receives until the reveal — only a count of how many have answered.
- **Claims are locked at the drop**, one of each per player, and a claim the
  table can no longer support falls back to no claim rather than stranding you.
- **Every limit is server-side**: track counts, duplicates, name rules, who may
  answer and when, and what a like is allowed to be.
- **What the server cannot check is rule zero.** Whether you had heard it,
  whether it moved you, whether you think it's popular — those are self-reports,
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
