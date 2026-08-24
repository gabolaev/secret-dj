/**
 * Scoring and end-of-night awards. Pure functions, no game state, fully tested.
 *
 * One number per player, and everything you score, you score as a DJ. The model
 * exists to make three decisions matter:
 *  - the **answer** is a verdict, not a like: how much you liked it, whether it
 *    was new to you, whether it moved you, and whether you reckon everybody
 *    already knows it;
 *  - the **claim** is the DJ's own bet, made blind in the lobby, and it is what
 *    stops "queue what they will all mildly enjoy" from being the best line;
 *  - the **decoy** gives the DJ something to play for during their own round.
 *
 * Reading the room is still played — guessing feeds the DJ's `so-me` claim and
 * still wins trophies — but it no longer pays points.
 */
import { DEFAULT_CLAIM, claimMultiplier } from './claims.js';
import {
    type AnswerRecord,
    type Award,
    type ClaimId,
    type AwardId,
    type PlayedTrack,
    type PlayerId,
    type PointDelta,
} from './types.js';

export const POINTS = {
    /** To the DJ, per listener who fell for their decoy. */
    decoyHit: 1,
} as const;

/**
 * Added per listener the track was new to.
 *
 * Small on purpose: bringing something unheard is worth a nudge on every track,
 * and worth a great deal more if you actually claimed it.
 */
export const NOVELTY_BONUS = 1;

/**
 * Added per listener the track moved. Worth more than novelty, because getting
 * to somebody is the rarer and better thing — and it is deliberately independent
 * of whether they liked it.
 */
export const EMOTION_BONUS = 2;

/**
 * How much of a track's score a unanimously "we all know this one" verdict takes
 * away. The tax on the obvious: it is what stops a famous banger from being the
 * safe winning move, without taking a beloved classic all the way to nothing.
 */
export const OBVIOUSNESS_DRAG = 0.5;

/** One listener's contribution: what they gave, plus what they brought. */
export function answerValue(answer: AnswerRecord): number {
    return answer.like + (answer.heard ? 0 : NOVELTY_BONUS) + (answer.moved ? EMOTION_BONUS : 0);
}

/**
 * What the room gave, scaled to the size of the table.
 *
 * The average is taken over whoever actually answered and then scaled back up to
 * everyone who could have, which makes **staying quiet neutral**. Summing
 * instead would leave silence as a way to deflate a rival's track without having
 * to say anything you would be embarrassed by at the reveal — the one lever the
 * honesty rule could not reach.
 */
export function roomVerdict(played: { answers: readonly AnswerRecord[]; listenerCount: number }): number {
    if (played.answers.length === 0) return 0;
    const average = played.answers.reduce((sum, answer) => sum + answerValue(answer), 0) / played.answers.length;
    return average * played.listenerCount;
}

/** The tax on the obvious, as a multiplier between 0.5 and 1. */
export function obviousnessDrag(answers: readonly AnswerRecord[]): number {
    if (answers.length === 0) return 1;
    const share = answers.filter(answer => answer.popular).length / answers.length;
    return 1 - OBVIOUSNESS_DRAG * share;
}

/** What the room gave, after the tax but before the DJ's bet. */
export function trackVerdict(played: { answers: readonly AnswerRecord[]; listenerCount: number }): number {
    return Math.round(roomVerdict(played) * obviousnessDrag(played.answers));
}

/** What the DJ actually banked: the room's verdict, put through their claim. */
export function trackScore(played: PlayedTrack): number {
    // A played track always carries its claim; the fallback is only here because
    // the type allows it to be withheld while the track is still on the decks.
    const claim = played.track.claim ?? DEFAULT_CLAIM;
    const raw = roomVerdict(played) * obviousnessDrag(played.answers);
    return Math.round(raw * claimMultiplier({ claim, answers: played.answers, votes: played.votes }));
}

export interface AwardDefinition {
    id: AwardId;
    /** Display grouping only. There is one score; these are just trophies. */
    group: 'music' | 'people';
    /** Rendering hint: how to format `Award.value`. */
    unit: 'points' | 'percent' | 'guesses' | 'listeners';
    /** True when a *smaller* value wins. */
    lowerIsBetter: boolean;
}

