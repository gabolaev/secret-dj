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
    common: {
        loading: 'Loading',
        close: 'Close',
        open: 'Open ↗',
    },

    locale: { label: 'Language', en: 'EN', ru: 'RU' },

    join: {
        tagline: 'Everyone queues a track in secret. Guess whose is whose.',
        nameLabel: 'Your name',
        namePlaceholder: 'DJ Nightshift',
        codeLabel: 'Room code',
        codePlaceholder: 'K7QM2',
        create: 'Start a new one',
        join: 'Join the room',
        connecting: 'Connecting…',
        reconnecting: 'Reconnecting…',
        howItWorks: 'How it works',
        genericError: 'That did not work.',
        findingSeat: 'Finding your seat…',
    },

    shell: {
        copyInvite: 'Copy invite link',
        copied: 'Copied',
        copyPrompt: 'Copy this invite link:',
        rules: 'Rules',
        leave: 'Leave',
        live: 'live',
        connecting: 'connecting',
        offline: 'offline',
    },

    roster: {
        // Presence, and only presence. Anything about answering would name the
        // DJ by omission — see PlayerRoster.
        gone: 'left',
        away: 'away',
        ready: 'ready',
        scoreTitle: 'Points',
        theRoom: 'Players',
        setlist: 'Setlist',
        notPlayedYet: '—',
    },

    lobby: {
        queueMore: (n: number) => `Queue ${en2(n, 'more track', 'more tracks')}`,
        setReady: 'Your tracks',
        hintWaiting: (names: string) => `Waiting on ${names}.`,
        hintWaitingForHost: 'Everyone is ready. Waiting for the host.',
        setlistLength: (n: number) => `${en2(n, 'track', 'tracks')} tonight`,
        settings: 'Room settings',
        tracksQueued: 'Tracks each DJ queues',
        tracksPlayed: 'How many actually play',
        fewer: 'Fewer',
        more: 'More',
        guessing: 'Guessing',
        start: 'Start the night',
        needTwo: 'Guessing needs at least two players.',
    },

    claims: {
        label: 'Claim',
        needsPlayers: (n: number) => `Needs ${n}+ players`,
        needsGuessing: 'Needs guessing on',
        evidence: {
            'never-heard': (n: number, of: number) => `${n} of ${of} hadn't heard it`,
            unanimous: (n: number, of: number) => `${n} of ${of} gave it 4+`,
            emotional: (n: number, of: number) => `${n} of ${of} were moved`,
            'so-me': (n: number, of: number) => `${n} of ${of} named you`,
            'not-me': (n: number, of: number) => `${n} of ${of} guessed someone else`,
            divisive: (n: number, of: number) => `${n} of ${of}`,
        },
        evidenceSpread: (percent: number) => `${percent}% split`,
        spent: 'Used on another track',
        none: {
            title: 'No claim',
            blurb: 'Safe. You keep what the room gives.',
        },
        'never-heard': {
            title: "You've never heard this",
            blurb: 'Pays if it is new to the room.',
        },
        unanimous: {
            title: 'Everyone will like this',
            blurb: 'Pays if everyone gives it 4+.',
        },
        emotional: {
            title: 'This will get to you',
            blurb: 'Pays if it moves people.',
        },
        'so-me': {
            title: 'You will know it was me',
            blurb: 'Pays if they guess you.',
        },
        'not-me': {
            title: 'You will never guess it was me',
            blurb: 'Pays if nobody guesses you.',
        },
        divisive: {
            title: 'This will split the room',
            blurb: 'Pays if ratings split.',
        },
    } satisfies {
        evidence: Record<Exclude<ClaimId, 'none'>, (n: number, of: number) => string>;
        evidenceSpread: (percent: number) => string;
        label: string;
        spent: string;
        needsPlayers: (n: number) => string;
        needsGuessing: string;
    } & Record<ClaimId, { title: string; blurb: string }>,

    url: {
        placeholder: 'Paste a Spotify, YouTube, Apple Music… link',
        submit: 'Add',
        hintInvalid: "That's not a link yet.",
        hintUnsupported: "We can't play links from there.",
        loading: 'Loading…',
    },

    tracks: {
        remove: 'Remove',
        playingNow: 'Now playing',
    },

    round: {
        position: (n: number, total: number) => `Track ${n} / ${total}`,
        timeLeft: 'Time left',
        lookupFailed: "Couldn't read this link.",

        itWas: 'It was',
        namedBy: (n: number, of: number) => `${n}/${of} guessed`,

        yoursTitle: 'This one is yours',
        yourClaim: 'Your claim:',
        findingTrack: 'Finding the track…',
        openIn: (service: string) => `Open in ${service} ↗`,
        openLink: 'Open the link',
        done: 'Done',
        undone: 'Not done yet',
        doneCount: (n: number, total: number) => `${n} of ${total} done`,
        hostReveal: 'Reveal the DJ',
        hostNext: 'Next track',
        hostFinish: 'Finish the night',
        hostWaiting: 'Waiting for the room to finish.',
        waitingForNext: 'Waiting for the host…',
        waitingForReveal: 'Everyone has guessed. Waiting for the host…',
    },

    answer: {
        likeTitle: 'How much did you like it?',
        likeValue: (n: number) => `${n} out of 5`,
        // One phrase per number, so the same score means the same thing to everybody.
        verdicts: ['Nothing at all', 'Not for me', 'It passed', 'Solid', 'Really good', 'Superb'],
        heard: 'Heard it before',
        heardHint: 'Did you know this track before tonight?',
        popular: 'Popular',
        popularHint: 'A well-known track?',
        moved: 'It got to me',
        movedHint: 'Did it move you?',
        unsigned: 'Pick a number for your answer to count.',
    },

    guess: {
        title: 'Whose is it?',
    },

    reveal: {
        correct: 'correct',
        wrong: 'wrong',
        likedIt: (name: string, n: number) => `${name} gave it ${n} out of 5`,
        sumLabel: 'Ratings plus bonuses',
        nobodyAnswered: 'nobody answered',
        scaleLabel: 'Averaged and scaled to the table',
        scaleWorking: (total: number, answered: number, listeners: number) =>
            `${total} ÷ ${answered} answered × ${listeners} listening`,
        nothingToScale: 'nothing to scale',
        dragWorking: (n: number, of: number) => `${n} of ${of} called it popular`,
        noClaim: 'no claim',
        unchanged: 'no change',
        newTag: (n: number) => `new +${n}`,
        movedTag: (n: number) => `moved +${n}`,
        saidNothing: 'said nothing',
        answersTitle: 'Answers',
        obviousLabel: 'Popularity tax',
        noDrag: 'nobody called it popular',
        silent: (n: number) => `${n} silent`,
        heardTag: 'heard it',
        popularTag: 'popular',
        toughCrowd: 'Nobody said a word.',
        answeredSummary: (answered: number, silent: number) =>
            silent > 0 ? `${answered} answered · ${silent} silent` : `${answered} answered`,
        theWorking: 'How it was scored',
        claimLabel: 'Claim',
        // ♥ and ★ never share a column, and only ♥ ever ranks anything.
        roomGave: '♥ Room',
        djBanked: '★ Banked',
    },

    finale: {
        thatWasTheNight: "That's the night.",
        roomSummary: (tracks: number, players: number) =>
            `${en2(tracks, 'track', 'tracks')} · ${en2(players, 'player', 'players')}`,
        rankedBy: 'Tracks',
        starRanksNothing: '♥ room · ★ DJ',
        notGiven: 'Not given',
        copyAll: (n: number) => `Copy (${n})`,

        awards: 'Awards',
        takeaway: 'Your favourites',
        takeawayEmpty: 'Nothing got a 4 from you tonight.',
        copyTakeawayHeader: (room: string) => `Secret DJ — my favourites from room ${room}`,
        loveTitle: 'What the room gave it',
        totalTitle: 'What the DJ banked',
        unplayed: "Didn't make the cut",
        leave: 'Leave the room',
        copyPrompt: 'Copy the list:',
    },

    awards: {
        'track-of-the-night': {
            title: 'Track of the Night',
            blurb: 'most ♥ of the night',
        },
        'deep-cut': {
            title: 'Deep Cut',
            blurb: 'new to the room, and it landed',
        },
        'gut-punch': {
            title: 'Gut Punch',
            blurb: 'moved the most people',
        },
        'human-shazam': {
            title: 'Human Shazam',
            blurb: 'named the most DJs',
        },
        ghost: {
            title: 'The Ghost',
            blurb: 'went unrecognised',
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
        oath: 'Answer honestly. Nobody can check what you heard or felt except the people in the room, and the game only works if it is true.',
        items: [
            {
                head: 'Queue in secret.',
                body: 'Everyone queues the same number of tracks. Only some play, picked at random.',
            },
            {
                head: 'Make a claim.',
                body: 'Bet on what each track will do to the room. Land it for up to ×1.5, miss for ×0.5. No claim is safe.',
            },
            {
                head: 'Rate it 0–5.',
                body: 'Then tick heard it, popular, or it got to me. Nothing counts until you pick a number.',
            },
            {
                head: 'Popular costs.',
                body: 'The more of you call a track popular, the less it scores — down to half.',
            },
            {
                head: 'Guess the DJ.',
                body: 'Name who put it on. Right gets you a point.',
            },
        ],
        claimsTitle: 'The claims',
        claimsBody: 'Each one once a night. Fully true ×1.5, half true ×1, not at all ×0.5.',
        scoring: {
            title: 'Scoring',
            addTitle: 'Each listener adds',
            add: [
                { what: 'Their rating', points: '0–5' },
                { what: 'New to them', points: '+1' },
                { what: 'It got to them', points: '+2' },
            ],
            addNote: 'Averaged and scaled to the table, so silence costs the DJ nothing.',
            obviousTitle: 'Then the popularity tax',
            obviousBody: 'Nobody ticks popular: no change. Half do: −25%. Everyone: −50%.',
            claimTitle: 'Then the claim',
            claimBody: 'Multiplies what is left. No claim leaves it alone.',
            guessLine: { what: 'You named the DJ', points: '+1' },
            example: '4 listeners rate 5, 4, 4, 3 = 16. All new: +4 → 20. Two moved: +4 → 24. Nobody said popular: 24. "Never heard this" landed: ×1.5 → 36.',
        },
        note: 'The host starts the game and moves each round on. If they leave, someone else takes over.',
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
        ROUND_NOT_READY: 'Somebody in the room has not finished yet.',
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
