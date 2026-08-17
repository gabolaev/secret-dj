import type { GameView, PointReason } from '@secret-dj/common';
import { Avatar } from './Avatar';
import { nameOf } from '../lib/format';
import { useT } from '../i18n';

interface RevealPanelProps {
    view: GameView;
}

/**
 * The payoff. Kept as one block inside the deck rather than two side-by-side
 * cards, so the reveal reads top to bottom: who it was, what the decoy did,
 * who guessed what, who spent what.
 */
export function RevealPanel({ view }: RevealPanelProps) {
    const t = useT();
    const reveal = view.round?.reveal;
    if (!reveal) return null;

    const djName = nameOf(view.players, reveal.djId);
    const correct = reveal.votes.filter(vote => vote.correct);
    const fooled = reveal.votes.filter(vote => vote.fooled);
    const points = new Map(reveal.points.map(delta => [`${delta.playerId}:${delta.reason}` as const, delta.points]));
    const pointsFor = (playerId: string, reason: PointReason) => points.get(`${playerId}:${reason}`);
    const djLove = (pointsFor(reveal.djId, 'hearts-received') ?? 0) + (pointsFor(reveal.djId, 'anthem-received') ?? 0);

    return (
        <div className="reveal">
            <div className="reveal__head">
                <Avatar id={reveal.djId} name={djName} size="lg" />
                <div>
                    <p className="reveal__eyebrow">{t.reveal.queuedBy}</p>
                    <h3 className="reveal__name">{djName}</h3>
                    <p className="reveal__sub">
                        {view.settings.guessingEnabled
                            ? t.reveal.guessSummary(correct.length, reveal.votes.length)
                            : t.reveal.noGuessing}
                    </p>
                </div>
            </div>

            {reveal.decoyId && (
                <p className="reveal__decoy">
                    <span aria-hidden="true">⌘</span>
                    {t.reveal.decoyWas(nameOf(view.players, reveal.decoyId))} · {t.reveal.decoyHits(fooled.length)}
                    {pointsFor(reveal.djId, 'decoy-hit') !== undefined && (
                        <span className="reveal__pts">{t.reveal.points(pointsFor(reveal.djId, 'decoy-hit')!)}</span>
                    )}
                </p>
            )}

            {view.settings.guessingEnabled && reveal.votes.length > 0 && (
                <ul className="reveal__votes">
                    {reveal.votes.map(vote => (
                        <li key={vote.voterId} className={vote.correct ? 'is-correct' : vote.fooled ? 'is-fooled' : 'is-wrong'}>
                            <Avatar id={vote.voterId} name={nameOf(view.players, vote.voterId)} size="sm" />
                            {nameOf(view.players, vote.voterId)}
                            <span className="reveal__arrow" aria-hidden="true">
                                →
                            </span>
                            <span className="reveal__guess">{nameOf(view.players, vote.guessId)}</span>
                            {pointsFor(vote.voterId, 'correct-guess') !== undefined && (
                                <span className="reveal__pts">{t.reveal.points(pointsFor(vote.voterId, 'correct-guess')!)}</span>
                            )}
                            <span
                                className="reveal__mark"
                                aria-label={vote.correct ? t.reveal.correct : vote.fooled ? t.reveal.fooled : t.reveal.wrong}
                            >
                                {vote.correct ? '✓' : vote.fooled ? '⌘' : '✗'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="reveal__hearts">
                <span className="label">{t.reveal.heartsTitle}</span>
                {reveal.anthemBy.length + reveal.heartedBy.length === 0 && <span>{t.reveal.toughCrowd}</span>}
                {reveal.anthemBy.map(playerId => (
                    <span key={playerId} className="who who--anthem" title={t.reveal.anthemFrom(nameOf(view.players, playerId))}>
                        <Avatar id={playerId} name={nameOf(view.players, playerId)} size="sm" />
                        {nameOf(view.players, playerId)} ★
                    </span>
                ))}
                {reveal.heartedBy.map(playerId => (
                    <span key={playerId} className="who">
                        <Avatar id={playerId} name={nameOf(view.players, playerId)} size="sm" />
                        {nameOf(view.players, playerId)}
                    </span>
                ))}
                {djLove > 0 && <span className="reveal__pts">{`${djName} ${t.reveal.points(djLove)}`}</span>}
            </div>
        </div>
    );
}
