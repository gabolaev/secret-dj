import { AWARDS_BY_ID, type Award, type AwardId, type PublicPlayer } from '@secret-dj/common';
import { nameOf } from '../lib/format';
import { useT } from '../i18n';

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
    /** The first award spans the row. */
    lead?: boolean;
}

/** One award. Ties are shared, never broken; an award nobody earned says "Not given". */
export function AwardCard({ id, award, players, lead }: AwardCardProps) {
    const t = useT();
    const definition = AWARDS_BY_ID[id];
    const copy = t.awards[id];
    const given = award !== undefined && award.winners.length > 0;

    return (
        <article className={`award${lead && given ? ' award--lead' : ''}${given ? '' : ' award--none'}`}>
            <span className="award__glyph" aria-hidden="true">
                {AWARD_GLYPHS[id]}
            </span>
            <span className="award__title">{copy.title}</span>
            <span className="award__blurb">{copy.blurb}</span>

            {given ? (
                <>
                    <span className="award__winners">
                        {award.winners.map(playerId => (
                            <span key={playerId} className="award__who">
                                {nameOf(players, playerId)}
                            </span>
                        ))}
                    </span>
                    {award.detail && <span className="award__detail clip">{award.detail}</span>}
                    <span className="award__value num">{t.awardValue[definition.unit](award.value)}</span>
                </>
            ) : (
                <span className="award__winners award__winners--none">{t.finale.notGiven}</span>
            )}
        </article>
    );
}
