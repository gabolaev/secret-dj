import { useEffect, useRef } from 'react';
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
                        <button type="button" className="win__btn" onClick={onClose} aria-label={t.common.close}>
                            ✕
                        </button>
                    </div>
                </header>

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

                <p className="sheet__note">{t.rules.note}</p>
            </article>
        </dialog>
    );
}
