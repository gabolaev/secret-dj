import { beforeEach, describe, expect, it } from 'vitest';
import { GameError } from '@secret-dj/common';
import { GameRoom, HOST_GRACE_MS } from '../src/game/room.js';
import { projectGame } from '../src/game/view.js';

const SPOTIFY = (n: number) => `https://open.spotify.com/track/track${n}`;

let clock = 1_000_000;
const now = () => clock;

function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

/** A room with `names` seated, connected, and everyone's tracks queued. */
function setup(
    names: string[],
    options: { tracksPerPlayer?: number; tracksPlayedPerPlayer?: number; guessingEnabled?: boolean } = {},
) {
    const room = new GameRoom({ id: 'TEST1', settings: options, now, rng: seeded(11) });
    const ids: Record<string, string> = {};
    let counter = 0;

    for (const name of names) {
        const { player } = room.addPlayer(name);
        ids[name] = player.id;
        room.attachSocket(player.id);
    }
    for (const name of names) {
        for (let i = 0; i < room.settings.tracksPerPlayer; i++) {
            room.addTrack(ids[name], SPOTIFY(counter++));
        }
    }
    return { room, ids };
}

function expectError(code: string, fn: () => unknown) {
    try {
        fn();
    } catch (error) {
        expect(error).toBeInstanceOf(GameError);
        expect((error as GameError).code).toBe(code);
        return;
    }
    throw new Error(`expected ${code} but nothing was thrown`);
}

beforeEach(() => {
    clock = 1_000_000;
});

describe('joining', () => {
    it('rejects duplicate names case-insensitively', () => {
        const room = new GameRoom({ id: 'T', now });
        room.addPlayer('Ana');
        expectError('NAME_TAKEN', () => room.addPlayer('  ana '));
    });

    it('rejects names that are too short, too long, or full of junk', () => {
        const room = new GameRoom({ id: 'T', now });
        expectError('NAME_INVALID', () => room.addPlayer('a'));
        expectError('NAME_INVALID', () => room.addPlayer('x'.repeat(21)));
        expectError('NAME_INVALID', () => room.addPlayer('<script>'));
    });

    it('refuses new players once the music has started', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.start(ids.ana);
        expectError('GAME_ALREADY_STARTED', () => room.addPlayer('cy'));
    });

    it('only accepts a resume with the right token', () => {
        const room = new GameRoom({ id: 'T', now });
        const { player } = room.addPlayer('ana');
        expect(room.authenticate(player.id, player.token).id).toBe(player.id);
        expectError('SESSION_INVALID', () => room.authenticate(player.id, 'guess'));
        expectError('SESSION_INVALID', () => room.authenticate('someone-else', player.token));
    });
});

describe('queueing tracks', () => {
    it('enforces the per-player limit on the server, not just in the UI', () => {
        const room = new GameRoom({ id: 'T', settings: { tracksPerPlayer: 2 }, now });
        const { player } = room.addPlayer('ana');
        room.addTrack(player.id, SPOTIFY(1));
        room.addTrack(player.id, SPOTIFY(2));
        expectError('TRACK_LIMIT_REACHED', () => room.addTrack(player.id, SPOTIFY(3)));
    });

    it('rejects the same song twice, however it was shared', () => {
        const room = new GameRoom({ id: 'T', settings: { tracksPerPlayer: 4 }, now });
        const ana = room.addPlayer('ana').player;
        const bo = room.addPlayer('bo').player;
        room.addTrack(ana.id, 'https://open.spotify.com/track/abc?si=one');
        // Same song, different share token, different player: still a duplicate.
        expectError('TRACK_DUPLICATE', () => room.addTrack(bo.id, 'https://open.spotify.com/intl-de/track/abc'));
    });

    it('rejects links we cannot play', () => {
        const room = new GameRoom({ id: 'T', now });
        const { player } = room.addPlayer('ana');
        expectError('TRACK_UNSUPPORTED', () => room.addTrack(player.id, 'https://example.com/song.mp3'));
        expectError('TRACK_URL_INVALID', () => room.addTrack(player.id, ''));
    });

    it('refuses to add or remove tracks once the game is running', () => {
        const { room, ids } = setup(['ana', 'bo']);
        const trackId = room.players.get(ids.ana)!.trackIds[0];
        room.start(ids.ana);
        expectError('WRONG_PHASE', () => room.addTrack(ids.ana, SPOTIFY(99)));
        expectError('WRONG_PHASE', () => room.removeTrack(ids.ana, trackId));
    });

    it('will not let one player delete another player\'s track', () => {
        const { room, ids } = setup(['ana', 'bo']);
        const anasTrack = room.players.get(ids.ana)!.trackIds[0];
        expectError('TRACK_NOT_FOUND', () => room.removeTrack(ids.bo, anasTrack));
    });
});