/**
 * Award semantics only. The titles and blurbs live in the frontend's message
 * catalogue so they can be translated without touching the rules.
 */
export const AWARDS: readonly AwardDefinition[] = [
    { id: 'crowd-favourite', group: 'music', unit: 'points', lowerIsBetter: false },
    { id: 'track-of-the-night', group: 'music', unit: 'points', lowerIsBetter: false },
    { id: 'deep-cut', group: 'music', unit: 'percent', lowerIsBetter: false },
    { id: 'gut-punch', group: 'music', unit: 'listeners', lowerIsBetter: false },
    { id: 'human-shazam', group: 'people', unit: 'guesses', lowerIsBetter: false },
    { id: 'ghost', group: 'people', unit: 'percent', lowerIsBetter: true },
    { id: 'puppet-master', group: 'people', unit: 'listeners', lowerIsBetter: false },
];

export const AWARDS_BY_ID: Record<AwardId, AwardDefinition> = Object.fromEntries(
    AWARDS.map(award => [award.id, award]),
) as Record<AwardId, AwardDefinition>;

export interface RoundOutcome {
    djId: PlayerId;
    claim: { id: ClaimId };
    votes: Array<{ voterId: PlayerId; correct: boolean; fooled: boolean }>;
    answers: readonly AnswerRecord[];
    listenerCount: number;
}

/**
 * Points earned by a single round, as a flat list the UI can animate.
 *
 * Split into three so the reveal can show its working: what the room gave, what
 * calling it obvious took back, and what the claim did to the remainder.
 */
export function computeRoundPoints(round: RoundOutcome): PointDelta[] {
    const deltas: PointDelta[] = [];

    const verdict = roomVerdict(round);
    const drag = obviousnessDrag(round.answers);
    const taxed = verdict * drag;
    const claimed = taxed * claimMultiplier(round);

    if (Math.round(verdict) !== 0) {
        deltas.push({ playerId: round.djId, points: Math.round(verdict), reason: 'room-verdict' });
    }

    const taxPaid = Math.round(taxed) - Math.round(verdict);
    if (taxPaid !== 0) {
        deltas.push({ playerId: round.djId, points: taxPaid, reason: 'obviousness' });
    }

    const swing = Math.round(claimed) - Math.round(taxed);
    if (swing !== 0) {
        deltas.push({ playerId: round.djId, points: swing, reason: 'claim-landed' });
    }

    const fooled = round.votes.filter(vote => vote.fooled).length;
    if (fooled > 0) {
        deltas.push({ playerId: round.djId, points: fooled * POINTS.decoyHit, reason: 'decoy-hit' });
    }

    return deltas;
}

interface Tally {
    pointsReceived: number;
    bestTrackPoints: number;
    bestTrackTitle?: string;
    /** Share of the room the DJ's freshest track was new to, as a percentage. */
    deepestCut: number;
    deepestCutTitle?: string;
    mostMoved: number;
    mostMovedTitle?: string;
    correctGuesses: number;
    guessesAgainst: number;
    identifications: number;
    decoyHits: number;
}

function emptyTally(): Tally {
    return {
        pointsReceived: 0,
        bestTrackPoints: 0,
        deepestCut: 0,
        mostMoved: 0,
        correctGuesses: 0,
        guessesAgainst: 0,
        identifications: 0,
        decoyHits: 0,
    };
}

