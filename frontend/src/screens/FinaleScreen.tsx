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
 * That was the night.
 *
 * Two numbers, two weights, and they never share a column. **♥** is what the
 * room gave — likes, novelty, emotion, before the popularity tax and before
 * anybody's gamble — and it is the only thing that ranks the setlist. **★** is
 * what the DJ banked; it is set quieter, and it ranks nothing, because a
 * claim is one person's bet and has no business moving a chart of what the
 * room liked.
 *
 * Ties share a rank rather than being broken: two tracks the room valued
 * equally both read 04, and the next one down reads 06. Breaking a tie on some
 * tiebreaker nobody was told about is the one way a chart can lie.
 *
 * There is deliberately no leaderboard and no winner. The score existed to
 * make choices matter during the night, not to crown anybody at the end of it.
 */
export function FinaleScreen({ view, onLeave }: FinaleScreenProps) {
    const t = useT();
    const awards = view.awards ?? [];
    const byId = new Map(awards.map(award => [award.id, award]));
    const present = view.players.filter(player => player.presence !== 'left').length;

    // What you actually want to walk out with is the handful of tracks *you*
    // liked. It gets the heavy rule, because it is the only part of the night
    // you keep.
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
    // Shared ranks: equal ♥ means equal position, and the next distinct value
    // skips the places the tie consumed.
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
                <h2 className="finale__title">{t.finale.thatWasTheNight}</h2>
                <p className="finale__summary num">{t.finale.roomSummary(view.history.length, present)}</p>
            </header>

            <Block label={t.finale.rankedBy} count={t.finale.starRanksNothing}>
                <ol className="final-list list">
                    {ranked.map(played => (
                        <li key={played.track.id} className="final-list__row">
                            <span className="final-list__n num">
                                {String(rankOf.get(played.number)).padStart(2, '0')}
                            </span>
                            <a
                                className="final-list__title clip"
                                href={played.track.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={trackLabel(played.track)}
                            >
                                {trackLabel(played.track)}
                            </a>
                            <span className="final-list__played num">{t.finale.played(played.number)}</span>
                            <span className="final-list__dj clip">{nameOf(view.players, played.djId)}</span>
                            <span className="final-list__love num" title={t.finale.loveTitle}>
                                ♥ {love(played)}
                            </span>
                            <span className="final-list__banked num" title={t.finale.totalTitle}>
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
                label={t.finale.takeaway}
                count={
                    takeaway.length > 0 ? (
                        <button
                            type="button"
                            className="stamp stamp--action"
                            onClick={() => void copy(t.finale.copyTakeawayHeader(view.id), takeaway)}
                        >
                            {t.finale.copyAll(takeaway.length)}
                        </button>
                    ) : undefined
                }
            >
                {takeaway.length === 0 ? (
                    // Written, not blank. The one screen where a zero state is a
                    // personality test for the product.
                    <p className="takeaway__empty">{t.finale.takeawayEmpty}</p>
                ) : (
                    <ol className="final-list list list--strong">
                        {takeaway.map(played => {
                            const mine = played.answers.find(answer => answer.listenerId === view.you.id)!;
                            return (
                                <li key={played.track.id} className="final-list__row">
                                    <a
                                        className="final-list__title clip"
                                        href={played.track.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={trackLabel(played.track)}
                                    >
                                        {trackLabel(played.track)}
                                    </a>
                                    <span className="final-list__gave num">
                                        {t.finale.youGaveIt(nameOf(view.players, played.djId), mine.like)}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </Block>

            {view.unplayed && view.unplayed.length > 0 && (
                <Block label={t.finale.unplayed} count={view.unplayed.length}>
                    <ol className="final-list list">
                        {view.unplayed.map(entry => (
                            <li key={entry.track.id} className="final-list__row">
                                <a
                                    className="final-list__title clip"
                                    href={entry.track.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={trackLabel(entry.track)}
                                >
                                    {trackLabel(entry.track)}
                                </a>
                                <span className="final-list__dj clip">{nameOf(view.players, entry.djId)}</span>
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
