import type { PlayerId, PublicPlayer } from '@secret-dj/common';
import { Avatar } from './Avatar';

interface ChipPickerProps {
    label: string;
    options: readonly PublicPlayer[];
    value?: PlayerId;
    onSelect: (playerId: PlayerId) => void;
}

/** One row of player chips, one picked. */
export function ChipPicker({ label, options, value, onSelect }: ChipPickerProps) {
    return (
        <div className="pick" role="group" aria-label={label}>
            <h3 className="pick__label">{label}</h3>
            <div className="pick__options">
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
        </div>
    );
}
