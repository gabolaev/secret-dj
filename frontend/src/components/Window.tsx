import type { ReactNode } from 'react';

interface WindowProps {
    title: string;
    children: ReactNode;
    /** Small controls docked at the right of the title bar. */
    actions?: ReactNode;
    className?: string;
    /** Set when the body supplies its own padding (e.g. a full-bleed list). */
    flush?: boolean;
}

/**
 * A window: bevelled steel frame, hatched title bar with a tiny centred
 * caption. Every panel in the app is one of these, which is what keeps the
 * skin coherent without each screen inventing its own container.
 */
export function Window({ title, children, actions, className, flush }: WindowProps) {
    return (
        <section className={`win${className ? ` ${className}` : ''}`}>
            <header className="win__bar">
                <span className="win__grip" aria-hidden="true" />
                <h2 className="win__title">{title}</h2>
                <span className="win__grip" aria-hidden="true" />
                {actions}
            </header>
            <div className="win__body" style={flush ? { padding: 0 } : undefined}>
                {children}
            </div>
        </section>
    );
}
