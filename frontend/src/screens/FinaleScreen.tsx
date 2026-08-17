import { AWARDS_BY_ID, trackScore, type GameView, type Scores } from '@secret-dj/common';
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
    const totalPoints = view.history.reduce((sum, played) => sum + trackScore(played), 0);

    const copyPlaylist = async () => {
        const lines = view.history.map(
            played => `${played.number}. ${trackLabel(played.track)} — ${nameOf(view.players, played.djId)}\n   ${played.track.url}`,
        );
        const text = `${t.finale.copyHeader(view.id)}\n\n${lines.join('\n')}`;
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            window.prompt(t.finale.copyPrompt, text);
        }
    };

    return (
        <div className="stage">
            <header className="stage__head">
                <h2 className="stage__title">{t.finale.summary(view.history.length, totalPoints)}</h2>
                <p className="stage__sub">{t.finale.sub}</p>
            </header>

            <div className="boards">
                <Board view={view} board="selector" title={t.finale.selectorBoard} blurb={t.finale.selectorBlurb} />
                {view.settings.guessingEnabled && (
                    <Board view={view} board="detective" title={t.finale.detectiveBoard} blurb={t.finale.detectiveBlurb} />
                )}
            </div>

            {awards.length > 0 && (
                <Window title={t.finale.awards}>
                    <div className="awards">
                        {awards
                            // Keep each board's trophies together, Selector first.
                            .slice()
                            .sort((a, b) =>
                                AWARDS_BY_ID[a.id].board === AWARDS_BY_ID[b.id].board
                                    ? 0
                                    : AWARDS_BY_ID[a.id].board === 'selector'
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
                <ol className="final-list">
                    {view.history.map(played => {
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
                                <span className={`track__meta${score > 0 ? ' track__meta--heart' : ''}`}>
                                    {played.anthemBy.length > 0 && '★'}
                                    {score > 0 ? `♥${score}` : ''}
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

interface BoardProps {
    view: GameView;
    board: keyof Scores;
    title: string;
    blurb: string;
}

function Board({ view, board, title, blurb }: BoardProps) {
    const ranked = [...view.players].sort(
        (a, b) => b.scores[board] - a.scores[board] || a.name.localeCompare(b.name),
    );

    return (
        <Window title={title} className={`board board--${board}`}>
            <p className="board__blurb">{blurb}</p>
            <ol className="scores">
                {ranked.map((player, index) => (
                    <li key={player.id} className={index === 0 && player.scores[board] > 0 ? 'is-winner' : undefined}>
                        <span className="scores__rank">{index + 1}</span>
                        <Avatar id={player.id} name={player.name} size="sm" />
                        <span className="scores__name">{player.name}</span>
                        <span className="scores__pts">{player.scores[board]}</span>
                    </li>
                ))}
            </ol>
        </Window>
    );
}
