import { describe, expect, it } from 'vitest';
import {
    CLAIMS_BY_ID,
    CLAIM_FLOOR,
    claimAvailable,
    claimMultiplier,
    freshness,
    identificationRate,
    spread,
    type AnswerRecord,
    type ClaimId,
    type Rating,
} from '@secret-dj/common';

type Spec = [like: Rating, heard?: boolean, moved?: boolean, popular?: boolean];

const said = (specs: Spec[]): AnswerRecord[] =>
    specs.map(([like, heard = false, moved = false, popular = false], index) => ({
        listenerId: `p${index}`,
        like,
        heard,
        popular,
        moved,
    }));

const votes = (correct: number, wrong: number) => [
    ...Array.from({ length: correct }, () => ({ correct: true })),
    ...Array.from({ length: wrong }, () => ({ correct: false })),
];

const outcome = (id: ClaimId, answers: AnswerRecord[] = [], voteList = votes(0, 0)) => ({
    claim: { id },
    answers,
    votes: voteList,
});

describe('the safe claim is the floor', () => {
    it('pays exactly what the room gave, whatever happened', () => {
        for (const answers of [[], said([[5], [5]]), said([[0], [1]])]) {
            expect(claimMultiplier(outcome('none', answers))).toBe(1);
        }
    });

    it('is the only claim a player may repeat in one night', () => {
        expect(CLAIMS_BY_ID.none.limit).toBeNull();
        for (const id of ['never-heard', 'unanimous', 'emotional', 'so-me', 'divisive'] as const) {
            expect(CLAIMS_BY_ID[id].limit).toBe(1);
        }
    });

    it('is beaten by every claim that lands, and beats every one that misses', () => {
        // The whole mechanic: queueing something everyone mildly enjoys can
        // never be the strongest line, and can never be the worst either.
        const landed = [
            claimMultiplier(outcome('never-heard', said([[4], [4]]))),
            claimMultiplier(outcome('unanimous', said([[4], [5]]))),
            claimMultiplier(outcome('emotional', said([[3, false, true], [1, false, true]]))),
            claimMultiplier(outcome('so-me', [], votes(4, 0))),
            claimMultiplier(outcome('divisive', said([[5], [0]]))),
        ];
        const missed = [
            claimMultiplier(outcome('never-heard', said([[4, true], [4, true]]))),
            claimMultiplier(outcome('unanimous', said([[3], [2]]))),
            claimMultiplier(outcome('emotional', said([[4], [4]]))),
            claimMultiplier(outcome('so-me', [], votes(0, 4))),
            claimMultiplier(outcome('divisive', said([[4], [4]]))),
        ];

        expect(landed.every(value => value > 1)).toBe(true);
        expect(missed.every(value => value === CLAIM_FLOOR)).toBe(true);
    });

    it('keeps every claim inside the same band, so no bet dwarfs another', () => {
        const extremes = [
            outcome('never-heard', said([[5], [5]])),
            outcome('unanimous', said([[5], [5]])),
            outcome('emotional', said([[5, false, true], [5, false, true]])),
            outcome('so-me', [], votes(3, 0)),
            outcome('divisive', said([[5], [0]])),
        ];
        for (const one of extremes) {
            expect(claimMultiplier(one)).toBeLessThanOrEqual(1.5);
            expect(claimMultiplier(one)).toBeGreaterThanOrEqual(CLAIM_FLOOR);
        }
    });
});

describe('one dishonest answer is barely worth telling', () => {
    it('moves any claim by at most one share of the room', () => {
        // The honesty rule is a house rule, so the scoring's job is to make
        // lying pointless rather than impossible. Every multiplier is a share,
        // so in a room of six a single false answer moves it by a sixth.
        const honest = said([[5], [5], [5], [5], [5], [5]]);
        const liar = said([[5], [5], [5], [5], [5], [5, true]]);

        const before = claimMultiplier(outcome('never-heard', honest));
        const after = claimMultiplier(outcome('never-heard', liar));
        expect(before - after).toBeCloseTo(1 / 6, 10);
    });
});

