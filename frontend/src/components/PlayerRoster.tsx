import type { GameView, PublicPlayer } from '@secret-dj/common';
import { Avatar } from './Avatar';
import { useT } from '../i18n';
import type { Messages } from '../i18n';

interface PlayerRosterProps {
    view: GameView;
}

/**
 * Presence only during a round — never who has answered. The DJ is the one
 * player who cannot answer, so any done/not-done mark names them by omission.
 * Progress is shown as a count on the round instead.
 */
function stateFor(player: PublicPlayer, view: GameView, t: Messages): { label: string; tone: string } | null {
    if (player.presence === 'left') return { label: t.roster.gone, tone: 'gone' };
    if (player.presence === 'offline') return { label: t.roster.away, tone: 'gone' };
    if (view.phase !== 'lobby') return null;
    // Nothing is secret before the music starts, so queueing progress is fine.
    if (player.ready) return { label: t.roster.ready, tone: 'ready' };
    return { label: `${player.submitted}/${view.settings.tracksPerPlayer}`, tone: 'waiting' };
}

export function PlayerRoster({ view }: PlayerRosterProps) {
    const t = useT();
    // Scores only move at a reveal, after the DJ has been named, so they are safe to show.
    const showScores = view.phase !== 'lobby';
    const roster = showScores
        ? [...view.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        : view.players;

    return (
        <ul className="roster">
            {roster.map(player => {
                const state = stateFor(player, view, t);
                const isYou = player.id === view.you.id;
                const away = player.presence !== 'online';
                return (
                    <li key={player.id} className={`roster__row${isYou ? ' roster__row--you' : ''}${away ? ' roster__row--away' : ''}`}>
                        <Avatar id={player.id} name={player.name} size="sm" dimmed={away} />
                        <span className="roster__name clip" title={player.name}>
                            {player.name}
                        </span>
                        {state && <span className={`roster__state roster__state--${state.tone}`}>{state.label}</span>}
                        {showScores && (
                            <span className="roster__score num" title={t.roster.scoreTitle}>
                                {player.score}
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
