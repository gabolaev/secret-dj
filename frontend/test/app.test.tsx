// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { GameView, PublicPlayer, Result, RoundView, Session } from '@secret-dj/common';

/**
 * Screen-selection and localisation tests.
 *
 * v1's App component could reach a state where it was "in a game" with no game
 * state, and rendered a second, copy-pasted join form to cope. These tests pin
 * down that every reachable state maps to exactly one screen — and that the
 * whole UI switches language without a reload.
 */

type Handler = (...args: unknown[]) => void;

const listeners = new Map<string, Set<Handler>>();
const sent: Array<{ event: string; payload: unknown }> = [];
let nextResult: Result<Record<string, unknown>> = { ok: true };

const fakeSocket = {
    connected: true,
    on: (event: string, handler: Handler) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(handler);
    },
    off: (event: string, handler: Handler) => listeners.get(event)?.delete(handler),
};

function emitToClient(event: string, payload: unknown): void {
    for (const handler of listeners.get(event) ?? []) handler(payload);
}

vi.mock('../src/lib/socket', () => ({
    getSocket: () => fakeSocket,
    request: (event: string, payload: unknown) => {
        sent.push({ event, payload });
        return Promise.resolve(nextResult);
    },
}));

/**
 * Node 26 ships a native `localStorage` that is disabled without
 * `--localstorage-file`, and it shadows the one jsdom provides. An in-memory
 * stub keeps the test independent of the runtime either way.
 */
function installLocalStorage(): void {
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => void store.set(key, String(value)),
            removeItem: (key: string) => void store.delete(key),
            clear: () => store.clear(),
            key: (index: number) => [...store.keys()][index] ?? null,
            get length() {
                return store.size;
            },
        },
    });
}

const SESSION: Session = { gameId: 'K7QM2', playerId: 'p1', token: 'secret', name: 'Ana' };

function player(overrides: Partial<PublicPlayer> & Pick<PublicPlayer, 'id' | 'name'>): PublicPlayer {
    return {
        isHost: false,
        presence: 'online',
        submitted: 3,
        ready: true,
        scores: { selector: 0, detective: 0 },
        ...overrides,
    };
}

function round(overrides: Partial<RoundView> = {}): RoundView {
    return {
        number: 2,
        total: 4,
        track: {
            id: 't9',
            url: 'https://open.spotify.com/track/xyz',
            title: 'Smalltown Boy',
            service: 'Spotify',
            metadata: 'ready',
        },
        isMine: false,
        myReaction: 'none',
        heartCount: 3,
        anthemCount: 0,
        votesIn: 1,
        votersExpected: 2,
        canVote: true,
        canReact: true,
        ...overrides,
    };
}

function lobbyView(overrides: Partial<GameView> = {}): GameView {
    return {
        id: 'K7QM2',
        phase: 'lobby',
        settings: { tracksPerPlayer: 3, tracksPlayedPerPlayer: 2, guessingEnabled: true },
        players: [
            player({ id: 'p1', name: 'Ana', isHost: true, submitted: 2, ready: false }),
            player({ id: 'p2', name: 'Bo' }),
        ],
        you: {
            id: 'p1',
            name: 'Ana',
            isHost: true,
            tracks: [
                {
                    id: 't1',
                    url: 'https://open.spotify.com/track/abc',
                    title: 'Blue Monday',
                    artist: 'New Order',
                    service: 'Spotify',
                    metadata: 'ready',
                },
            ],
            wallet: { heartsLeft: 4, heartBudget: 5, anthemSpent: false },
        },
        history: [],
        setlistLength: 0,
        now: Date.now(),
        ...overrides,
    };
}

async function importApp() {
    const module = await import('../src/App');
    return module.default;
}

beforeEach(() => {
    listeners.clear();
    sent.length = 0;
    nextResult = { ok: true };
    installLocalStorage();
    window.location.hash = '';
    vi.resetModules();
});

afterEach(cleanup);

