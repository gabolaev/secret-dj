/**
 * Claims: what a DJ says a track will do, and what it takes to be right.
 *
 * The whole point of the mechanic is that **the safe play is the floor**. `none`
 * asks nothing of the music and pays exactly what the room gave; every other
 * claim multiplies that between 0.5 and 1.5, and lands only if the track really
 * was new to them, really did land with all of them, really moved them, really
 * is recognisably yours, or really did split them. Queueing something everyone
 * will mildly enjoy can therefore never be the strongest line — which is the
 * behaviour the old scoring rewarded and this one is built to stop.
 *
 * Every multiplier is a **share of the answering room**, never a threshold. That
 * is deliberate: since three of the four answers are self-reports no server can
 * check, the game asks people not to lie, and the least it can do in return is
 * make one dishonest answer worth almost nothing. In a room of six, a single
 * false answer moves any of these by a sixth of its range.
 *
 * Pure functions over a round's answers, no game state, fully tested.
 */
import { RATING_MAX, type AnswerRecord, type ClaimId } from './types.js';

/** Where a claim that misses bottoms out. Half of what the room actually gave. */
export const CLAIM_FLOOR = 0.5;

/** A like at or above this counts as "they loved it". */
export const LOVED_AT = 4;

/**
 * The widest the room can possibly disagree: half the scale.
 *
 * A population standard deviation peaks at half the range, when the answers sit
 * entirely at both ends — 0s and 5s and nothing between. Dividing by it puts
 * `spread` on the same 0–1 footing as every other claim's measure.
 */
export const MAX_DEVIATION = RATING_MAX / 2;

export interface ClaimDefinition {
    id: ClaimId;
    /** How many a player may play in one night. `null` is unlimited. */
    limit: number | null;
    /** Below this many players at the table, the claim is not offered. */
    minPlayers: number;
    /** True when the claim is scored off the guesses, so it needs them enabled. */
    needsGuessing: boolean;
}

export const CLAIMS: readonly ClaimDefinition[] = [
    { id: 'none', limit: null, minPlayers: 1, needsGuessing: false },
    { id: 'never-heard', limit: 1, minPlayers: 1, needsGuessing: false },
    // "Everyone" and "split" both need at least two listeners to mean anything.
    { id: 'unanimous', limit: 1, minPlayers: 3, needsGuessing: false },
    { id: 'emotional', limit: 1, minPlayers: 1, needsGuessing: false },
    // Scored on identification, so it needs guessing — and needs being named to
    // not be a foregone conclusion.
    { id: 'so-me', limit: 1, minPlayers: 3, needsGuessing: true },
    // The mirror of it. Nothing stops a player taking both on different tracks:
    // one you are proud to own, one you would rather nobody pinned on you.
    { id: 'not-me', limit: 1, minPlayers: 3, needsGuessing: true },
    { id: 'divisive', limit: 1, minPlayers: 3, needsGuessing: false },
];

export const CLAIMS_BY_ID: Record<ClaimId, ClaimDefinition> = Object.fromEntries(
    CLAIMS.map(claim => [claim.id, claim]),
) as Record<ClaimId, ClaimDefinition>;

export const DEFAULT_CLAIM: { id: ClaimId } = { id: 'none' };

/** Whether a table of this shape can play a given claim at all. */
export function claimAvailable(
    claim: ClaimDefinition,
    table: { players: number; guessingEnabled: boolean },
): boolean {
    if (table.players < claim.minPlayers) return false;
    return !claim.needsGuessing || table.guessingEnabled;
}

/** Share of the answering room for which `predicate` holds. Zero if nobody answered. */
export function shareOf(
    answers: readonly AnswerRecord[],
    predicate: (answer: AnswerRecord) => boolean,
): number {
    if (answers.length === 0) return 0;
    return answers.filter(predicate).length / answers.length;
}

/** Share of the room that named the DJ correctly. */
export function identificationRate(votes: readonly { correct: boolean }[]): number {
    if (votes.length === 0) return 0;
    return votes.filter(vote => vote.correct).length / votes.length;
}

