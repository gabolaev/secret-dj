import type { ReactNode } from 'react';

interface BlockProps {
    /** Section heading. Omitted when the body announces itself. */
    label?: string;
    /** Right-aligned beside the heading, usually a count. */
    count?: ReactNode;
    className?: string;
    children: ReactNode;
}

export function Block({ label, count, className, children }: BlockProps) {
    return (
        <section className={`block${className ? ` ${className}` : ''}`}>
            {label && (
                <header className="block__head">
                    <h2 className="block__title">{label}</h2>
                    {count !== undefined && count !== null && <span className="block__aside">{count}</span>}
                </header>
            )}
            {children}
        </section>
    );
}
