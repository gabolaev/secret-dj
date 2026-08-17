import { AWARDS_BY_ID, type Award, type PublicPlayer } from '@secret-dj/common';
import { Avatar } from './Avatar';
import { nameOf } from '../lib/format';
import { useT } from '../i18n';

const GLYPHS: Record<Award['id'], string> = {
    'crowd-favourite': '♥',
    'track-of-the-night': '★',
    'golden-ear': '◈',
    'human-shazam': '◎',
    ghost: '☾',
    'puppet-master': '⌘',
};

interface AwardCardProps {
    award: Award;
    players: readonly PublicPlayer[];
    /** Staggers the entrance so the ceremony reads as a sequence. */
    index: number;
}

export function AwardCard({ award, players, index }: AwardCardProps) {
    const t = useT();
    const definition = AWARDS_BY_ID[award.id];
    const copy = t.awards[award.id];

    return (
        <article className={`award award--${definition.board}`} style={{ ['--delay' as string]: `${index * 120}ms` }}>
            <span className="award__glyph" aria-hidden="true">
                {GLYPHS[award.id]}
            </span>
            <h4 className="award__title">{copy.title}</h4>
            <p className="award__blurb">{copy.blurb}</p>

            <ul className="award__winners">
                {award.winners.map(playerId => (
                    <li key={playerId} className="who">
                        <Avatar id={playerId} name={nameOf(players, playerId)} size="sm" />
                        {nameOf(players, playerId)}
                    </li>
                ))}
            </ul>

            <p className="award__value">{t.awardValue[definition.unit](award.value)}</p>
            {award.detail && <p className="award__detail">{award.detail}</p>}
        </article>
    );
}
