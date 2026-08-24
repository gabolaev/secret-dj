import { describe, expect, it } from 'vitest';
import {
    DEFAULT_CLAIM,
    EMOTION_BONUS,
    NOVELTY_BONUS,
    computeAwards,
    computeRoundPoints,
    obviousnessDrag,
    roomVerdict,
    trackScore,
    trackVerdict,
    type AnswerRecord,
    type ClaimId,
    type PlayedTrack,
    type Rating,
} from '@secret-dj/common';

const track = (id: string, claim: ClaimId = 'none'): PlayedTrack['track'] => ({
    id,
    url: `https://open.spotify.com/track/${id}`,
    title: `Track ${id}`,
    metadata: 'ready',
    claim: { id: claim },
});

type Said = [listener: string, like: Rating, flags?: Partial<Omit<AnswerRecord, 'listenerId' | 'like'>>];

interface RoundSpec {
    dj: string;
    said?: Said[];
    /** Defaults to however many actually answered. */
    listeners?: number;
    claim?: ClaimId;
    votes?: Array<[voter: string, guess: string]>;
}

function played(number: number, spec: RoundSpec): PlayedTrack {
    const answers: AnswerRecord[] = (spec.said ?? []).map(([listenerId, like, flags]) => ({
        listenerId,
        like,
        heard: false,
        popular: false,
        moved: false,
        ...flags,
    }));
    return {
        number,
        track: track(`t${number}`, spec.claim),
        djId: spec.dj,
        answers,
        listenerCount: spec.listeners ?? answers.length,
        votes: (spec.votes ?? []).map(([voterId, guessId]) => ({
            voterId,
            guessId,
            correct: guessId === spec.dj,
        })),
    };
}

describe('what one listener is worth', () => {
    it('is their like, plus a nudge for novelty and more for being moved', () => {
        const base = played(1, { dj: 'ana', said: [['bo', 3, { heard: true }]] });
        expect(roomVerdict(base)).toBe(3);

        const fresh = played(1, { dj: 'ana', said: [['bo', 3]] });
        expect(roomVerdict(fresh)).toBe(3 + NOVELTY_BONUS);

        const moving = played(1, { dj: 'ana', said: [['bo', 3, { heard: true, moved: true }]] });
        expect(roomVerdict(moving)).toBe(3 + EMOTION_BONUS);
    });

    it('scores a track that moved people even though nobody liked it', () => {
        // Getting to someone is the rarer and better thing, so it survives a
        // room of zeroes. This is the case the like-only model could not see.
        const gutting = played(1, {
            dj: 'ana',
            said: [['bo', 0, { heard: true, moved: true }], ['cy', 0, { heard: true, moved: true }]],
        });
        expect(roomVerdict(gutting)).toBe(2 * EMOTION_BONUS);
    });
});

describe('staying quiet is neutral', () => {
    it('scales the average up to the table, so silence neither helps nor hurts', () => {
        // The one lever the honesty rule could not reach: deflating a rival by
        // saying nothing. Averaging and rescaling closes it.
        const everyone = played(1, { dj: 'ana', said: [['bo', 4, { heard: true }], ['cy', 4, { heard: true }]] });
        const oneQuiet = played(1, { dj: 'ana', said: [['bo', 4, { heard: true }]], listeners: 2 });
        expect(roomVerdict(oneQuiet)).toBe(roomVerdict(everyone));
    });

    it('makes a round played to a half-empty room comparable with a full one', () => {
        const busy = played(1, { dj: 'ana', said: [['bo', 3, { heard: true }], ['cy', 3, { heard: true }]] });
        const teaBreak = played(2, { dj: 'ana', said: [['bo', 3, { heard: true }]], listeners: 2 });
        expect(trackVerdict(teaBreak)).toBe(trackVerdict(busy));
    });

    it('is zero when nobody answered at all', () => {
        expect(roomVerdict(played(1, { dj: 'ana', listeners: 4 }))).toBe(0);
    });
});

