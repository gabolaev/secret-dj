import { AWARDS_BY_ID, type Award, type AwardId, type PublicPlayer } from '@secret-dj/common';
import { nameOf } from '../lib/format';
import { useT } from '../i18n';

/** One text glyph each — never an icon font, never a colour emoji. */
export const AWARD_GLYPHS: Record<AwardId, string> = {
    'track-of-the-night': '★',
    'deep-cut': '☄',
    'gut-punch': '⚡',
    'human-shazam': '◎',
    ghost: '☾',
};

interface AwardCardProps {
    id: AwardId;
    award?: Award;
    players: readonly PublicPlayer[];
    /** The first card is set in ink: one award leads, the rest are a grid. */
    lead?: boolean;
}

/**
 * One award, whether or not anybody won it.
 *
 * A trophy nobody earned — or that the whole room ties for — is printed as
 * "Not given", with the reason on the card. Omitting it would leave a gap the
 * reader has to explain to themselves, and the explanation is more interesting
 * than the trophy: "everybody hid equally well" is a fact about tonight.
 *
 * Winners are plural because ties are shared, never broken. They stack one per
 * line; wrapping them inline is what produced a pile of names with no shape.
 */
export function AwardCard({ id, award, players, lead }: AwardCardProps) {
    const t = useT();
    const definition = AWARDS_BY_ID[id];
    const copy = t.awards[id];
    const given = award !== undefined && award.winners.length > 0;

    return (
        <article
            className={`award${lead && given ? ' award--lead ink' : ''}${given ? '' : ' award--none'}`}
        >
            <span className={`award__title num${lead && given ? ' label--ink' : ''}`}>
                <span aria-hidden="true">{AWARD_GLYPHS[id]}</span> {copy.title}
            </span>

            {given ? (
                <>
                    <span className="award__winners">
                        {award.winners.map(playerId => (
                            <span key={playerId} className="award__who">
                                {nameOf(players, playerId)}
                            </span>
                        ))}
                    </span>
                    <span className="award__value num">
                        {award.detail ? `${award.detail} · ` : ''}
                        {t.awardValue[definition.unit](award.value)}
                    </span>
                </>
            ) : (
                <>
                    <span className="award__winners award__winners--none">{t.finale.notGiven}</span>
                    <span className="award__value num">{copy.notGiven}</span>
                </>
            )}
        </article>
    );
}
