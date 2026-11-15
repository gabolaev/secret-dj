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

    it('shows the connection on the room code, and announces it', async () => {
        await mountWith(lobbyView());
        await waitFor(() => expect(screen.getByText('K7QM2')).toBeTruthy());

        const code = document.querySelector('.room-code')!;
        expect(code.className).toContain('room-code--online');
        expect(within(code as HTMLElement).getByRole('status').textContent).toBe('live');
    });

    it('shows the players and the setlist, and nothing else, in the side column', async () => {
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));
        await waitFor(() => expect(document.querySelector('.roster')).toBeTruthy());

        const side = document.querySelector('.shell__side')!;
        expect(side.querySelectorAll('.block')).toHaveLength(2);
        expect(side.querySelector('.setlist')).toBeTruthy();
    });

    it('never names a track before it has played', async () => {
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));
        await waitFor(() => expect(document.querySelector('.setlist')).toBeTruthy());

        // One row per track from the first round, but an upcoming title would
        // name its DJ — and the server never sends one anyway.
        expect(document.querySelectorAll('.setlist__row')).toHaveLength(4);
        const upcoming = document.querySelectorAll('.setlist__row--upcoming');
        expect(upcoming).toHaveLength(3);
        for (const row of upcoming) expect(row.querySelector('.setlist__title')).toBeNull();
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
            expect(['left', 'away']).toContain(state);
        }

        // The running score is fine and is shown: no total moves until a
        // reveal, and a reveal has already said the DJ's name out loud, so the
        // column cannot be read backwards. It is answer state — and only answer
        // state — that has no safe value during a round.
        expect(document.querySelectorAll('.roster__score').length).toBeGreaterThan(0);
        const roster = document.querySelector('.roster')!.textContent!;
        for (const leak of ['done', 'deciding', 'thinking', 'answered', 'locked']) {
            expect(roster.toLowerCase(), `the roster leaks answer state: ${leak}`).not.toContain(leak);
        }
    });
    it('says each thing in the lobby once', async () => {
        await mountWith(lobbyView());

        await waitFor(() => expect(screen.getByText(/Queue 2 more tracks/i)).toBeTruthy());
        const stage = document.querySelector('.stage')!;

        // The count rides on the heading rather than being said again below it.
        const queue = [...stage.querySelectorAll('.block__head')].find(head =>
            head.textContent?.includes('Queue 2 more tracks'),
        )!;
        expect(queue.querySelector('.block__aside')!.textContent).toBe('1/3');
        // No hand of claims above the queue: each track's picker says what is left.
        expect(document.querySelector('.hand')).toBeNull();
        // While you are still queueing there is no status line under the button.
        expect(stage.querySelector('.cta .muted')).toBeNull();
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

    it('stacks the answer: the scale, the three toggles, then the note', async () => {
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));

        await waitFor(() => expect(document.querySelector('.answer')).toBeTruthy());
        const answer = document.querySelector('.answer')!;

        const parts = [...answer.children].map(child => child.className);
        expect(parts).toEqual(['answer__head', 'rate', 'toggles', 'answer__note']);
        expect(answer.parentElement!.className).toContain('answer-card');
    });

    it('marks the number you chose and names it', async () => {
        await mountWith(
            lobbyView({
                phase: 'listening',
                setlistLength: 4,
                round: round({ myAnswer: { like: 3, heard: false, popular: false, moved: false } }),
            }),
        );

        await waitFor(() => expect(screen.getByRole('radiogroup', { name: 'How much did you like it?' })).toBeTruthy());
        const checked = [0, 1, 2, 3, 4, 5].map(
            value => screen.getByRole('radio', { name: `${value} out of 5` }).getAttribute('aria-checked') === 'true',
        );
        expect(checked).toEqual([false, false, false, true, false, false]);
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
        expect(screen.queryByRole('group', { name: 'Claim' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /No claim/ }));
        await waitFor(() => expect(screen.getByRole('group', { name: 'Claim' })).toBeTruthy());
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
        expect(sheet.textContent).toContain('Needs 3+ players');
    });

    it('greys out the claims this table is too small for, with the reason', async () => {
        // Reported as "how do I set 'this is so me'?" — the deck used to drop
        // them silently, which reads as a missing feature rather than a rule.
        await mountWith(lobbyView());

        await waitFor(() => expect(screen.getByRole('button', { name: /No claim/ })).toBeTruthy());
        fireEvent.click(screen.getByRole('button', { name: /No claim/ }));
        await waitFor(() => expect(screen.getByRole('group', { name: 'Claim' })).toBeTruthy());

        const deck = document.querySelector('.claim__deck')!;
        const soMe = [...deck.querySelectorAll('.claim__option')].find(option =>
            option.textContent?.includes('You will know it was me'),
        )!;

        // Present, disabled, and it says why: two players at this table.
        expect(soMe).toBeTruthy();
        expect(soMe.hasAttribute('disabled')).toBe(true);
        expect(soMe.textContent).toContain('Needs 3+ players');

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

        await waitFor(() => expect(screen.getByText(/You've never heard this/)).toBeTruthy());
        // Shown inside the DJ's own card, which nobody else is rendered.
        expect(document.querySelector('.yours__claim')!.textContent).toContain('Your claim:');
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

        // Progress is a count, never names — the DJ gets no list of who is done.
        expect(document.querySelector('.yours')!.textContent).toMatch(/\d of \d done/);
        expect(document.querySelector('.answers')).toBeNull();
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

        await waitFor(() => expect(document.querySelector('.reveal')).toBeTruthy());

        // Who it was, and how many named them.
        expect(document.querySelector('.reveal__name')!.textContent).toBe('Cy');
        expect(document.querySelector('.reveal__named')!.textContent).toBe('1/1 guessed');

        // ♥ the room gave, the claim's multiplier, ★ what the DJ banked. ♥ and
        // ★ are never the same number twice: ♥ ranks the finale, ★ ranks nothing.
        const stats = [...document.querySelectorAll('.stat__value')].map(node => node.textContent);
        expect(stats).toEqual(['10', '×1.5', '12']);
        // The claim, in its own terms.
        expect(document.querySelector('.reveal__claim')!.textContent).toContain('2 of 2 hadn\'t heard it');

        // The working is one tap away, four steps in a fixed order, each naming
        // the number it started from and the one it left behind.
        const ledger = document.querySelector('.ledger')!;
        expect(ledger.tagName).toBe('DETAILS');
        expect(ledger.querySelectorAll('.ledger__row')).toHaveLength(4);
        expect(ledger.textContent).toContain('7 + 3');
        expect(ledger.textContent).toContain('10 ÷ 2 answered × 2 listening');
        expect(ledger.textContent).toContain('1 of 2 called it popular');
        expect(ledger.textContent).toContain('10 → 8');
        expect(ledger.textContent).toContain('8 → 12');

        // One row per listener: what they made of the track and who they guessed.
        const answers = [...document.querySelectorAll('.answers__row')];
        expect(answers).toHaveLength(2);
        expect(answers[0].textContent).toContain('Ana');
        expect(answers[0].querySelector('.answers__guess')!.textContent).toContain('Cy');
        expect(answers[0].querySelector('.answers__guess')!.className).toContain('is-correct');
        // Bo answered but never guessed, so that half of the row is simply absent.
        expect(answers[1].querySelector('.answers__guess')).toBeNull();
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

        // Every award has a card, whether or not anybody won it: omitting one
        // leaves a hole the reader has to explain to themselves. "Not given" is
        // the whole fact, and it is all the card says — five trophies each
        // justifying their own absence is what made the finale read as prose.
        expect(cards).toHaveLength(5);
        const shazam = cards.find(card => card.textContent?.includes('Human Shazam'))!;
        expect(shazam.className).toContain('award--none');
        expect(shazam.textContent).toContain('Not given');
        expect(shazam.querySelector('.award__value')).toBeNull();
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
        const takeaway = screen.getByText(/Your favourites/).closest('section')!;
        expect(within(takeaway).getAllByRole('listitem')[0].textContent).toContain('Blue Monday');

        // The chart is ranked by the room, not by the running order: the track
        // the room rated higher comes first.
        const chart = screen.getByText(/^Tracks$/).closest('section')!;
        const rows = within(chart).getAllByRole('listitem');
        expect(rows[0].textContent).toContain('Blue Monday');
        expect(rows[1].textContent).toContain('Ceremony');
        // ...and whose it was.
        expect(rows[1].querySelector('.chart__dj')!.textContent).toBe('Ana');

        // Two numbers, kept apart, and never in the same column: 5 + 1 new + 2
        // moved = 8 from the room, and no claim, so 8 is also what it banked.
        expect(rows[0].querySelector('.chart__love')!.textContent).toBe('♥ 8');
        expect(rows[0].querySelector('.chart__banked')!.textContent).toBe('★ 8');
        // Ceremony: 1 + 1 new = 2 from the room, ×1.5 for a claim that landed.
        expect(rows[1].querySelector('.chart__love')!.textContent).toBe('♥ 2');
        expect(rows[1].querySelector('.chart__banked')!.textContent).toBe('★ 3');
        // ♥ decides the order, so it leads; ★ ranks nothing and comes after it.
        expect(rows[0].querySelector('.chart__love')!.compareDocumentPosition(
            rows[0].querySelector('.chart__banked')!,
        ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        // Queueing more than plays only pays off if you find out what you sat on.
        expect(screen.getByText("Didn't make the cut")).toBeTruthy();
        expect(screen.getByText('Temptation')).toBeTruthy();
    });
});
