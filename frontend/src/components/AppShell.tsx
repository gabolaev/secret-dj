import { useEffect, useState, type ReactNode } from 'react';
import type { GameView } from '@secret-dj/common';
import { LocaleToggle } from './LocaleToggle';
import { Logo } from './Logo';
import { formatCountdown, useCountdown } from '../hooks/useCountdown';
import { useT } from '../i18n';

interface AppShellProps {
    view: GameView;
    connection: 'connecting' | 'online' | 'offline';
    onLeave: () => void;
    onShowRules: () => void;
    sidebar: ReactNode;
    children: ReactNode;
}

export function AppShell({ view, connection, onLeave, onShowRules, sidebar, children }: AppShellProps) {
    const t = useT();
    const [copied, setCopied] = useState(false);

    const round = view.round;
    // Called unconditionally: hooks cannot sit behind the `round &&` below.
    const secondsLeft = useCountdown(round?.endsAt ?? 0, view.now);
    const overtime = secondsLeft < 0;
    const counting = round && view.phase !== 'reveal';

    useEffect(() => {
        if (!copied) return;
        const timer = window.setTimeout(() => setCopied(false), 1600);
        return () => window.clearTimeout(timer);
    }, [copied]);

    const shareLink = `${window.location.origin}${window.location.pathname}#${view.id}`;

    const copyInvite = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
        } catch {
            // Clipboard blocked: show the link so it can be copied by hand.
            window.prompt(t.shell.copyPrompt, shareLink);
        }
    };

    return (
        <div className="shell">
            <header className="shell__bar">
                <Logo />

                <button
                    type="button"
                    className={`room-code room-code--${connection}`}
                    onClick={copyInvite}
                    title={t.shell.copyInvite}
                >
                    <span className="room-code__dot" aria-hidden="true" />
                    <span className="room-code__value num">{copied ? t.shell.copied : view.id}</span>
                    <span className="visually-hidden" role="status">
                        {t.shell[connection === 'online' ? 'live' : connection]}
                    </span>
                </button>

                <span className="shell__spacer" />

                {round && (
                    <span className="shell__progress num">
                        <span className="shell__position">{t.round.position(round.number, round.total)}</span>
                        <span className="shell__position shell__position--short" aria-hidden="true">
                            {round.number}/{round.total}
                        </span>
                        {counting && (
                            <span
                                className={`timer${overtime ? ' timer--over' : ''}`}
                                role="timer"
                                aria-label={t.round.timeLeft}
                            >
                                {formatCountdown(secondsLeft)}
                            </span>
                        )}
                    </span>
                )}

                <nav className="shell__menu">
                    <LocaleToggle />
                    {/* On a phone these collapse to icons; the aria-label keeps the name. */}
                    <button
                        type="button"
                        className="button button--ghost shell__action"
                        onClick={onShowRules}
                        aria-label={t.shell.rules}
                        title={t.shell.rules}
                    >
                        <span className="shell__action-label">{t.shell.rules}</span>
                        <svg className="shell__icon" viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.3M12 16.8v.2" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="button button--ghost shell__action"
                        onClick={onLeave}
                        aria-label={t.shell.leave}
                        title={t.shell.leave}
                    >
                        <span className="shell__action-label">{t.shell.leave}</span>
                        <svg className="shell__icon" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />
                        </svg>
                    </button>
                </nav>
            </header>

            <main className="shell__body">
                <section className="shell__main">{children}</section>
                <aside className="shell__side">{sidebar}</aside>
            </main>
        </div>
    );
}
