<div align="center">

# ◉ Secret DJ

**A real-time listening party. Everyone queues a track in secret, the room
spends its hearts, and guesses who put it on.**

English · Русский

</div>

---

## Run it

The published image bundles the API and the built frontend, so one container is
the whole app.

```bash
docker run -d --name secret-dj -p 4000:4000 --restart unless-stopped \
  gabolaev/secret-dj:latest
```

Open <http://localhost:4000>, start a room, and share the invite link.

To update, pull and recreate:

```bash
docker pull gabolaev/secret-dj:latest
docker rm -f secret-dj && docker run -d --name secret-dj -p 4000:4000 \
  --restart unless-stopped gabolaev/secret-dj:latest
```

Behind a reverse proxy, pass the two settings that matter — see
[Configuration](#configuration) for the rest:

```bash
docker run -d --name secret-dj -p 4000:4000 --restart unless-stopped \
  -e TRUST_PROXY_HOPS=1 \
  -e CORS_ORIGIN=https://secretdj.example.com \
  gabolaev/secret-dj:latest
```

Or build from this checkout instead of pulling:

```bash
docker compose up --build      # http://localhost:4000
```

> **Run exactly one instance.** Game state lives in the server's memory — there
> is no shared store — so a second replica means players landing on different
> instances and not seeing each other. For the same reason, restarting the
> container ends any game in progress.

## Development

```bash
npm install
npm run dev
```

Three watchers start together: `common` rebuilds shared types, the backend runs
on **:4000** with hot restart, and Vite serves the app on **:5173**. Vite
proxies both `/api` and `/socket.io` through to the backend, so there is nothing
to configure.

Open <http://localhost:5173>.

To play a real game you need **two browsers** (or one normal window and one
private) — the session token lives in `localStorage`, so two tabs in the same
profile are the same player. Guessing needs at least two DJs; to poke at it
alone, turn **Guessing** off in room settings for a solo listening party.

| | |
|---|---|
| `npm run verify` | typecheck + lint + tests + build, everything the CI would run |
| `npm test` | 154 tests |
| `npm run test:watch` | tests on save |
| `npm run typecheck` | whole-repo project references, plus the test files |
| `npm run lint` | |
| `npm run build` | `common` → `backend` → `frontend` |
| `npm start` | production mode: API + built frontend on :4000 |

## How it works

```
 browser                     node
┌─────────────┐  socket.io   ┌──────────────┐    ┌───────────────┐
│ useSecretDj │◀────────────▶│   gateway    │───▶│   GameRoom    │  the engine:
│  (1 socket) │   session    │ auth + limits│    │ every rule,   │  pure, no I/O
└─────────────┘   token      └──────┬───────┘    │ every guard   │
       ▲                            │            └───────┬───────┘
       │      GameView per viewer   ▼                    │
       └────────────────────  projectGame()  ◀───────────┘
                              the one place secrets are withheld
```

Three workspaces:

| | |
|---|---|
| `common/` | Types, wire protocol, music-service registry, scoring, setlist building. Shared verbatim by both sides. |
| `backend/` | Express + socket.io. The game engine, the projection layer, metadata lookup, SSRF-safe outbound HTTP. |
| `frontend/` | React 19 + Vite. One socket, one hook, four screens, two languages. |

### The game

Everyone queues three tracks; two of them play, chosen at random. You get a
small budget of **hearts** for the whole night and exactly one **anthem** worth
triple, so backing a track always costs you something. Guess the DJ behind each
track — and while your own track plays, secretly pick who you want the room to
blame instead. Two scoreboards: **Selector** for the love your tracks earned,
**Detective** for guesses and decoys. Full rules in
[`game_rules.md`](./game_rules.md).

### Design rules the code actually follows

**Identity is a token, never a name.** Create/join returns a secret; the server
derives the actor from the socket session. After the handshake, no client
message carries an identity — so impersonation isn't a bug you can have, it's a
request the protocol can't express.

**One engine, one guard rail.** Every transition goes through a method on
`GameRoom` that begins by asserting the actor and the phase. There is no path
that skips it.

**One projection.** `projectGame(room, viewer)` is the only function that turns
state into something a client sees. Who queued the track, who voted for whom,
and who hearted it are *withheld from the payload* until the reveal — not
hidden in the UI. One file to audit.

**Nothing user-supplied gets fetched blindly.** Outbound requests are restricted
to known music hosts, re-checked at every redirect, resolved through DNS and
rejected if they land on a private address.

**No prose on the wire.** The server returns error *codes*, and `buildEmbed`
returns issue codes rather than sentences, so the UI renders every message in
the player's own language. Adding a locale means adding one file — the English
catalogue defines the type, so a missing key is a build failure, never a string
that silently falls back at 2am.

## Languages

English and Russian, toggled in the header (and in the rules sheet). The choice
is remembered; with nothing stored the app follows the browser. Plural forms go
through `Intl.PluralRules`, so Russian gets its three forms — 1 трек, 2 трека,
5 треков — rather than an English-shaped guess.

To add a locale: copy `frontend/src/i18n/ru.ts`, translate it, and register it
in `frontend/src/i18n/index.tsx`. TypeScript will tell you what you missed.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `4000` | HTTP + socket port |
| `NODE_ENV` | — | `production` serves the built frontend and locks CORS to same-origin |
| `CORS_ORIGIN` | same-origin in prod, `*` in dev | Comma-separated allowed origins |
| `LOG_LEVEL` | `info` in prod, `debug` otherwise | `debug` \| `info` \| `warn` \| `error` \| `silent` |
| `TRUST_PROXY_HOPS` | `1` | Proxy hops in front of the app, for correct per-IP rate limiting |
| `FRONTEND_DIST` | `../../frontend/dist` | Override the static asset directory |
| `VITE_BACKEND_URL` | same origin | Set only if the API lives on another host |

## Supported services

Spotify · YouTube · YouTube Music · Apple Music · Deezer · SoundCloud · TIDAL ·
Bandcamp · Yandex Music

Everything but Bandcamp plays inline. Detection, canonical identity (for
duplicate checking) and embed construction all come from one registry in
`common/src/musicServices.ts`.

## Rules

See [`game_rules.md`](./game_rules.md).

---

Not a single line of code in this repository was written by a human being.
Except this one.
