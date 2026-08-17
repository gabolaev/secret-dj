import { useEffect, useState, type ReactNode } from 'react';
import type { GameView } from '@secret-dj/common';
import { LocaleToggle } from './LocaleToggle';
import { Logo } from './Logo';
import { useT } from '../i18n';

interface AppShellProps {
    view: GameView;
    connection: 'connecting' | 'online' | 'offline';
    onLeave: () => void;
    onShowRules: () => void;
    sidebar: ReactNode;
    children: ReactNode;
}

/**
 * One slim bar, then the two-column body.
 *
 * Everything in the bar is inline. There were three dropdown menus here, each
 * containing exactly one item — a menu that opens to reveal a single button is
 * just a button with an extra click in front of it.
 *
 * The room code stays on the bar because it is the one string people read out
 * loud to each other; clicking it copies the invite link.
 */
export function AppShell({ view, connection, onLeave, onShowRules, sidebar, children }: AppShellProps) {
    const t = useT();
    const [copied, setCopied] = useState(false);

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
            // Clipboard blocked (insecure context, denied permission): show the
            // link so it can be copied by hand rather than failing silently.
            window.prompt(t.shell.copyPrompt, shareLink);
        }
    };

    return (
        <div className="shell">
            <header className="shell__bar">
                <Logo size={22} className="shell__logo" />

                <button type="button" className="shell__code" onClick={copyInvite} title={t.shell.copyInvite}>
                    <span className="shell__code-label">{t.shell.room}</span>
                    <span className="shell__code-value">{copied ? t.shell.copied : view.id}</span>
                </button>

                <span
                    className={`dot dot--${connection}`}
                    role="status"
                    aria-label={t.shell[connection === 'online' ? 'live' : connection]}
                />

                <span className="shell__spacer" />

                <LocaleToggle />
                <button type="button" className="button button--ghost" onClick={onShowRules}>
                    {t.shell.rules}
                </button>
                <button type="button" className="button button--ghost shell__leave" onClick={onLeave}>
                    {t.shell.leave}
                </button>
            </header>

            <main className="shell__body">
                <section className="shell__main">{children}</section>
                <aside className="shell__side">{sidebar}</aside>
            </main>
        </div>
    );
}
