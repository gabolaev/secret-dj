import { DEFAULT_CLAIM, claimEvidence, type ClaimId, type GameView } from '@secret-dj/common';
import { Placeholder, Redacted } from './Redacted';
import { Block } from './Block';
import { useI18n, useT } from '../i18n';

interface ClaimCardProps {
    view: GameView;
}

/**
 * The DJ's bet, and the bar over it.
 *
 * The bar is the size of the sentence beneath it. You know a bet was placed and
 * roughly how much there is to say about it — that is the difference between
 * withheld and absent, and it is the clearest place in the product to see why
 * the two need different renderings.
 *
 * Three states, in this order of precedence:
 *
 * - **Yours.** The DJ has always been able to see their own claim, and the card
 *   says so on its face rather than quietly looking like everyone else's.
 * - **Revealed.** The claim, plus what it turned out to be worth, in its own
 *   terms — never a bare multiplier.
 * - **Sealed.** Geometry and a legend. The claim has not been sent to this
 *   browser and there is nothing here to un-hide.
 */
export function ClaimCard({ view }: ClaimCardProps) {
    const t = useT();
    const { locale } = useI18n();
    const round = view.round;
    if (!round) return null;

    const reveal = round.reveal;
    const claim = round.track.claim;
    const yours = round.isMine && !reveal;
    const open = Boolean(reveal) || yours;

    const evidence = reveal
        ? claimEvidence({ claim: claim ?? DEFAULT_CLAIM, answers: reveal.answers, votes: reveal.votes })
        : null;

    const landed = reveal && reveal.claimMultiplier !== 1;
    const stamp = !open
        ? t.round.stampSealed
        : yours
          ? t.round.stampYours
          : landed
            ? t.round.stampLanded(reveal.claimMultiplier.toLocaleString(locale, { maximumFractionDigits: 2 }))
            : t.round.stampFlat;

    /** Why the claim was worth what it was, in the claim's own terms. */
    const reason = (): string => {
        if (!claim || claim.id === 'none') return t.reveal.noClaim;
        if (!evidence) return t.claims.yoursOnly;
        return evidence.kind === 'share'
            ? t.claims.evidence[claim.id as Exclude<ClaimId, 'none'>](evidence.hit, evidence.of)
            : t.claims.evidenceSpread(evidence.percent);
    };

    return (
        <Block
            label={t.round.djsClaim}
            count={<span className={`stamp${open ? ' stamp--open' : ''}`}>{stamp}</span>}
        >
            <Redacted open={open} legend={t.round.sealedUntilReveal} className={`claim-card${yours ? ' claim-card--yours' : ''}`}>
                <span className="claim-card__title">
                    {claim ? t.claims[claim.id].title : <Placeholder width="18ch" size="fig" />}
                </span>
                <span className="claim-card__blurb">
                    {claim ? reason() : <Placeholder width="34ch" />}
                </span>
            </Redacted>
        </Block>
    );
}
