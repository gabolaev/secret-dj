import type { ReactNode } from 'react';

interface BlockProps {
    /** The mono legend above the block. Omitted when the body announces itself. */
    label?: string;
    /** A second legend on the right-hand end of the rule, usually a count. */
    count?: ReactNode;
    className?: string;
    children: ReactNode;
}

/**
 * A titled section of the page.
 *
 * This replaces the window chrome the previous skin used everywhere. There is
 * no frame, no title bar and no body padding: a block is a silkscreened legend
 * with a hairline running out of it, and then the thing itself. Depth in this
 * design is one hairline and one fill inversion, so a container that draws a
 * second border around content that already has one is just a doubled rule.
 *
 * The legend is the only tracked type in the product and it is always
 * uppercase mono — never a sentence, because tracked-out Cyrillic prose is
 * what made the last skin unreadable.
 */
export function Block({ label, count, className, children }: BlockProps) {
    return (
        <section className={`block${className ? ` ${className}` : ''}`}>
            {label && (
                <h2 className="label">
                    {label}
                    {count !== undefined && count !== null && <span className="label__count">{count}</span>}
                </h2>
            )}
            {children}
        </section>
    );
}