describe('authorisation', () => {
    it('lets only the host change settings, start, reveal and advance', () => {
        const { room, ids } = setup(['ana', 'bo']);
        expectError('NOT_HOST', () => room.updateSettings(ids.bo, { tracksPerPlayer: 5 }));
        expectError('NOT_HOST', () => room.start(ids.bo));

        room.start(ids.ana);
        expectError('NOT_HOST', () => room.reveal(ids.bo));
        room.reveal(ids.ana);
        expectError('NOT_HOST', () => room.next(ids.bo));
    });

    it('rejects commands from a player who is not in the game', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.start(ids.ana);
        expectError('SESSION_INVALID', () => room.vote('not-a-player', ids.ana));
        expectError('SESSION_INVALID', () => room.answer('not-a-player', { like: 3 }));
    });
});

describe('starting', () => {
    it('waits for everyone to finish queueing', () => {
        const room = new GameRoom({ id: 'T', settings: { tracksPerPlayer: 2 }, now });
        const ana = room.addPlayer('ana').player;
        const bo = room.addPlayer('bo').player;
        room.attachSocket(ana.id);
        room.attachSocket(bo.id);
        room.addTrack(ana.id, SPOTIFY(1));
        room.addTrack(ana.id, SPOTIFY(2));
        room.addTrack(bo.id, SPOTIFY(3));
        expectError('NOT_READY', () => room.start(ana.id));
    });

    it('refuses a guessing game with a single DJ', () => {
        const { room, ids } = setup(['ana']);
        expectError('NOT_ENOUGH_PLAYERS', () => room.start(ids.ana));
    });

    it('allows a solo listening party', () => {
        const { room, ids } = setup(['ana'], { guessingEnabled: false });
        room.start(ids.ana);
        expect(room.phase).toBe('listening');
    });

    it('cannot be restarted mid-game', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.start(ids.ana);
        const firstTrack = room.round!.trackId;
        expectError('WRONG_PHASE', () => room.start(ids.ana));
        expect(room.round!.trackId).toBe(firstTrack);
    });

    it('never lets more tracks play than were queued', () => {
        const { room, ids } = setup(['ana', 'bo'], { tracksPerPlayer: 3, tracksPlayedPerPlayer: 3 });
        // Asking to play 5 of 3 is clamped rather than accepted.
        room.updateSettings(ids.ana, { tracksPlayedPerPlayer: 5 });
        expect(room.settings.tracksPlayedPerPlayer).toBe(3);
        room.start(ids.ana);
        expect(room.setlist).toHaveLength(6);
    });

    it('picks a different subset on different nights', () => {
        // Same queue, different seed: the setlist must not be deterministic, or
        // the whole point of queueing more than plays is lost.
        const subsets = new Set<string>();
        for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
            const room = new GameRoom({ id: 'T', settings: { tracksPerPlayer: 4, tracksPlayedPerPlayer: 2 }, now, rng: seeded(seed) });
            const ids: string[] = [];
            for (const name of ['ana', 'bo']) {
                const { player } = room.addPlayer(name);
                room.attachSocket(player.id);
                ids.push(player.id);
            }
            let counter = 0;
            for (const id of ids) {
                for (let i = 0; i < 4; i++) room.addTrack(id, SPOTIFY(counter++));
            }
            room.start(ids[0]);
            subsets.add([...room.setlist].sort().join(','));
        }
        expect(subsets.size).toBeGreaterThan(1);
    });

    it('clamps settings to sane bounds', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.updateSettings(ids.ana, { tracksPerPlayer: 999 });
        expect(room.settings.tracksPerPlayer).toBe(10);
        room.updateSettings(ids.ana, { tracksPerPlayer: -4 });
        expect(room.settings.tracksPerPlayer).toBe(1);
        // Lowering the queue drags the played count down with it.
        expect(room.settings.tracksPlayedPerPlayer).toBe(1);
    });

    it('starts everybody on zero when the night starts', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 4, tracksPlayedPerPlayer: 4 });
        room.start(ids.ana);

        for (const id of Object.values(ids)) {
            expect(room.players.get(id)!.score).toBe(0);
        }
    });
});