describe('never-heard', () => {
    it('measures how much of the answering room the track was new to', () => {
        expect(freshness(said([[4], [4]]))).toBe(1);
        expect(freshness(said([[4, true], [4]]))).toBe(0.5);
        expect(freshness(said([[4, true], [4, true]]))).toBe(0);
    });

    it('is zero when the room said nothing at all', () => {
        expect(freshness([])).toBe(0);
        expect(claimMultiplier(outcome('never-heard'))).toBe(CLAIM_FLOOR);
    });
});

describe('unanimous', () => {
    it('wants everybody at four or more, and one holdout costs you', () => {
        expect(claimMultiplier(outcome('unanimous', said([[4], [5], [4]])))).toBe(1.5);
        expect(claimMultiplier(outcome('unanimous', said([[4], [5], [3]])))).toBeCloseTo(0.5 + 2 / 3, 10);
        expect(claimMultiplier(outcome('unanimous', said([[3], [3]])))).toBe(CLAIM_FLOOR);
    });
});

describe('emotional', () => {
    it('counts being moved, which is not the same as liking it', () => {
        // Nobody liked it and everybody felt it: the claim lands in full.
        expect(claimMultiplier(outcome('emotional', said([[0, false, true], [1, false, true]])))).toBe(1.5);
        // Everybody liked it and nobody was moved: it misses in full.
        expect(claimMultiplier(outcome('emotional', said([[5], [5]])))).toBe(CLAIM_FLOOR);
    });
});

describe('so-me', () => {
    it('pays on being recognised, and nothing else', () => {
        expect(identificationRate(votes(0, 3))).toBe(0);
        expect(identificationRate(votes(3, 0))).toBe(1);
        expect(claimMultiplier(outcome('so-me', [], votes(2, 2)))).toBe(1);
        expect(claimMultiplier(outcome('so-me', [], votes(4, 0)))).toBe(1.5);
    });

    it('bottoms out rather than dividing by an empty room', () => {
        expect(claimMultiplier(outcome('so-me'))).toBe(CLAIM_FLOOR);
    });
});

describe('divisive', () => {
    it('peaks on a dead-even split and collapses when one camp is empty', () => {
        expect(spread(said([[5], [1]]))).toBe(1);
        expect(spread(said([[5], [4], [1], [0]]))).toBe(1);
        expect(spread(said([[5], [5], [5], [5]]))).toBe(0);
        expect(spread(said([[1], [0]]))).toBe(0);
    });

    it('cannot be farmed with a track nobody loves', () => {
        // Three haters and no lovers is not a split, it is a bad track.
        expect(spread(said([[0], [1], [1]]))).toBe(0);
    });

    it('ignores the lukewarm middle, which is neither camp', () => {
        expect(spread(said([[2], [3]]))).toBe(0);
    });
});

describe('what a table can play', () => {
    const big = { players: 5, guessingEnabled: true };

    it('offers the safe claim, novelty and emotion to any table at all', () => {
        const tiny = { players: 2, guessingEnabled: false };
        for (const id of ['none', 'never-heard', 'emotional'] as const) {
            expect(claimAvailable(CLAIMS_BY_ID[id], tiny)).toBe(true);
        }
    });

    it('withholds the claims that need a room rather than a person', () => {
        // "Everyone" and "split" both need at least two listeners to mean
        // anything, and identification needs the DJ to not be obvious.
        for (const id of ['unanimous', 'divisive', 'so-me'] as const) {
            expect(claimAvailable(CLAIMS_BY_ID[id], { players: 2, guessingEnabled: true })).toBe(false);
            expect(claimAvailable(CLAIMS_BY_ID[id], big)).toBe(true);
        }
    });

    it('withholds identification claims from a listening party', () => {
        expect(claimAvailable(CLAIMS_BY_ID['so-me'], { players: 5, guessingEnabled: false })).toBe(false);
        // Nothing else is scored off the guesses, so nothing else is affected.
        expect(claimAvailable(CLAIMS_BY_ID.divisive, { players: 5, guessingEnabled: false })).toBe(true);
    });
});
