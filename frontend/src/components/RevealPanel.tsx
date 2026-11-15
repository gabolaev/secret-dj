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
import { Block } from './Block';
import { nameOf } from '../lib/format';
import { useI18n, useT } from '../i18n';

interface RevealPanelProps {
    view: GameView;
}

/** Trims trailing zeroes ("×1", not "×1.00") and uses the reader's decimal separator. */
function multiplier(value: number, locale: string): string {
    return value.toLocaleString(locale, { maximumFractionDigits: 2 });
}

/**
 * Who it was, what it scored, and what everyone said.
 *
 * Every figure comes from the same shared functions that banked the points,
 * so the explanation cannot drift from the arithmetic.
 */
export function RevealPanel({ view }: RevealPanelProps) {
    const t = useT();
    const { locale } = useI18n();
    const round = view.round;
    const reveal = round?.reveal;
    if (!round || !reveal) return null;

    const djName = nameOf(view.players, reveal.djId);
    const claim = round.track.claim ?? DEFAULT_CLAIM;
    const correct = reveal.votes.filter(vote => vote.correct).length;

    const djPoints = new Map(
        reveal.points.filter(delta => delta.playerId === reveal.djId).map(delta => [delta.reason, delta.points]),
    );
    const pointsFor = (reason: PointReason) => djPoints.get(reason) ?? 0;

    const contributions = reveal.answers.map(answerValue);
    const total = contributions.reduce((sum, value) => sum + value, 0);
    const verdict = Math.round(roomVerdict(reveal));
    const drag = obviousnessDrag(reveal.answers);
    const popular = reveal.answers.filter(answer => answer.popular).length;
    const silent = Math.max(0, reveal.listenerCount - reveal.answers.length);

    // The deltas telescope, so each step shows the number it started and ended on.
    const afterTax = verdict + pointsFor('obviousness');
    const afterClaim = afterTax + pointsFor('claim-landed');
    const banked = reveal.points
        .filter(delta => delta.playerId === reveal.djId)
        .reduce((sum, delta) => sum + delta.points, 0);

    const evidence = claimEvidence({ claim, answers: reveal.answers, votes: reveal.votes });
    const claimReason =
        claim.id === 'none' || !evidence
            ? null
            : evidence.kind === 'share'
              ? t.claims.evidence[claim.id as Exclude<ClaimId, 'none'>](evidence.hit, evidence.of)
              : t.claims.evidenceSpread(evidence.percent);

    const steps = [
        {
            label: t.reveal.sumLabel,
            detail:
                (contributions.length > 0 ? contributions.join(' + ') : t.reveal.nobodyAnswered) +
                (silent > 0 ? ` · ${t.reveal.silent(silent)}` : ''),
            change: `${total}`,
        },
        {
            label: t.reveal.scaleLabel,
            detail:
                reveal.answers.length > 0
                    ? t.reveal.scaleWorking(total, reveal.answers.length, reveal.listenerCount)
                    : t.reveal.nothingToScale,
            change: `${total} → ${verdict}`,
        },
        {
            label: t.reveal.obviousLabel,
            detail:
                popular === 0
                    ? t.reveal.noDrag
                    : `${t.reveal.dragWorking(popular, reveal.answers.length)} · ×${multiplier(drag, locale)}`,
            change: popular === 0 ? t.reveal.unchanged : `${verdict} → ${afterTax}`,
        },
        {
            label: t.reveal.claimLabel,
            detail:
                afterTax === afterClaim
                    ? t.reveal.noClaim
                    : `${t.claims[claim.id].title} · ×${multiplier(reveal.claimMultiplier, locale)}`,
            change: afterTax === afterClaim ? t.reveal.unchanged : `${afterTax} → ${afterClaim}`,
        },
    ];

    // Answers first, so the ratings lead; anyone who only guessed follows.
    const listeners = [
        ...reveal.answers.map(answer => ({
            id: answer.listenerId,
            answer,
            vote: reveal.votes.find(v => v.voterId === answer.listenerId),
        })),
        ...reveal.votes
            .filter(vote => !reveal.answers.some(answer => answer.listenerId === vote.voterId))
            .map(vote => ({ id: vote.voterId, answer: undefined, vote })),
    ];

    return (
        <>
            <section className="card reveal">
                <div className="reveal__dj">
                    <Avatar id={reveal.djId} name={djName} size="lg" />
                    <div className="reveal__who">
                        <span className="reveal__eyebrow">{t.round.itWas}</span>
                        <span className="reveal__name clip">{djName}</span>
                    </div>
                    {view.settings.guessingEnabled && (
                        <span className="reveal__named num">
                            {t.round.namedBy(correct, reveal.votes.length)}
                        </span>
                    )}
                </div>

                <dl className="stats">
                    <div className="stat">
                        <dt>{t.reveal.roomGave}</dt>
                        <dd className="stat__value num">{verdict}</dd>
                    </div>
                    <div className="stat">
                        <dt>{t.reveal.claimLabel}</dt>
                        <dd className="stat__value num">×{multiplier(reveal.claimMultiplier, locale)}</dd>
                    </div>
                    <div className="stat stat--total">
                        <dt>{t.reveal.djBanked}</dt>
                        <dd className="stat__value num">{banked}</dd>
                    </div>
                </dl>

                {claim.id !== 'none' && (
                    <p className="reveal__claim">
                        <strong>{t.claims[claim.id].title}</strong>
                        {claimReason && <span>{claimReason}</span>}
                    </p>
                )}

                <details className="ledger">
                    <summary>{t.reveal.theWorking}</summary>
                    <ol className="ledger__rows">
                        {steps.map(step => (
                            <li key={step.label} className="ledger__row">
                                <span className="ledger__body">
                                    <span className="ledger__label">{step.label}</span>
                                    <span className="ledger__detail num">{step.detail}</span>
                                </span>
                                <span className="ledger__change num">{step.change}</span>
                            </li>
                        ))}
                    </ol>
                </details>
            </section>

            <Block label={t.reveal.answersTitle} count={t.reveal.answeredSummary(reveal.answers.length, silent)}>
                {listeners.length === 0 ? (
                    <p className="muted">{t.reveal.toughCrowd}</p>
                ) : (
                    <ul className="answers">
                        {listeners.map(({ id, answer, vote }) => {
                            const name = nameOf(view.players, id);
                            const tags = answer
                                ? [
                                      answer.heard ? t.reveal.heardTag : t.reveal.newTag(NOVELTY_BONUS),
                                      answer.popular ? t.reveal.popularTag : null,
                                      answer.moved ? t.reveal.movedTag(EMOTION_BONUS) : null,
                                  ]
                                      .filter(Boolean)
                                      .join(' · ')
                                : t.reveal.saidNothing;
                            return (
                                <li key={id} className="answers__row">
                                    <Avatar id={id} name={name} size="sm" />
                                    <span className="answers__who">
                                        <span className="answers__name clip">{name}</span>
                                        <span className="answers__tags clip">{tags}</span>
                                    </span>
                                    {vote && (
                                        <span
                                            className={`answers__guess${vote.correct ? ' is-correct' : ''}`}
                                            title={vote.correct ? t.reveal.correct : t.reveal.wrong}
                                        >
                                            {vote.correct && <i aria-hidden="true">✓ </i>}
                                            {nameOf(view.players, vote.guessId)}
                                        </span>
                                    )}
                                    <b
                                        className="answers__like num"
                                        title={answer ? t.reveal.likedIt(name, answer.like) : undefined}
                                    >
                                        {answer ? answer.like : '—'}
                                        <small>/{RATING_MAX}</small>
                                    </b>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Block>
        </>
    );
}
