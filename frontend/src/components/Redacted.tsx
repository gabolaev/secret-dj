import type { ReactNode } from 'react';

interface RedactedProps {
    /** False while the secret is withheld; true once the page stops covering it. */
    open: boolean;
    /** The legend printed on the bar itself, e.g. "SEALED UNTIL THE REVEAL". */
    legend?: string;
    /** A second legend, pushed to the right-hand end of the bar. */
    endLegend?: string;
    className?: string;
    children: ReactNode;
}

/**
 * The one rendering mode this design is built around.
 *
 * A secret occupies exactly the space it will occupy when it is told. The
 * children are laid out at full size and an absolutely-positioned sibling is
 * painted over them; at the reveal that cover is wiped away left to right and
 * the content underneath was there the whole time. Nothing reflows, nothing
 * appears from nowhere — the page just stops covering things up. That is what
 * makes *withheld* look different from *absent*, which is the whole job.
 *
 * Two rules this component cannot enforce on its own, and which every caller
 * has to keep:
 *
 * 1. **Never hide a secret the client should not have.** The server withholds
 *    other people's answers, the DJ's identity and their claim until the
 *    reveal, and it must keep doing so. Where the content genuinely has not
 *    arrived, pass geometry — a row of the right height with nothing in it —
 *    rather than the real value with a bar on top. The cover is a rendering of
 *    information the browser does not have, never a CSS blindfold over
 *    information it does.
 *
 * 2. **Do not swap a placeholder for the content.** The no-reflow promise *is*
 *    the direction; a bar that resizes when it lifts is a different, worse
 *    idea that happens to use the same colour.
 *
 * The wipe is the only thing in the product that animates. Under
 * `prefers-reduced-motion` it becomes a cut and the reveal is identical,
 * because the end state plus its label carries everything the movement did.
 */
export function Redacted({ open, legend, endLegend, className, children }: RedactedProps) {
    return (
        <div className={`redact${className ? ` ${className}` : ''}`} data-open={open}>
            {children}
            {/* Left in the tree once open so the wipe has something to animate,
                and inert either way: it is paint, not content. */}
            <div className="redact__cover" aria-hidden="true">
                {legend && <span className="redact__legend">{legend}</span>}
                {endLegend && <span className="redact__legend redact__legend--end">{endLegend}</span>}
            </div>
        </div>
    );
}

/**
 * Geometry for a secret that has not arrived yet.
 *
 * Holds one line of the given type size open so a sealed row is exactly as
 * tall as the row it becomes. Empty to the accessibility tree — the sealed
 * state is announced once, by the block's own label ("ANSWERS SEALED — 6 OF
 * 8"), rather than six times by six blank rows.
 */
export function Placeholder({ width, size = 'base' }: { width: string; size?: 'micro' | 'base' | 'fig' }) {
    return (
        <span className={`placeholder placeholder--${size}`} style={{ width }} aria-hidden="true" />
    );
}
