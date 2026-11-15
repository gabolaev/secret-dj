import { RATING_MAX, RATING_MIN, type Answer, type Rating } from '@secret-dj/common';
import { useT } from '../i18n';

interface AnswerBarProps {
    answer: Answer;
    disabled?: boolean;
    onAnswer: (patch: Partial<Answer>) => void;
}

const LIKES = [0, 1, 2, 3, 4, 5] as const satisfies readonly Rating[];

/**
 * The rating, then three yes/no facts about the track. The rating signs the
 * answer: until it is picked, the toggles count for nothing.
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
        <div className="answer">
            <div className="answer__head">
                <h3 className="answer__title">{t.answer.likeTitle}</h3>
                <span className="answer__verdict">{like === undefined ? '' : t.answer.verdicts[like]}</span>
            </div>

            <div className="rate" role="radiogroup" aria-label={t.answer.likeTitle}>
                {LIKES.map(value => (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={like === value}
                        className={`rate__key num${like === value ? ' is-active' : ''}`}
                        disabled={disabled}
                        onClick={() => onAnswer({ like: value })}
                    >
                        <span aria-hidden="true">{value}</span>
                        <span className="visually-hidden">{t.answer.likeValue(value)}</span>
                    </button>
                ))}
            </div>

            <div className="toggles">
                {toggles.map(toggle => {
                    const on = answer[toggle.key];
                    return (
                        <button
                            key={toggle.key}
                            type="button"
                            className={`chip${on ? ' is-active' : ''}`}
                            aria-pressed={on}
                            disabled={disabled}
                            title={toggle.hint}
                            onClick={() => onAnswer({ [toggle.key]: !on })}
                        >
                            <span className="chip__check" aria-hidden="true">
                                {on ? '✓' : '+'}
                            </span>
                            {toggle.label}
                        </button>
                    );
                })}
            </div>

            {like === undefined && <p className="answer__note">{t.answer.unsigned}</p>}
        </div>
    );
}

/** Guards the six buttons against the shared scale drifting underneath them. */
export const LIKE_RANGE_OK = LIKES[0] === RATING_MIN && LIKES[LIKES.length - 1] === RATING_MAX;
