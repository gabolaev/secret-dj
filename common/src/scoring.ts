/**
 * Scoring and end-of-night awards. Pure functions, no game state, fully tested.
 *
 * The scoring model exists to make three decisions matter:
 *  - hearts are **scarce**, so spending one is a real choice with a cost;
 *  - the **anthem** is a single, once-a-night bet worth three times a heart;
 *  - the **decoy** gives the DJ something to play for during their own round.
 *
 * Points land on two separate boards. Nothing crosses over: your taste cannot
 * win you the deduction game, and reading the room cannot win you the music one.
 */
import type {
    Award,
    AwardId,
    PlayedTrack,
    PlayerId,
    PointDelta,
    Reaction,
    Scores,
} from './types.js';

export const POINTS = {
    /** For naming the DJ behind a track. */
    correctGuess: 1,
    /** To the DJ, per heart their track collects. */
    heart: 1,
    /** To the DJ, for the one anthem a listener can spend all night. */
    anthem: 3,
    /** To the DJ, per listener who fell for their decoy. */
    decoyHit: 1,
} as const;

/**
 * Share of the tracks you will actually hear that you can afford to heart.
 * Low enough that you must pass on things you liked, which is the entire point.
 */
export const HEART_BUDGET_RATIO = 0.4;

/**
 * Every player is DJ for exactly `playedPerPlayer` rounds, so everybody listens
 * to the same number of tracks and everybody gets the same budget.
 */
export function heartBudget(setlistLength: number, playedPerPlayer: number): number {
    const asListener = Math.max(0, setlistLength - playedPerPlayer);
    return Math.max(1, Math.ceil(asListener * HEART_BUDGET_RATIO));
}

export function reactionPoints(reaction: Reaction): number {
    if (reaction === 'anthem') return POINTS.anthem;
    if (reaction === 'heart') return POINTS.heart;
    return 0;
}

export function emptyScores(): Scores {
    return { selector: 0, detective: 0 };
}

export interface AwardDefinition {
    id: AwardId;
    /** Which scoreboard this award belongs to. */
    board: keyof Scores;
    /** Rendering hint: how to format `Award.value`. */
    unit: 'points' | 'hearts' | 'guesses' | 'percent' | 'listeners';
    /** True when a *smaller* value wins. */
    lowerIsBetter: boolean;
}

/**
 * Award semantics only. The titles and blurbs live in the frontend's message
 * catalogue so they can be translated without touching the rules.
 */
export const AWARDS: readonly AwardDefinition[] = [
    { id: 'crowd-favourite', board: 'selector', unit: 'points', lowerIsBetter: false },
    { id: 'track-of-the-night', board: 'selector', unit: 'points', lowerIsBetter: false },
    { id: 'golden-ear', board: 'selector', unit: 'points', lowerIsBetter: false },
    { id: 'human-shazam', board: 'detective', unit: 'guesses', lowerIsBetter: false },
    { id: 'ghost', board: 'detective', unit: 'percent', lowerIsBetter: true },
    { id: 'puppet-master', board: 'detective', unit: 'listeners', lowerIsBetter: false },
];

export const AWARDS_BY_ID: Record<AwardId, AwardDefinition> = Object.fromEntries(
    AWARDS.map(award => [award.id, award]),
) as Record<AwardId, AwardDefinition>;

export interface RoundOutcome {
    djId: PlayerId;
    votes: Array<{ voterId: PlayerId; correct: boolean; fooled: boolean }>;
    heartedBy: PlayerId[];
    anthemBy: PlayerId[];
}

/** Points earned by a single round, as a flat list the UI can animate. */
export function computeRoundPoints(round: RoundOutcome): PointDelta[] {
    const deltas: PointDelta[] = [];

    for (const vote of round.votes) {
        if (vote.correct) {
            deltas.push({
                playerId: vote.voterId,
                points: POINTS.correctGuess,
                reason: 'correct-guess',
                board: 'detective',
            });
        }
    }

    if (round.heartedBy.length > 0) {
        deltas.push({
            playerId: round.djId,
            points: round.heartedBy.length * POINTS.heart,
            reason: 'hearts-received',
            board: 'selector',
        });
    }

    if (round.anthemBy.length > 0) {
        deltas.push({
            playerId: round.djId,
            points: round.anthemBy.length * POINTS.anthem,
            reason: 'anthem-received',
            board: 'selector',
        });
    }

    const fooled = round.votes.filter(vote => vote.fooled).length;
    if (fooled > 0) {
        deltas.push({
            playerId: round.djId,
            points: fooled * POINTS.decoyHit,
            reason: 'decoy-hit',
            board: 'detective',
        });
    }

    return deltas;
}

/** Total heart-points a played track collected. */
export function trackScore(played: Pick<PlayedTrack, 'heartedBy' | 'anthemBy'>): number {
    return played.heartedBy.length * POINTS.heart + played.anthemBy.length * POINTS.anthem;
}

interface Tally {
    pointsReceived: number;
    bestTrackPoints: number;
    bestTrackTitle?: string;
    correctGuesses: number;
    guessesAgainst: number;
    identifications: number;
    decoyHits: number;
    /** Points collected by whichever track this player spent their anthem on. */
    anthemTargetPoints: number;
    anthemTargetTitle?: string;
    anthemSpent: boolean;
}

function emptyTally(): Tally {
    return {
        pointsReceived: 0,
        bestTrackPoints: 0,
        correctGuesses: 0,
        guessesAgainst: 0,
        identifications: 0,
        decoyHits: 0,
        anthemTargetPoints: 0,
        anthemSpent: false,
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
        const points = trackScore(played);
        const title = played.track.title ?? played.track.url;

        dj.pointsReceived += points;
        if (points > dj.bestTrackPoints) {
            dj.bestTrackPoints = points;
            dj.bestTrackTitle = title;
        }

        for (const listener of played.anthemBy) {
            const tally = ensure(listener);
            tally.anthemSpent = true;
            tally.anthemTargetPoints = points;
            tally.anthemTargetTitle = title;
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
 * Awards for the end of the night, three per scoreboard. Only awards that
 * actually happened are returned, so a quiet game shows a short, honest list
 * rather than six trophies for zero of everything.
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
        'golden-ear',
        pickWinners(
            // Only players who actually spent their one anthem are in the running.
            entries
                .filter(([, tally]) => tally.anthemSpent)
                .map(([playerId, tally]) => ({
                    playerId,
                    value: tally.anthemTargetPoints,
                    detail: tally.anthemTargetTitle,
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
