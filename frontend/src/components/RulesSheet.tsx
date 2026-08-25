import { useEffect, useRef } from 'react';
import { CLAIMS } from '@secret-dj/common';
import { useT } from '../i18n';
import { LocaleToggle } from './LocaleToggle';

interface RulesSheetProps {
    open: boolean;
    onClose: () => void;
}

/**
 * House rules, in a real `<dialog>` so focus trapping, Escape and the backdrop
 * come from the platform instead of from hand-rolled key handlers.
 */
export function RulesSheet({ open, onClose }: RulesSheetProps) {
    const t = useT();
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            className="sheet"
            ref={ref}
            onClose={onClose}
            onClick={event => {
                if (event.target === ref.current) onClose();
            }}
        >
            <article className="sheet__body">
                <header className="sheet__header">
                    <h2>{t.rules.title}</h2>
                    <div className="sheet__tools">
                        <LocaleToggle compact />
                        <button type="button" className="button button--ghost" onClick={onClose} aria-label={t.common.close}>
                            ✕
                        </button>
                    </div>
                </header>

                {/* Rule zero, above the numbered list: nothing else in the game
                    works if the answers are not true, and no server can check
                    them. It gets its own frame rather than a bullet. */}
                <p className="sheet__oath">{t.rules.oath}</p>

                <ol className="sheet__list">
                    {t.rules.items.map((item, index) => (
                        <li key={item.head}>
                            <strong>
                                {String(index + 1).padStart(2, '0')}. {item.head}
                            </strong>{' '}
                            {item.body}
                        </li>
                    ))}
                </ol>

                {/* The moves are a list; the arithmetic is a table, because
                    "how many points do I get" is a lookup, not a paragraph. */}
                {/* Driven off the claim registry rather than a second copy of
                    the wording, so a new claim cannot land in the lobby and be
                    missing from the rules. */}
                <h3 className="sheet__subhead">{t.rules.claimsTitle}</h3>
                <p className="sheet__note">{t.rules.claimsBody}</p>
                <ul className="rules-claims">
                    {CLAIMS.filter(claim => claim.id !== 'none').map(claim => (
                        <li key={claim.id}>
                            <strong>{t.claims[claim.id].title}</strong>
                            <span>{t.claims[claim.id].blurb}</span>
                            {(claim.minPlayers > 1 || claim.needsGuessing) && (
                                <em>
                                    {claim.minPlayers > 1
                                        ? t.claims.needsPlayers(claim.minPlayers)
                                        : t.claims.needsGuessing}
                                </em>
                            )}
                        </li>
                    ))}
                </ul>

                {/* What adds up, then what scales it. Two separate ideas, and
                    printing "×0.5" without saying what it multiplies taught
                    nobody anything. */}
                <h3 className="sheet__subhead">{t.rules.scoring.title}</h3>

                <p className="sheet__lead">{t.rules.scoring.addTitle}</p>
                <dl className="scoring">
                    {t.rules.scoring.add.map(line => (
                        <div className="scoring__row" key={line.what}>
                            <dt>{line.what}</dt>
                            <dd>{line.points}</dd>
                        </div>
                    ))}
                </dl>
                <p className="sheet__note">{t.rules.scoring.addNote}</p>

                <p className="sheet__lead">{t.rules.scoring.obviousTitle}</p>
                <p className="sheet__note">{t.rules.scoring.obviousBody}</p>

                <p className="sheet__lead">{t.rules.scoring.claimTitle}</p>
                <p className="sheet__note">{t.rules.scoring.claimBody}</p>

                <dl className="scoring">
                    <div className="scoring__row">
                        <dt>{t.rules.scoring.guessLine.what}</dt>
                        <dd>{t.rules.scoring.guessLine.points}</dd>
                    </div>
                </dl>

                <p className="sheet__example">{t.rules.scoring.example}</p>

                <p className="sheet__note">{t.rules.note}</p>
            </article>
        </dialog>
    );
}
