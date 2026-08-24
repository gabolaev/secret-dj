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
import type { AnswerRecord, ClaimId } from './types.js';

/** Where a claim that misses bottoms out. Half of what the room actually gave. */
export const CLAIM_FLOOR = 0.5;

/** A like at or above this counts as "they loved it". */
export const LOVED_AT = 4;
/** A like at or below this counts as "they did not". */
export const HATED_AT = 1;

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
 * How cleanly the room split, from 0 (unanimous) to 1 (evenly divided).
 *
 * The product of the two shares peaks at a dead-even split and collapses to zero
 * the moment one camp is empty — so a track nobody dislikes scores nothing here
 * however loved it is, and neither does one nobody loves. There is no way to
 * farm it with something merely annoying.
 */
export function spread(answers: readonly AnswerRecord[]): number {
    if (answers.length === 0) return 0;
    const loved = answers.filter(answer => answer.like >= LOVED_AT).length;
    const hated = answers.filter(answer => answer.like <= HATED_AT).length;
    return Math.min(1, (4 * loved * hated) / (answers.length * answers.length));
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
        case 'divisive':
            return CLAIM_FLOOR + spread(outcome.answers);
        case 'none':
            return 1;
    }
}
