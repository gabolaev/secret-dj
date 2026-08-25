import {
    AWARDS_BY_ID,
    LOVED_AT,
    roomVerdict,
    trackScore,
    trackVerdict,
    type GameView,
    type PlayedTrack,
} from '@secret-dj/common';
import { AwardCard } from '../components/AwardCard';
import { Avatar } from '../components/Avatar';
import { Window } from '../components/Window';
import { serviceBadgeByName } from '../lib/serviceLogos';
import { nameOf, trackLabel } from '../lib/format';
import { useT } from '../i18n';

interface FinaleScreenProps {
    view: GameView;
    onLeave: () => void;
}

export function FinaleScreen({ view, onLeave }: FinaleScreenProps) {
    const t = useT();
    const awards = view.awards ?? [];
    const totalPoints = view.history.reduce((sum, played) => sum + trackVerdict(played), 0);

    // The night's setlist is nobody's playlist. What you actually want to walk
    // out with is the handful of tracks *you* liked — so that is its own list,
    // above the record of what happened.
    const takeaway = view.history.filter(played => {
        const mine = played.answers.find(answer => answer.listenerId === view.you.id);
        return mine !== undefined && mine.like >= LOVED_AT;
    });

    const copy = async (header: string, tracks: readonly PlayedTrack[]) => {
        const lines = tracks.map(
            played => `${trackLabel(played.track)} — ${nameOf(view.players, played.djId)}\n   ${played.track.url}`,
        );
        const text = `${header}\n\n${lines.join('\n')}`;
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            window.prompt(t.finale.copyPrompt, text);
        }
    };

    // Two different numbers, so they get two columns: what the room gave, and
    // what that came to once the DJ's claim had its say.
    const love = (played: PlayedTrack) => Math.round(roomVerdict(played));

    // Ranked by the room, not by the banked total — a claim is the DJ's gamble,
    // and it should not move a track up a chart of what people liked.
    const ranked = [...view.history].sort(
        (a, b) => love(b) - love(a) || trackScore(b) - trackScore(a) || a.number - b.number,
    );

    const copyPlaylist = () => copy(t.finale.copyHeader(view.id), ranked);
    const copyTakeaway = () => copy(t.finale.copyTakeawayHeader(view.id), takeaway);

    return (
        <div className="stage">
            <header className="stage__head">
                <h2 className="stage__title">{t.finale.summary(view.history.length, totalPoints)}</h2>
                <p className="stage__sub">{t.finale.sub}</p>
            </header>

            <Window
                title={t.finale.takeaway}
                actions={
                    takeaway.length > 0 ? (
                        <button
                            type="button"
                            className="win__btn"
                            onClick={() => void copyTakeaway()}
                            title={t.finale.copyTakeaway}
                        >
                            ⧉
                        </button>
                    ) : undefined
                }
            >
                <p className="takeaway__blurb">{t.finale.takeawayBlurb}</p>
                {takeaway.length === 0 ? (
                    <p className="muted">{t.finale.takeawayEmpty}</p>
                ) : (
                    <ol className="final-list final-list--takeaway">
                        {takeaway.map(played => {
                            const badge = serviceBadgeByName(played.track.service);
                            const mine = played.answers.find(answer => answer.listenerId === view.you.id)!;
                            return (
                                <li key={played.track.id}>
                                    <span className="final-list__n">{played.number}</span>
                                    {badge?.logo ? (
                                        <img className="track__logo" src={badge.logo} alt="" aria-hidden="true" />
                                    ) : (
                                        <span className="track__logo track__logo--generic" aria-hidden="true">
                                            ♪
                                        </span>
                                    )}
                                    <a
                                        className="final-list__title"
                                        href={played.track.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {trackLabel(played.track)}
                                    </a>
                                    <span className="final-list__dj">
                                        <Avatar id={played.djId} name={nameOf(view.players, played.djId)} size="sm" />
                                        {nameOf(view.players, played.djId)}
                                    </span>
                                    <span className="track__meta track__meta--score">★{mine.like}</span>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </Window>

            {awards.length > 0 && (
                <Window title={t.finale.awards}>
                    <div className="awards">
                        {awards
                            // Keep each kind of trophy together, the music ones first.
                            .slice()
                            .sort((a, b) =>
                                AWARDS_BY_ID[a.id].group === AWARDS_BY_ID[b.id].group
                                    ? 0
                                    : AWARDS_BY_ID[a.id].group === 'music'
                                      ? -1
                                      : 1,
                            )
                            .map((award, index) => (
                                <AwardCard key={award.id} award={award} players={view.players} index={index} />
                            ))}
                    </div>
                </Window>
            )}

            <Window
                title={t.finale.setlist}
                actions={
                    <button type="button" className="win__btn" onClick={() => void copyPlaylist()} title={t.common.copy}>
                        ⧉
                    </button>
                }
            >
                <p className="final-list__legend">{t.finale.setlistLegend}</p>
                <ol className="final-list">
                    {ranked.map(played => {
                        const badge = serviceBadgeByName(played.track.service);
                        const score = trackScore(played);
                        return (
                            <li key={played.track.id}>
                                <span className="final-list__n">{played.number}</span>
                                {badge?.logo ? (
                                    <img className="track__logo" src={badge.logo} alt="" aria-hidden="true" />
                                ) : (
                                    <span className="track__logo track__logo--generic" aria-hidden="true">
                                        ♪
                                    </span>
                                )}
                                <a
                                    className="final-list__title"
                                    href={played.track.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {trackLabel(played.track)}
                                </a>
                                <span className="final-list__dj">
                                    <Avatar id={played.djId} name={nameOf(view.players, played.djId)} size="sm" />
                                    {nameOf(view.players, played.djId)}
                                </span>
                                <span className="final-list__scores">
                                    <span className="track__meta track__meta--love" title={t.finale.loveTitle}>
                                        ♥{love(played)}
                                    </span>
                                    <span className="track__meta track__meta--score" title={t.finale.totalTitle}>
                                        ★{score}
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </Window>

            {view.unplayed && view.unplayed.length > 0 && (
                <Window title={t.finale.unplayed}>
                    <ol className="final-list final-list--ghost">
                        {view.unplayed.map(entry => {
                            const badge = serviceBadgeByName(entry.track.service);
                            return (
                                <li key={entry.track.id}>
                                    <span className="final-list__n">·</span>
                                    {badge?.logo ? (
                                        <img className="track__logo" src={badge.logo} alt="" aria-hidden="true" />
                                    ) : (
                                        <span className="track__logo track__logo--generic" aria-hidden="true">
                                            ♪
                                        </span>
                                    )}
                                    <a
                                        className="final-list__title"
                                        href={entry.track.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {trackLabel(entry.track)}
                                    </a>
                                    <span className="final-list__dj">
                                        <Avatar id={entry.djId} name={nameOf(view.players, entry.djId)} size="sm" />
                                        {nameOf(view.players, entry.djId)}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </Window>
            )}

            <div className="cta">
                <button type="button" className="button button--lg" onClick={onLeave}>
                    {t.finale.leave}
                </button>
            </div>
        </div>
    );
}

