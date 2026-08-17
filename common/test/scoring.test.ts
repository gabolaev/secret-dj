import { describe, expect, it } from 'vitest';
import { computeAwards, computeRoundPoints, heartBudget, trackScore, type PlayedTrack } from '@secret-dj/common';

const track = (id: string): PlayedTrack['track'] => ({
    id,
    url: `https://open.spotify.com/track/${id}`,
    title: `Track ${id}`,
    metadata: 'ready',
});

interface RoundSpec {
    dj: string;
    hearts?: string[];
    anthems?: string[];
    decoy?: string;
    votes?: Array<[voter: string, guess: string]>;
}

function played(number: number, spec: RoundSpec): PlayedTrack {
    return {
        number,
        track: track(`t${number}`),
        djId: spec.dj,
        heartedBy: spec.hearts ?? [],
        anthemBy: spec.anthems ?? [],
        decoyId: spec.decoy,
        votes: (spec.votes ?? []).map(([voterId, guessId]) => ({
            voterId,
            guessId,
            correct: guessId === spec.dj,
            fooled: spec.decoy !== undefined && guessId === spec.decoy && guessId !== spec.dj,
        })),
    };
}

describe('heartBudget', () => {
    it('scales with how many tracks you will actually hear', () => {
        // 12-track night, you DJ 2 of them, so you listen to 10 -> 4 hearts.
        expect(heartBudget(12, 2)).toBe(4);
        expect(heartBudget(20, 2)).toBe(8);
    });

    it('always leaves at least one heart to spend', () => {
        expect(heartBudget(2, 2)).toBe(1);
        expect(heartBudget(0, 0)).toBe(1);
    });

    it('is scarce enough to force a choice', () => {
        // The whole mechanic depends on the budget being well under the number
        // of tracks you hear; otherwise "heart everything" comes back.
        const setlist = 15;
        const listened = setlist - 3;
        expect(heartBudget(setlist, 3)).toBeLessThan(listened / 2 + 1);
    });
});

describe('trackScore', () => {
    it('counts an anthem as three hearts', () => {
        expect(trackScore({ heartedBy: ['a', 'b'], anthemBy: [] })).toBe(2);
        expect(trackScore({ heartedBy: [], anthemBy: ['a'] })).toBe(3);
        expect(trackScore({ heartedBy: ['a', 'b'], anthemBy: ['c'] })).toBe(5);
    });
});

describe('computeRoundPoints', () => {
    it('splits points across the two boards and never mixes them', () => {
        const points = computeRoundPoints({
            djId: 'ana',
            votes: [
                { voterId: 'bo', correct: true, fooled: false },
                { voterId: 'cy', correct: false, fooled: true },
                { voterId: 'di', correct: false, fooled: true },
            ],
            heartedBy: ['bo', 'cy'],
            anthemBy: ['di'],
        });

        expect(points).toEqual([
            { playerId: 'bo', points: 1, reason: 'correct-guess', board: 'detective' },
            { playerId: 'ana', points: 2, reason: 'hearts-received', board: 'selector' },
            { playerId: 'ana', points: 3, reason: 'anthem-received', board: 'selector' },
            { playerId: 'ana', points: 2, reason: 'decoy-hit', board: 'detective' },
        ]);

        // Taste cannot win the deduction game and vice versa.
        const selector = points.filter(p => p.board === 'selector');
        expect(selector.every(p => p.reason.endsWith('received'))).toBe(true);
    });

    it('awards nothing when nothing happened', () => {
        expect(computeRoundPoints({ djId: 'ana', votes: [], heartedBy: [], anthemBy: [] })).toEqual([]);
    });
});

