import type { PlayerId } from '@secret-dj/common';
import { initials, playerTone } from '../lib/format';

interface AvatarProps {
    id: PlayerId;
    name: string;
    size?: 'sm' | 'md' | 'lg';
    dimmed?: boolean;
    /**
     * The one avatar painted in the hot colour: the DJ, on the band, at the
     * moment the round pays off. Everywhere else identity comes from the
     * letter and a step on the ink ramp — if every badge were red, red would
     * stop meaning "this is the thing".
     */
    signal?: boolean;
}

export function Avatar({ id, name, size = 'md', dimmed, signal }: AvatarProps) {
    return (
        <span
            className={`avatar avatar--${size}${dimmed ? ' avatar--dimmed' : ''}${signal ? ' avatar--signal' : ''}`}
            style={signal ? undefined : { ['--tone' as string]: `${playerTone(id)}%` }}
            title={name}
            aria-hidden="true"
        >
            {initials(name)}
        </span>
    );
}
