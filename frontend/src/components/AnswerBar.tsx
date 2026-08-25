import { RATING_MAX, RATING_MIN, type Answer, type Rating } from '@secret-dj/common';
import { useT } from '../i18n';

interface AnswerBarProps {
    answer: Answer;
    disabled?: boolean;
    onAnswer: (patch: Partial<Answer>) => void;
}

const LIKES = [0, 1, 2, 3, 4, 5] as const satisfies readonly Rating[];

/**
 * The four things a listener says about a track.
 *
 * The like comes first and is a radiogroup, because it is the one answer that
 * has an order to it — and because it is the signature: until it is given, the
 * three toggles below count for nothing at all. The toggles are deliberately
 * plain statements of fact rather than opinions dressed up as scoring buttons;
 * the game only works if people answer them honestly, and phrasing them as bets
 * would invite people to play them as bets.
 */
export function AnswerBar({ answer, disabled, onAnswer }: AnswerBarProps) {
    const t = useT();
    const like = answer.like;

    const toggles = [
        { key: 'heard', label: t.answer.heard, hint: t.answer.heardHint },
        { key: 'popular', label: t.answer.popular, hint: t.answer.popularHint },
        { key: 'moved', label: t.answer.moved, hint: t.answer.movedHint },
    ] as const;

    return (
        // One block, laid out top to bottom by itself. Returning the scale, the
        // toggles and the note as three loose siblings put them on one line of
        // the parent's flex row, where they jammed together and wrapped at
        // whatever point the container happened to run out.
        <div className="answer">
            <div className="rate" role="radiogroup" aria-label={t.answer.likeTitle}>
                <span className="rate__slot">
                    <span className="rate__stars">
                        {LIKES.map(value => (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={like === value}
                                className={`rate__key${like !== undefined && value <= like && value > 0 ? ' is-lit' : ''}${like === value ? ' is-active' : ''}`}
                                disabled={disabled}
                                onClick={() => onAnswer({ like: value })}
                            >
                                <span aria-hidden="true">{value}</span>
                                <span className="visually-hidden">{t.answer.likeValue(value)}</span>
                            </button>
                        ))}
                    </span>
                    {/* The word for the number, once there is one. The prompt
                        to pick one lives in the note below, so it is not said
                        twice in three lines. */}
                    <span className="rate__caption">{like === undefined ? '' : t.answer.verdicts[like]}</span>
                </span>
            </div>

            <div className="bets">
                {toggles.map(toggle => {
                    const on = answer[toggle.key];
                    return (
                        <button
                            key={toggle.key}
                            type="button"
                            className={`chip chip--answer${on ? ' is-active' : ''}`}
                            aria-pressed={on}
                            disabled={disabled}
                            title={toggle.hint}
                            onClick={() => onAnswer({ [toggle.key]: !on })}
                        >
                            {toggle.label}
                            {/* The word, not just the fill: a toggle whose only
                                state is a colour is a toggle nobody can read in
                                greyscale, or from four feet away. */}
                            <span className="chip__state num">{on ? t.answer.yes : t.answer.no}</span>
                        </button>
                    );
                })}
            </div>

            {/* Only says something while something is missing. The house rule
                about answering honestly lives in Rules; repeating it under
                every track turns it into wallpaper. */}
            {like === undefined && <p className="answer__note">{t.answer.unsigned}</p>}
        </div>
    );
}

/** Guards the six buttons against the shared scale drifting underneath them. */
export const LIKE_RANGE_OK = LIKES[0] === RATING_MIN && LIKES[LIKES.length - 1] === RATING_MAX;
