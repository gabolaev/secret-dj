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
function stateFor(player: PublicPlayer, t: Messages): { label: string; tone: string } | null {
    if (player.presence === 'left') return { label: t.roster.gone, tone: 'gone' };
    if (player.presence === 'offline') return { label: t.roster.away, tone: 'gone' };
    // Being in the room is the normal case, and labelling the normal case is
    // how a list turns into a column of the same word repeated. Silence means
    // present; only a broken connection is worth a word. Which row is yours is
    // said by the row's own tint, not by a badge on it.
    return null;
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

    // The running score, and the order it puts people in. This is safe in a way
    // answer state is not: nobody's total moves until a reveal, and a reveal
    // has already named the DJ out loud, so the column can never be read
    // backwards to work out whose track is playing.
    //
    // It stays out of the lobby, where every total is zero and a ranking would
    // be noise, and out of the finale, which ranks tracks by ♥ rather than
    // people by ★.
    const showScores = view.phase !== 'lobby';
    const roster = showScores
        ? [...view.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        : view.players;
    const top = Math.max(0, ...roster.map(player => player.score));

    return (
        <ul className="roster">
            {roster.map(player => {
                const state = inLobby ? lobbyStateFor(player, view, t) : stateFor(player, t);
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
                        {/* No host mark here. It was a ★ sitting immediately
                            beside the ★ of the score, which read as a second
                            number rather than as a role — and the host is
                            already the only person holding the buttons. */}
                        {state && (
                            <span className={`roster__state roster__state--${state.tone}`}>{state.label}</span>
                        )}
                        {showScores && (
                            <span
                                className={`roster__score num${
                                    player.score > 0 && player.score === top ? ' is-top' : ''
                                }`}
                                title={t.roster.scoreTitle}
                            >
                                ★{player.score}
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
