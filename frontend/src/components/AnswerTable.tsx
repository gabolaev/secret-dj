import {
    EMOTION_BONUS,
    NOVELTY_BONUS,
    RATING_MAX,
    answerValue,
    type GameView,
} from '@secret-dj/common';
import { Block } from './Block';
import { Placeholder, Redacted } from './Redacted';
import { nameOf } from '../lib/format';
import { useT } from '../i18n';

interface AnswerTableProps {
    view: GameView;
}

/**
 * What the room said — sealed during the round, attributed at the reveal.
 *
 * **The bars carry no names during the round, on purpose.** Naming who has
 * answered names the DJ by omission: they are the one person who cannot
 * answer, so a roster of DONE / DECIDING is a list with the answer circled. So
 * the round publishes counts and nothing else — six sealed rows, two
 * outstanding, no identities on either side of the line.
 *
 * Everything under the bars — name, number, tags, guess — arrives in one
 * movement at the reveal, which is also the only moment attribution is worth
 * anything. Two stages would be two chances to work out who is missing.
 *
 * That attribution is the whole enforcement mechanism for the honesty rule.
 * Three of the four answers are self-reports no server can check; what keeps
 * them true is having to sit next to someone who watched you call their
 * obscure B-side popular. Which is why the tags are printed in the row rather
 * than tucked behind a hover.
 */
export function AnswerTable({ view }: AnswerTableProps) {
    const t = useT();
    const round = view.round;
    if (!round) return null;

    const reveal = round.reveal;

    if (!reveal) {
        const sealed = round.answersIn;
        const out = Math.max(0, round.answersExpected - sealed);
        return (
            <Block
                label={t.round.answersSealed(sealed, round.answersExpected)}
                count={<span className="stamp">{t.round.countsOnly}</span>}
            >
                <div className="answers list">
                    {Array.from({ length: sealed }, (_, index) => (
                        <Redacted
                            key={index}
                            open={false}
                            legend={t.round.answerSlot(index + 1)}
                            className="answers__row"
                        >
                            {/* Geometry only. The row is exactly as tall as the
                                one it becomes, and holds nothing the browser
                                has not been sent. */}
                            <Placeholder width="9ch" />
                            <Placeholder width="2ch" />
                            <Placeholder width="12ch" size="micro" />
                        </Redacted>
                    ))}
                    <p className="answers__foot num">
                        <span>{t.round.stillOut(out)}</span>
                        <span className="answers__foot-end">{t.round.noNamesEitherSide}</span>
                    </p>
                </div>
            </Block>
        );
    }

    // Everyone who did anything this round, answers first so the best-liked
    // stay at the top; whoever only guessed follows.
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
    const silent = Math.max(0, reveal.listenerCount - reveal.answers.length);

    return (
        <Block
            label={t.reveal.answersTitle}
            count={
                <span className="stamp stamp--open">
                    {t.reveal.answeredSummary(reveal.answers.length, silent)}
                </span>
            }
        >
            <div className="answers list">
                {listeners.length === 0 && <p className="answers__foot num">{t.reveal.toughCrowd}</p>}
                {listeners.map(({ id, answer, vote }) => {
                    const name = nameOf(view.players, id);
                    return (
                        <Redacted key={id} open className="answers__row">
                            <span className="answers__name clip" title={name}>
                                {name}
                            </span>

                            <b className="answers__like num" title={t.reveal.likedIt(name, answer?.like ?? 0)}>
                                {answer ? `${answer.like}/${RATING_MAX}` : '—'}
                            </b>

                            <span className="answers__tags num clip">
                                {answer ? (
                                    [
                                        answer.heard ? t.reveal.heardTag : t.reveal.newTag(NOVELTY_BONUS),
                                        answer.popular ? t.reveal.popularTag : null,
                                        answer.moved ? t.reveal.movedTag(EMOTION_BONUS) : null,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')
                                ) : (
                                    <span className="answers__silent">{t.reveal.saidNothing}</span>
                                )}
                            </span>

                            {vote && (
                                <span
                                    className={`answers__guess num${vote.correct ? ' is-correct' : ''}`}
                                    title={vote.correct ? t.reveal.correct : t.reveal.wrong}
                                >
                                    {/* Fill *and* a tick *and* weight: three
                                        signals, so a correct guess survives
                                        greyscale. */}
                                    <i aria-hidden="true">{vote.correct ? '✓' : '·'}</i>
                                    {nameOf(view.players, vote.guessId)}
                                </span>
                            )}

                            <span className="answers__sum num" title={t.reveal.rowWorking(name)}>
                                {answer ? answerValue(answer) : ''}
                            </span>
                        </Redacted>
                    );
                })}

                <p className="answers__foot num">
                    <span>{t.reveal.djCouldNotAnswer(nameOf(view.players, reveal.djId))}</span>
                    <span className="answers__foot-end">{t.reveal.costsNothing}</span>
                </p>
            </div>

            {/* What a tick is worth, said once under the table rather than
                repeated on every row that has one. Naming the DJ pays the
                person who did it and costs the DJ nothing — those are two
                different facts and the legend carries both. */}
            {view.settings.guessingEnabled && (
                <p className="answers__key num">
                    <span className="answers__guess is-correct">
                        <i aria-hidden="true">✓</i>
                        {t.reveal.namedTheDj}
                    </span>
                    {t.reveal.guessWorth}
                </p>
            )}
        </Block>
    );
}
