// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CLAIMS } from '@secret-dj/common';
import type { GameView, PublicPlayer, Result, RoundView, Session } from '@secret-dj/common';
import { en } from '../src/i18n/en';

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
        score: 0,
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
            claim: { id: 'none' },
        },
        isMine: false,
        myAnswer: { heard: false, popular: false, moved: false },
        answersIn: 3,
        answersExpected: 3,
        votesIn: 1,
        votersExpected: 2,
        isReady: false,
        canVote: true,
        canAnswer: true,
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
                    claim: { id: 'none' },
                },
            ],
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
    // jsdom ships <dialog> without its modal methods, and the rules sheet uses
    // a real one so focus trapping and Escape come from the platform.
    beforeAll(() => {
        const proto = window.HTMLDialogElement.prototype as unknown as Record<string, unknown>;
        proto.showModal ??= function showModal(this: HTMLDialogElement) {
            this.open = true;
        };
        proto.close ??= function close(this: HTMLDialogElement) {
            this.open = false;
        };
    });

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

    it('offers guessing and the whole answer during a round', async () => {
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));

        await waitFor(() => expect(screen.getByRole('group', { name: 'Whose is it?' })).toBeTruthy());
        expect(screen.getByText('Track 2 of 4')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Bo/ })).toBeTruthy();

        // Zero through five — zero is a real answer, not an abstention.
        for (const value of [0, 1, 2, 3, 4, 5]) {
            expect(screen.getByRole('radio', { name: `${value} out of 5` })).toBeTruthy();
        }
        // ...plus the three things no server could ever check.
        expect(screen.getByRole('button', { name: /Heard it before/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Popular/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /It got to me/ })).toBeTruthy();
    });

    it('does not count an answer until a number signs it', async () => {
        await mountWith(
            lobbyView({
                phase: 'listening',
                setlistLength: 4,
                round: round({ myAnswer: { heard: true, popular: false, moved: true } }),
            }),
        );

        await waitFor(() => expect(screen.getByRole('button', { name: /Heard it before/ })).toBeTruthy());
        expect(screen.getByRole('button', { name: /Heard it before/ }).getAttribute('aria-pressed')).toBe('true');
        // The toggles are on and it still says the answer is not in.
        expect(screen.getByText(/toggles alone do not count/)).toBeTruthy();
    });

    it('lights the scale up to the number you chose', async () => {
        await mountWith(
            lobbyView({
                phase: 'listening',
                setlistLength: 4,
                round: round({ myAnswer: { like: 3, heard: false, popular: false, moved: false } }),
            }),
        );

        await waitFor(() => expect(screen.getByRole('radiogroup', { name: 'How much did you like it?' })).toBeTruthy());
        const lit = [0, 1, 2, 3, 4, 5].map(value =>
            screen.getByRole('radio', { name: `${value} out of 5` }).className.includes('is-lit'),
        );
        expect(lit).toEqual([false, true, true, true, false, false]);
        // The number alone is ambiguous; the phrase is what makes it a verdict.
        expect(screen.getByText('Solid')).toBeTruthy();
    });

    it('hangs a claim picker off every queued track, and opens one at a time', async () => {
        await mountWith(
            lobbyView({
                // Three at the table, so the claims that would give a duo's DJ
                // away are on offer at all.
                players: [
                    player({ id: 'p1', name: 'Ana', isHost: true, submitted: 2, ready: false }),
                    player({ id: 'p2', name: 'Bo' }),
                    player({ id: 'p3', name: 'Cy' }),
                ],
                you: {
                    ...lobbyView().you,
                    tracks: [
                        { ...lobbyView().you.tracks[0] },
                        {
                            id: 't2',
                            url: 'https://open.spotify.com/track/def',
                            title: 'Temptation',
                            service: 'Spotify',
                            metadata: 'ready',
                            claim: { id: 'so-me' },
                        },
                    ],
                },
            }),
        );

        await waitFor(() => expect(screen.getByText('Blue Monday — New Order')).toBeTruthy());
        // Each track wears its current bet; the deck stays closed until asked for.
        expect(screen.getByRole('button', { name: /No claim/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /You will know it was me/ })).toBeTruthy();
        expect(screen.queryByRole('group', { name: 'Your claim' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /No claim/ }));
        await waitFor(() => expect(screen.getByRole('group', { name: 'Your claim' })).toBeTruthy());
        expect(document.querySelectorAll('.claim__deck')).toHaveLength(1);

        // "so me" is spent on the other track, so it cannot be taken twice.
        const deck = document.querySelector('.claim__deck')!;
        const soMe = [...deck.querySelectorAll('.claim__option')].find(option =>
            option.textContent?.includes('You will know it was me'),
        )!;
        expect(soMe.hasAttribute('disabled')).toBe(true);
    });

    it('spells out every claim in the rules, straight from the registry', async () => {
        await mountWith(lobbyView());
        await waitFor(() => expect(screen.getByRole('button', { name: /Rules/ })).toBeTruthy());
        fireEvent.click(screen.getByRole('button', { name: /Rules/ }));

        const sheet = await waitFor(() => document.querySelector('.rules-claims')!);
        const listed = [...sheet.querySelectorAll('strong')].map(node => node.textContent);

        // Every bet a player can make, named and explained — driven off CLAIMS,
        // so a new one cannot ship to the lobby and be missing from the rules.
        expect(listed).toEqual(
            CLAIMS.filter(claim => claim.id !== 'none').map(claim => en.claims[claim.id].title),
        );
        // ...including what a claim needs before the table can play it at all.
        expect(sheet.textContent).toContain('Needs at least 3 players');
    });

    it('greys out the claims this table is too small for, with the reason', async () => {
        // Reported as "how do I set 'this is so me'?" — the deck used to drop
        // them silently, which reads as a missing feature rather than a rule.
        await mountWith(lobbyView());

        await waitFor(() => expect(screen.getByRole('button', { name: /No claim/ })).toBeTruthy());
        fireEvent.click(screen.getByRole('button', { name: /No claim/ }));
        await waitFor(() => expect(screen.getByRole('group', { name: 'Your claim' })).toBeTruthy());

        const deck = document.querySelector('.claim__deck')!;
        const soMe = [...deck.querySelectorAll('.claim__option')].find(option =>
            option.textContent?.includes('You will know it was me'),
        )!;

        // Present, disabled, and it says why: two players at this table.
        expect(soMe).toBeTruthy();
        expect(soMe.hasAttribute('disabled')).toBe(true);
        expect(soMe.textContent).toContain('Needs at least 3 players');

        // The ones a small table can play are still live.
        const fresh = [...deck.querySelectorAll('.claim__option')].find(option =>
            option.textContent?.includes("You've never heard this"),
        )!;
        expect(fresh.hasAttribute('disabled')).toBe(false);
    });

    it('shows no claim banner while the claim is being withheld', async () => {
        // The server strips it from the payload for everyone but the DJ, so the
        // banner's job is simply to not exist when it is not there.
        const { claim, ...anonymous } = round().track;
        await mountWith(
            lobbyView({ phase: 'listening', setlistLength: 4, round: round({ track: anonymous }) }),
        );

        await waitFor(() => expect(screen.getByRole('group', { name: 'Whose is it?' })).toBeTruthy());
        expect(claim).toBeTruthy();
        expect(document.querySelector('.banner')).toBeNull();
    });

    it('shows the DJ their own bet, marked as nobody else\u2019s business', async () => {
        await mountWith(
            lobbyView({
                phase: 'listening',
                setlistLength: 4,
                round: round({
                    isMine: true,
                    canVote: false,
                    canAnswer: false,
                    track: { ...round().track, claim: { id: 'never-heard' } },
                }),
            }),
        );

        await waitFor(() => expect(screen.getByText("You've never heard this")).toBeTruthy());
        expect(screen.getByText(/nobody else sees it until the reveal/)).toBeTruthy();
    });




    it('will not let the host reveal over the top of a live vote', async () => {
        await mountWith(
            lobbyView({
                phase: 'listening',
                setlistLength: 4,
                round: round({ isMine: true, canVote: false, canAnswer: false, isReady: false }),
            }),
        );

        await waitFor(() => expect(screen.getByRole('button', { name: /Reveal the DJ/ })).toBeTruthy());
        expect(screen.getByRole('button', { name: /Reveal the DJ/ }).hasAttribute('disabled')).toBe(true);
        expect(screen.getByText(/Waiting for the room to finish/)).toBeTruthy();

        cleanup();
        await mountWith(
            lobbyView({
                phase: 'tallying',
                setlistLength: 4,
                round: round({ isMine: true, canVote: false, canAnswer: false, isReady: true }),
            }),
        );
        await waitFor(() => expect(screen.getByRole('button', { name: /Reveal the DJ/ })).toBeTruthy());
        expect(screen.getByRole('button', { name: /Reveal the DJ/ }).hasAttribute('disabled')).toBe(false);
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

    it('leaves the DJ nothing to do but listen', async () => {
        await mountWith(
            lobbyView({
                phase: 'listening',
                setlistLength: 4,
                round: round({ isMine: true, canVote: false, canAnswer: false }),
            }),
        );

        await waitFor(() => expect(screen.getByText(/Yours/)).toBeTruthy());
        // Their own track: no guess, no answer, and no decoy any more either.
        expect(screen.queryByRole('group', { name: 'Whose is it?' })).toBeNull();
        expect(screen.queryByRole('radiogroup', { name: 'How much did you like it?' })).toBeNull();
        expect(document.querySelector('.pick')).toBeNull();
    });

    it('renders the scoreboard, the awards and your own takeaway at the finale', async () => {
        await mountWith(
            lobbyView({
                phase: 'finished',
                setlistLength: 2,
                players: [
                    player({ id: 'p1', name: 'Ana', isHost: true, score: 5 }),
                    player({ id: 'p2', name: 'Bo', score: 7 }),
                ],
                awards: [
                    { id: 'crowd-favourite', winners: ['p2'], value: 7 },
                    { id: 'gut-punch', winners: ['p1'], value: 3 },
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
                            claim: { id: 'none' },
                        },
                        djId: 'p2',
                        answers: [{ listenerId: 'p1', like: 5, heard: false, popular: false, moved: true }],
                        listenerCount: 1,
                        votes: [{ voterId: 'p1', guessId: 'p2', correct: true }],
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
                            claim: { id: 'none' },
                        },
                        djId: 'p1',
                    },
                ],
            }),
        );

        await waitFor(() => expect(screen.getByText('Crowd Favourite')).toBeTruthy());
        expect(screen.getByText('7 points')).toBeTruthy();
        expect(screen.getByText('Gut Punch')).toBeTruthy();

        // One board now, ranked by the single score.
        const board = screen.getByText('The night').closest('section')!;
        expect(within(board).getAllByRole('listitem')[0].textContent).toContain('Bo');

        // And the thing you actually walk out with: what *you* rated 4 or more.
        const takeaway = screen.getByText('Your takeaway').closest('section')!;
        expect(within(takeaway).getAllByRole('listitem')[0].textContent).toContain('Blue Monday');

        // Queueing more than plays only pays off if you find out what you sat on.
        expect(screen.getByText('The ones that got away')).toBeTruthy();
        expect(screen.getByText('Temptation')).toBeTruthy();
    });
});
