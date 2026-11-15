import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Contrast, measured rather than eyeballed. If a token moves, its pairing fails here. */
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
    ['text', 'bg', 7, 'body text on the page'],
    ['text', 'surface-2', 7, 'body text on a raised row'],
    ['text-2', 'surface', 4.5, 'secondary text on a card'],
    ['text-2', 'surface-2', 4.5, 'secondary text on a row'],
    ['text-3', 'surface', 4.5, 'small tertiary text on a card'],
    ['text-3', 'surface-2', 4.5, 'small tertiary text on a row'],
    ['accent', 'surface', 4.5, 'the accent used as words'],
    ['accent-ink', 'accent', 4.5, "the primary button's label"],
    ['good', 'surface', 4.5, 'a correct guess'],
    ['bad', 'surface', 4.5, 'an error message'],
];

describe('colour contrast', () => {
    it.each(PAIRS)('%s on %s clears %s:1 (%s)', (fg, bg, min) => {
        expect(Number(contrast(token(fg), token(bg)).toFixed(2))).toBeGreaterThanOrEqual(min);
    });

    it('steps the surfaces up from the page, so a card reads as raised', () => {
        const steps = ['bg', 'surface', 'surface-2', 'surface-3'].map(name => luminance(token(name)));
        expect([...steps].sort((a, b) => a - b)).toEqual(steps);
    });
});
