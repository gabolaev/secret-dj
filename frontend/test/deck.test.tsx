// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { GameView } from '@secret-dj/common';
import { I18nProvider } from '../src/i18n';
import { RoundScreen } from '../src/screens/RoundScreen';

const noop = () => Promise.resolve({ ok: true } as never);
const game = new Proxy({}, { get: () => noop }) as never;

const view: GameView = {
  id: 'K7QM2', phase: 'listening',
  settings: { tracksPerPlayer: 3, tracksPlayedPerPlayer: 2, guessingEnabled: true },
  players: [
    { id: 'p1', name: 'Ana', isHost: true, presence: 'online', submitted: 3, ready: true, scores: { selector: 2, detective: 1 } },
    { id: 'p2', name: 'Bo', isHost: false, presence: 'online', submitted: 3, ready: true, scores: { selector: 0, detective: 0 } },
  ],
  you: { id: 'p1', name: 'Ana', isHost: true, tracks: [], wallet: { heartsLeft: 2, heartBudget: 3, anthemSpent: false } },
  round: {
    number: 3, total: 6,
    track: { id: 't', url: 'https://open.spotify.com/track/abc', title: 'X', service: 'Spotify', metadata: 'ready' },
    isMine: false, myReaction: 'heart', heartCount: 2, anthemCount: 1,
    votesIn: 1, votersExpected: 2, canVote: true, canReact: true,
  },
  history: [], setlistLength: 6, now: Date.now(),
};

describe('deck markup', () => {
  it('carries position and live counts in the card header, not a panel', () => {
    const { container } = render(<I18nProvider><RoundScreen view={view} game={game} /></I18nProvider>);

    // The round is one card; the header is where the context lives.
    const bar = container.querySelector('.win__bar')!;
    expect(bar.querySelector('.win__title')!.textContent).toBe('Track 3 of 6');
    expect(bar.querySelector('.stat--heart')!.textContent).toContain('2');
    expect(bar.querySelector('.stat--anthem')!.textContent).toContain('1');
    expect(bar.querySelector('.stats')!.textContent).toContain('1/2');

    // The player, with nothing dressed up around it.
    expect(container.querySelector('.screen')).toBeTruthy();

    // No leftovers from the skeuomorphic pass.
    expect(container.querySelector('.matrix, .display, .spectrum, .slider, .digits')).toBeNull();

    // Active reaction, and every control row in a rack rather than its own card.
    expect(container.querySelector('.react__knob--heart')!.className).toContain('is-active');
    expect(container.querySelectorAll('.rack').length).toBeGreaterThanOrEqual(2);
  });
});
