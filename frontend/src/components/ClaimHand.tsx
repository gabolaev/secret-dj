import {
    CLAIMS,
    CLAIMS_BY_ID,
    DEFAULT_CLAIM,
    claimAvailable,
    type ClaimId,
    type GameView,
} from '@secret-dj/common';
import { Block } from './Block';
import { useT } from '../i18n';

interface ClaimHandProps {
    view: GameView;
}

/**
 * The hand.
 *
 * The lobby's real job is not pasting links, it is **allocation**: a handful of
 * cards, one use each, across the tracks you queue. So the claims are dealt
 * across the top of the screen where the whole strategic picture is one glance
 * — what you are still holding, and what you have already spent on what.
 *
 * Two rules the design will not bend on:
 *
 * - **A spent card still appears.** It leaves the hand visually — struck
 *   through, naming the track that took it — rather than vanishing. Seeing what
 *   you have already spent *is* the decision.
 * - **A card the table cannot support prints its reason on its face.** Not
 *   hidden, not silently downgraded: "needs guessing on — the host has it off"
 *   reads as a rule, where a missing card reads as a broken feature.
 *
 * No-claim is the floor: unlimited, always available, and never nagged about.
 * It cannot lose and it cannot win, and the copy says exactly that.
 */
export function ClaimHand({ view }: ClaimHandProps) {
    const t = useT();
    const tracks = view.you.tracks;

    const table = {
        players: view.players.filter(player => player.presence !== 'left').length,
        guessingEnabled: view.settings.guessingEnabled,
    };

    // Which track took each limited card, 1-based in queue order.
    const spentOn = new Map<ClaimId, number>();
    tracks.forEach((track, index) => {
        const claim = track.claim ?? DEFAULT_CLAIM;
        if (CLAIMS_BY_ID[claim.id].limit !== null) spentOn.set(claim.id, index + 1);
    });

    const limited = CLAIMS.filter(definition => CLAIMS_BY_ID[definition.id].limit !== null);
    const left = limited.filter(
        definition => !spentOn.has(definition.id) && claimAvailable(definition, table),
    ).length;

    return (
        <Block label={t.claims.handLabel} count={t.claims.left(left)}>
            <ul className="hand">
                {CLAIMS.map(definition => {
                    const available = claimAvailable(definition, table);
                    const spent = spentOn.get(definition.id);
                    const unlimited = CLAIMS_BY_ID[definition.id].limit === null;

                    const reason = !available
                        ? table.players < definition.minPlayers
                            ? t.claims.needsPlayers(definition.minPlayers)
                            : t.claims.needsGuessing
                        : spent !== undefined
                          ? t.claims.spentOn(spent)
                          : null;

                    const struck = !available || spent !== undefined;

                    return (
                        <li
                            key={definition.id}
                            className={`hand__card${struck ? ' hand__card--out' : ''}${
                                unlimited ? ' hand__card--floor' : ''
                            }`}
                        >
                            <span className="hand__name">{t.claims[definition.id].title}</span>
                            <span className={`hand__blurb num${reason && !available ? ' hand__blurb--bad' : ''}`}>
                                {reason ?? t.claims[definition.id].blurb}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </Block>
    );
}
