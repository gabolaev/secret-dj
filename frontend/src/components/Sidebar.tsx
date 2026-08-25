import { useMemo } from 'react';
import type { GameView } from '@secret-dj/common';
import { Block } from './Block';
import { DrumMachine } from './DrumMachine';
import { PlayerRoster } from './PlayerRoster';
import { Redacted } from './Redacted';
import { TrackList } from './TrackList';
import { nameOf, trackLabel } from '../lib/format';
import { useT } from '../i18n';

interface SidebarProps {
    view: GameView;
}

/**
 * The side column: the room, the setlist, and the fidget.
 *
 * The tab strip is gone. Tabs were hiding two of three short lists behind a
 * click in a column that has room for all three, and the running order is the
 * one thing you want visible *while* something else is on screen — it is how
 * you know how much night is left.
 */
export function Sidebar({ view }: SidebarProps) {
    const t = useT();
    // The setlist is a column of secrets you watch shorten, so it has nothing
    // left to do once the night is over: the finale prints the same tracks in
    // the middle of the page, in full, ranked, with the DJs on them.
    const running = view.phase !== 'lobby' && view.phase !== 'finished';
    const present = view.players.filter(player => player.presence !== 'left').length;

    // The setlist as a fixed-length column of slots: played ones are printed,
    // the rest are bars of the same width with no title on them. A track that
    // has not been on yet is a secret like any other — naming it would name the
    // DJ who queued it — so the running order is a column of secrets you watch
    // shorten, rather than a list that grows out of nothing.
    const setlist = useMemo(() => {
        const total = view.round?.total ?? view.history.length;
        const played = new Map(view.history.map(entry => [entry.number, entry]));
        return Array.from({ length: total }, (_, index) => {
            const number = index + 1;
            const entry = played.get(number);
            if (entry) {
                return {
                    number,
                    title: trackLabel(entry.track),
                    by: nameOf(view.players, entry.djId),
                    state: 'played' as const,
                };
            }
            if (view.round?.number === number) {
                return { number, title: trackLabel(view.round.track), by: '', state: 'playing' as const };
            }
            return { number, title: '', by: '', state: 'sealed' as const };
        });
    }, [view.history, view.players, view.round]);

    return (
        <>
            <Block label={t.roster.theRoom} count={present}>
                <PlayerRoster view={view} />
            </Block>

            {running && setlist.length > 0 && (
                <Block label={t.roster.setlist} count={`${view.history.length}/${setlist.length}`}>
                    <ul className="setlist list">
                        {setlist.map(slot => (
                            <li key={slot.number} className={`setlist__row setlist__row--${slot.state}`}>
                                <span className="setlist__n num">{String(slot.number).padStart(2, '0')}</span>
                                {slot.state === 'sealed' ? (
                                    <Redacted open={false} className="setlist__seal">
                                        <span className="setlist__title clip" aria-hidden="true">
                                            {t.roster.notPlayedYet}
                                        </span>
                                    </Redacted>
                                ) : (
                                    <>
                                        <span className="setlist__title clip" title={slot.title}>
                                            {slot.title}
                                        </span>
                                        <span className="setlist__by num clip">
                                            {slot.state === 'playing' ? t.tracks.playingNow : slot.by}
                                        </span>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                </Block>
            )}

            {running && view.you.tracks.length > 0 && (
                <Block label={t.roster.yourQueue} count={view.you.tracks.length}>
                    <TrackList
                        tracks={view.you.tracks}
                        nowPlayingId={view.round?.track.id}
                        playedIds={new Set(view.history.map(played => played.track.id))}
                    />
                </Block>
            )}

            {/* Three minutes of somebody else's track and nothing to do with
                your hands. Silent, local, worth no points — see the component. */}
            <DrumMachine />
        </>
    );
}