describe('voting', () => {
    it('does not let the DJ vote on their own track', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const other = Object.values(ids).find(id => id !== dj)!;
        // v1 only blocked voting *for yourself*, so the DJ could still vote.
        expectError('VOTE_OWN_TRACK', () => room.vote(dj, other));
    });

    it('rejects votes for yourself or for someone who is not playing', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const voter = Object.values(ids).find(id => id !== room.round!.djId)!;
        expectError('VOTE_INVALID_TARGET', () => room.vote(voter, voter));
        expectError('VOTE_INVALID_TARGET', () => room.vote(voter, 'batman'));
    });

    it('lets a voter change their mind until the reveal', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [voter, other] = Object.values(ids).filter(id => id !== dj);

        room.vote(voter, other);
        room.vote(other, voter);
        expect(room.phase).toBe('tallying');

        // Still changeable while tallying - the v1 rules contradicted themselves
        // and the implementation silently locked votes at the wrong moment.
        room.vote(voter, dj);
        expect(room.round!.votes.get(voter)).toBe(dj);
    });

    it('moves to tallying once every eligible voter has voted', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const voters = Object.values(ids).filter(id => id !== dj);

        room.vote(voters[0], dj);
        expect(room.phase).toBe('listening');
        room.vote(voters[1], dj);
        expect(room.phase).toBe('tallying');
    });

    it('does not stall the round when a voter disconnects', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const voters = Object.values(ids).filter(id => id !== dj);

        room.vote(voters[0], dj);
        expect(room.phase).toBe('listening');
        // v1 waited on every player forever, so one closed laptop froze the game.
        room.detachSocket(voters[1]);
        expect(room.phase).toBe('tallying');
    });

    it('lets the host reveal early rather than wait on an absent player', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        expect(room.phase).toBe('listening');
        room.reveal(ids.ana);
        expect(room.phase).toBe('reveal');
    });
});

describe('answering', () => {
    it('is idempotent and refuses the DJ', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const listener = Object.values(ids).find(id => id !== dj)!;

        room.answer(listener, { like: 4 });
        room.answer(listener, { like: 4 });
        expect(room.answersIn()).toBe(1);
        expectError('ANSWER_OWN_TRACK', () => room.answer(dj, { like: 4 }));
    });

    it('patches, so the four answers never overwrite each other', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.start(ids.ana);
        const listener = Object.values(ids).find(id => id !== room.round!.djId)!;

        room.answer(listener, { heard: true });
        room.answer(listener, { like: 2 });
        room.answer(listener, { moved: true });
        room.answer(listener, { like: 5 });

        expect(room.round!.answers.get(listener)).toEqual({
            like: 5,
            heard: true,
            popular: false,
            moved: true,
        });
    });

    it('refuses a like off the scale, and keeps the last good one', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.start(ids.ana);
        const listener = Object.values(ids).find(id => id !== room.round!.djId)!;

        room.answer(listener, { like: 5 });
        expectError('RATING_INVALID', () => room.answer(listener, { like: 6 as never }));
        expectError('RATING_INVALID', () => room.answer(listener, { like: -1 as never }));
        expectError('RATING_INVALID', () => room.answer(listener, { like: 2.5 as never }));
        expect(room.round!.answers.get(listener)!.like).toBe(5);
    });

    it('counts nobody until they sign the answer with a like', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.start(ids.ana);
        const listener = Object.values(ids).find(id => id !== room.round!.djId)!;

        // Toggles alone say nothing: one denominator for the whole game, and
        // this is what a player has to do to enter it.
        room.answer(listener, { heard: true, popular: true, moved: true });
        expect(room.answersIn()).toBe(0);

        room.answer(listener, { like: 0 });
        expect(room.answersIn()).toBe(1);
    });

    it('treats zero as a real answer, not as silence', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 1, tracksPlayedPerPlayer: 1 });
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [a, b] = Object.values(ids).filter(id => id !== dj);

        // One listener says "nothing at all" and means it; the other says
        // nothing. The first drags the average, the second is not counted.
        room.answer(a, { like: 0, heard: true });
        room.answer(b, { like: 4, heard: true });
        room.reveal(ids.ana);

        // (0 + 4) / 2 answerers x 2 listeners = 4.
        expect(room.players.get(dj)!.score).toBe(4);
    });

    it('stays open after voting closes, until the reveal', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const listener = Object.values(ids).find(id => id !== dj)!;

        room.vote(listener, dj);
        expect(room.phase).toBe('tallying');
        room.answer(listener, { like: 2 });
        expect(room.answersIn()).toBe(1);

        room.reveal(ids.ana);
        expectError('WRONG_PHASE', () => room.answer(listener, { like: 0 }));
    });

    it('scales the verdict to the table, so staying quiet is neutral', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 1, tracksPlayedPerPlayer: 1 });
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [a] = Object.values(ids).filter(id => id !== dj);

        // One of two listeners answers: 4 + 1 for novelty, averaged over the
        // one who spoke, scaled back up to the two who could have.
        room.answer(a, { like: 4 });
        room.reveal(ids.ana);

        expect(room.players.get(dj)!.score).toBe(10);
    });
});

