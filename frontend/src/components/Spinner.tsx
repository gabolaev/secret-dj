import { useT } from '../i18n';

interface SpinnerProps {
    label?: string;
}

/** A record spinning. It is a music game; the loader should earn its keep. */
export function Spinner({ label }: SpinnerProps) {
    const t = useT();
    return (
        <span className="spinner" role="status" aria-live="polite">
            <span className="spinner__disc" aria-hidden="true" />
            {label ? <span className="spinner__label">{label}</span> : <span className="visually-hidden">{t.common.loading}</span>}
        </span>
    );
}
