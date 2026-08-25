interface LogoProps {
    /** `bar` sits in the header; `hero` is the join screen. */
    size?: 'bar' | 'hero';
    className?: string;
}

/**
 * The wordmark, and nothing else.
 *
 * There used to be a drawn record-deck mark beside it. It was doing the work a
 * logo does on a product page and none of the work a name does in a bar: at
 * 26px it read as a smudge, and next to an interface made entirely of engraved
 * uppercase labels it was the one illustrated thing on screen.
 *
 * So the name is the mark. Set the way the case of an instrument is stamped —
 * uppercase, widely tracked, with the second word in the one colour — it needs
 * no drawing to be recognisable.
 */
export function Logo({ size = 'bar', className }: LogoProps) {
    return (
        <span className={`logo logo--${size}${className ? ` ${className}` : ''}`}>
            Secret
            {/* A real space, so the name is read and copied as two words — but
                carrying no width, because the mark is one stamped token and the
                interpunct is what separates the halves. Left in the text rather
                than removed and faked, so `textContent` stays "Secret DJ".
                Without this the tracked space sat on the left of the dot only,
                and the mark read as "SECRET ·DJ". */}
            <span className="logo__space"> </span>
            <em>DJ</em>
        </span>
    );
}
