import type { PlayerId } from '@secret-dj/common';
import { initials, playerTone } from '../lib/format';

interface AvatarProps {
    id: PlayerId;
    name: string;
    size?: 'sm' | 'md' | 'lg';
    dimmed?: boolean;
}

export function Avatar({ id, name, size = 'md', dimmed }: AvatarProps) {
    return (
        <span
            className={`avatar avatar--${size}${dimmed ? ' avatar--dimmed' : ''}`}
            style={{ ['--tone' as string]: `${playerTone(id)}%` }}
            title={name}
            aria-hidden="true"
        >
            {initials(name)}
        </span>
    );
}