describe('the tax on the obvious', () => {
    it('takes nothing when nobody calls it a hit, and half when everybody does', () => {
        expect(obviousnessDrag([])).toBe(1);
        expect(obviousnessDrag(played(1, { dj: 'ana', said: [['bo', 5]] }).answers)).toBe(1);
        expect(
            obviousnessDrag(played(1, { dj: 'ana', said: [['bo', 5, { popular: true }]] }).answers),
        ).toBe(0.5);
    });

    it('scales with the share, so one voice is never a cliff', () => {
        const half = played(1, {
            dj: 'ana',
            said: [['bo', 4, { popular: true }], ['cy', 4]],
        });
        expect(obviousnessDrag(half.answers)).toBe(0.75);
    });

    it('never takes a track all the way to nothing', () => {
        // A beloved classic that everybody knows should still be worth playing.
        const famous = played(1, {
            dj: 'ana',
            said: [['bo', 5, { heard: true, popular: true }], ['cy', 5, { heard: true, popular: true }]],
        });
        expect(trackVerdict(famous)).toBe(5);
    });
});

describe('computeRoundPoints', () => {
    it('shows its working: the room, the tax, then the claim', () => {
        const points = computeRoundPoints({
            djId: 'ana',
            claim: { id: 'never-heard' },
            votes: [],
            listenerCount: 2,
            answers: [
                { listenerId: 'bo', like: 4, heard: false, popular: true, moved: false },
                { listenerId: 'cy', like: 4, heard: false, popular: false, moved: false },
            ],
        });

        // 5 + 5 from the room, a quarter off for being half-obvious, and a
        // claim that landed in full on top of what is left.
        expect(points).toContainEqual({ playerId: 'ana', points: 10, reason: 'room-verdict' });
        expect(points).toContainEqual({ playerId: 'ana', points: -2, reason: 'obviousness' });
        expect(points).toContainEqual({ playerId: 'ana', points: 3, reason: 'claim-landed' });
    });

    it('takes points back off a claim that missed', () => {
        const points = computeRoundPoints({
            djId: 'ana',
            claim: { id: 'never-heard' },
            votes: [],
            listenerCount: 2,
            answers: [
                { listenerId: 'bo', like: 5, heard: true, popular: false, moved: false },
                { listenerId: 'cy', like: 5, heard: true, popular: false, moved: false },
            ],
        });
        expect(points).toContainEqual({ playerId: 'ana', points: 10, reason: 'room-verdict' });
        expect(points).toContainEqual({ playerId: 'ana', points: -5, reason: 'claim-landed' });
    });

    it('leaves the safe claim alone entirely', () => {
        const points = computeRoundPoints({
            djId: 'ana',
            claim: DEFAULT_CLAIM,
            votes: [],
            listenerCount: 1,
            answers: [{ listenerId: 'bo', like: 4, heard: true, popular: false, moved: false }],
        });
        expect(points.some(delta => delta.reason === 'claim-landed')).toBe(false);
        expect(points.some(delta => delta.reason === 'obviousness')).toBe(false);
    });

    it('pays nobody for guessing, however many get it right', () => {
        const points = computeRoundPoints({
            djId: 'ana',
            claim: DEFAULT_CLAIM,
            listenerCount: 2,
            answers: [],
            votes: [
                { voterId: 'bo', correct: true },
                { voterId: 'cy', correct: false },
            ],
        });
        expect(points).toEqual([]);
    });

    it('awards nothing when nothing happened', () => {
        expect(
            computeRoundPoints({ djId: 'ana', claim: DEFAULT_CLAIM, votes: [], answers: [], listenerCount: 3 }),
        ).toEqual([]);
    });
});

describe('trackScore', () => {
    it('is the room, taxed, then put through the bet', () => {
        const gamble = played(1, {
            dj: 'ana',
            claim: 'divisive',
            said: [['bo', 5, { heard: true }], ['cy', 0, { heard: true }]],
        });
        // The room gave 5; the even split paid it at x1.5.
        expect(trackVerdict(gamble)).toBe(5);
        expect(trackScore(gamble)).toBe(8);
    });
});