describe('computeAwards', () => {
    const players = ['ana', 'bo', 'cy'];

    it('picks the ghost by identification rate, lower being better', () => {
        // ana is named 2/2, bo 0/2.
        const history = [
            played(1, { dj: 'ana', votes: [['bo', 'ana'], ['cy', 'ana']] }),
            played(2, { dj: 'bo', votes: [['ana', 'cy'], ['cy', 'ana']] }),
        ];

        const ghost = computeAwards(history, players).find(award => award.id === 'ghost');
        expect(ghost?.winners).toEqual(['bo']);
        expect(ghost?.value).toBe(0);
    });

    it('cannot be won just by queueing more tracks', () => {
        const history = [
            played(1, { dj: 'ana', votes: [['bo', 'ana'], ['cy', 'cy']] }),
            played(2, { dj: 'ana', votes: [['bo', 'cy'], ['cy', 'bo']] }),
            played(3, { dj: 'bo', votes: [['ana', 'bo']] }),
        ];

        const ghost = computeAwards(history, players).find(award => award.id === 'ghost');
        expect(ghost?.winners).toEqual(['ana']);
        expect(ghost?.value).toBe(25);
    });

    it('weights the crowd favourite by anthems, not just heart count', () => {
        // bo gets three plain hearts; ana gets one anthem. They tie at 3.
        const history = [played(1, { dj: 'ana', anthems: ['cy'] }), played(2, { dj: 'bo', hearts: ['ana', 'cy', 'di'] })];
        const favourite = computeAwards(history, [...players, 'di']).find(award => award.id === 'crowd-favourite');
        expect(favourite?.winners.sort()).toEqual(['ana', 'bo']);
        expect(favourite?.value).toBe(3);
    });

    it('shares ties instead of picking by array order', () => {
        const history = [played(1, { dj: 'ana', hearts: ['bo', 'cy'] }), played(2, { dj: 'bo', hearts: ['ana', 'cy'] })];
        const favourite = computeAwards(history, players).find(award => award.id === 'crowd-favourite');
        expect(favourite?.winners.sort()).toEqual(['ana', 'bo']);
    });

    it('names the single best track and reports its title', () => {
        const history = [played(1, { dj: 'ana', hearts: ['bo'] }), played(2, { dj: 'bo', hearts: ['ana', 'cy'] })];
        const best = computeAwards(history, players).find(award => award.id === 'track-of-the-night');
        expect(best?.winners).toEqual(['bo']);
        expect(best?.value).toBe(2);
        expect(best?.detail).toBe('Track t2');
    });

    it('gives the golden ear to whoever backed the biggest track', () => {
        const history = [
            // cy's anthem lands on a track that ends up worth 3 + 1 = 4.
            played(1, { dj: 'ana', hearts: ['bo'], anthems: ['cy'] }),
            // bo's anthem lands on a quiet one, worth 3.
            played(2, { dj: 'cy', anthems: ['bo'] }),
        ];
        const golden = computeAwards(history, players).find(award => award.id === 'golden-ear');
        expect(golden?.winners).toEqual(['cy']);
        expect(golden?.value).toBe(4);
    });

    it('only considers players who actually spent an anthem', () => {
        const history = [played(1, { dj: 'ana', hearts: ['bo', 'cy'] })];
        expect(computeAwards(history, players).find(award => award.id === 'golden-ear')).toBeUndefined();
    });

    it('crowns the puppet master by decoys that landed', () => {
        const history = [
            played(1, { dj: 'ana', decoy: 'cy', votes: [['bo', 'cy'], ['cy', 'bo']] }),
            played(2, { dj: 'bo', decoy: 'ana', votes: [['ana', 'cy'], ['cy', 'ana']] }),
        ];
        const puppet = computeAwards(history, players).find(award => award.id === 'puppet-master');
        // ana fooled bo; bo fooled cy. One each.
        expect(puppet?.winners.sort()).toEqual(['ana', 'bo']);
        expect(puppet?.value).toBe(1);
    });

    it('does not count a decoy that happens to be the right answer', () => {
        // A "decoy" pointing at the real DJ is just the truth; it scores nothing.
        const history = [played(1, { dj: 'ana', decoy: 'ana', votes: [['bo', 'ana']] })];
        const awards = computeAwards(history, players);
        expect(awards.find(award => award.id === 'puppet-master')).toBeUndefined();
        expect(awards.find(award => award.id === 'human-shazam')?.winners).toEqual(['bo']);
    });

    it('omits awards nobody earned rather than handing out zeroes', () => {
        const history = [played(1, { dj: 'ana', votes: [['bo', 'cy']] })];
        const ids = computeAwards(history, players).map(award => award.id);
        expect(ids).not.toContain('crowd-favourite');
        expect(ids).not.toContain('human-shazam');
        expect(ids).not.toContain('golden-ear');
        expect(ids).not.toContain('puppet-master');
    });

    it('returns nothing at all for an empty game', () => {
        expect(computeAwards([], players)).toEqual([]);
    });
});