describe('claims', () => {
    it('is a lobby decision, made before you know anything about the night', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        const mine = room.players.get(ids.ana)!.trackIds[0];

        room.setClaim(ids.ana, mine, 'so-me');
        expect(room.tracks.get(mine)!.claim).toEqual({ id: 'so-me' });

        room.start(ids.ana);
        // Once the music is playing the bet is locked: otherwise it stops being
        // a bet and becomes a read on how the night is going.
        expectError('WRONG_PHASE', () => room.setClaim(ids.ana, mine, 'divisive'));
    });

    it('starts every track on the safe claim', () => {
        const { room, ids } = setup(['ana', 'bo']);
        for (const trackId of room.players.get(ids.ana)!.trackIds) {
            expect(room.tracks.get(trackId)!.claim).toEqual({ id: 'none' });
        }
    });

    it('refuses to let you claim somebody else\u2019s track', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        const theirs = room.players.get(ids.bo)!.trackIds[0];
        expectError('TRACK_NOT_FOUND', () => room.setClaim(ids.ana, theirs, 'so-me'));
    });

    it('allows one of each limited claim, and any number of the safe one', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 3, tracksPlayedPerPlayer: 2 });
        const [first, second, third] = room.players.get(ids.ana)!.trackIds;

        room.setClaim(ids.ana, first, 'so-me');
        expectError('CLAIM_SPENT', () => room.setClaim(ids.ana, second, 'so-me'));

        // Moving it to another track is fine; having two is not.
        room.setClaim(ids.ana, first, 'never-heard');
        room.setClaim(ids.ana, second, 'so-me');
        expect(room.tracks.get(first)!.claim.id).toBe('never-heard');

        room.setClaim(ids.ana, third, 'none');
        room.setClaim(ids.ana, first, 'none');
        expect(room.tracks.get(third)!.claim.id).toBe('none');
    });

    it('withholds the claims a two-player table would give away', () => {
        const { room, ids } = setup(['ana', 'bo']);
        const mine = room.players.get(ids.ana)!.trackIds[0];

        expectError('CLAIM_UNAVAILABLE', () => room.setClaim(ids.ana, mine, 'so-me'));
        expectError('CLAIM_UNAVAILABLE', () => room.setClaim(ids.ana, mine, 'divisive'));
        // Freshness needs nobody to deduce anything, so it stands.
        room.setClaim(ids.ana, mine, 'never-heard');
        expect(room.tracks.get(mine)!.claim.id).toBe('never-heard');
    });

    it('drops a claim the table can no longer support instead of stranding it', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        const identified = room.players.get(ids.ana)!.trackIds[0];
        const split = room.players.get(ids.ana)!.trackIds[1];

        room.setClaim(ids.ana, identified, 'so-me');
        room.setClaim(ids.ana, split, 'divisive');

        // Guessing off makes identification unscoreable...
        room.updateSettings(ids.ana, { guessingEnabled: false });
        expect(room.tracks.get(identified)!.claim.id).toBe('none');
        expect(room.tracks.get(split)!.claim.id).toBe('divisive');

        // ...and a table of two has nobody left to split.
        room.leave(ids.cy);
        expect(room.tracks.get(split)!.claim.id).toBe('none');
    });

    it('puts the claim through the scoreboard when the round is revealed', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 1, tracksPlayedPerPlayer: 1 });
        for (const id of Object.values(ids)) {
            room.setClaim(id, room.players.get(id)!.trackIds[0], 'never-heard');
        }
        room.start(ids.ana);

        const dj = room.round!.djId;
        const [a, b] = Object.values(ids).filter(id => id !== dj);
        room.answer(a, { like: 4 });
        room.answer(b, { like: 4 });
        // Neither had heard it: 4 + 1 each = 10 from the room, and freshness 1
        // pays the claim at x1.5.
        room.reveal(ids.ana);

        expect(room.players.get(dj)!.score).toBe(15);
    });
});

