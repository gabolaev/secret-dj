# Secret DJ — the rules

A real-time listening party. Everyone queues music in secret, the room listens
together, spends its hearts, and tries to work out who put each track on.

Available in English and Russian; the toggle is in the header.

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
- **You never see another player's queue.** Only the tracks that actually got
  played become public — and at the very end, the ones that didn't.

The host can start once every player has finished queueing. Guessing needs at
least two DJs; a listening party can be played solo.

### 3. The setlist

The running order is built **once**, when the game starts:

- each DJ contributes a random subset of what they queued;
- the order is shuffled, then rearranged so the **same DJ never plays twice in a
  row** whenever that's mathematically possible.

### 4. Each round

One track plays. Everyone can see it, open it, and hear it. There are three
things to do, depending on who you are.

#### Spend a heart — or don't

You get a **limited number of hearts for the whole night**: about 40% of the
tracks you will actually hear. You cannot heart everything, so every heart is a
choice with a cost, and passing on something you liked is part of the game.

A heart is **+1** to the DJ.

#### Or spend your one anthem

You get exactly **one anthem per night**, worth **+3**. Save it for the track
you'll still be thinking about tomorrow — and once it's gone, it's gone.

Each round you choose one of: nothing, a heart, or the anthem. You can change
your mind until the reveal; switching refunds whatever you'd already spent.

#### Guess the DJ

Everyone except the DJ picks a name. Change your guess as often as you like —
nothing is locked until the host reveals. A correct guess is **+1**.

#### If it's your track: set a decoy

The DJ can't vote and can't heart their own track, so instead they get a move
nobody else has: **secretly name the player you want the room to blame.** Every
listener who guesses your decoy is **+1** to you.

A decoy pointing at the real answer scores nothing, obviously. If your decoy
leaves the room mid-round, it's dropped.

---

Once everyone still connected has voted, the round is marked ready. The host can
reveal at any point regardless, so one person walking away from their laptop can
never freeze the game.

### 5. The reveal

Everyone sees who the DJ was, every guess, who got it right, who fell for the
decoy, and who spent what. Then the host moves on, or closes out the night.

---

## Two scoreboards

The game serves two different people: the one who wants to share music they
love, and the one who wants to read the room. Forcing both onto one number
served neither, so there are two, and **nothing crosses between them**.

| Board | Counts |
|---|---|
| ♥ **Selector** | Hearts (+1) and anthems (+3) your tracks earned |
| ◎ **Detective** | Your correct guesses (+1) and listeners your decoys fooled (+1) |

Your taste cannot win you the deduction game, and reading the room cannot win
you the music one.

## Awards

Three per board, at the end. **Ties are shared, never broken arbitrarily**, and
an award nobody earned simply isn't given.

| Award | Board | Won by |
|---|---|---|
| ♥ **Crowd Favourite** | Selector | Most love collected across the night |
| ★ **Track of the Night** | Selector | The single track that moved the most people |
| ◈ **Golden Ear** | Selector | Spent their anthem on the track that earned it |
| ◎ **Human Shazam** | Detective | Most correct guesses |
| ☾ **The Ghost** | Detective | Lowest *rate* of being correctly identified |
| ⌘ **Puppet Master** | Detective | Sent the most people chasing the wrong DJ |

The Ghost is scored as a percentage, not a count, so it can't be won by simply
queueing more tracks than everyone else.

---

## Fair play, and how it's enforced

These aren't honour-system rules. They're properties of the server.

- **Your identity is a token, not a name.** The server issues a secret when you
  join and derives who you are from your connection. No client message carries
  a username, so "vote as someone else" is not a request the protocol can
  express.
- **Only the host** can change settings, start the game, reveal a round or
  advance — checked on the server, on every command.
- **Secrets are withheld, not hidden.** The DJ's identity, their decoy,
  individual votes, and who spent which heart are simply not in the data your
  browser receives until the reveal. Nor is anyone else's wallet — knowing whose
  anthem was still unspent would narrow down who just used one.
- **The wallet is server-side and atomic.** Switching a heart for your anthem
  refunds and charges in a single step, so no amount of clicking can conjure an
  extra heart.
- **Every limit is server-side**: track counts, duplicates, name rules, who may
  vote and when.

## Coming and going

- **Disconnecting keeps your seat.** Your tracks, scores, hearts and guesses
  survive a refresh, a closed tab, a dead train tunnel.
- **Multiple tabs are fine.** You show as present until the last one closes.
- **Leaving is deliberate.** Press Leave and your seat is released: your
  unplayed tracks come out of the setlist, while everything already played stays
  in the history with your name on it.
- **The crown always moves.** If the host leaves, it passes immediately. If the
  host merely vanishes, it passes after a short grace period.
- **Rooms clean themselves up** once everyone has gone.
