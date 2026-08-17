interface LogoMarkProps {
    size?: number;
    className?: string;
}

/**
 * The mark: a record on a deck, seen from above.
 *
 * Constraints it has to satisfy, which is why it is drawn rather than typed:
 *  - legible at 22px in the bar and at 54px on the join screen;
 *  - carries its own contrast, so it can never vanish into a background the
 *    way the old pale-text wordmark did;
 *  - the label is the accent, so the mark ties to the rest of the palette;
 *  - no lettering, so it never needs translating.
 *
 * The tonearm is what makes it read as a *deck* rather than a generic disc at
 * small sizes — without it this is just concentric circles.
 */
export function LogoMark({ size = 24, className }: LogoMarkProps) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            focusable="false"
        >
            {/* Platter. */}
            <circle cx="14.5" cy="17.5" r="12" fill="#0d1119" stroke="currentColor" strokeOpacity="0.28" />

            {/* Grooves. */}
            <circle cx="14.5" cy="17.5" r="8.8" stroke="currentColor" strokeOpacity="0.22" />
            <circle cx="14.5" cy="17.5" r="6.4" stroke="currentColor" strokeOpacity="0.14" />

            {/* Label and spindle. */}
            <circle cx="14.5" cy="17.5" r="4.2" fill="var(--accent, #ffb545)" />
            <circle cx="14.5" cy="17.5" r="0.9" fill="#0d1119" />

            {/* Tonearm, down on the record. */}
            <path
                d="M26.4 6.6 L19.4 13.4"
                stroke="currentColor"
                strokeOpacity="0.75"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <circle cx="26.4" cy="6.6" r="2.3" fill="#0d1119" stroke="currentColor" strokeOpacity="0.55" />
            <circle cx="18.8" cy="14" r="1.7" fill="var(--accent, #ffb545)" />
        </svg>
    );
}

interface LogoProps {
    size?: number;
    /** Renders the wordmark beside the mark. */
    wordmark?: boolean;
    className?: string;
}

/**
 * Mark plus wordmark. The wordmark is real text rather than paths so it stays
 * crisp at any size, can be selected, and scales with the mark.
 */
export function Logo({ size = 24, wordmark = true, className }: LogoProps) {
    return (
        <span className={`logo${className ? ` ${className}` : ''}`} style={{ ['--logo-size' as string]: `${size}px` }}>
            <LogoMark size={size} className="logo__mark" />
            {wordmark && (
                <span className="logo__word">
                    Secret<em>DJ</em>
                </span>
            )}
        </span>
    );
}
