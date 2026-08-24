import { DEFAULT_CLAIM, type GameView, type PointReason } from '@secret-dj/common';
import { Avatar } from './Avatar';
import { nameOf } from '../lib/format';
import { useT } from '../i18n';

interface RevealPanelProps {
    view: GameView;
}

/** Trims trailing zeroes so a flat multiplier reads "×1", not "×1.00". */
function multiplier(value: number): string {
    return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * The payoff, and the only thing holding the honesty rule up.
 *
 * Three of the four answers are self-reports no server can check, so this panel
 * prints **every answer with a name on it**. That is the enforcement: not a
 * validation rule, but having to sit next to someone who watched you call their
 * obscure B-side obvious. Which is also why the toggles are rendered as plain
 * tags rather than tucked behind a hover.
 */
export function RevealPanel({ view }: RevealPanelProps) {
    const t = useT();
    const reveal = view.round?.reveal;
    if (!reveal) return null;

    const djName = nameOf(view.players, reveal.djId);
    const correct = reveal.votes.filter(vote => vote.correct);
    const fooled = reveal.votes.filter(vote => vote.fooled);
    const points = new Map(reveal.points.map(delta => [delta.reason, delta.points]));
    const pointsFor = (reason: PointReason) => points.get(reason);

    // The reveal is exactly when the claim stops being withheld.
    const claim = view.round?.track.claim ?? DEFAULT_CLAIM;
    const heard = reveal.answers.filter(answer => answer.heard).length;
    const moved = reveal.answers.filter(answer => answer.moved).length;
    const silent = Math.max(0, reveal.listenerCount - reveal.answers.length);

    const line = (reason: PointReason) => {
        const value = pointsFor(reason);
        if (value === undefined) return null;
        return <span className={`reveal__pts${value < 0 ? ' is-down' : ''}`}>{t.reveal.points(value)}</span>;
    };

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

            {/* What the room gave, what calling it obvious took back, and what
                the DJ's bet did to the remainder — in that order, so the score
                shows its working rather than arriving as one number. */}
            <ul className="ledger">
                <li>
                    <span className="ledger__label">{t.reveal.verdictLabel}</span>
                    <span className="ledger__detail">
                        {heard === 0 ? t.reveal.knewNobody : t.reveal.knewCount(heard, reveal.answers.length)} ·{' '}
                        {t.reveal.movedCount(moved)}
                        {silent > 0 && ` · ${t.reveal.silent(silent)}`}
                    </span>
                    {line('room-verdict')}
                </li>
                <li>
                    <span className="ledger__label">{t.reveal.obviousLabel}</span>
                    <span className="ledger__detail">
                        {reveal.obviousnessDrag === 1
                            ? t.reveal.noDrag
                            : t.reveal.dragResult(multiplier(reveal.obviousnessDrag))}
                    </span>
                    {line('obviousness')}
                </li>
                <li className={`ledger__claim ledger__claim--${claim.id}`}>
                    <span className="ledger__label">{t.claims[claim.id].title}</span>
                    <span className="ledger__detail">{t.reveal.claimResult(multiplier(reveal.claimMultiplier))}</span>
                    {line('claim-landed')}
                </li>
            </ul>

            {reveal.decoyId && (
                <p className="reveal__decoy">
                    <span aria-hidden="true">⌘</span>
                    {t.reveal.decoyWas(nameOf(view.players, reveal.decoyId))} · {t.reveal.decoyHits(fooled.length)}
                    {line('decoy-hit')}
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

            <div className="answers">
                <span className="label">{t.reveal.answersTitle}</span>
                {reveal.answers.length === 0 && <span className="muted">{t.reveal.toughCrowd}</span>}
                {reveal.answers.map(answer => {
                    const name = nameOf(view.players, answer.listenerId);
                    return (
                        <span key={answer.listenerId} className="answers__row">
                            <Avatar id={answer.listenerId} name={name} size="sm" />
                            <span className="answers__name">{name}</span>
                            <b className="answers__like">{answer.like}</b>
                            {answer.heard && <span className="tag tag--heard">{t.reveal.heardTag}</span>}
                            {answer.popular && <span className="tag tag--popular">{t.reveal.popularTag}</span>}
                            {answer.moved && <span className="tag tag--moved">{t.reveal.movedTag}</span>}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
