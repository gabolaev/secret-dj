import { useEffect, useState } from 'react';
import { useSecretDj } from './hooks/useSecretDj';
import { AppShell } from './components/AppShell';
import { Sidebar } from './components/Sidebar';
import { Toasts } from './components/Toasts';
import { RulesSheet } from './components/RulesSheet';
import { Spinner } from './components/Spinner';
import { JoinScreen } from './screens/JoinScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { RoundScreen } from './screens/RoundScreen';
import { FinaleScreen } from './screens/FinaleScreen';
import { I18nProvider, useT } from './i18n';

/**
 * Screen selection, and nothing else.
 *
 * v1's App component was 1,000 lines that rendered the join form twice —
 * verbatim — because "in a game but with no state yet" was a reachable state it
 * had no other way to handle. Here that state simply doesn't exist: you are
 * either restoring, out of a game, or holding a real `GameView`.
 */
function Game() {
    const t = useT();
    const game = useSecretDj();
    const [rulesOpen, setRulesOpen] = useState(false);
    const { view, lastFeed, notify, session } = game;

    // Turn the room's activity into unobtrusive notices.
    useEffect(() => {
        if (!lastFeed) return;
        switch (lastFeed.kind) {
            case 'player-joined':
                notify('info', t.feed.joined(lastFeed.name));
                break;
            case 'player-left':
                notify('info', t.feed.left(lastFeed.name));
                break;
            case 'host-changed':
                notify('info', t.feed.hostChanged(lastFeed.name));
                break;
            case 'anthem-spent':
                notify('success', t.feed.anthemSpent);
                break;
            case 'game-finished':
                notify('success', t.feed.finished);
                break;
            default:
                break;
        }
    }, [lastFeed, notify, t]);

    const overlay = (
        <>
            <Toasts notices={game.notices} onDismiss={game.dismissNotice} />
            <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
        </>
    );

    if (game.restoring && !view) {
        return (
            <div className="boot">
                <Spinner label={t.join.findingSeat} />
                {overlay}
            </div>
        );
    }

    if (!session || !view) {
        return (
            <>
                <JoinScreen
                    connection={game.connection}
                    onCreate={game.createGame}
                    onJoin={game.joinGame}
                    onShowRules={() => setRulesOpen(true)}
                />
                {overlay}
            </>
        );
    }

    return (
        <>
            <AppShell
                view={view}
                connection={game.connection}
                onLeave={() => void game.leaveGame()}
                onShowRules={() => setRulesOpen(true)}
                sidebar={<Sidebar view={view} />}
            >
                {view.phase === 'lobby' && <LobbyScreen view={view} game={game} />}
                {(view.phase === 'listening' || view.phase === 'tallying' || view.phase === 'reveal') && (
                    <RoundScreen view={view} game={game} />
                )}
                {view.phase === 'finished' && <FinaleScreen view={view} onLeave={() => void game.leaveGame()} />}
            </AppShell>
            {overlay}
        </>
    );
}

export default function App() {
    return (
        <I18nProvider>
            <Game />
        </I18nProvider>
    );
}
