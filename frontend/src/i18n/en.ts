import type { AwardId, EmbedIssue, ErrorCode } from '@secret-dj/common';
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
            'Everyone queues a track in secret. The room spends its hearts, and tries to work out who put it on.',
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
        selectorTitle: 'Selector — hearts your tracks earned',
        detectiveTitle: 'Detective — guesses and decoys',
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
        guessingOn: 'Guess the DJ behind each track, set decoys, and score on the Detective board.',
        guessingOff: 'Listening party: hearts only, no guessing, no Detective board.',
        start: 'Start the night',
        needTwo: 'Guessing needs at least two DJs — invite someone, or switch to a listening party.',
        stillQueueing: (names: string) => `Still queueing: ${names}.`,
    },

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
        hearts: (n: number) => en2(n, 'heart', 'hearts'),
        anthems: (n: number) => en2(n, 'anthem', 'anthems'),
        voted: (n: number, total: number) => `${n}/${total} voted`,
        hostReveal: 'Reveal the DJ',
        hostNext: 'Next track',
        hostFinish: 'Close out the night',
        hostWaitingVotes: (n: number) =>
            `Still waiting on ${en2(n, 'vote', 'votes')} — reveal anyway if someone has wandered off.`,
        waitingForNext: 'Waiting for the host to cue the next track…',
        waitingForReveal: 'Everyone has voted. Waiting for the host to reveal…',
    },

    react: {
        title: 'Worth keeping?',
        pass: 'Pass',
        heart: 'Heart',
        anthem: 'Anthem',
        walletHearts: (left: number, budget: number) => `${left} of ${budget} hearts left`,
        walletAnthemLeft: 'Anthem still in your pocket',
        walletAnthemGone: 'Anthem already spent',
        outOfHearts: 'Out of hearts — save them or spend the anthem.',
        anthemGone: 'You only get one anthem a night.',
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
        noGuessing: 'No guessing tonight — just the hearts.',
        correct: 'correct',
        wrong: 'wrong',
        fooled: 'fell for the decoy',
        decoyWas: (name: string) => `Decoy: ${name}`,
        decoyHits: (n: number) => `${en2(n, 'listener', 'listeners')} fell for it`,
        heartsTitle: 'Hearts',
        toughCrowd: 'A tough crowd tonight.',
        anthemFrom: (name: string) => `${name} spent their anthem here`,
        points: (n: number) => `+${n}`,
    },

    finale: {
        summary: (tracks: number, points: number) =>
            `${en2(tracks, 'track', 'tracks')}, ${en2(points, 'point', 'points')} of love handed out`,
        sub: "Nobody's queue was ever visible. Now everything is.",
        awards: 'Awards',
        selectorBoard: 'Selector',
        selectorBlurb: 'What your taste did to the room',
        detectiveBoard: 'Detective',
        detectiveBlurb: 'What you did to the people',
        setlist: 'The setlist',
        unplayed: 'The ones that got away',
        leave: 'Leave the room',
        copyHeader: (room: string) => `Secret DJ — room ${room}`,
        copyPrompt: "Copy tonight's setlist:",
    },

    awards: {
        'crowd-favourite': {
            title: 'Crowd Favourite',
            blurb: 'Collected the most love across the night',
        },
        'track-of-the-night': {
            title: 'Track of the Night',
            blurb: 'The single track that moved the most people',
        },
        'golden-ear': {
            title: 'Golden Ear',
            blurb: 'Spent their anthem on the track that earned it',
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
        hearts: (n: number) => en2(n, 'heart', 'hearts'),
        guesses: (n: number) => `${n} correct`,
        percent: (n: number) => `${n}% identified`,
        listeners: (n: number) => en2(n, 'listener', 'listeners'),
    },

    rules: {
        title: 'House rules',
        items: [
            {
                head: 'Queue in secret.',
                body: 'Everyone queues the same number of tracks, and only some of them play — chosen at random. Nobody ever sees anyone else\'s queue.',
            },
            {
                head: 'Spend your hearts.',
                body: 'You get a limited number for the whole night, so you have to pass on things you liked. A heart is +1 to the DJ.',
            },
            {
                head: 'One anthem.',
                body: 'Exactly one per night, worth +3. Spend it on the track you would still be thinking about tomorrow.',
            },
            {
                head: 'Guess the DJ.',
                body: 'Everyone except the DJ picks a name. Change your mind as often as you like — nothing locks until the host reveals.',
            },
            {
                head: 'Set a decoy.',
                body: 'While your own track plays, secretly name who you want the room to blame. +1 for every listener who falls for it.',
            },
            {
                head: 'Two scoreboards.',
                body: 'Selector counts the love your tracks earned. Detective counts your guesses and your decoys. They never mix.',
            },
        ],
        note: 'The host sets the pace: they start the game, reveal each round and move on. If the host disappears, the crown passes automatically so nobody gets stranded.',
    },

    feed: {
        joined: (name: string) => `${name} joined`,
        left: (name: string) => `${name} left`,
        hostChanged: (name: string) => `${name} is now the host`,
        anthemSpent: 'Somebody just spent their anthem',
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
        REACT_OWN_TRACK: 'Hearting your own track is cheating, and a little sad.',
        OUT_OF_HEARTS: 'You are out of hearts for tonight. Spend them wisely.',
        ANTHEM_SPENT: 'You only get one anthem a night, and yours is gone.',
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
