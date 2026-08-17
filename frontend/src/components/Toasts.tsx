import type { Notice } from '../hooks/useSecretDj';

interface ToastsProps {
    notices: Notice[];
    onDismiss: (id: number) => void;
}

export function Toasts({ notices, onDismiss }: ToastsProps) {
    if (notices.length === 0) return null;
    return (
        <div className="toasts" role="status" aria-live="polite">
            {notices.map(notice => (
                <button
                    key={notice.id}
                    type="button"
                    className={`toast toast--${notice.tone}`}
                    onClick={() => onDismiss(notice.id)}
                    title="Dismiss"
                >
                    {notice.message}
                </button>
            ))}
        </div>
    );
}
