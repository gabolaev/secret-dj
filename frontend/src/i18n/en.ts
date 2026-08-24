import type { AwardId, ClaimId, EmbedIssue, ErrorCode } from '@secret-dj/common';
import { en2 } from './plural';

/**
 * The English catalogue, and the source of truth for the message shape.
 *
 * `Messages` is derived from this object, so every other locale is checked
 * against it structurally: a missing key or a function with the wrong arity is
 * a compile error, not a string that silently falls back to English at 2am.
 */
export const en = {
    brand: { name: 'Secret', accent: 'DJ' },

    common: {
        loading: 'Loading',
        close: 'Close',
        copy: 'Copy',
        open: 'open ↗',
        you: 'you',
        host: 'Host',
        nothingYet: 'Nothing here yet.',
    },

    locale: { label: 'Language', en: 'EN', ru: 'RU' },

    join: {
        tagline:
            'Everyone queues a track in secret. The room rates it out of five, and tries to work out who put it on.',
        nameLabel: 'Your name',
        namePlaceholder: 'DJ Nightshift',
        codeLabel: 'Room code',
        codeOptional: 'optional',
        codePlaceholder: 'e.g. K7QM2',
        create: 'Start a new room',
        join: 'Join room',
        connecting: 'Connecting…',
        reconnecting: 'Reconnecting…',
        howItWorks: 'How it works',
        genericError: 'That did not work.',
        services:
            'Works with Spotify, YouTube, Apple Music, Deezer, SoundCloud, TIDAL, Bandcamp and Yandex Music.',
        findingSeat: 'Finding your seat…',
    },

    shell: {
        room: 'room',
        copyInvite: 'copy link',
        copied: 'copied!',
        copyPrompt: 'Copy this invite link:',
        rules: 'Rules',
        leave: 'Leave',
        live: 'live',
        connecting: 'connecting',
        offline: 'offline',
    },

    roster: {
        inTheRoom: 'In the room',
        yourQueue: 'Your queue',
        played: 'Played',
        playlist: 'Playlist',
        ready: 'ready',
        away: 'away',
        gone: 'left',
        thinking: 'thinking',
        lockedIn: 'locked in',
        onTheDecks: 'on the decks',
        scoreTitle: 'What your tracks earned',
    },

    lobby: {
        queueMore: (n: number) => `Queue ${en2(n, 'more track', 'more tracks')}`,
        setReady: 'Your set is ready',
        hintSecret: 'Nobody can see what you pick — not now, not later.',
        hintWaiting: (names: string) => `Waiting on ${names}.`,
        hintHostCanStart: 'Everyone is ready. Drop the needle whenever you like.',
        hintWaitingForHost: 'Everyone is ready. Waiting for the host to start.',
        emptyQueue: 'Nothing queued yet. Paste a link above.',
        title: 'Warm-up',
        settings: 'Room settings',
        willPlay: (n: number) => `${n} will play`,
        tracksQueued: 'Tracks each DJ queues',
        tracksQueuedHint: 'Queue more than gets played, so nobody can count who is spent.',
        tracksPlayed: 'How many actually play',
        tracksPlayedHint: (total: number) => `${en2(total, 'track', 'tracks')} in the setlist right now.`,
        fewer: 'Fewer',
        more: 'More',
        guessing: 'Guessing',
        guessingOn: 'Guess the DJ behind each track, set decoys, and unlock the claims scored on being recognised.',
        guessingOff: 'Listening party: answers only, no guessing, no decoys.',
        start: 'Start the night',
        needTwo: 'Guessing needs at least two DJs — invite someone, or switch to a listening party.',
        stillQueueing: (names: string) => `Still queueing: ${names}.`,
    },

    claims: {
        label: 'Your claim',
        hint: 'Each claim is one a night. No claim is the floor — the rest pay more only if they land, and less if they miss.',
        yoursOnly: 'Your bet — nobody else sees it until the reveal.',
        spent: 'Already played tonight',
        none: {
            title: 'No claim',
            blurb: 'Just the track. Whatever the room gives, you keep.',
        },
        'never-heard': {
            title: "You've never heard this",
            blurb: 'Pays on how much of the room it was new to — and it still has to land.',
        },
        unanimous: {
            title: 'Everyone will like this',
            blurb: 'Pays on how many gave it four or more. One holdout costs you.',
        },
        emotional: {
            title: 'This will get to you',
            blurb: 'Pays on how many say it moved them. Liking it is a different question.',
        },
        'so-me': {
            title: 'You will know it was me',
            blurb: 'Pays on being recognised — and makes you easier to name all night.',
        },
        divisive: {
            title: 'This will split the room',
            blurb: 'Pays on an even split of loved and hated. Agreement scores nothing.',
        },
    } satisfies { label: string; hint: string; spent: string; yoursOnly: string } & Record<
        ClaimId,
        { title: string; blurb: string }
    >,

    url: {
        placeholder: 'Paste a Spotify, YouTube, Apple Music… link',
        submit: 'Queue it',
        hintEmpty: 'Anything goes — the more surprising, the better.',
        hintInvalid: 'That does not look like a link yet.',
        hintUnsupported:
            'We cannot play that host. Try Spotify, YouTube, Apple Music, Deezer, SoundCloud, TIDAL or Yandex.',
        hintLooking: 'Looking it up…',
        hintGood: 'Looks good.',
        hintReady: 'Ready to queue.',
        loading: 'Loading…',
    },

    tracks: {
        remove: 'Remove',
        playingNow: 'Playing now',
    },

    round: {
        position: (n: number, total: number) => `Track ${n} of ${total}`,
        titleMine: 'Yours',
        findingTrack: 'Finding the track…',
        openIn: (service: string) => `Open in ${service} ↗`,
        openLink: 'Open the link',
        answered: (n: number) => `${en2(n, 'listener', 'listeners')} answered`,
        voted: (n: number, total: number) => `${n}/${total} voted`,
        hostReveal: 'Reveal the DJ',
        hostNext: 'Next track',
        hostFinish: 'Close out the night',
        hostWaitingVotes: (n: number) =>
            `Still waiting on ${en2(n, 'vote', 'votes')} — reveal anyway if someone has wandered off.`,
        waitingForNext: 'Waiting for the host to cue the next track…',
        waitingForReveal: 'Everyone has voted. Waiting for the host to reveal…',
    },

    answer: {
        likeTitle: 'How much did you like it?',
        likePrompt: 'Pick a number',
        likeValue: (n: number) => `${n} out of 5`,
        // One phrase per number, so the same score means the same thing to everybody.
        verdicts: ['Nothing at all', 'Not for me', 'It passed', 'Solid', 'Really good', 'Superb'],
        heard: 'Heard it before',
        heardHint: 'Had you come across this track before tonight?',
        popular: 'Everyone knows this',
        popularHint: 'Is this a well-known track? The more of you say yes, the less it scores.',
        moved: 'It got to me',
        movedHint: 'Did it move you? Whether you liked it is a separate question.',
        unsigned: 'Pick a number to lock your answer in — the toggles alone do not count.',
        honesty: 'House rule: answer honestly. Nothing here can be checked, and the game is nothing if it is not true.',
    },

    guess: {
        title: 'Whose is it?',
    },

    decoy: {
        title: 'Blame',
        none: 'Nobody',
    },

    reveal: {
        queuedBy: 'That one was queued by',
        guessSummary: (correct: number, total: number) =>
            `${correct} of ${en2(total, 'guess', 'guesses')} got it.`,
        noGuessing: 'No guessing tonight — just the ratings.',
        correct: 'correct',
        wrong: 'wrong',
        fooled: 'fell for the decoy',
        decoyWas: (name: string) => `Decoy: ${name}`,
        decoyHits: (n: number) => `${en2(n, 'listener', 'listeners')} fell for it`,
        answersTitle: 'What the room said',
        verdictLabel: 'The room',
        obviousLabel: 'How obvious',
        claimResult: (multiplier: string) => `landed at ×${multiplier}`,
        dragResult: (multiplier: string) => `obvious to some — ×${multiplier}`,
        noDrag: 'nobody called it obvious',
        knewNobody: 'New to everyone who answered',
        knewCount: (n: number, total: number) => `${n} of ${total} had heard it`,
        movedCount: (n: number) => `${en2(n, 'listener', 'listeners')} moved`,
        silent: (n: number) => `${en2(n, 'listener', 'listeners')} said nothing`,
        heardTag: 'heard it',
        popularTag: 'obvious',
        movedTag: 'moved',
        toughCrowd: 'Nobody said a word.',
        // Claims can go backwards, so the sign has to come from the number.
        points: (n: number) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`),
    },

    finale: {
        summary: (tracks: number, points: number) =>
            `${en2(tracks, 'track', 'tracks')}, ${en2(points, 'point', 'points')} of love handed out`,
        sub: "Nobody's queue was ever visible. Now everything is.",
        awards: 'Awards',
        takeaway: 'Your takeaway',
        takeawayBlurb: 'Everything you rated four or more tonight. This is the bit you keep.',
        takeawayEmpty: 'Nothing moved you tonight. Harsh.',
        copyTakeaway: 'Copy your playlist',
        copyTakeawayHeader: (room: string) => `Secret DJ — my takeaway from room ${room}`,
        board: 'The night',
        boardBlurb: 'What your tracks did to the room',
        setlist: 'The setlist',
        unplayed: 'The ones that got away',
        leave: 'Leave the room',
        copyHeader: (room: string) => `Secret DJ — room ${room}`,
        copyPrompt: "Copy tonight's setlist:",
    },

    awards: {
        'crowd-favourite': {
            title: 'Crowd Favourite',
            blurb: 'Scored the most across the night',
        },
        'track-of-the-night': {
            title: 'Track of the Night',
            blurb: 'The single track that moved the most people',
        },
        'deep-cut': {
            title: 'Deep Cut',
            blurb: 'Brought the track fewest people had heard — and it landed',
        },
        'gut-punch': {
            title: 'Gut Punch',
            blurb: 'Played the track that got to the most people',
        },
        'human-shazam': {
            title: 'Human Shazam',
            blurb: 'Named the most DJs correctly',
        },
        ghost: {
            title: 'The Ghost',
            blurb: 'Slipped past the room unrecognised',
        },
        'puppet-master': {
            title: 'Puppet Master',
            blurb: 'Sent the most people chasing the wrong DJ',
        },
    } satisfies Record<AwardId, { title: string; blurb: string }>,

    awardValue: {
        points: (n: number) => en2(n, 'point', 'points'),
        guesses: (n: number) => `${n} correct`,
        percent: (n: number) => `${n}%`,
        listeners: (n: number) => en2(n, 'listener', 'listeners'),
    },

    rules: {
        title: 'House rules',
        oath: 'Never lie in your answers. Whether you had heard it, whether everyone knows it, whether it got to you — none of it can be checked by anything except the people sitting with you. The game is nothing if the answers are not true.',
        items: [
            {
                head: 'Queue in secret.',
                body: 'Everyone queues the same number of tracks, and only some of them play — chosen at random. Nobody ever sees anyone else\'s queue.',
            },
            {
                head: 'Make a claim.',
                body: 'Every track you queue carries a bet: safe, or that the room will recognise you, or that nobody has heard it, or that it will split them. The safe one is the floor; the rest pay up to half again — or half as much if they miss.',
            },
            {
                head: 'Answer honestly.',
                body: 'Four questions per track: how much you liked it, whether you had heard it, whether everyone knows it, whether it got to you. None of it can be checked by anything but the people in the room — and the game is nothing if the answers are not true.',
            },
            {
                head: 'Zero to five.',
                body: 'How much you liked it, and it is the signature on your whole answer — the three toggles count for nothing until you pick a number. Say nothing at all and you are simply not counted.',
            },
            {
                head: 'The tax on the obvious.',
                body: 'The more of you call a track well known, the less it scores — down to half. A famous banger is never the easy winning move.',
            },
            {
                head: 'Guess the DJ.',
                body: 'Everyone except the DJ picks a name. It wins you no points — it feeds the DJ\'s claim, and the trophies at the end.',
            },
            {
                head: 'Set a decoy.',
                body: 'While your own track plays, secretly name who you want the room to blame. +1 for every listener who falls for it.',
            },
            {
                head: 'One score.',
                body: 'Everything you score, you score as a DJ: what your tracks did to the room, put through your claim, plus the decoys you got away with.',
            },
        ],
        note: 'The host sets the pace: they start the game, reveal each round and move on. If the host disappears, the crown passes automatically so nobody gets stranded.',
    },

    feed: {
        joined: (name: string) => `${name} joined`,
        left: (name: string) => `${name} left`,
        hostChanged: (name: string) => `${name} is now the host`,
        finished: "That's the night — results are in",
    },

    errors: {
        BAD_REQUEST: 'That request did not make sense.',
        GAME_NOT_FOUND: 'No room with that code. Check the spelling?',
        GAME_FULL: 'This room is full.',
        GAME_ALREADY_STARTED: 'This game is already under way.',
        NAME_TAKEN: 'Someone in this room already goes by that name.',
        NAME_INVALID: 'Pick a name of 2–20 letters, numbers, spaces or - _ . apostrophe.',
        SESSION_INVALID: 'Your seat expired. Join again to get a new one.',
        NOT_AUTHENTICATED: 'You are not in a room yet.',
        NOT_HOST: 'Only the host can do that.',
        WRONG_PHASE: 'That is not possible right now.',
        NOT_READY: 'Everyone needs to finish queueing first.',
        NOT_ENOUGH_PLAYERS: 'Guessing needs at least two DJs. Invite someone, or switch to a listening party.',
        TRACK_LIMIT_REACHED: 'You have already queued all of your tracks.',
        TRACK_DUPLICATE: 'That track is already in this game.',
        TRACK_UNSUPPORTED: 'That link is not from a music service we can play.',
        TRACK_URL_INVALID: 'That is not a usable link.',
        TRACK_NOT_FOUND: 'That track is not in your queue.',
        VOTE_NOT_ALLOWED: 'You cannot vote in this round.',
        VOTE_OWN_TRACK: 'It is your track. Sit this one out and enjoy it.',
        VOTE_INVALID_TARGET: 'That is not someone you can vote for.',
        CLAIM_INVALID: 'That is not a claim you can make.',
        CLAIM_SPENT: 'You have already played that claim on another track tonight.',
        CLAIM_UNAVAILABLE: 'That claim needs a bigger table, or guessing switched on.',
        ANSWER_OWN_TRACK: 'Answering about your own track is cheating, and a little sad.',
        RATING_INVALID: 'A like is a whole number from zero to five.',
        DECOY_NOT_DJ: 'Only the DJ can set a decoy.',
        DECOY_INVALID_TARGET: 'Pick someone else in the room to be mistaken for.',
        RATE_LIMITED: 'Slow down a moment.',
        INTERNAL: 'Something broke on our side.',
        TIMEOUT: 'The server did not answer. Check your connection.',
    } satisfies Record<ErrorCode | 'TIMEOUT', string>,

    embed: {
        'unrecognised-link': 'We do not recognise that link.',
        'missing-youtube-id': 'No video id in that YouTube link.',
        'missing-spotify-id': 'No Spotify id in that link.',
        'missing-deezer-id': 'No Deezer id in that link.',
        'missing-apple-id': 'No Apple Music id in that link.',
        'missing-yandex-id': 'Yandex links need an album or track id.',
        'missing-tidal-id': 'No TIDAL id in that link.',
        'external-only': 'This one plays in its own tab.',
    } satisfies Record<EmbedIssue, string>,
};

/**
 * Widen the literal types inferred from `en` so other locales are only required
 * to match the *shape*, not the exact English strings.
 */
type Widen<T> = T extends string
    ? string
    : T extends (...args: infer A) => string
      ? (...args: A) => string
      : T extends readonly (infer E)[]
        ? readonly Widen<E>[]
        : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof en>;