describe('the tax on the obvious', () => {
    it('takes half when everybody calls it a hit, and nothing when nobody does', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 2, tracksPlayedPerPlayer: 2 });
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [a, b] = Object.values(ids).filter(id => id !== dj);

        room.answer(a, { like: 4, heard: true, popular: true });
        room.answer(b, { like: 4, heard: true, popular: true });
        room.reveal(ids.ana);
        // 8 from the room, halved: a famous banger is never the easy win.
        expect(room.players.get(dj)!.score).toBe(4);

        room.next(ids.ana);
        const dj2 = room.round!.djId;
        for (const id of Object.values(ids).filter(other => other !== dj2)) {
            room.answer(id, { like: 4, heard: true });
        }
        room.reveal(ids.ana);
        const banked = dj2 === dj ? room.players.get(dj2)!.score - 4 : room.players.get(dj2)!.score;
        expect(banked).toBe(8);
    });

    it('scales with the share, so one dissenting voice is not a cliff', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 1, tracksPlayedPerPlayer: 1 });
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [a, b] = Object.values(ids).filter(id => id !== dj);

        // Half the room calls it obvious: a quarter off, not a half.
        room.answer(a, { like: 4, heard: true, popular: true });
        room.answer(b, { like: 4, heard: true });
        room.reveal(ids.ana);
        expect(room.players.get(dj)!.score).toBe(6);
    });
});

describe('novelty and emotion', () => {
    it('pays a little for being new and more for getting to somebody', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 1, tracksPlayedPerPlayer: 1 });
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [a, b] = Object.values(ids).filter(id => id !== dj);

        // a: liked it 3, new to them, moved -> 3 + 1 + 2 = 6
        // b: liked it 3, heard it, unmoved -> 3
        room.answer(a, { like: 3, moved: true });
        room.answer(b, { like: 3, heard: true });
        room.reveal(ids.ana);

        expect(room.players.get(dj)!.score).toBe(9);
    });

    it('counts being moved even by a track nobody liked', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 1, tracksPlayedPerPlayer: 1 });
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [a, b] = Object.values(ids).filter(id => id !== dj);

        room.answer(a, { like: 0, heard: true, moved: true });
        room.answer(b, { like: 0, heard: true, moved: true });
        room.reveal(ids.ana);

        // Nobody liked it and it still scored: getting to people is the point.
        expect(room.players.get(dj)!.score).toBe(4);
    });
});

describe('decoys', () => {
    it('is the DJ\'s move and nobody else\'s', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const other = Object.values(ids).find(id => id !== dj)!;

        expectError('DECOY_NOT_DJ', () => room.setDecoy(other, dj));
        room.setDecoy(dj, other);
        expect(room.round!.decoyId).toBe(other);
    });

    it('rejects pointing at yourself or at a stranger', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        expectError('DECOY_INVALID_TARGET', () => room.setDecoy(dj, dj));
        expectError('DECOY_INVALID_TARGET', () => room.setDecoy(dj, 'batman'));
    });

    it('can be cleared again', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const other = Object.values(ids).find(id => id !== dj)!;
        room.setDecoy(dj, other);
        room.setDecoy(dj, null);
        expect(room.round!.decoyId).toBeNull();
    });

    it('scores a point for every listener it fools', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 2, tracksPlayedPerPlayer: 1 });
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [a, b] = Object.values(ids).filter(id => id !== dj);

        room.setDecoy(dj, a);
        room.vote(b, a); // fooled
        room.vote(a, dj); // correct
        room.reveal(ids.ana);

        expect(room.players.get(dj)!.score).toBe(1);
        // Naming the DJ correctly is still worth playing for — it feeds their
        // `so-me` claim and the trophies — but it is worth no points.
        expect(room.players.get(a)!.score).toBe(0);
        expect(room.history[0].votes.find(v => v.voterId === b)!.fooled).toBe(true);
    });

    it('is dropped if the decoy target walks out', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const target = Object.values(ids).find(id => id !== dj)!;
        room.setDecoy(dj, target);
        room.leave(target);
        // Blaming somebody who is no longer in the room is unguessable.
        expect(room.round!.decoyId).toBeNull();
    });
});

