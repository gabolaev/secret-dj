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
    { id: 'p1', name: 'Ana', isHost: true, presence: 'online', submitted: 3, ready: true, score: 12 },
    { id: 'p2', name: 'Bo', isHost: false, presence: 'online', submitted: 3, ready: true, score: 0 },
  ],
  you: { id: 'p1', name: 'Ana', isHost: true, tracks: [] },
  round: {
    number: 3, total: 6,
    track: { id: 't', url: 'https://open.spotify.com/track/abc', title: 'X', service: 'Spotify', metadata: 'ready', claim: { id: 'none' } },
    isMine: false, myAnswer: { like: 4, heard: false, popular: false, moved: false },
    answersIn: 2, answersExpected: 2, votesIn: 1, votersExpected: 2,
    endsAt: Date.now() + 60_000, isReady: false, myDone: false, doneIn: 0, doneExpected: 2,
    canVote: true, canAnswer: true,
  },
  history: [], setlistLength: 6, now: Date.now(),
};

describe('round markup', () => {
  it('captions the player with the title and a way out to the service', () => {
    const { container } = render(<I18nProvider><RoundScreen view={view} game={game} /></I18nProvider>);

    const now = container.querySelector('.now')!;
    expect(now.querySelector('.now__player')).toBeTruthy();
    expect(now.querySelector('.now__title')!.textContent).toBe('X');
    expect(now.querySelector('.now__service')!.getAttribute('alt')).toBe('Spotify');
    expect(now.querySelector('.now__open')!.getAttribute('href')).toBe('https://open.spotify.com/track/abc');
  });

  it('shows nothing of the DJ, their claim or anyone else\'s answers before the reveal', () => {
    const { container } = render(<I18nProvider><RoundScreen view={view} game={game} /></I18nProvider>);

    expect(container.querySelector('.reveal')).toBeNull();
    expect(container.querySelector('.answers')).toBeNull();
    // Only you and the one other player are named, and only as guess options.
    const named = [...container.querySelectorAll('.pick .chip')].map(chip => chip.textContent);
    expect(named).toEqual(['BBo']);
    // Progress is a count, never a list of who is done.
    expect(container.querySelector('.answer-card__foot')!.textContent).toContain('0 of 2 done');
  });

  it('marks only the number you chose on the rating scale', () => {
    const { container } = render(<I18nProvider><RoundScreen view={view} game={game} /></I18nProvider>);

    const likes = [...container.querySelectorAll('.rate__key')];
    expect(likes).toHaveLength(6);
    expect(likes.map(button => button.className.includes('is-active'))).toEqual([
      false, false, false, false, true, false,
    ]);
  });
});
