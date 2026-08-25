// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CLAIMS } from '@secret-dj/common';
import type { GameView, PublicPlayer, Result, RoundView, Session } from '@secret-dj/common';
import { en } from '../src/i18n/en';
import { PLUG_REACH } from '../src/components/Cables';

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

    it('shows the connection on the room block, not a dot beside it', async () => {
        await mountWith(lobbyView());
        await waitFor(() => expect(screen.getByText('K7QM2')).toBeTruthy());

        const code = document.querySelector('.shell__code')!;
        expect(code.className).toContain('shell__code--online');
        // The separate indicator is gone, but the state is still announced.
        expect(document.querySelector('.dot')).toBeNull();
        expect(within(code as HTMLElement).getByRole('status').textContent).toBe('live');
    });

    it('hides a silent drum machine behind a button in the sidebar', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            await mountWith(lobbyView());
            await waitFor(() => expect(screen.getByText('Drum machine')).toBeTruthy());

            // Folded away, the panel is its title bar and nothing else.
            expect(document.querySelector('.dm')).toBeNull();
            expect(document.querySelector('.side--inset .win__body')!.children).toHaveLength(0);

            fireEvent.click(screen.getByRole('button', { name: 'Drums' }));
            await waitFor(() => expect(document.querySelector('.dm')).toBeTruthy());

            // Four voices, eight steps, and it opens already running a pattern.
            expect(document.querySelectorAll('.dm__row')).toHaveLength(4);
            expect(document.querySelectorAll('.dm__pad')).toHaveLength(32);
            expect(document.querySelectorAll('.dm__pad.is-on').length).toBeGreaterThan(0);

            // Indicator lamps are their own row, the way the hardware does it.
            expect(document.querySelectorAll('.dm__led')).toHaveLength(8);
            expect(document.querySelectorAll('.dm__led.is-lit')).toHaveLength(1);
            // ...and the readout says what it is doing.
            expect(document.querySelector('.dm__display')!.textContent).toContain('120');

            // The playhead moves on its own — one lit step, and a different one
            // a beat later.
            const lit = () => [...document.querySelectorAll('.dm__pad')].findIndex(pad => pad.className.includes('is-now'));
            const first = lit();
            expect(first).toBeGreaterThanOrEqual(0);
            await act(async () => {
                vi.advanceTimersByTime(260);
            });
            expect(lit()).not.toBe(first);

            // A pad is a switch you can flip...
            const pad = document.querySelectorAll('.dm__pad')[0];
            const wasOn = pad.getAttribute('aria-pressed') === 'true';
            fireEvent.click(pad);
            expect(pad.getAttribute('aria-pressed')).toBe(String(!wasOn));

            // ...and the hit is an event of its own, so a tap on a stopped
            // machine still registers as something that happened.
            expect(pad.className).toContain('is-hit');
            await act(async () => {
                vi.advanceTimersByTime(240);
            });
            expect(pad.className).not.toContain('is-hit');

            // Cables spill out of it across the page — and must never be able
            // to swallow a click, add a scrollbar, or draw over the content.
            const cables = document.querySelector('.cables')!;
            expect(cables).toBeTruthy();
            expect(cables.getAttribute('aria-hidden')).toBe('true');
            expect(cables.tagName.toLowerCase()).toBe('svg');
            // Portalled straight to the body. Inside the layout it sat in the
            // sidebar column, where a positioned element paints over static
            // block content whatever the DOM order says.
            expect(cables.parentElement).toBe(document.body);
            expect(cables.closest('.shell')).toBeNull();
            // Every lead ends in a connector rather than stopping in mid-air.
            expect(cables.querySelectorAll('g > rect').length).toBeGreaterThan(0);

            // The tempo keys are a pair of nudges rather than four buttons
            // repeating the number the display already carries.
            fireEvent.click(screen.getByRole('button', { name: 'Slower' }));
            expect(document.querySelector('.dm__display')!.textContent).toContain('110');

            // Nothing anywhere in it can make a sound.
            expect(document.querySelector('audio')).toBeNull();

            // Folding the machine away takes them with it.
            fireEvent.click(screen.getByRole('button', { name: 'Hide drums' }));
            await waitFor(() => expect(document.querySelector('.cables')).toBeNull());
        } finally {
            vi.useRealTimers();
        }
    });

    it('lays gear out behind the join card without getting in its way', async () => {
        window.localStorage.clear();
        const App = await importApp();
        render(<App />);

        await waitFor(() => expect(document.querySelector('.bench')).toBeTruthy());
        const bench = document.querySelector('.bench')!;
        // A backdrop to a form somebody has to read and type into: it must not
        // be reachable, focusable, or announced.
        expect(bench.getAttribute('aria-hidden')).toBe('true');
        expect(bench.getAttribute('focusable')).toBe('false');
        expect(bench.querySelectorAll('button, a, input')).toHaveLength(0);
        // A working desk is dense: gear pushed up against gear, not four
        // objects floating in the corners.
        expect(bench.querySelectorAll('.bench__unit').length).toBeGreaterThanOrEqual(8);

        // Cable colours live in the component rather than the stylesheet, so
        // the palette guard in the CSS tests cannot see them. Check here that
        // the desk stays achromatic apart from the one accent.
        const strokes = [...bench.querySelectorAll('.bench__cables path[stroke^="#"]')].map(
            node => node.getAttribute('stroke')!.slice(1).toLowerCase(),
        );
        expect(strokes.length).toBeGreaterThan(20);
        for (const hex of new Set(strokes)) {
            const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
            const saturated = Math.max(r, g, b) - Math.min(r, g, b) > 40;
            expect(!saturated || hex === 'd13c00' || hex === 'c9b273', `${hex} is off the palette`).toBe(true);
        }

        // Every lead is patched between real sockets rather than drawn past
        // them: each one starts on a jack and ends on a connector.
        const jacks = [...bench.querySelectorAll('.bench__jack')].map(node => ({
            x: Number(node.getAttribute('cx')),
            y: Number(node.getAttribute('cy')),
        }));
        expect(jacks.length).toBeGreaterThan(8);

        // Every socket is *on* its panel. Sockets used to be placed just
        // outside the case, which is what made the connectors look stuck to
        // nothing: a plug floating in the gap beside the gear.
        for (const unit of bench.querySelectorAll('.bench__unit')) {
            const body = unit.querySelector('rect')!;
            const w = Number(body.getAttribute('width'));
            const h = Number(body.getAttribute('height'));
            for (const jack of unit.querySelectorAll('.bench__jack')) {
                const jx = Number(jack.getAttribute('cx'));
                const jy = Number(jack.getAttribute('cy'));
                expect(jx >= 0 && jx <= w && jy >= 0 && jy <= h, `jack ${jx},${jy} is off its panel`).toBe(true);
            }
        }

        const plugs = [...bench.querySelectorAll('.bench__plug')];
        expect(plugs.length).toBeGreaterThan(8);

        const paths = [...bench.querySelectorAll('.bench__cables path')];
        expect(paths.length).toBeGreaterThan(0);
        for (const plug of plugs) {
            // Connectors are placed by transform, the same shape the drum
            // machine's leads use.
            const [, px, py] = /translate\(([-\d.]+) ([-\d.]+)\)/
                .exec(plug.getAttribute('transform')!)!
                .map(Number);
            // The sheath starts at the *tail* of the barrel rather than at the
            // socket, so a lead never runs out through its own connector. That
            // puts each cable end exactly one connector-length from its plug.
            const attached = paths.some(path => {
                const d = path.getAttribute('d')!;
                const [, sx, sy] = /^M ([-\d.]+) ([-\d.]+)/.exec(d)!;
                const [, ex, ey] = /([-\d.]+) ([-\d.]+)$/.exec(d)!;
                const reaches = (x: string, y: string) =>
                    Math.abs(Math.hypot(Number(x) - px, Number(y) - py) - PLUG_REACH) < 0.01;
                return reaches(sx, sy) || reaches(ex, ey);
            });
            expect(attached, `plug at ${px},${py} is not on a cable`).toBe(true);
        }
    });

    it('only shows the tab strip when there is a choice to make', async () => {
        // A strip of one tab is a second heading for a panel that already has
        // one: "PLAYLIST" over "IN THE ROOM" over the list itself.
        await mountWith(lobbyView());
        await waitFor(() => expect(document.querySelector('.roster')).toBeTruthy());
        expect(document.querySelector('.tabs')).toBeNull();

        // Once the night is under way there is a queue to switch to, so it
        // comes back.
        cleanup();
        await mountWith(lobbyView({ phase: 'listening', setlistLength: 4, round: round() }));
        await waitFor(() => expect(document.querySelector('.tabs')).toBeTruthy());
        expect(document.querySelectorAll('.tab').length).toBeGreaterThan(1);
    });

    it('says each thing in the lobby once', async () => {
        // The lobby carried five explanatory subtitles, and the heading, the
        // queue counter and the empty state each said "you have queued nothing"
        // in their own words.
        await mountWith(lobbyView());

        await waitFor(() => expect(screen.getByText(/Queue 2 more tracks/i)).toBeTruthy());
        const stage = document.querySelector('.stage')!;

        // The count rides on the title rather than heading a section of its own.
        expect(stage.querySelector('.stage__title')!.textContent).toContain('1/3');
        expect(screen.queryByText(/Nothing queued yet/i)).toBeNull();
        // Settings are a label and a control, with the reasoning left to Rules.
        expect(document.querySelectorAll('.setting__hint')).toHaveLength(0);
        // Nothing explains the input; it has a placeholder.
        expect(screen.queryByText(/the more surprising/i)).toBeNull();
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
        const racks = [...document.querySelectorAll('.rack')];
        const guessRack = racks.findIndex(rack => rack.querySelector('.pick'));
        const doneRack = racks.findIndex(rack => rack.textContent?.includes('finished.'));

        expect(guessRack).toBeGreaterThanOrEqual(0);
        expect(doneRack).toBeGreaterThan(guessRack);
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
        // The whole block is one child of the rack, not three.
        expect(answer.parentElement!.className).toContain('rack');
        expect(answer.parentElement!.children).toHaveLength(1);
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

        await waitFor(() => expect(screen.getByText(/Yours/)).toBeTruthy());
        // Their own track: no guess, no answer, and no decoy any more either.
        expect(screen.queryByRole('group', { name: 'Whose is it?' })).toBeNull();
        expect(screen.queryByRole('radiogroup', { name: 'How much did you like it?' })).toBeNull();
        expect(document.querySelector('.pick')).toBeNull();
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
        const ledger = document.querySelector('.ledger')!.textContent!;

        // Each listener's own sum, then how those become the room's verdict.
        expect(ledger).toContain('7 + 3');
        expect(ledger).toContain('10 ÷ 2 answered × 2 listening');
        // Each multiplier step names the number it started from and the number
        // it left behind: "×0.5" never said half of what.
        expect(ledger).toContain('10 → 8');
        expect(ledger).toContain('8 → 12');
        // ...and why it moved.
        expect(ledger).toContain('1 of 2 called it popular');
        expect(ledger).toContain('2 of 2 had not heard it');
        // And the number all of that adds up to.
        expect(ledger).toContain('Cy banks');
        expect(ledger).toContain('12');

        // One row per listener: what they guessed and what they made of the
        // track, rather than the same people listed twice.
        const rows = [...document.querySelectorAll('.answers__row')];
        expect(rows).toHaveLength(2);
        expect(rows[0].textContent).toContain('Ana');
        expect(rows[0].querySelector('.answers__guess')!.textContent).toContain('Cy');
        // A correct guess is worth a point again, and the row says so.
        expect(rows[0].querySelector('.answers__guess')!.textContent).toContain('+1');
        // Bo answered but never guessed, so that half of the row is simply absent.
        expect(rows[1].querySelector('.answers__guess')).toBeNull();
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
        const card = document.querySelector('.award')!;

        // Winners stack one per line: inline wrapping is what turned a shared
        // award into an unreadable pile of avatars.
        const winners = card.querySelector('.award__winners')!;
        expect(winners.children).toHaveLength(2);
        // ...and the value is the last thing in the card, so it lines up with
        // the value of every other card in the row.
        expect(card.lastElementChild!.className).toContain('award__value');
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

        await waitFor(() => expect(screen.getByText('Track of the Night')).toBeTruthy());
        expect(screen.getByText('7 points')).toBeTruthy();
        expect(screen.getByText('Gut Punch')).toBeTruthy();

        // No leaderboard: the night is not a competition to win.
        expect(screen.queryByText('The night')).toBeNull();
        expect(document.querySelector('.scores')).toBeNull();

        // What you actually walk out with: what *you* rated 4 or more.
        const takeaway = screen.getByText('Your takeaway').closest('section')!;
        expect(within(takeaway).getAllByRole('listitem')[0].textContent).toContain('Blue Monday');

        // The setlist is the night's chart, not its running order: the track
        // the room rated higher comes first.
        const setlist = screen.getByText('The setlist').closest('section')!;
        const rows = within(setlist).getAllByRole('listitem');
        expect(rows[0].textContent).toContain('Blue Monday');
        expect(rows[1].textContent).toContain('Ceremony');
        // ...and each row still says when it actually played.
        expect(rows[1].textContent).toContain('2');

        // Two numbers, kept apart: 5 + 1 new + 2 moved = 8 from the room, and
        // no claim, so 8 is also what it banked.
        expect(rows[0].querySelector('.track__meta--love')!.textContent).toBe('♥8');
        expect(rows[0].querySelector('.track__meta--score')!.textContent).toBe('★8');
        // Ceremony: 1 + 1 new = 2 from the room, ×1.5 for a claim that landed.
        expect(rows[1].querySelector('.track__meta--love')!.textContent).toBe('♥2');
        expect(rows[1].querySelector('.track__meta--score')!.textContent).toBe('★3');

        // Queueing more than plays only pays off if you find out what you sat on.
        expect(screen.getByText('The ones that got away')).toBeTruthy();
        expect(screen.getByText('Temptation')).toBeTruthy();
    });
});
