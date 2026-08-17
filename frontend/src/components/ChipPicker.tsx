import type { PlayerId, PublicPlayer } from '@secret-dj/common';
import { Avatar } from './Avatar';

interface ChipPickerProps {
    label: string;
    options: readonly PublicPlayer[];
    value?: PlayerId;
    onSelect: (playerId: PlayerId) => void;
    /** Adds a leading "none" chip; used by the decoy, which is optional. */
    noneLabel?: string;
    onSelectNone?: () => void;
    tone?: 'guess' | 'decoy';
}

/**
 * One row of avatar chips.
 *
 * Guessing the DJ and naming a decoy are the same interaction — pick one
 * player — so they are the same component. Previously they were two separate
 * panels, each with a heading, a paragraph of explanation and a grid of cards,
 * which is what made the round screen feel like a form.
 */
export function ChipPicker({ label, options, value, onSelect, noneLabel, onSelectNone, tone = 'guess' }: ChipPickerProps) {
    return (
        <div className={`pick pick--${tone}`} role="group" aria-label={label}>
            <span className="pick__label">{label}</span>

            {noneLabel && onSelectNone && (
                <button
                    type="button"
                    className={`chip chip--bare${!value ? ' is-active' : ''}`}
                    aria-pressed={!value}
                    onClick={onSelectNone}
                >
                    {noneLabel}
                </button>
            )}

            {options.map(player => {
                const active = value === player.id;
                return (
                    <button
                        key={player.id}
                        type="button"
                        className={`chip${active ? ' is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => onSelect(player.id)}
                    >
                        <Avatar id={player.id} name={player.name} size="sm" />
                        {player.name}
                    </button>
                );
            })}
        </div>
    );
}
