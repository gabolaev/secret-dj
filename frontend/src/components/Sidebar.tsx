import type { GameView } from '@secret-dj/common';
import { Block } from './Block';
import { PlayerRoster } from './PlayerRoster';
import { nameOf, trackLabel } from '../lib/format';
import { useT } from '../i18n';

interface SidebarProps {
    view: GameView;
}

export function Sidebar({ view }: SidebarProps) {
    const t = useT();
    const running = view.phase !== 'lobby' && view.phase !== 'finished';
    const present = view.players.filter(player => player.presence !== 'left').length;
    const total = view.round?.total ?? view.history.length;
    const played = new Map(view.history.map(entry => [entry.number, entry]));

    return (
        <>
            <Block label={t.roster.theRoom} count={present}>
                <PlayerRoster view={view} />
            </Block>

            {running && total > 0 && (
                <Block label={t.roster.setlist} count={`${view.history.length}/${total}`}>
                    <ol className="setlist">
                        {Array.from({ length: total }, (_, index) => {
                            const number = index + 1;
                            const entry = played.get(number);
                            const playing = !entry && view.round?.number === number;
                            // Upcoming tracks are never sent: a title would name its DJ.
                            const state = entry ? 'played' : playing ? 'playing' : 'upcoming';
                            return (
                                <li key={number} className={`setlist__row setlist__row--${state}`}>
                                    <span className="setlist__n num">{number}</span>
                                    {entry ? (
                                        <span className="setlist__text">
                                            <span className="setlist__title clip" title={trackLabel(entry.track)}>
                                                {trackLabel(entry.track)}
                                            </span>
                                            <span className="setlist__by clip">{nameOf(view.players, entry.djId)}</span>
                                        </span>
                                    ) : playing ? (
                                        <span className="setlist__text">
                                            <span className="setlist__title clip">{trackLabel(view.round!.track)}</span>
                                            <span className="setlist__by">{t.tracks.playingNow}</span>
                                        </span>
                                    ) : (
                                        <span className="setlist__text setlist__by">{t.roster.notPlayedYet}</span>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </Block>
            )}
        </>
    );
}
