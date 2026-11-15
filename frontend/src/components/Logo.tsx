interface LogoProps {
    /** `bar` sits in the header; `hero` is the join screen. */
    size?: 'bar' | 'hero';
    className?: string;
}

export function Logo({ size = 'bar', className }: LogoProps) {
    return (
        <span className={`logo logo--${size}${className ? ` ${className}` : ''}`}>
            Secret <em>DJ</em>
        </span>
    );
}
