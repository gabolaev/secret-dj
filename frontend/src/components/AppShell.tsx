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

/**
 * One printed bar, then the two-column body.
 *
 * The bar carries what is true of the whole room rather than of one screen:
 * the name, the code, who is in, where we are in the setlist, and how long is
 * left. The counters used to sit in a panel header inside the round; they read
 * better up here, where the eye already goes for context, and it leaves the
 * round itself as nothing but the thing being withheld and the thing you say
 * about it.
 *
 * The room code stays on the bar because it is the one string people read out
 * loud to each other; clicking it copies the invite link.
 */
export function AppShell({ view, connection, onLeave, onShowRules, sidebar, children }: AppShellProps) {
    const t = useT();
    const [copied, setCopied] = useState(false);

    const round = view.round;
    // Above any early return: a hook cannot be called conditionally, and there
    // is no round to count down between tracks anyway.
    const secondsLeft = useCountdown(round?.endsAt ?? 0, view.now);
    const overtime = secondsLeft < 0;

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

    const present = view.players.filter(player => player.presence === 'online').length;
    const away = view.players.length - present;
    const counting = round && view.phase !== 'reveal';

    return (
        <div className="shell">
            <header className="shell__bar">
                <Logo className="shell__logo" />

                {/* The room block carries the connection itself, rather than a
                    separate dot beside it: it is already the thing you look at,
                    and one element saying one thing beats two. */}
                <button
                    type="button"
                    className={`shell__code shell__code--${connection}`}
                    onClick={copyInvite}
                    title={t.shell.copyInvite}
                >
                    <span className="shell__code-value">{copied ? t.shell.copied : view.id}</span>
                    <span className="visually-hidden" role="status">
                        {t.shell[connection === 'online' ? 'live' : connection]}
                    </span>
                </button>

                <span className="shell__room num">
                    {t.round.inRoom(present)}
                    {away > 0 && ` · ${t.round.onFloor(away)}`}
                </span>

                <span className="shell__spacer" />

                {round && (
                    <span className="shell__position num">{t.round.position(round.number, round.total)}</span>
                )}
                {counting && (
                    <span
                        className={`timer num${overtime ? ' timer--over' : ''}`}
                        role="timer"
                        aria-label={t.round.timeLeft}
                    >
                        {formatCountdown(secondsLeft)}
                    </span>
                )}

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