export function tallyHistory(history: readonly PlayedTrack[], playerIds: readonly PlayerId[]): Map<PlayerId, Tally> {
    const tallies = new Map<PlayerId, Tally>(playerIds.map(id => [id, emptyTally()]));
    const ensure = (id: PlayerId): Tally => {
        let tally = tallies.get(id);
        if (!tally) {
            tally = emptyTally();
            tallies.set(id, tally);
        }
        return tally;
    };

    for (const played of history) {
        const dj = ensure(played.djId);
        const title = played.track.title ?? played.track.url;
        // Banked points are what you won; the room's verdict is what ranks
        // tracks against each other, so a lucky claim cannot crown a track the
        // room liked less than another.
        const verdict = trackVerdict(played);

        dj.pointsReceived += trackScore(played);
        if (verdict > dj.bestTrackPoints) {
            dj.bestTrackPoints = verdict;
            dj.bestTrackTitle = title;
        }

        // A deep cut nobody liked is just an obscure track, so it has to have
        // landed before its novelty counts for anything.
        if (played.answers.length > 0 && verdict > 0) {
            const unheard = Math.round(
                (played.answers.filter(answer => !answer.heard).length / played.answers.length) * 100,
            );
            if (unheard > dj.deepestCut) {
                dj.deepestCut = unheard;
                dj.deepestCutTitle = title;
            }
        }

        const moved = played.answers.filter(answer => answer.moved).length;
        if (moved > dj.mostMoved) {
            dj.mostMoved = moved;
            dj.mostMovedTitle = title;
        }

        for (const vote of played.votes) {
            const voter = ensure(vote.voterId);
            dj.guessesAgainst += 1;
            if (vote.correct) {
                voter.correctGuesses += 1;
                dj.identifications += 1;
            }
            if (vote.fooled) dj.decoyHits += 1;
        }
    }

    return tallies;
}

interface Candidate {
    playerId: PlayerId;
    value: number;
    detail?: string;
}

function pickWinners(
    candidates: Candidate[],
    lowerIsBetter: boolean,
    /** Awards with nothing to celebrate are omitted entirely. */
    isMeaningful: (best: number) => boolean,
): Omit<Award, 'id'> | null {
    if (candidates.length === 0) return null;
    const best = candidates.reduce(
        (acc, candidate) => (lowerIsBetter ? Math.min(acc, candidate.value) : Math.max(acc, candidate.value)),
        lowerIsBetter ? Infinity : -Infinity,
    );
    if (!Number.isFinite(best) || !isMeaningful(best)) return null;

    const winners = candidates.filter(candidate => candidate.value === best);
    return {
        winners: winners.map(candidate => candidate.playerId),
        value: best,
        detail: winners.length === 1 ? winners[0].detail : undefined,
    };
}

/**
 * Awards for the end of the night. Only awards that actually happened are
 * returned, so a quiet game shows a short, honest list rather than seven
 * trophies for zero of everything.
 */
export function computeAwards(history: readonly PlayedTrack[], playerIds: readonly PlayerId[]): Award[] {
    const tallies = tallyHistory(history, playerIds);
    const entries = [...tallies.entries()];
    const awards: Award[] = [];

    const add = (id: AwardId, result: Omit<Award, 'id'> | null): void => {
        if (result) awards.push({ id, ...result });
    };

    add(
        'crowd-favourite',
        pickWinners(
            entries.map(([playerId, tally]) => ({ playerId, value: tally.pointsReceived })),
            false,
            best => best > 0,
        ),
    );

    add(
        'track-of-the-night',
        pickWinners(
            entries.map(([playerId, tally]) => ({
                playerId,
                value: tally.bestTrackPoints,
                detail: tally.bestTrackTitle,
            })),
            false,
            best => best > 0,
        ),
    );

    add(
        'deep-cut',
        pickWinners(
            entries.map(([playerId, tally]) => ({
                playerId,
                value: tally.deepestCut,
                detail: tally.deepestCutTitle,
            })),
            false,
            best => best > 0,
        ),
    );

    add(
        'gut-punch',
        pickWinners(
            entries.map(([playerId, tally]) => ({
                playerId,
                value: tally.mostMoved,
                detail: tally.mostMovedTitle,
            })),
            false,
            best => best > 0,
        ),
    );

    add(
        'human-shazam',
        pickWinners(
            entries.map(([playerId, tally]) => ({ playerId, value: tally.correctGuesses })),
            false,
            best => best > 0,
        ),
    );

    add(
        'ghost',
        pickWinners(
            // Only DJs the room actually had a chance to identify can hide from it.
            entries
                .filter(([, tally]) => tally.guessesAgainst > 0)
                .map(([playerId, tally]) => ({
                    playerId,
                    value: Math.round((tally.identifications / tally.guessesAgainst) * 100),
                })),
            true,
            best => best < 100,
        ),
    );

    add(
        'puppet-master',
        pickWinners(
            entries.map(([playerId, tally]) => ({ playerId, value: tally.decoyHits })),
            false,
            best => best > 0,
        ),
    );

    return awards;
}
