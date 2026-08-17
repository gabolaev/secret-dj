import type { Reaction, Wallet } from '@secret-dj/common';
import { useT } from '../i18n';

interface ReactionBarProps {
    reaction: Reaction;
    wallet: Wallet;
    disabled?: boolean;
    onReact: (reaction: Reaction) => void;
}

/**
 * Pass / heart / anthem as a segmented control, with the wallet as pips.
 *
 * Modelling this as three exclusive states rather than two toggles is what
 * makes the wallet safe: switching from a heart to your anthem is a single
 * command the server applies atomically.
 *
 * The rules explanation that used to sit here lives in the rules sheet now —
 * it was a paragraph of text repeated on screen every single round.
 */
export function ReactionBar({ reaction, wallet, disabled, onReact }: ReactionBarProps) {
    const t = useT();

    const options: Array<{ value: Reaction; label: string; glyph: string; blocked: boolean; hint?: string }> = [
        { value: 'none', label: t.react.pass, glyph: '·', blocked: false },
        {
            value: 'heart',
            label: t.react.heart,
            glyph: '♥',
            blocked: wallet.heartsLeft <= 0 && reaction !== 'heart',
            hint: t.react.outOfHearts,
        },
        {
            value: 'anthem',
            label: t.react.anthem,
            glyph: '★',
            blocked: wallet.anthemSpent && reaction !== 'anthem',
            hint: t.react.anthemGone,
        },
    ];

    return (
        <>
            <div className="react" role="radiogroup" aria-label={t.react.title}>
                {options.map(option => {
                    const active = reaction === option.value;
                    return (
                        <span className="react__slot" key={option.value}>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={active}
                                className={`knob react__knob react__knob--${option.value}${active ? ' is-active' : ''}`}
                                disabled={disabled || option.blocked}
                                title={option.blocked ? option.hint : undefined}
                                onClick={() => onReact(option.value)}
                            >
                                <span aria-hidden="true">{option.glyph}</span>
                                <span className="visually-hidden">{option.label}</span>
                            </button>
                            <span className="react__caption">{option.label}</span>
                        </span>
                    );
                })}
            </div>

            {/* Spent hearts stay visible as hollow pips: the cost of the next
                one should be obvious without reading a sentence. */}
            <span className="wallet" aria-label={t.react.walletHearts(wallet.heartsLeft, wallet.heartBudget)}>
                <span className="wallet__pips" aria-hidden="true">
                    {Array.from({ length: wallet.heartBudget }, (_, index) => (
                        <i key={index} className={index < wallet.heartsLeft ? 'is-full' : undefined}>
                            ♥
                        </i>
                    ))}
                </span>
                <span className={`wallet__anthem${wallet.anthemSpent ? '' : ' is-left'}`} title={wallet.anthemSpent ? t.react.walletAnthemGone : t.react.walletAnthemLeft}>
                    {wallet.anthemSpent ? '☆' : '★'}
                </span>
            </span>
        </>
    );
}