describe('scoring and progression', () => {
    it('banks every point on one score, once', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 1, tracksPlayedPerPlayer: 1 });
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [a, b] = Object.values(ids).filter(id => id !== dj);

        room.vote(a, dj); // correct
        room.vote(b, a); // wrong
        room.answer(a, { like: 4, heard: true });
        room.answer(b, { like: 2, heard: true });
        room.reveal(ids.ana);

        // Naming the DJ wins a trophy at the end, never a point on the night.
        expect(room.players.get(a)!.score).toBe(0);
        expect(room.players.get(b)!.score).toBe(0);
        expect(room.players.get(dj)!.score).toBe(6);

        // Revealing twice must not double-score.
        expectError('WRONG_PHASE', () => room.reveal(ids.ana));
        expect(room.players.get(dj)!.score).toBe(6);
    });

    it('cannot skip a round by calling next at the wrong time', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.start(ids.ana);
        // v1 accepted `nextRound` in any phase, from any client.
        expectError('WRONG_PHASE', () => room.next(ids.ana));
    });

    it('plays the chosen tracks exactly once and then finishes', () => {
        const { room, ids } = setup(['ana', 'bo'], { tracksPerPlayer: 3, tracksPlayedPerPlayer: 2 });
        room.start(ids.ana);
        expect(room.setlist).toHaveLength(4);

        const seen: string[] = [];
        for (let i = 0; i < 4; i++) {
            expect(room.phase).not.toBe('finished');
            seen.push(room.round!.trackId);

            const listener = Object.values(ids).find(id => id !== room.round!.djId)!;
            room.vote(listener, room.round!.djId);
            room.answer(listener, { like: 3 });

            room.reveal(ids.ana);
            room.next(ids.ana);
        }

        expect(new Set(seen).size).toBe(4);
        expect(room.phase).toBe('finished');
        expect(room.history).toHaveLength(4);
        expect(room.awards().map(award => award.id).sort()).toEqual([
            'crowd-favourite',
            'deep-cut',
            'human-shazam',
            'track-of-the-night',
        ]);
    });

    it('leaves the unplayed tracks out of the setlist and reveals them at the end', () => {
        const { room, ids } = setup(['ana', 'bo'], { tracksPerPlayer: 3, tracksPlayedPerPlayer: 2 });
        room.start(ids.ana);

        // Two of each player's three tracks play; the rest are "the ones that
        // got away" - and their existence is what keeps elimination unreliable.
        expect(room.setlist).toHaveLength(4);
        expect(room.unplayedTracks()).toHaveLength(0); // not until the game ends

        for (let i = 0; i < 4; i++) {
            room.reveal(ids.ana);
            room.next(ids.ana);
        }

        expect(room.phase).toBe('finished');
        const unplayed = room.unplayedTracks();
        expect(unplayed).toHaveLength(2);
        expect(new Set(unplayed.map(entry => entry.djId))).toEqual(new Set([ids.ana, ids.bo]));
    });

    it('hands every DJ the same number of slots, whoever queued more', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 3, tracksPlayedPerPlayer: 2 });
        room.start(ids.ana);

        const owners = room.setlist.map(trackId => room.tracks.get(trackId)!.ownerId);
        for (const id of Object.values(ids)) {
            expect(owners.filter(owner => owner === id)).toHaveLength(2);
        }
    });

    it('hands out no awards when the room was completely silent', () => {
        // Nobody voted, nobody rated: an honest empty list beats five trophies
        // for zero of everything, which is what v1 rendered.
        const { room, ids } = setup(['ana', 'bo'], { tracksPerPlayer: 1 });
        room.start(ids.ana);
        room.reveal(ids.ana);
        room.next(ids.ana);
        room.reveal(ids.ana);
        room.next(ids.ana);

        expect(room.phase).toBe('finished');
        expect(room.awards()).toEqual([]);
    });
});

