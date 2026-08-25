import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Contrast, measured rather than eyeballed.
 *
 * The design ships a contrast table and this is it, executable. Every number
 * below appears in the handoff; if a token moves, the pairing it was chosen
 * for fails here rather than six months later on somebody's laptop in a bar.
 *
 * The rule the table encodes: **the hot colour is a fill, not an ink.**
 * `--signal` only ever has to read as a *shape* — a key, an avatar, a timer
 * block — so it is held to the 3:1 that non-text graphics need. Red used as
 * *words* is `--signal-text`, which is darkened and held to the full 4.5.
 */
const css = readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf8');

function token(name: string): string {
    const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
    if (!match) throw new Error(`missing colour token --${name}`);
    return match[1];
}

function channel(value: number): number {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
    const full = hex.length === 4 ? `#${[...hex.slice(1)].map(c => c + c).join('')}` : hex;
    const [r, g, b] = [1, 3, 5].map(i => parseInt(full.slice(i, i + 2), 16));
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/** [foreground, background, minimum, why]. */
const PAIRS: Array<[string, string, number, string]> = [
    ['ink', 'bone', 7, 'body text on the page'],
    ['ink', 'paper', 7, 'body text on a row'],
    ['ink-2', 'paper', 4.5, 'every 11px mono annotation'],
    ['ink-2', 'bone', 4.5, 'annotation on the page'],
    ['signal', 'bone', 3, 'the hot colour as a fill — never as small text'],
    ['signal-text', 'paper', 4.5, 'red used as words'],
    ['signal-text', 'bone', 4.5, 'red used as words, on the page'],
    ['signal-ink', 'signal', 4.5, "the primary key's label"],
    ['on-ink', 'ink', 7, 'the reversed DJ band'],
    ['on-ink-2', 'ink', 4.5, 'secondary text on ink'],
    ['redact-label', 'redact', 4.5, 'the SEALED legend on a bar'],
];

describe('colour contrast', () => {
    it.each(PAIRS)('%s on %s clears %s:1 (%s)', (fg, bg, min) => {
        expect(Number(contrast(token(fg), token(bg)).toFixed(2))).toBeGreaterThanOrEqual(min);
    });

    it('keeps the two paper tones apart, so a row reads as raised off the page', () => {
        // They are close on purpose — this is paper on paper, not a panel on a
        // background — but they must not be the same colour.
        expect(luminance(token('paper'))).toBeGreaterThan(luminance(token('bone')));
    });

    it('keeps a redaction bar darker than the ink it sits among', () => {
        // A bar that is *lighter* than the text around it reads as a highlight.
        // It has to read as something laid over the page.
        expect(luminance(token('redact'))).toBeLessThan(luminance(token('ink')));
    });

    it('keeps a separate, darker red for words', () => {
        // `--signal` measures 4.6:1 on the page — fine for a fill and for text
        // at 19px and up, but the product sets red at 11px in hint copy and
        // failed-lookup labels. `--signal-text` exists for exactly that, so the
        // invariant worth guarding is that it stays the darker of the two.
        expect(luminance(token('signal-text'))).toBeLessThan(luminance(token('signal')));
        expect(contrast(token('signal-text'), token('paper'))).toBeGreaterThanOrEqual(4.5);
    });
});