/** Share of the answering room the track was new to. */
export function freshness(answers: readonly AnswerRecord[]): number {
    return shareOf(answers, answer => !answer.heard);
}

/**
 * How far apart the room was, from 0 (unanimous) to 1 (as split as it gets).
 *
 * The root-mean-square distance from the room's own average, normalised against
 * the widest disagreement the scale allows.
 *
 * This replaced counting how many landed either side of a threshold, which was
 * a step function pretending to be a measure: one listener moving from 3 to 4
 * swung the multiplier hard, while a room that answered 5, 5, 3, 3 scored zero
 * despite plainly disagreeing. Deviation reads every answer, and reads the
 * *size* of each disagreement rather than just which side of a line it fell on.
 *
 * A track everybody disliked still barely pays: the deviation is small, and it
 * multiplies a base that is close to zero anyway.
 */
export function spread(answers: readonly AnswerRecord[]): number {
    // One answer has nothing to be far from, and cannot split a room.
    if (answers.length < 2) return 0;
    const mean = answers.reduce((sum, answer) => sum + answer.like, 0) / answers.length;
    const variance =
        answers.reduce((sum, answer) => sum + (answer.like - mean) ** 2, 0) / answers.length;
    return Math.min(1, Math.sqrt(variance) / MAX_DEVIATION);
}

export interface ClaimOutcome {
    claim: { id: ClaimId };
    answers: readonly AnswerRecord[];
    votes: readonly { correct: boolean }[];
}

/** What the DJ's claim turned out to be worth, as a multiplier on the verdict. */
export function claimMultiplier(outcome: ClaimOutcome): number {
    switch (outcome.claim.id) {
        case 'never-heard':
            return CLAIM_FLOOR + freshness(outcome.answers);
        case 'unanimous':
            return CLAIM_FLOOR + shareOf(outcome.answers, answer => answer.like >= LOVED_AT);
        case 'emotional':
            return CLAIM_FLOOR + shareOf(outcome.answers, answer => answer.moved);
        case 'so-me':
            return CLAIM_FLOOR + identificationRate(outcome.votes);
        case 'not-me':
            // Pays on getting away with it, and pays nothing at all if nobody
            // guessed either way — hiding from a room that never looked is not
            // the same as hiding from one that did.
            return outcome.votes.length === 0
                ? CLAIM_FLOOR
                : CLAIM_FLOOR + (1 - identificationRate(outcome.votes));
        case 'divisive':
            return CLAIM_FLOOR + spread(outcome.answers);
        case 'none':
            return 1;
    }
}

/**
 * The counts behind a claim's multiplier, so the reveal can show its working.
 *
 * Derived here rather than recounted in the UI: if the reveal explained a claim
 * with numbers the scoring did not actually use, it would be worse than showing
 * nothing at all.
 */
export type ClaimEvidence =
    | { kind: 'share'; hit: number; of: number }
    /** How far apart the room was, as a percentage of the widest possible. */
    | { kind: 'spread'; percent: number }
    | null;

export function claimEvidence(outcome: ClaimOutcome): ClaimEvidence {
    const answers = outcome.answers;
    const share = (predicate: (answer: AnswerRecord) => boolean): ClaimEvidence => ({
        kind: 'share',
        hit: answers.filter(predicate).length,
        of: answers.length,
    });

    switch (outcome.claim.id) {
        case 'never-heard':
            return share(answer => !answer.heard);
        case 'unanimous':
            return share(answer => answer.like >= LOVED_AT);
        case 'emotional':
            return share(answer => answer.moved);
        case 'so-me':
            return {
                kind: 'share',
                hit: outcome.votes.filter(vote => vote.correct).length,
                of: outcome.votes.length,
            };
        case 'not-me':
            return {
                kind: 'share',
                hit: outcome.votes.filter(vote => !vote.correct).length,
                of: outcome.votes.length,
            };
        case 'divisive':
            return { kind: 'spread', percent: Math.round(spread(answers) * 100) };
        case 'none':
            return null;
    }
}
