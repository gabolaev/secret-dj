import {
    DEFAULT_CLAIM,
    EMOTION_BONUS,
    NOVELTY_BONUS,
    RATING_MAX,
    answerValue,
    claimEvidence,
    obviousnessDrag,
    roomVerdict,
    type ClaimId,
    type GameView,
    type PointReason,
} from '@secret-dj/common';
import { Avatar } from './Avatar';
import { nameOf } from '../lib/format';
import { useI18n, useT } from '../i18n';

interface RevealPanelProps {
    view: GameView;
}

/**
 * Trims trailing zeroes so a flat multiplier reads "×1", not "×1.00", and uses
 * the reader's decimal separator — the Russian copy writes ×1,5 everywhere else.
 */
function multiplier(value: number, locale: string): string {
    return value.toLocaleString(locale, { maximumFractionDigits: 2 });
}

/**
 * The payoff, and the only thing holding the honesty rule up.
 *
 * Three of the four answers are self-reports no server can check, so this panel
 * prints **every answer with a name on it**. That is the enforcement: not a
 * validation rule, but having to sit next to someone who watched you call their
 * obscure B-side popular. Which is also why the toggles are rendered as plain
 * tags rather than tucked behind a hover.
 */
export function RevealPanel({ view }: RevealPanelProps) {
    const t = useT();
    const { locale } = useI18n();
    const reveal = view.round?.reveal;
    if (!reveal) return null;

    const djName = nameOf(view.players, reveal.djId);
    const correct = reveal.votes.filter(vote => vote.correct);
    const djPoints = new Map(
        reveal.points.filter(delta => delta.playerId === reveal.djId).map(delta => [delta.reason, delta.points]),
    );
    const pointsFor = (reason: PointReason) => djPoints.get(reason);
    const guessPoints = new Set(
        reveal.points.filter(delta => delta.reason === 'correct-guess').map(delta => delta.playerId),
    );

    // The reveal is exactly when the claim stops being withheld.
    const claim = view.round?.track.claim ?? DEFAULT_CLAIM;
    const popular = reveal.answers.filter(answer => answer.popular).length;
    const evidence = claimEvidence({ claim, answers: reveal.answers, votes: reveal.votes });

    // Every number below is derived from the same exported functions that banked
    // the points, so the explanation cannot drift from the arithmetic.
    const contributions = reveal.answers.map(answerValue);
    const total = contributions.reduce((sum, value) => sum + value, 0);
    const verdict = Math.round(roomVerdict(reveal));
    const drag = obviousnessDrag(reveal.answers);
    const banked = reveal.points
        .filter(delta => delta.playerId === reveal.djId)
        .reduce((sum, delta) => sum + delta.points, 0);

    // "×0.5" never said half of *what*. The deltas telescope, so each step can
    // show the number it started from and the number it left behind instead.
    const afterTax = verdict + (pointsFor('obviousness') ?? 0);
    const afterClaim = afterTax + (pointsFor('claim-landed') ?? 0);

    /** Why the claim was worth what it was, in the claim's own terms. */
    const claimReason = (): string | null => {
        if (!evidence) return null;
        return evidence.kind === 'share'
            ? t.claims.evidence[claim.id as Exclude<ClaimId, 'none'>](evidence.hit, evidence.of)
            : t.claims.evidenceSpread(evidence.percent);
    };

    /** `10 → 8`: the step this row performed, in the units of the score. */
    const change = (before: number, after: number, times: number) => (
        <span className="ledger__change" title={t.reveal.timesWorking(multiplier(times, locale))}>
            {before} <i aria-hidden="true">→</i> {after}
        </span>
    );

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

            {/* Every arithmetic step, in the order it happens. A reveal that
                only shows the final number teaches nobody the game. */}
            <ul className="ledger">
                <li>
                    <span className="ledger__label">{t.reveal.sumLabel}</span>
                    <span className="ledger__detail">
                        {contributions.length > 0 ? contributions.join(' + ') : t.reveal.nobodyAnswered}
                        {reveal.listenerCount > reveal.answers.length &&
                            ` · ${t.reveal.silent(reveal.listenerCount - reveal.answers.length)}`}
                    </span>
                    <span className="ledger__sum">{total}</span>
                </li>
                <li>
                    <span className="ledger__label">{t.reveal.scaleLabel}</span>
                    <span className="ledger__detail">
                        {reveal.answers.length > 0
                            ? t.reveal.scaleWorking(total, reveal.answers.length, reveal.listenerCount)
                            : t.reveal.nothingToScale}
                    </span>
                    <span className="reveal__pts">{t.reveal.points(verdict)}</span>
                </li>
                <li>
                    <span className="ledger__label">{t.reveal.obviousLabel}</span>
                    {popular > 0 && change(verdict, afterTax, drag)}
                    <span className="ledger__detail">
                        {popular === 0
                            ? t.reveal.noDrag
                            : t.reveal.dragWorking(popular, reveal.answers.length)}
                    </span>
                    {line('obviousness') ?? <span className="ledger__nil">{t.reveal.unchanged}</span>}
                </li>
                <li className={`ledger__claim ledger__claim--${claim.id}`}>
                    <span className="ledger__label">{t.claims[claim.id].title}</span>
                    {evidence && change(afterTax, afterClaim, reveal.claimMultiplier)}
                    <span className="ledger__detail">{claimReason() ?? t.reveal.noClaim}</span>
                    {line('claim-landed') ?? <span className="ledger__nil">{t.reveal.unchanged}</span>}
                </li>
                <li className="ledger__total">
                    <span className="ledger__label">{t.reveal.totalLabel(djName)}</span>
                    <span className="ledger__detail" />
                    <span className="reveal__pts">{banked}</span>
                </li>
            </ul>

            {view.settings.guessingEnabled && reveal.votes.length > 0 && (
                <ul className="reveal__votes">
                    {reveal.votes.map(vote => (
                        <li key={vote.voterId} className={vote.correct ? 'is-correct' : 'is-wrong'}>
                            <Avatar id={vote.voterId} name={nameOf(view.players, vote.voterId)} size="sm" />
                            {nameOf(view.players, vote.voterId)}
                            <span className="reveal__arrow" aria-hidden="true">
                                →
                            </span>
                            <span className="reveal__guess">{nameOf(view.players, vote.guessId)}</span>
                            {guessPoints.has(vote.voterId) && (
                                <span className="reveal__pts">{t.reveal.points(1)}</span>
                            )}
                            <span
                                className="reveal__mark"
                                aria-label={vote.correct ? t.reveal.correct : t.reveal.wrong}
                            >
                                {vote.correct ? '✓' : '✗'}
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
                            {/* "4" on its own reads as points, or a rank, or
                                anything. The scale has to be on the pill. */}
                            <b className="answers__like" title={t.reveal.likedIt(name, answer.like)}>
                                {answer.like}/{RATING_MAX}
                            </b>
                            {answer.heard ? (
                                <span className="tag tag--heard">{t.reveal.heardTag}</span>
                            ) : (
                                <span className="tag tag--new">{t.reveal.newTag(NOVELTY_BONUS)}</span>
                            )}
                            {answer.popular && <span className="tag tag--popular">{t.reveal.popularTag}</span>}
                            {answer.moved && <span className="tag tag--moved">{t.reveal.movedTag(EMOTION_BONUS)}</span>}
                            <span className="answers__sum" title={t.reveal.rowWorking(name)}>
                                = {answerValue(answer)}
                            </span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
