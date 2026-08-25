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
        copy: 'Copy',
        open: 'open ↗',
        you: 'you',
        host: 'Host',
        nothingYet: 'Nothing here yet.',
    },

    locale: { label: 'Language', en: 'EN', ru: 'RU' },

    join: {
        tagline:
            'Everyone queues a track in secret. The room rates it.',
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
        hintWaiting: (names: string) => `Waiting on ${names}.`,
        hintHostCanStart: 'Everyone is ready. Drop the needle whenever you like.',
        hintWaitingForHost: 'Everyone is ready. Waiting for the host to start.',
        setlistLength: (n: number) => `${en2(n, 'track', 'tracks')} tonight`,
        settings: 'Room settings',
        title: 'Warm-up',
        tracksQueued: 'Tracks each DJ queues',
        tracksPlayed: 'How many actually play',
        fewer: 'Fewer',
        more: 'More',
        guessing: 'Guessing',
        start: 'Start the night',
        needTwo: 'Guessing needs at least two DJs — invite someone, or switch to a listening party.',
        stillQueueing: (names: string) => `Still queueing: ${names}.`,
    },

    claims: {
        label: 'Your claim',
        yoursOnly: 'Your bet — nobody else sees it until the reveal.',
        needsPlayers: (n: number) => `Needs at least ${n} players in the room`,
        needsGuessing: 'Needs guessing switched on',
        evidence: {
            'never-heard': (n: number, of: number) => `${n} of ${of} had not heard it`,
            unanimous: (n: number, of: number) => `${n} of ${of} gave it 4 or more`,
            emotional: (n: number, of: number) => `${n} of ${of} say it moved them`,
            'so-me': (n: number, of: number) => `${n} of ${of} named you`,
            'not-me': (n: number, of: number) => `${n} of ${of} looked elsewhere`,
            divisive: (n: number, of: number) => `${n} of ${of}`,
        },
        evidenceSpread: (percent: number) => `${percent}% as far apart as the room can get`,
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
            blurb: 'Pays on being recognised.',
        },
        'not-me': {
            title: 'You will never guess it was me',
            blurb: 'Pays on getting away with it. Nothing if the room never guessed at all.',
        },
        divisive: {
            title: 'This will split the room',
            blurb: 'Pays on an even split of loved and hated. Agreement scores nothing.',
        },
    } satisfies {
        evidence: Record<Exclude<ClaimId, 'none'>, (n: number, of: number) => string>;
        evidenceSpread: (percent: number) => string;
        label: string;
        spent: string;
        yoursOnly: string;
        needsPlayers: (n: number) => string;
        needsGuessing: string;
    } & Record<
        ClaimId,
        { title: string; blurb: string }
    >,

    url: {
        placeholder: 'Paste a Spotify, YouTube, Apple Music… link',
        submit: 'Queue it',
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

    drums: {
        title: 'Drum machine',
        show: 'Drums',
        hide: 'Hide drums',
        play: 'Play',
        stop: 'Stop',
        clear: 'Clear',
        slower: 'Slower',
        faster: 'Faster',
        tempo: 'Tempo',
    },

    round: {
        position: (n: number, total: number) => `Track ${n} of ${total}`,
        titleMine: 'Yours',
        findingTrack: 'Finding the track…',
        openIn: (service: string) => `Open in ${service} ↗`,
        openLink: 'Open the link',
        answered: (n: number) => `${en2(n, 'listener', 'listeners')} answered`,
        voted: (n: number, total: number) => `${n}/${total} voted`,
        done: 'Done',
        undone: 'Not done yet',
        doneCount: (n: number, total: number) => `${n} of ${total} finished. The reveal happens on its own once everybody has.`,
        timeLeft: 'Time left in this round',
        hostReveal: 'Reveal the DJ',
        hostNext: 'Next track',
        hostFinish: 'Close out the night',
        hostWaiting: 'Waiting for the room to finish. Anyone who has actually left drops out on their own.',
        waitingForNext: 'Waiting for the host to cue the next track…',
        waitingForReveal: 'Everyone has voted. Waiting for the host to reveal…',
    },

    answer: {
        likeTitle: 'How much did you like it?',
        likeValue: (n: number) => `${n} out of 5`,
        // One phrase per number, so the same score means the same thing to everybody.
        verdicts: ['Nothing at all', 'Not for me', 'It passed', 'Solid', 'Really good', 'Superb'],
        heard: 'Heard it before',
        heardHint: 'Had you come across this track before tonight?',
        popular: 'Popular',
        popularHint: 'A well-known track? The more of you say so, the less it scores for the DJ.',
        moved: 'It got to me',
        movedHint: 'Did it move you? Whether you liked it is a separate question.',
        unsigned: 'Pick a number for your answer to count.',
        honesty: 'House rule: answer honestly. Nothing here can be checked, and the game is nothing if it is not true.',
    },

    guess: {
        title: 'Whose is it?',
    },

    reveal: {
        queuedBy: 'That one was queued by',
        guessSummary: (correct: number, total: number) =>
            `${correct} of ${en2(total, 'guess', 'guesses')} got it.`,
        noGuessing: 'No guessing tonight — just the ratings.',
        correct: 'correct',
        wrong: 'wrong',
        likedIt: (name: string, n: number) => `${name} liked it ${n} out of 5`,
        sumLabel: 'What each listener gave',
        nobodyAnswered: 'nobody answered',
        scaleLabel: 'Averaged, then scaled to the table',
        scaleWorking: (total: number, answered: number, listeners: number) =>
            `${total} ÷ ${answered} answered × ${listeners} listening`,
        nothingToScale: 'nothing to scale',
        dragWorking: (n: number, of: number) => `${n} of ${of} called it popular`,
        timesWorking: (m: string) => `multiplied by ${m}`,
        noClaim: 'no claim, so nothing changes',
        unchanged: 'unchanged',
        totalLabel: (name: string) => `${name} banks`,
        rowWorking: (name: string) => `${name}: their rating, plus a point if it was new to them, plus two if it moved them`,
        newTag: (n: number) => `new to them +${n}`,
        movedTag: (n: number) => `moved +${n}`,
        saidNothing: 'said nothing',
        answersTitle: 'What the room said',
        obviousLabel: 'Popularity',
        noDrag: 'nobody called it popular',
        silent: (n: number) => `${en2(n, 'listener', 'listeners')} said nothing`,
        heardTag: 'heard it',
        popularTag: 'popular',
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
        setlistLegend: '♥ what the room gave · ★ what it came to after the DJ\u2019s claim',
        loveTitle: 'What the room gave it',
        totalTitle: 'What it came to after the claim',
        setlist: 'The setlist',
        unplayed: 'The ones that got away',
        leave: 'Leave the room',
        copyHeader: (room: string) => `Secret DJ — room ${room}`,
        copyPrompt: "Copy tonight's setlist:",
    },

    awards: {
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
    } satisfies Record<AwardId, { title: string; blurb: string }>,

    awardValue: {
        points: (n: number) => en2(n, 'point', 'points'),
        guesses: (n: number) => `${n} correct`,
        percent: (n: number) => `${n}%`,
        listeners: (n: number) => en2(n, 'listener', 'listeners'),
    },

    rules: {
        title: 'House rules',
        oath: 'Never lie in your answers. Whether you had heard it, whether it is popular, whether it got to you — none of it can be checked by anything except the people sitting with you. The game is nothing if the answers are not true. This is not that kind of a competition, it is a shared experience. Be honest, be kind, and have fun.',
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
                body: 'Four questions per track: how much you liked it, whether you had heard it, whether it is popular, whether it got to you. None of it can be checked by anything but the people in the room — and the game is nothing if the answers are not true.',
            },
            {
                head: 'Zero to five.',
                body: 'How much you liked it. Nothing you say about a track counts until you have picked a number, and if you say nothing at all you are simply not counted.',
            },
            {
                head: 'The popularity tax.',
                body: 'The more of you call a track popular, the less it scores — down to half. A famous banger is never the easy winning move.',
            },
            {
                head: 'Guess the DJ.',
                body: 'Everyone except the DJ picks a name. Get it right and you bank a point — and either way it feeds the DJ\'s claim and the trophies at the end.',
            },
            {
                head: 'One score.',
                body: 'Your tracks, put through your claim, plus a point for every DJ you name correctly. There is no leaderboard at the end — the score is there to make the choices matter, not to rank the room.'
            },
        ],
        claimsTitle: 'The claims',
        claimsBody: 'One of each per night, so the decision is which of your tracks deserves which bet. Every one of them scales the whole total: it came true completely, half as much again; not at all, the track is worth half.',
        scoring: {
            title: 'Where the points come from',
            addTitle: 'Every listener who answered adds',
            add: [
                { what: 'How much they liked it', points: '0 to 5' },
                { what: 'They had not heard it before', points: '+1' },
                { what: 'It got to them', points: '+2' },
            ],
            addNote: 'Those are added up, averaged, and multiplied back by how many listeners were at the table — so somebody staying quiet costs the DJ nothing.',
            obviousTitle: 'Then: the popularity tax',
            obviousBody: 'The more listeners tick "popular", the smaller that total gets. Nobody ticked it — nothing changes. Half of them did — a quarter comes off. All of them did — the track is worth half.',
            claimTitle: 'Then: your claim',
            claimBody: 'Your claim scales whatever is left. It came true completely — half as much again. It half came true — nothing changes. It did not come true at all — the track is worth half. A track with no claim is left alone, which is exactly what makes no claim the safe play.',
            guessLine: { what: 'You named the DJ correctly', points: '+1, to you' },
            example:
                'Four listeners, all four answer: 5, 4, 4 and 3 makes 16. None of them had heard it, so +1 each — 20. Two of them were moved, +2 each — 24. Nobody ticked "popular", so it stays 24. The claim "you had never heard this" came true completely, half as much again: 36 points. Had two of the four ticked it, the 24 would have become 18, and 27 after the claim.',
        },
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
