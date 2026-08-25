import { useMemo, useRef, useState } from 'react';
import { trackScore, type GameView } from '@secret-dj/common';
import { Cables, useCableOrigin } from './Cables';
import { DrumMachine } from './DrumMachine';
import { PlayerRoster } from './PlayerRoster';
import { TrackList } from './TrackList';
import { Window } from './Window';
import { serviceBadgeByName } from '../lib/serviceLogos';
import { nameOf, trackLabel } from '../lib/format';
import { useT } from '../i18n';

interface SidebarProps {
    view: GameView;
}

/**
 * The playlist panel.
 *
 * Tabs rather than stacked collapsibles: only one of these three lists is ever
 * relevant at a time, and a tab strip says so in a way three fold headers do
 * not. The roster is the default because it *is* the room.
 */
export function Sidebar({ view }: SidebarProps) {
    const t = useT();
    const [tab, setTab] = useState<'room' | 'queue' | 'played'>('room');
    const [drums, setDrums] = useState(false);
    // The cables are drawn from wherever the machine currently is, so they read
    // as coming out of it rather than off the edge of the window.
    const machine = useRef<HTMLDivElement>(null);
    const origin = useCableOrigin(machine, drums);
    const playedIds = useMemo(() => new Set(view.history.map(played => played.track.id)), [view.history]);

    const inPlay = view.phase !== 'lobby';
    const present = view.players.filter(player => player.presence !== 'left').length;

    const tabs = [
        { id: 'room' as const, label: t.roster.inTheRoom, count: present, show: true },
        { id: 'queue' as const, label: t.roster.yourQueue, count: view.you.tracks.length, show: inPlay && view.you.tracks.length > 0 },
        { id: 'played' as const, label: t.roster.played, count: view.history.length, show: view.history.length > 0 },
    ].filter(entry => entry.show);

    // A tab can disappear (history empties on a new game); never strand the user
    // on one that is no longer rendered.
    const active = tabs.some(entry => entry.id === tab) ? tab : 'room';

    return (
        <>
        {drums && origin && <Cables from={origin} />}
        <Window title={t.roster.playlist} className="side" flush>
            {/* A strip of one tab is a second heading for a panel that already
                has one. It earns its place only when there is a choice. */}
            {tabs.length > 1 && (
            <div className="tabs" role="tablist">
                {tabs.map(entry => (
                    <button
                        key={entry.id}
                        type="button"
                        role="tab"
                        className="tab"
                        aria-selected={active === entry.id}
                        onClick={() => setTab(entry.id)}
                    >
                        {entry.label} <span className="tab__count">{entry.count}</span>
                    </button>
                ))}
            </div>
            )}

            <div className="side__screen" role="tabpanel">
                {active === 'room' && <PlayerRoster view={view} />}

                {active === 'queue' && (
                    <TrackList tracks={view.you.tracks} nowPlayingId={view.round?.track.id} playedIds={playedIds} />
                )}

                {active === 'played' && (
                    <ul className="tracks">
                        {[...view.history].reverse().map(played => {
                            const badge = serviceBadgeByName(played.track.service);
                            const score = trackScore(played);
                            return (
                                <li key={played.track.id} className="track">
                                    {badge?.logo ? (
                                        <img className="track__logo" src={badge.logo} alt="" aria-hidden="true" />
                                    ) : (
                                        <span className="track__logo track__logo--generic" aria-hidden="true">
                                            ♪
                                        </span>
                                    )}
                                    <a
                                        className="track__title"
                                        href={played.track.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`${trackLabel(played.track)} — ${nameOf(view.players, played.djId)}`}
                                    >
                                        {trackLabel(played.track)}
                                    </a>
                                    {score > 0 && <span className="track__meta track__meta--score">★{score}</span>}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </Window>

        {/* Three minutes of somebody else's track and nothing to do with your
            hands. Silent on purpose — see the component. */}
        <div ref={machine}>
        <Window
            title={t.drums.title}
            className="side side--inset"
            actions={
                <button
                    type="button"
                    className="win__btn"
                    aria-expanded={drums}
                    aria-label={drums ? t.drums.hide : t.drums.show}
                    onClick={() => setDrums(value => !value)}
                >
                    {drums ? '–' : '+'}
                </button>
            }
        >
            {drums && <DrumMachine />}
        </Window>
        </div>
        </>
    );
}