describe('screen selection', () => {
    it('shows the join screen when there is no session', async () => {
        const App = await importApp();
        render(<App />);
        expect(screen.getByPlaceholderText('DJ Nightshift')).toBeTruthy();
        expect(screen.getByRole('button', { name: /start a new room/i })).toBeTruthy();
    });

    it('renders exactly one join form (v1 rendered two)', async () => {
        const App = await importApp();
        render(<App />);
        expect(screen.getAllByPlaceholderText('DJ Nightshift')).toHaveLength(1);
    });

    it('prefills the room code from the URL fragment', async () => {
        window.location.hash = '#K7QM2';
        const App = await importApp();
        render(<App />);
        expect(screen.getByPlaceholderText('e.g. K7QM2').getAttribute('value')).toBe('K7QM2');
    });

    it('does not strand the player when a stored session is rejected', async () => {
        window.localStorage.setItem('secret-dj/session/v2', JSON.stringify(SESSION));
        nextResult = { ok: false, code: 'GAME_NOT_FOUND', message: 'gone' };

        const App = await importApp();
        render(<App />);

        await waitFor(() => expect(screen.getByPlaceholderText('DJ Nightshift')).toBeTruthy());
        expect(sent.some(message => message.event === 'game:resume')).toBe(true);
        expect(window.localStorage.getItem('secret-dj/session/v2')).toBeNull();
    });
});

describe('language', () => {
    it('switches the whole UI without a reload', async () => {
        const App = await importApp();
        render(<App />);
        expect(screen.getByRole('button', { name: /start a new room/i })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'RU' }));

        expect(screen.getByRole('button', { name: 'Создать комнату' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /start a new room/i })).toBeNull();
        expect(document.documentElement.lang).toBe('ru');
    });

    it('remembers the choice', async () => {
        const App = await importApp();
        const first = render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'RU' }));
        first.unmount();

        vi.resetModules();
        const AppAgain = await importApp();
        render(<AppAgain />);
        expect(screen.getByRole('button', { name: 'Создать комнату' })).toBeTruthy();
    });

    it('follows the browser when nothing is stored', async () => {
        Object.defineProperty(window.navigator, 'language', { configurable: true, value: 'ru-RU' });
        const App = await importApp();
        render(<App />);
        expect(screen.getByRole('button', { name: 'Создать комнату' })).toBeTruthy();
        Object.defineProperty(window.navigator, 'language', { configurable: true, value: 'en-US' });
    });
});

