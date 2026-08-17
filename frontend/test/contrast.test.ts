import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Contrast, measured rather than eyeballed.
 *
 * The previous skin set mid-tone text on gradients, which reads fine in the
 * editor and badly on a real screen. Every gradient endpoint is a token now,
 * so each pairing can be checked against the *worst* end of its ramp.
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

/**
 * [foreground, background, minimum, why].
 *
 * There is one text context now — light on dark — so every pairing is checked
 * against all three surface rungs. The previous design had two contexts and
 * every legibility bug came from a colour crossing between them.
 */
const SURFACES = ['bg', 'surface', 'surface-2', 'surface-3'] as const;

const PAIRS: Array<[string, string, number, string]> = [
    ...SURFACES.map(s => ['text', s, 7, 'body text'] as [string, string, number, string]),
    ...SURFACES.map(s => ['muted', s, 4.5, 'secondary text'] as [string, string, number, string]),
    ...SURFACES.map(s => ['faint', s, 3, 'captions and meta'] as [string, string, number, string]),
    ['accent', 'surface', 4.5, 'accent text and figures'],
    ['heart', 'surface', 4.5, 'heart counts'],
    ['detective', 'surface', 4.5, 'detective scores'],
    ['good', 'surface', 4.5, 'correct guesses'],
    ['bad', 'surface', 4.5, 'errors'],
    ['accent-ink', 'accent', 7, 'label on the primary button'],
    // The display is its own darker panel.
    ['screen-ink', 'screen', 7, 'primary readout'],
    ['screen-dim', 'screen', 4.5, 'readout captions — dim in feel, not in legibility'],
];

describe('colour contrast', () => {
    it.each(PAIRS)('%s on %s clears %s:1 (%s)', (fg, bg, min) => {
        expect(Number(contrast(token(fg), token(bg)).toFixed(2))).toBeGreaterThanOrEqual(min);
    });

    it('keeps the surface ladder monotonic, so depth reads as depth', () => {
        const steps = SURFACES.map(name => luminance(token(name)));
        for (let i = 1; i < steps.length; i++) {
            expect(steps[i], SURFACES[i]).toBeGreaterThan(steps[i - 1]);
        }
    });
});
