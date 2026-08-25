import type { GameView, PublicPlayer } from '@secret-dj/common';
import { Avatar } from './Avatar';
import { useT } from '../i18n';
import type { Messages } from '../i18n';

interface PlayerRosterProps {
    view: GameView;
}

/**
 * Presence, and only presence.
 *
 * This is the one place the design has a rule the game would otherwise break.
 * The DJ is the single person in the room who *cannot* answer, so any roster
 * that reports who has answered names them by omission: mark them not-done and
 * they are the last one pending once everybody else finishes; mark them done
 * and they are the only one finished the instant the round opens. There is no
 * safe value, which is why the server never sends one (see `PublicPlayer`) and
 * why this component must not invent one from what it can see locally either.
 *
 * So during a round the roster answers exactly one question — who is in the
 * room — and progress is published as counts on the round itself: "6 OF 8
 * SEALED", "2 STILL OUT". The lobby is the exception and always was: nothing
 * is secret before the music starts, so queueing progress is shown in full.
 *
 * HERE / GONE / YOU are words first. Colour and opacity repeat them; they never
 * replace them, and the roster survives greyscale.
 */
function stateFor(player: PublicPlayer, view: GameView, t: Messages): { label: string; tone: string } {
    if (player.id === view.you.id) return { label: t.roster.you, tone: 'you' };
    if (player.presence === 'left') return { label: t.roster.gone, tone: 'gone' };
    if (player.presence === 'offline') return { label: t.roster.away, tone: 'gone' };
    return { label: t.roster.here, tone: 'here' };
}

/** What a player still owes the lobby. Only ever rendered before the music. */
function lobbyStateFor(player: PublicPlayer, view: GameView, t: Messages): { label: string; tone: string } {
    if (player.presence === 'left') return { label: t.roster.gone, tone: 'gone' };
    if (player.ready) return { label: t.roster.ready, tone: 'here' };
    return { label: `${player.submitted}/${view.settings.tracksPerPlayer}`, tone: 'waiting' };
}

export function PlayerRoster({ view }: PlayerRosterProps) {
    const t = useT();
    const inLobby = view.phase === 'lobby';

    // Join order, not score order. Ranking the room by ★ would put the DJ's
    // banked total to work deciding a chart it has no business deciding — ♥ is
    // what ranks tracks, at the finale, and nothing ranks people at all.
    const roster = view.players;

    return (
        <ul className="roster">
            {roster.map(player => {
                const state = inLobby ? lobbyStateFor(player, view, t) : stateFor(player, view, t);
                const isYou = player.id === view.you.id;
                return (
                    <li
                        key={player.id}
                        className={`roster__row${isYou ? ' roster__row--you' : ''}${
                            player.presence !== 'online' ? ' roster__row--dim' : ''
                        }`}
                    >
                        <Avatar id={player.id} name={player.name} size="sm" dimmed={player.presence !== 'online'} />
                        <span className="roster__name clip" title={player.name}>
                            {player.name}
                        </span>
                        {player.isHost && (
                            <span className="roster__host" title={t.common.host} aria-label={t.common.host}>
                                ★
                            </span>
                        )}
                        <span className={`roster__state roster__state--${state.tone}`}>{state.label}</span>
                    </li>
                );
            })}
        </ul>
    );
}
