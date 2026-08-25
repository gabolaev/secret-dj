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
  it('quarantines the embed rather than trying to blend it', () => {
    const { container } = render(<I18nProvider><RoundScreen view={view} game={game} /></I18nProvider>);

    // A printed caption strip over an ink passe-partout. Framing a foreign
    // object admits that it is foreign; blending it is how you get a design
    // that only works for one provider.
    const frame = container.querySelector('.embed-frame')!;
    expect(frame.querySelector('.embed-frame__strip')!.textContent).toContain('Now playing');
    expect(frame.querySelector('.embed-frame__strip')!.textContent).toContain('Spotify');
    expect(frame.querySelector('.embed-frame__mat')).toBeTruthy();
    // The title is ours, printed under the frame, not inside it.
    expect(frame.querySelector('.embed-frame__name')!.textContent).toBe('X');

    // No leftovers from the hardware pass.
    expect(container.querySelector('.win, .bench, .knob, .eq, .matrix, .display')).toBeNull();
  });

  it('seals what is withheld and leaves the rest plainly readable', () => {
    const { container } = render(<I18nProvider><RoundScreen view={view} game={game} /></I18nProvider>);

    // The three withheld things are all present at full size and all covered.
    // Nothing here is a placeholder waiting to be swapped: the reveal lifts
    // these covers off, so the round and the reveal are the same page.
    const covered = [...container.querySelectorAll('.redact')];
    expect(covered.length).toBeGreaterThanOrEqual(3);
    for (const node of covered) {
      expect(node.getAttribute('data-open')).toBe('false');
      expect(node.querySelector('.redact__cover')).toBeTruthy();
    }

    // The DJ band is the size it will be when it opens, and the bar says both
    // what it is hiding and when it will stop.
    const band = container.querySelector('.band')!;
    expect(band.querySelector('.redact__legend')!.textContent).toContain('One of the 2 of you');
    // Counts, never names.
    expect(container.querySelector('.label')!.textContent).not.toContain('Bo');
  });

  it('lights the rating scale up to the number you chose', () => {
    const { container } = render(<I18nProvider><RoundScreen view={view} game={game} /></I18nProvider>);

    // Zero through five. Everything up to your answer is inked in, so the row
    // reads as a level rather than as six unrelated buttons.
    const likes = [...container.querySelectorAll('.rate__key')];
    expect(likes).toHaveLength(6);
    expect(likes.map(button => button.className.includes('is-lit'))).toEqual([
      false, true, true, true, true, false,
    ]);
    expect(likes[4].className).toContain('is-active');
  });
});