describe('in-game screens', () => {
    async function mountWith(view: GameView) {
        window.localStorage.setItem('secret-dj/session/v2', JSON.stringify(SESSION));
        const App = await importApp();
        const result = render(<App />);
        await waitFor(() => expect(sent.some(m => m.event === 'game:resume')).toBe(true));
        emitToClient('game:state', view);
        return result;
    }

    it('renders the lobby with the room code and your own queue', async () => {
        await mountWith(lobbyView());
        await waitFor(() => expect(screen.getByText('K7QM2')).toBeTruthy());
        expect(screen.getByText(/Queue 2 more tracks/i)).toBeTruthy();
        expect(screen.getByText('Blue Monday — New Order')).toBeTruthy();
        expect(screen.getByRole('button', { name: /start the night/i })).toBeTruthy();
        // Both setlist knobs are exposed to the host.
        expect(screen.getByText(/Tracks each DJ queues/i)).toBeTruthy();
        expect(screen.getByText(/How many actually play/i)).toBeTruthy();
    });

    it('offers guessing and the heart wallet during a round', async () => {
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));

        await waitFor(() => expect(screen.getByRole('group', { name: 'Whose is it?' })).toBeTruthy());
        expect(screen.getByText('Track 2 of 4')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Bo/ })).toBeTruthy();
        // Scarcity has to be visible, or it is not a decision.
        expect(screen.getByLabelText('4 of 5 hearts left')).toBeTruthy();
        expect(screen.getByRole('radio', { name: /Anthem/ })).toBeTruthy();
    });

    it('blocks the anthem once it is spent', async () => {
        await mountWith(
            lobbyView({
                phase: 'listening',
                setlistLength: 4,
                round: round(),
                you: { ...lobbyView().you, wallet: { heartsLeft: 0, heartBudget: 5, anthemSpent: true } },
            }),
        );

        await waitFor(() => expect(screen.getByLabelText('0 of 5 hearts left')).toBeTruthy());
        expect(screen.getByRole('radio', { name: /Anthem/ }).hasAttribute('disabled')).toBe(true);
        expect(screen.getByRole('radio', { name: /Heart/ }).hasAttribute('disabled')).toBe(true);
        expect(screen.getByTitle('Anthem already spent')).toBeTruthy();
    });

    it('never marks another player as done, at any point in the round', async () => {
        // The reported bug: at round start the DJ was the only player already
        // showing as decided, which gave them away before a note had played.
        for (const [label, votesIn] of [['fresh', 0], ['partway', 1], ['complete', 2]] as const) {
            cleanup();
            await mountWith(
                lobbyView({
                    phase: 'listening',
                    setlistLength: 4,
                    round: round({ votesIn, votersExpected: 2 }),
                    players: [
                        player({ id: 'p1', name: 'Ana', isHost: true }),
                        player({ id: 'p2', name: 'Bo' }),
                        player({ id: 'p3', name: 'Cy' }),
                    ],
                }),
            );

            await waitFor(() => expect(screen.getByRole('group', { name: 'Whose is it?' })).toBeTruthy());
            const roster = document.querySelector('.roster')!;
            const rows = [...roster.querySelectorAll('.roster__row')];

            for (const row of rows) {
                const isYou = row.textContent?.includes('you');
                const status = row.querySelector('.roster__status')?.textContent ?? '';
                // Only the viewer's own row may carry a round status.
                if (!isYou) expect(status, `${label}: ${row.textContent}`).toBe('');
            }
        }
    });

    it('gives the DJ a decoy instead of a vote', async () => {
        await mountWith(
            lobbyView({
                phase: 'listening',
                setlistLength: 4,
                round: round({ isMine: true, canVote: false, canReact: false }),
            }),
        );

        await waitFor(() => expect(screen.getByRole('group', { name: 'Blame' })).toBeTruthy());
        // The DJ can no longer be idle: no vote, no hearts, but a decoy to set.
        expect(screen.queryByRole('group', { name: 'Whose is it?' })).toBeNull();
        expect(screen.queryByRole('radio', { name: /Heart/ })).toBeNull();
        expect(screen.getByText(/Yours/)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Bo/ })).toBeTruthy();
    });

    it('renders both scoreboards and the awards at the finale', async () => {
        await mountWith(
            lobbyView({
                phase: 'finished',
                setlistLength: 2,
                players: [
                    player({ id: 'p1', name: 'Ana', isHost: true, scores: { selector: 1, detective: 4 } }),
                    player({ id: 'p2', name: 'Bo', scores: { selector: 7, detective: 0 } }),
                ],
                awards: [
                    { id: 'crowd-favourite', winners: ['p2'], value: 7 },
                    { id: 'puppet-master', winners: ['p1'], value: 3 },
                ],
                history: [
                    {
                        number: 1,
                        track: {
                            id: 't1',
                            url: 'https://open.spotify.com/track/abc',
                            title: 'Blue Monday',
                            service: 'Spotify',
                            metadata: 'ready',
                        },
                        djId: 'p2',
                        heartedBy: ['p1'],
                        anthemBy: [],
                        votes: [{ voterId: 'p1', guessId: 'p2', correct: true, fooled: false }],
                    },
                ],
                unplayed: [
                    {
                        track: {
                            id: 't5',
                            url: 'https://open.spotify.com/track/def',
                            title: 'Temptation',
                            service: 'Spotify',
                            metadata: 'ready',
                        },
                        djId: 'p1',
                    },
                ],
            }),
        );

        await waitFor(() => expect(screen.getByText('Crowd Favourite')).toBeTruthy());
        expect(screen.getByText('7 points')).toBeTruthy();
        expect(screen.getByText('Puppet Master')).toBeTruthy();

        // Each board ranks by its own number, not a merged total.
        const selector = screen.getByText('Selector').closest('section')!;
        expect(within(selector).getAllByRole('listitem')[0].textContent).toContain('Bo');
        const detective = screen.getByText('Detective').closest('section')!;
        expect(within(detective).getAllByRole('listitem')[0].textContent).toContain('Ana');

        // Queueing more than plays only pays off if you find out what you sat on.
        expect(screen.getByText('The ones that got away')).toBeTruthy();
        expect(screen.getByText('Temptation')).toBeTruthy();
    });
});
