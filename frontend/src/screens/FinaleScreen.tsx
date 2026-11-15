import {
    AWARDS,
    LOVED_AT,
    roomVerdict,
    trackScore,
    type GameView,
    type PlayedTrack,
} from '@secret-dj/common';
import { AwardCard } from '../components/AwardCard';
import { Block } from '../components/Block';
import { nameOf, trackLabel } from '../lib/format';
import { useT } from '../i18n';

interface FinaleScreenProps {
    view: GameView;
    onLeave: () => void;
}

/**
 * Tracks are ranked by ♥ — what the room gave — never by ★, which is one DJ's
 * bet. Ties share a rank. There is deliberately no leaderboard of people.
 */
export function FinaleScreen({ view, onLeave }: FinaleScreenProps) {
    const t = useT();
    const awards = view.awards ?? [];
    const byId = new Map(awards.map(award => [award.id, award]));
    const present = view.players.filter(player => player.presence !== 'left').length;

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

    const love = (played: PlayedTrack) => Math.round(roomVerdict(played));

    const ranked = [...view.history].sort((a, b) => love(b) - love(a) || a.number - b.number);
    const rankOf = new Map<number, number>();
    ranked.forEach((played, index) => {
        const previous = ranked[index - 1];
        rankOf.set(
            played.number,
            previous && love(previous) === love(played) ? rankOf.get(previous.number)! : index + 1,
        );
    });

    return (
        <div className="stage">
            <header className="finale__head">
                <h1 className="finale__title">{t.finale.thatWasTheNight}</h1>
                <p className="muted num">{t.finale.roomSummary(view.history.length, present)}</p>
            </header>

            <Block className="card" label={t.finale.rankedBy} count={t.finale.starRanksNothing}>
                <ol className="chart">
                    {ranked.map(played => (
                        <li key={played.track.id} className="chart__row">
                            <span className="chart__rank num">{rankOf.get(played.number)}</span>
                            <span className="chart__text">
                                <a
                                    className="chart__title clip"
                                    href={played.track.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={trackLabel(played.track)}
                                >
                                    {trackLabel(played.track)}
                                </a>
                                <span className="chart__dj clip">{nameOf(view.players, played.djId)}</span>
                            </span>
                            <span className="chart__love num" title={t.finale.loveTitle}>
                                ♥ {love(played)}
                            </span>
                            <span className="chart__banked num" title={t.finale.totalTitle}>
                                ★ {trackScore(played)}
                            </span>
                        </li>
                    ))}
                </ol>
            </Block>

            <Block label={t.finale.awards}>
                <div className="awards">
                    {AWARDS.map((definition, index) => (
                        <AwardCard
                            key={definition.id}
                            id={definition.id}
                            award={byId.get(definition.id)}
                            players={view.players}
                            lead={index === 0}
                        />
                    ))}
                </div>
            </Block>

            <Block
                className="card"
                label={t.finale.takeaway}
                count={
                    takeaway.length > 0 ? (
                        <button
                            type="button"
                            className="button button--ghost"
                            onClick={() => void copy(t.finale.copyTakeawayHeader(view.id), takeaway)}
                        >
                            {t.finale.copyAll(takeaway.length)}
                        </button>
                    ) : undefined
                }
            >
                {takeaway.length === 0 ? (
                    <p className="muted">{t.finale.takeawayEmpty}</p>
                ) : (
                    <ol className="chart">
                        {takeaway.map(played => {
                            const mine = played.answers.find(answer => answer.listenerId === view.you.id)!;
                            return (
                                <li key={played.track.id} className="chart__row">
                                    <span className="chart__text">
                                        <a
                                            className="chart__title clip"
                                            href={played.track.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={trackLabel(played.track)}
                                        >
                                            {trackLabel(played.track)}
                                        </a>
                                        <span className="chart__dj clip">{nameOf(view.players, played.djId)}</span>
                                    </span>
                                    <span className="chart__love num">{mine.like}/5</span>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </Block>

            {view.unplayed && view.unplayed.length > 0 && (
                <Block className="card" label={t.finale.unplayed} count={view.unplayed.length}>
                    <ol className="chart">
                        {view.unplayed.map(entry => (
                            <li key={entry.track.id} className="chart__row">
                                <span className="chart__text">
                                    <a
                                        className="chart__title clip"
                                        href={entry.track.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={trackLabel(entry.track)}
                                    >
                                        {trackLabel(entry.track)}
                                    </a>
                                    <span className="chart__dj clip">{nameOf(view.players, entry.djId)}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </Block>
            )}

            <div className="cta">
                <button type="button" className="button button--lg" onClick={onLeave}>
                    {t.finale.leave}
                </button>
            </div>
        </div>
    );
}
