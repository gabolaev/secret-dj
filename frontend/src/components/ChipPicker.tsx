import type { PlayerId, PublicPlayer } from '@secret-dj/common';
import { Avatar } from './Avatar';

interface ChipPickerProps {
    label: string;
    options: readonly PublicPlayer[];
    value?: PlayerId;
    onSelect: (playerId: PlayerId) => void;
}

/**
 * One row of avatar chips.
 *
 * One row of chips, one player picked. It was a whole panel with a heading, a
 * paragraph of explanation and a grid of cards, which is what made the round
 * screen feel like a form.
 */
export function ChipPicker({ label, options, value, onSelect }: ChipPickerProps) {
    return (
        <div className="pick pick--guess" role="group" aria-label={label}>
            <span className="pick__label">{label}</span>

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
