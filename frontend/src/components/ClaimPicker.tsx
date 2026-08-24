import {
    CLAIMS,
    CLAIMS_BY_ID,
    DEFAULT_CLAIM,
    claimAvailable,
    type ClaimId,
    type GameView,
    type PublicTrack,
} from '@secret-dj/common';
import { useT } from '../i18n';

interface ClaimPickerProps {
    track: PublicTrack;
    view: GameView;
    /** Limited claims already used up on the player's *other* tracks. */
    spent: ReadonlySet<ClaimId>;
    open: boolean;
    onToggle: () => void;
    onPick: (claim: ClaimId) => void;
}

/**
 * The bet attached to one queued track, collapsed to a badge until you open it.
 *
 * Five claims across three tracks is fifteen buttons if every track shows the
 * whole deck at once, which is a wall rather than a decision. One open picker
 * at a time keeps the lobby readable and matches how the choice is actually
 * made: track by track.
 */
export function ClaimPicker({ track, view, spent, open, onToggle, onPick }: ClaimPickerProps) {
    const t = useT();
    // Only ever absent on a track being played, which the lobby never shows.
    const current = track.claim ?? DEFAULT_CLAIM;
    const table = {
        players: view.players.filter(player => player.presence !== 'left').length,
        guessingEnabled: view.settings.guessingEnabled,
    };

    return (
        <div className={`claim${open ? ' is-open' : ''}`}>
            <button type="button" className="claim__badge" onClick={onToggle} aria-expanded={open}>
                {t.claims[current.id].title}
            </button>

            {open && (
                <div className="claim__deck" role="group" aria-label={t.claims.label}>
                    {CLAIMS.filter(definition => claimAvailable(definition, table)).map(definition => {
                        const isCurrent = current.id === definition.id;
                        const blocked = !isCurrent && spent.has(definition.id);

                        return (
                            <button
                                key={definition.id}
                                type="button"
                                className={`claim__option${isCurrent ? ' is-active' : ''}`}
                                aria-pressed={isCurrent}
                                disabled={blocked}
                                onClick={() => onPick(definition.id)}
                            >
                                <span className="claim__name">{t.claims[definition.id].title}</span>
                                <span className="claim__blurb">
                                    {blocked ? t.claims.spent : t.claims[definition.id].blurb}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/** Limited claims this player has already committed, excluding one track. */
export function spentClaims(tracks: readonly PublicTrack[], exceptId?: string): Set<ClaimId> {
    const spent = new Set<ClaimId>();
    for (const track of tracks) {
        if (track.id === exceptId) continue;
        const claim = track.claim ?? DEFAULT_CLAIM;
        if (CLAIMS_BY_ID[claim.id].limit !== null) spent.add(claim.id);
    }
    return spent;
}