describe('leaving and host succession', () => {
    it('keeps a leaver in history but pulls their unplayed tracks', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 2 });
        room.start(ids.ana);
        room.reveal(ids.ana);
        room.next(ids.ana);

        const before = room.setlist.length;
        const played = new Set(room.history.map(entry => entry.trackId));
        room.leave(ids.cy);

        expect(room.setlist.length).toBeLessThanOrEqual(before);
        // Nothing already played is retro-actively removed.
        for (const trackId of played) expect(room.setlist).toContain(trackId);
        // And their name still resolves for the reveal that already happened.
        expect(room.players.get(ids.cy)!.name).toBe('cy');
    });

    it('hands the crown over immediately when the host leaves', () => {
        const { room, ids } = setup(['ana', 'bo']);
        expect(room.hostId).toBe(ids.ana);
        room.leave(ids.ana);
        expect(room.hostId).toBe(ids.bo);
    });

    it('waits out a brief host disconnect, then moves on', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.detachSocket(ids.ana);

        room.reassignHostIfNeeded();
        expect(room.hostId).toBe(ids.ana); // still within the grace period

        clock += HOST_GRACE_MS + 1;
        room.reassignHostIfNeeded();
        expect(room.hostId).toBe(ids.bo);
    });

    it('survives a multi-tab player closing one tab', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.attachSocket(ids.ana); // second tab
        room.detachSocket(ids.ana);
        // v1 keyed presence off a single socket, so closing one tab showed the
        // player as disconnected while they were still sitting there.
        expect(room.players.get(ids.ana)!.presence).toBe('online');
        room.detachSocket(ids.ana);
        expect(room.players.get(ids.ana)!.presence).toBe('offline');
    });
});