describe('computeAwards', () => {
    const players = ['ana', 'bo', 'cy'];

    it('picks the ghost by identification rate, lower being better', () => {
        const history = [
            played(1, { dj: 'ana', votes: [['bo', 'ana'], ['cy', 'ana']] }),
            played(2, { dj: 'bo', votes: [['ana', 'cy'], ['cy', 'ana']] }),
        ];
        const ghost = computeAwards(history, players).find(award => award.id === 'ghost');
        expect(ghost?.winners).toEqual(['bo']);
        expect(ghost?.value).toBe(0);
    });

    it('still crowns the best guesser, even though guessing pays nothing', () => {
        const history = [
            played(1, { dj: 'ana', votes: [['bo', 'ana'], ['cy', 'bo']] }),
            played(2, { dj: 'cy', votes: [['bo', 'cy'], ['ana', 'bo']] }),
        ];
        const shazam = computeAwards(history, players).find(award => award.id === 'human-shazam');
        expect(shazam?.winners).toEqual(['bo']);
        expect(shazam?.value).toBe(2);
    });

    it('gives the deep cut to the track fewest people had heard', () => {
        const history = [
            played(1, { dj: 'ana', said: [['bo', 4], ['cy', 4]] }),
            played(2, { dj: 'bo', said: [['ana', 4, { heard: true }], ['cy', 4]] }),
        ];
        const deep = computeAwards(history, players).find(award => award.id === 'deep-cut');
        expect(deep?.winners).toEqual(['ana']);
        expect(deep?.value).toBe(100);
        expect(deep?.detail).toBe('Track t1');
    });

    it('will not call an obscure track nobody liked a deep cut', () => {
        const history = [played(1, { dj: 'ana', said: [['bo', 0], ['cy', 0]] })];
        // Two zeroes still carry the novelty bonus, so it has to be truly dead.
        const dead = [played(1, { dj: 'ana', said: [['bo', 0, { heard: true }], ['cy', 0, { heard: true }]] })];
        expect(computeAwards(dead, players).find(award => award.id === 'deep-cut')).toBeUndefined();
        expect(computeAwards(history, players).find(award => award.id === 'deep-cut')).toBeDefined();
    });

    it('gives the gut punch to the track that moved the most people', () => {
        const history = [
            played(1, { dj: 'ana', said: [['bo', 1, { moved: true }], ['cy', 1, { moved: true }]] }),
            played(2, { dj: 'bo', said: [['ana', 5], ['cy', 5]] }),
        ];
        const punch = computeAwards(history, players).find(award => award.id === 'gut-punch');
        expect(punch?.winners).toEqual(['ana']);
        expect(punch?.value).toBe(2);
    });

    it('ranks tracks against each other by the room, not by a lucky claim', () => {
        const history = [
            // bo's claim lands and banks more, but the room liked ana's track more.
            played(1, { dj: 'ana', said: [['bo', 5, { heard: true }], ['cy', 5, { heard: true }]] }),
            played(2, { dj: 'bo', claim: 'never-heard', said: [['ana', 3], ['cy', 3]] }),
        ];
        const awards = computeAwards(history, players);

        // The room gave ana's track more (10 against 8)...
        const best = awards.find(award => award.id === 'track-of-the-night');
        expect(best?.winners).toEqual(['ana']);
        expect(best?.detail).toBe('Track t1');

        // ...but bo's bet landed, so bo banked more across the night.
        const favourite = awards.find(award => award.id === 'crowd-favourite');
        expect(favourite?.winners).toEqual(['bo']);
        expect(favourite?.value).toBe(12);
    });

    it('shares ties instead of picking by array order', () => {
        const history = [
            played(1, { dj: 'ana', said: [['bo', 4, { heard: true }], ['cy', 1, { heard: true }]] }),
            played(2, { dj: 'bo', said: [['ana', 2, { heard: true }], ['cy', 3, { heard: true }]] }),
        ];
        const favourite = computeAwards(history, players).find(award => award.id === 'crowd-favourite');
        expect(favourite?.winners.sort()).toEqual(['ana', 'bo']);
    });



    it('omits awards nobody earned rather than handing out zeroes', () => {
        // Nobody voted, nobody answered: an honest empty list beats seven
        // trophies for zero of everything.
        expect(computeAwards([played(1, { dj: 'ana' })], players)).toEqual([]);
        expect(computeAwards([], players)).toEqual([]);
    });
});
