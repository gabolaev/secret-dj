// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
        endsAt: Date.now() + 42_000,
        isReady: false,
        myDone: false,
        doneIn: 0,
        doneExpected: 2,
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
        expect(screen.getByRole('button', { name: /start a new one/i })).toBeTruthy();
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
        expect(screen.getByPlaceholderText('K7QM2').getAttribute('value')).toBe('K7QM2');
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
        expect(screen.getByRole('button', { name: /start a new one/i })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'RU' }));

        expect(screen.getByRole('button', { name: 'Создать свою' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /start a new one/i })).toBeNull();
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
        expect(screen.getByRole('button', { name: 'Создать свою' })).toBeTruthy();
    });

    it('follows the browser when nothing is stored', async () => {
        Object.defineProperty(window.navigator, 'language', { configurable: true, value: 'ru-RU' });
        const App = await importApp();
        render(<App />);
        expect(screen.getByRole('button', { name: 'Создать свою' })).toBeTruthy();
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

    it('shows the connection on the room block, not a dot beside it', async () => {
        await mountWith(lobbyView());
        await waitFor(() => expect(screen.getByText('K7QM2')).toBeTruthy());

        const code = document.querySelector('.shell__code')!;
        expect(code.className).toContain('shell__code--online');
        // The separate indicator is gone, but the state is still announced.
        expect(document.querySelector('.dot')).toBeNull();
        expect(within(code as HTMLElement).getByRole('status').textContent).toBe('live');
    });

    it('keeps the fidget silent, local, and stopped until somebody starts it', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            await mountWith(lobbyView());
            await waitFor(() => expect(document.querySelector('.dm')).toBeTruthy());

            // Four voices, eight steps, seeded — an empty grid is not a toy.
            expect(document.querySelectorAll('.dm__row')).toHaveLength(4);
            expect(document.querySelectorAll('.dm__cell')).toHaveLength(32);
            expect(document.querySelectorAll('.dm__cell.is-on').length).toBeGreaterThan(0);

            // It must NOT auto-run. This is the whole design rule for it: the
            // only thing allowed to animate in the product is a cover being
            // wiped off a secret, and a toy that starts itself cannot honour
            // `prefers-reduced-motion` no matter what the stylesheet says.
            const playhead = () =>
                [...document.querySelectorAll('.dm__tick')].findIndex(tick =>
                    tick.className.includes('is-now'),
                );
            expect(playhead()).toBe(-1);
            await act(async () => {
                vi.advanceTimersByTime(1000);
            });
            expect(playhead()).toBe(-1);

            // Started by hand, it runs.
            fireEvent.click(screen.getByRole('button', { name: 'Run' }));
            await waitFor(() => expect(playhead()).toBeGreaterThanOrEqual(0));
            const first = playhead();
            await act(async () => {
                vi.advanceTimersByTime(260);
            });
            expect(playhead()).not.toBe(first);

            // A cell is a switch you can flip, and it has exactly two states:
            // punched or not. Nothing else may change how it looks.
            const cell = document.querySelectorAll('.dm__cell')[0];
            const wasOn = cell.getAttribute('aria-pressed') === 'true';
            fireEvent.click(cell);
            expect(cell.getAttribute('aria-pressed')).toBe(String(!wasOn));

            // Nothing anywhere in it can make a sound, and nothing leaves the
            // browser: it is worth no points and nobody sees your pattern.
            expect(document.querySelector('audio')).toBeNull();
            expect(sent.some(message => JSON.stringify(message).includes('drum'))).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    it('shows the room, the setlist and the fidget at once, with no tab strip', async () => {
        // Tabs were hiding two of three short lists behind a click in a column
        // with room for all three — and the running order is the one thing you
        // want visible *while* something else is on screen.
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));
        await waitFor(() => expect(document.querySelector('.roster')).toBeTruthy());

        expect(document.querySelector('.tabs')).toBeNull();
        expect(document.querySelector('.setlist')).toBeTruthy();
        expect(document.querySelector('.dm')).toBeTruthy();
    });

    it('prints the running order as a column of secrets, not a list that grows', async () => {
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));
        await waitFor(() => expect(document.querySelector('.setlist')).toBeTruthy());

        // One slot per track in the setlist, from the very first round: a track
        // that has not been on yet is a secret like any other, so it is a bar of
        // the same width with no title on it. Naming it would name its DJ.
        const rows = document.querySelectorAll('.setlist__row');
        expect(rows).toHaveLength(4);

        const sealed = document.querySelectorAll('.setlist__row--sealed');
        expect(sealed.length).toBe(3);
        for (const row of sealed) {
            const cover = row.querySelector('.redact__cover');
            expect(cover).toBeTruthy();
            expect(row.querySelector('.redact')!.getAttribute('data-open')).toBe('false');
        }
    });

    it('shows presence in the roster and nothing else, ever', async () => {
        // The single most important rule in the design. The DJ is the one
        // person who cannot answer, so a roster that reports progress names
        // them by omission — mark them not-done and they are the last one
        // pending; mark them done and they are the only one finished the
        // instant the round opens. There is no safe value.
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));
        await waitFor(() => expect(document.querySelector('.roster')).toBeTruthy());

        const states = [...document.querySelectorAll('.roster__state')].map(node => node.textContent);
        for (const state of states) {
            expect(['here', 'gone', 'away', 'you']).toContain(state);
        }

        // And no score column: ★ is what a DJ banked on a gamble, and it has no
        // business ranking the people in the room.
        expect(document.querySelector('.roster__score')).toBeNull();
        expect(document.querySelector('.roster__scores')).toBeNull();
    });
    it('says each thing in the lobby once', async () => {
        // The lobby carried five explanatory subtitles, and the heading, the
        // queue counter and the empty state each said "you have queued nothing"
        // in their own words.
        await mountWith(lobbyView());

        await waitFor(() => expect(screen.getByText(/Queue 2 more tracks/i)).toBeTruthy());
        const stage = document.querySelector('.stage')!;

        // The count rides on the block's legend rather than heading a section
        // of its own.
        const queue = [...stage.querySelectorAll('.label')].find(label =>
            label.textContent?.includes('Queue 2 more tracks'),
        )!;
        expect(queue.querySelector('.label__count')!.textContent).toBe('1/3');
        expect(screen.queryByText(/Nothing queued yet/i)).toBeNull();
        // Settings are a label and a control, with the reasoning left to Rules.
        expect(document.querySelectorAll('.setting__hint')).toHaveLength(0);
        // Nothing explains the input; it has a placeholder.
        expect(screen.queryByText(/the more surprising/i)).toBeNull();
    });


    it('offers guessing and the whole answer during a round', async () => {
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));

        await waitFor(() => expect(screen.getByRole('group', { name: 'Whose is it?' })).toBeTruthy());
        expect(screen.getByText('Track 2 / 4')).toBeTruthy();
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
        expect(screen.getByText(/Pick a number for your answer to count/)).toBeTruthy();
    });

    it('counts the round down, and keeps counting once it runs out', async () => {
        await mountWith(
            lobbyView({
                phase: 'listening',
                setlistLength: 4,
                now: Date.now(),
                round: round({ endsAt: Date.now() + 42_000 }),
            }),
        );

        await waitFor(() => expect(document.querySelector('.timer')).toBeTruthy());
        const timer = document.querySelector('.timer')!;
        expect(timer.textContent).toBe('0:42');
        expect(timer.className).not.toContain('timer--over');

        // Past the deadline it goes negative and turns red rather than stopping:
        // the minute is pressure to get on with it, not a cut-off.
        cleanup();
        await mountWith(
            lobbyView({
                phase: 'listening',
                setlistLength: 4,
                now: Date.now(),
                round: round({ endsAt: Date.now() - 7_000 }),
            }),
        );

        await waitFor(() => expect(document.querySelector('.timer')).toBeTruthy());
        const over = document.querySelector('.timer')!;
        expect(over.textContent).toBe('−0:07');
        expect(over.className).toContain('timer--over');
    });

    it('puts Done last, under the guess it finishes', async () => {
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));

        await waitFor(() => expect(screen.getByRole('button', { name: /^Done$/ })).toBeTruthy());

        // Your answer is one card, read top to bottom: the number and the
        // toggles, then who you think it was, then the button that finishes
        // both. Done is last because it is what the other two are for.
        const card = document.querySelector('.answer-card')!;
        const parts = [...card.children].map(child => child.className);
        const guess = parts.findIndex(name => name.includes('pick'));
        const done = parts.findIndex(name => name.includes('answer-card__foot'));

        expect(parts[0]).toContain('answer');
        expect(guess).toBeGreaterThanOrEqual(0);
        expect(done).toBeGreaterThan(guess);
    });

    it('stacks the answer instead of letting it wrap across the rack', async () => {
        // The three parts used to be loose siblings of the rack's flex row, so
        // the scale, the toggles and the note laid out on one line and broke
        // wherever the container ran out — clipping a rating button mid-circle.
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));

        await waitFor(() => expect(document.querySelector('.answer')).toBeTruthy());
        const answer = document.querySelector('.answer')!;

        expect(answer.children).toHaveLength(3);
        expect(answer.children[0].className).toContain('rate');
        expect(answer.children[1].className).toContain('bets');
        expect(answer.children[2].className).toContain('answer__note');
        // The whole block is one child of the answer card, not three.
        expect(answer.parentElement!.className).toContain('answer-card');
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

        await waitFor(() => expect(document.querySelector('.rules-claims')).toBeTruthy());
        const sheet = document.querySelector('.rules-claims')!;
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

        await waitFor(() => expect(screen.getByText(/This one is yours/i)).toBeTruthy());
        // Their own track: no guess, no answer, and no decoy any more either.
        expect(screen.queryByRole('group', { name: 'Whose is it?' })).toBeNull();
        expect(screen.queryByRole('radiogroup', { name: 'How much did you like it?' })).toBeNull();
        expect(document.querySelector('.pick')).toBeNull();

        // They are the only person in the room on the other side of the bar,
        // and the screen says so rather than just going quiet.
        expect(screen.getByText(/Nothing to do but watch them work it out/i)).toBeTruthy();
        // The answers are sealed for them too — even though they are the one
        // person who already knows which name is missing from them.
        expect(document.querySelector('.answers__row .redact__cover')).toBeTruthy();
    });

    it('shows every arithmetic step of the reveal, not just the total', async () => {
        await mountWith(
            lobbyView({
                phase: 'reveal',
                setlistLength: 4,
                players: [
                    player({ id: 'p1', name: 'Ana', isHost: true }),
                    player({ id: 'p2', name: 'Bo' }),
                    player({ id: 'p3', name: 'Cy' }),
                ],
                round: round({
                    track: { ...round().track, claim: { id: 'never-heard' } },
                    reveal: {
                        djId: 'p3',
                        // Ana: 4 + 1 new + 2 moved = 7.  Bo: 2 + 1 new = 3.
                        answers: [
                            { listenerId: 'p1', like: 4, heard: false, popular: true, moved: true },
                            { listenerId: 'p2', like: 2, heard: false, popular: false, moved: false },
                        ],
                        votes: [{ voterId: 'p1', guessId: 'p3', correct: true }],
                        listenerCount: 2,
                        claimMultiplier: 1.5,
                        obviousnessDrag: 0.75,
                        points: [
                            { playerId: 'p1', points: 1, reason: 'correct-guess' },
                            { playerId: 'p3', points: 10, reason: 'room-verdict' },
                            { playerId: 'p3', points: -2, reason: 'obviousness' },
                            { playerId: 'p3', points: 4, reason: 'claim-landed' },
                        ],
                    },
                }),
            }),
        );

        await waitFor(() => expect(document.querySelector('.ledger')).toBeTruthy());
        const ledger = () => document.querySelector('.ledger')!.textContent!;
        const rows = () => [...document.querySelectorAll('.ledger__row')];

        // Five steps in a fixed order, and every one of them starts covered:
        // the working *steps*, one row per press, rather than arriving as a
        // finished block nobody read.
        expect(rows()).toHaveLength(4);
        for (const row of rows()) {
            expect(row.getAttribute('data-open')).toBe('false');
        }
        // The total is withheld until the working that produced it has been.
        expect(document.querySelector('.ledger__banked')!.textContent).toBe('—');

        // Host-paced, never a timed cascade: a room that wants to argue about a
        // row can sit on it.
        const step = screen.getByRole('button', { name: /next step/i });
        for (let press = 0; press < 4; press++) fireEvent.click(step);
        await waitFor(() => expect(rows().every(row => row.getAttribute('data-open') === 'true')).toBe(true));

        // Each listener's own sum, then how those become the room's verdict.
        expect(ledger()).toContain('7 + 3');
        expect(ledger()).toContain('10 ÷ 2 answered × 2 listening');
        // Each step names the number it started from and the number it left
        // behind: "×0.5" never said half of what.
        expect(ledger()).toContain('10 → 8');
        expect(ledger()).toContain('8 → 12');
        // ...and why it moved.
        expect(ledger()).toContain('1 of 2 called it popular');
        // And the number all of that adds up to.
        expect(ledger()).toContain('Cy banks');
        expect(document.querySelector('.ledger__banked')!.textContent).toBe('12');

        // The claim's own evidence stays on the claim card, in the claim's own
        // terms, rather than being restated as a ledger detail.
        expect(document.querySelector('.claim-card')!.textContent).toContain('2 of 2 had not heard it');

        // ♥ and ★ are both printed, and they are never the same number twice:
        // ♥ ranks the finale, ★ ranks nothing.
        const tallies = [...document.querySelectorAll('.tally__value')].map(node => node.textContent);
        expect(tallies).toEqual(['10', '12']);

        // One row per listener: what they guessed and what they made of the
        // track, rather than the same people listed twice.
        const answers = [...document.querySelectorAll('.answers__row')];
        expect(answers).toHaveLength(2);
        expect(answers[0].textContent).toContain('Ana');
        expect(answers[0].querySelector('.answers__guess')!.textContent).toContain('Cy');
        expect(answers[0].querySelector('.answers__guess')!.className).toContain('is-correct');
        // Bo answered but never guessed, so that half of the row is simply absent.
        expect(answers[1].querySelector('.answers__guess')).toBeNull();
        // What a tick is worth is said once, under the table.
        expect(document.querySelector('.answers__key')!.textContent).toContain('+1 to them');
    });

    it('shows a rating on the reveal as a scale, not a bare number', async () => {
        await mountWith(
            lobbyView({
                phase: 'reveal',
                setlistLength: 4,
                round: round({
                    reveal: {
                        djId: 'p2',
                        answers: [{ listenerId: 'p1', like: 4, heard: false, popular: true, moved: false }],
                        votes: [],
                        listenerCount: 1,
                        claimMultiplier: 1,
                        obviousnessDrag: 0.5,
                        points: [{ playerId: 'p2', points: 5, reason: 'room-verdict' }],
                    },
                }),
            }),
        );

        await waitFor(() => expect(document.querySelector('.answers__like')).toBeTruthy());
        const pill = document.querySelector('.answers__like')!;
        expect(pill.textContent).toBe('4/5');
        expect(pill.getAttribute('title')).toContain('4 out of 5');
    });

    it('lays out an award card so the value is anchored, not floating', async () => {
        await mountWith(
            lobbyView({
                phase: 'finished',
                setlistLength: 2,
                players: [
                    player({ id: 'p1', name: 'Ana', isHost: true }),
                    player({ id: 'p2', name: 'Bo' }),
                    player({ id: 'p3', name: 'Cy' }),
                ],
                awards: [{ id: 'ghost', winners: ['p1', 'p2'], value: 55 }],
                history: [],
            }),
        );

        await waitFor(() => expect(document.querySelector('.award')).toBeTruthy());
        const cards = [...document.querySelectorAll('.award')];
        const ghost = cards.find(card => card.textContent?.includes('The Ghost'))!;

        // Winners stack one per line: inline wrapping is what turned a shared
        // award into an unreadable pile of names. Ties are shared, never broken.
        expect(ghost.querySelector('.award__winners')!.children).toHaveLength(2);
        // ...and the value is the last thing in the card, so it lines up with
        // the value of every other card in the row.
        expect(ghost.lastElementChild!.className).toContain('award__value');

        // Every award has a card, whether or not anybody won it. A trophy
        // nobody earned is printed as "Not given" *with the reason on it* —
        // omitting it would leave a hole the reader has to explain to
        // themselves, and the explanation is the interesting part.
        expect(cards).toHaveLength(5);
        const shazam = cards.find(card => card.textContent?.includes('Human Shazam'))!;
        expect(shazam.className).toContain('award--none');
        expect(shazam.textContent).toContain('Not given');
        expect(shazam.textContent).toContain('nobody named a single DJ right');
    });

    it('renders the awards, the chart and your own takeaway at the finale', async () => {
        await mountWith(
            lobbyView({
                phase: 'finished',
                setlistLength: 2,
                players: [
                    player({ id: 'p1', name: 'Ana', isHost: true, score: 5 }),
                    player({ id: 'p2', name: 'Bo', score: 7 }),
                ],
                awards: [
                    { id: 'track-of-the-night', winners: ['p2'], value: 7, detail: 'Blue Monday' },
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
                    {
                        number: 2,
                        track: {
                            id: 't2',
                            url: 'https://open.spotify.com/track/ghi',
                            title: 'Ceremony',
                            service: 'Spotify',
                            metadata: 'ready',
                            // Nobody had heard it, so the claim lands in full.
                            claim: { id: 'never-heard' },
                        },
                        djId: 'p1',
                        answers: [{ listenerId: 'p2', like: 1, heard: false, popular: false, moved: false }],
                        listenerCount: 1,
                        votes: [],
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

        await waitFor(() => expect(screen.getByText(/Track of the Night/)).toBeTruthy());
        const trophy = [...document.querySelectorAll('.award')].find(card =>
            card.textContent?.includes('Track of the Night'),
        )!;
        expect(trophy.textContent).toContain('Blue Monday');
        expect(trophy.textContent).toContain('7 points');
        expect(screen.getByText(/Gut Punch/)).toBeTruthy();

        // No leaderboard: the night is not a competition to win.
        expect(screen.queryByText('The night')).toBeNull();
        expect(document.querySelector('.scores')).toBeNull();

        // What you actually walk out with: what *you* rated 4 or more.
        const takeaway = screen.getByText(/What you're taking home/).closest('section')!;
        expect(within(takeaway).getAllByRole('listitem')[0].textContent).toContain('Blue Monday');

        // The chart is ranked by the room, not by the running order: the track
        // the room rated higher comes first.
        const chart = screen.getByText(/Ranked by what the room gave/).closest('section')!;
        const rows = within(chart).getAllByRole('listitem');
        expect(rows[0].textContent).toContain('Blue Monday');
        expect(rows[1].textContent).toContain('Ceremony');
        // ...and each row still says when it actually played.
        expect(rows[1].querySelector('.final-list__played')!.textContent).toContain('02');

        // Two numbers, kept apart, and never in the same column: 5 + 1 new + 2
        // moved = 8 from the room, and no claim, so 8 is also what it banked.
        expect(rows[0].querySelector('.final-list__love')!.textContent).toBe('♥ 8');
        expect(rows[0].querySelector('.final-list__banked')!.textContent).toBe('★ 8');
        // Ceremony: 1 + 1 new = 2 from the room, ×1.5 for a claim that landed.
        expect(rows[1].querySelector('.final-list__love')!.textContent).toBe('♥ 2');
        expect(rows[1].querySelector('.final-list__banked')!.textContent).toBe('★ 3');
        // ♥ decides the order, so it leads; ★ ranks nothing and comes after it.
        expect(rows[0].querySelector('.final-list__love')!.compareDocumentPosition(
            rows[0].querySelector('.final-list__banked')!,
        ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        // Queueing more than plays only pays off if you find out what you sat on.
        expect(screen.getByText('The ones that got away')).toBeTruthy();
        expect(screen.getByText('Temptation')).toBeTruthy();
    });
});
