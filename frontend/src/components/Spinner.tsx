import { useT } from '../i18n';

interface SpinnerProps {
    label?: string;
}

export function Spinner({ label }: SpinnerProps) {
    const t = useT();
    return (
        <span className="spinner" role="status" aria-live="polite">
            <span className="spinner__ring" aria-hidden="true" />
            {label ? <span>{label}</span> : <span className="visually-hidden">{t.common.loading}</span>}
        </span>
    );
}