describe('projection', () => {
    it('hides the DJ, the voters and the answers until the reveal', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [watcher, other] = Object.values(ids).filter(id => id !== dj);

        room.vote(watcher, other);
        room.answer(watcher, { like: 4 });
        room.setDecoy(dj, watcher);

        const view = projectGame(room, watcher);
        expect(view.round!.reveal).toBeUndefined();
        expect(view.round!.isMine).toBe(false);
        expect(view.round!.myGuess).toBe(other);
        expect(view.round!.myAnswer.like).toBe(4);
        expect(view.round!.answersIn).toBe(1);
        expect(view.round!.myDecoy).toBeUndefined();
        // The payload must not contain the DJ's id anywhere.
        expect(JSON.stringify(view.round)).not.toContain(dj);
    });

    it('withholds the DJ\u2019s claim from the room until the reveal', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy'], { tracksPerPlayer: 1, tracksPlayedPerPlayer: 1 });
        for (const id of Object.values(ids)) {
            room.setClaim(id, room.players.get(id)!.trackIds[0], 'never-heard');
        }
        room.start(ids.ana);
        const dj = room.round!.djId;
        const listener = Object.values(ids).find(id => id !== dj)!;

        // A claim on screen is elimination information — one of each per night,
        // so a second `never-heard` would say "not whoever played the first".
        // It also leans on the very answers it is scored on.
        const hidden = projectGame(room, listener).round!;
        expect(hidden.track.claim).toBeUndefined();
        expect(JSON.stringify(hidden)).not.toContain('never-heard');

        // The DJ has to be able to remember what they bet.
        expect(projectGame(room, dj).round!.track.claim).toEqual({ id: 'never-heard' });

        room.reveal(ids.ana);
        expect(projectGame(room, listener).round!.track.claim).toEqual({ id: 'never-heard' });
    });

    it('shows the DJ their own decoy and nobody else theirs', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [watcher, target] = Object.values(ids).filter(id => id !== dj);
        room.setDecoy(dj, target);

        expect(projectGame(room, dj).round!.myDecoy).toBe(target);
        // For everyone else the decoy must be absent, not merely unrendered.
        const others = JSON.stringify(projectGame(room, watcher).round);
        expect(others).not.toContain('myDecoy');
    });

    it('never leaks who answered what before the reveal', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const [a, b] = Object.values(ids).filter(id => id !== dj);
        room.answer(a, { like: 5, moved: true });
        room.answer(b, { like: 1, popular: true });

        const view = projectGame(room, dj);
        expect(view.round!.answersIn).toBe(2);
        // A count, never a total: the running score would give away the answers
        // themselves, and the DJ must not learn who said what about their track.
        expect(JSON.stringify(view.round)).not.toContain(a);
        expect(JSON.stringify(view.round)).not.toContain(b);
        expect(JSON.stringify(view.round)).not.toContain(a);
        expect(JSON.stringify(view.round)).not.toContain(b);
    });

    it('never puts another player\u2019s answer on the wire', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const other = Object.values(ids).find(id => id !== dj)!;
        room.answer(other, { like: 5, moved: true });

        // The viewer sees their own answer and an anonymous count, nothing else.
        expect(projectGame(room, other).round!.myAnswer.like).toBe(5);
        expect(projectGame(room, dj).round!.myAnswer.like).toBeUndefined();
        expect(JSON.stringify(projectGame(room, dj).players)).not.toContain('like');
    });

    it('never includes another player\u2019s queue', () => {
        const { room, ids } = setup(['ana', 'bo']);
        const view = projectGame(room, ids.bo);
        const bosTracks = room.players.get(ids.bo)!.trackIds;
        expect(view.you.tracks.map(track => track.id)).toEqual(bosTracks);
        expect(JSON.stringify(view.players)).not.toContain(room.players.get(ids.ana)!.trackIds[0]);
    });

    it('tells the DJ it is their track, without telling anyone else', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const other = Object.values(ids).find(id => id !== dj)!;

        expect(projectGame(room, dj).round!.isMine).toBe(true);
        expect(projectGame(room, dj).round!.canVote).toBe(false);
        expect(projectGame(room, other).round!.isMine).toBe(false);
        expect(projectGame(room, other).round!.canVote).toBe(true);
    });

    it('opens everything up at the reveal', () => {
        const { room, ids } = setup(['ana', 'bo']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const other = Object.values(ids).find(id => id !== dj)!;
        room.vote(other, dj);
        room.answer(other, { like: 4, heard: true, moved: true });
        room.reveal(ids.ana);

        const reveal = projectGame(room, other).round!.reveal!;
        expect(reveal.djId).toBe(dj);
        // Attributed on purpose: it is the only thing holding the honesty rule up.
        expect(reveal.answers).toEqual([
            { listenerId: other, like: 4, heard: true, popular: false, moved: true },
        ]);
        expect(reveal.votes).toEqual([{ voterId: other, guessId: dj, correct: true, fooled: false }]);
        expect(reveal.points).toContainEqual({ playerId: dj, points: 6, reason: 'room-verdict' });
    });

    it('never puts a per-player vote flag on the wire at all', () => {
        // Marking the DJ as "voted" made them the only player already done the
        // instant the round opened; marking them as "not voted" made them the
        // last one pending at the end. Either way the roster gave them away, so
        // the field is gone and progress is reported only in aggregate.
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const voters = Object.values(ids).filter(id => id !== dj);

        for (const stage of ['fresh', 'partial', 'complete'] as const) {
            if (stage === 'partial') room.vote(voters[0], dj);
            if (stage === 'complete') room.vote(voters[1], dj);

            for (const viewer of Object.values(ids)) {
                const view = projectGame(room, viewer);
                expect(JSON.stringify(view.players), stage).not.toContain('hasVoted');
                // The aggregate counter is identical for every viewer, DJ included.
                expect(view.round!.votersExpected).toBe(2);
            }
        }
    });

    it('never reports more votes cast than voters expected', () => {
        const { room, ids } = setup(['ana', 'bo', 'cy']);
        room.start(ids.ana);
        const dj = room.round!.djId;
        const voters = Object.values(ids).filter(id => id !== dj);

        room.vote(voters[0], dj);
        room.vote(voters[1], dj);
        room.detachSocket(voters[0]);

        const round = projectGame(room, voters[1]).round!;
        expect(round.votesIn).toBeLessThanOrEqual(round.votersExpected);
    });
});

describe('metadata', () => {
    it('applies a lookup result once and marks failures', () => {
        const room = new GameRoom({ id: 'T', now });
        const { player } = room.addPlayer('ana');
        const { track } = room.addTrack(player.id, SPOTIFY(1));

        expect(room.applyMetadata(track.id, { title: 'Blue Monday', artist: 'New Order' })).toBe(true);
        expect(room.tracks.get(track.id)!.title).toBe('Blue Monday');
        // Late duplicate results must not clobber a resolved track.
        expect(room.applyMetadata(track.id, { title: 'Something else' })).toBe(false);

        const second = room.addTrack(player.id, SPOTIFY(2)).track;
        expect(room.applyMetadata(second.id, null)).toBe(true);
        expect(room.tracks.get(second.id)!.metadata).toBe('failed');
        expect(room.applyMetadata('ghost-track', null)).toBe(false);
    });
});
