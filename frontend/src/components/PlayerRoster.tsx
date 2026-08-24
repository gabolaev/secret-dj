import type { GameView, PublicPlayer } from '@secret-dj/common';
import { useT } from '../i18n';
import type { Messages } from '../i18n';

interface PlayerRosterProps {
    view: GameView;
}

function statusFor(player: PublicPlayer, view: GameView, t: Messages): { label: string; tone: string } {
    if (player.presence === 'left') return { label: t.roster.gone, tone: 'gone' };
    if (player.presence === 'offline') return { label: t.roster.away, tone: 'away' };
    if (view.phase === 'lobby') {
        return player.ready
            ? { label: t.roster.ready, tone: 'ready' }
            : { label: `${player.submitted}/${view.settings.tracksPerPlayer}`, tone: 'waiting' };
    }
    // The only per-player round status that is safe to render is the viewer's
    // own: they already know whether the current track is theirs. Anything
    // shown for *other* players would identify the DJ, because the DJ's state
    // never changes while everyone else's does.
    if (view.round && !view.round.reveal && player.id === view.you.id) {
        if (view.round.isMine) return { label: t.roster.onTheDecks, tone: 'dj' };
        if (view.round.myGuess) return { label: t.roster.lockedIn, tone: 'ready' };
        if (view.round.canVote) return { label: t.roster.thinking, tone: 'waiting' };
    }
    return { label: '', tone: 'idle' };
}

/** Numbered playlist rows: position, name, status, scores. */
export function PlayerRoster({ view }: PlayerRosterProps) {
    const t = useT();
    const showScores = view.phase !== 'lobby';

    const roster = [...view.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const top = Math.max(0, ...roster.map(player => player.score));

    return (
        <ul className="roster">
            {roster.map((player, index) => {
                const status = statusFor(player, view, t);
                const isYou = player.id === view.you.id;
                return (
                    <li
                        key={player.id}
                        className={`roster__row${isYou ? ' roster__row--you' : ''}${player.presence !== 'online' ? ' roster__row--dim' : ''}`}
                    >
                        <span className="roster__n">{index + 1}.</span>
                        <span className="roster__name">
                            {player.name}
                            {player.isHost && (
                                <span className="roster__host" title={t.common.host}>
                                    ★
                                </span>
                            )}
                            {isYou && <span className="roster__you">({t.common.you})</span>}
                        </span>
                        {status.label && <span className={`roster__status roster__status--${status.tone}`}>{status.label}</span>}
                        {showScores && (
                            <span className="roster__scores">
                                <span
                                    className={`roster__score roster__score--selector${
                                        player.score > 0 && player.score === top ? ' is-top' : ''
                                    }`}
                                    title={t.roster.scoreTitle}
                                >
                                    <i aria-hidden="true">★</i>
                                    {player.score}
                                </span>
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
