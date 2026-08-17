import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The skin's type is small by nature — pixel and LCD faces at chrome sizes —
 * so it is easy to drift back into unreadable territory one hardcoded value at
 * a time. Sizes must come from the scale, and the scale has a floor.
 */
const theme = readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');

function scale(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [, name, value] of theme.matchAll(/--(fs-[a-z-]+):\s*(\d+)px/g)) {
        out[name] = Number(value);
    }
    return out;
}

describe('type scale', () => {
    it('defines every step', () => {
        const sizes = scale();
        // Four. A scale with a step per component is not a scale.
        expect(Object.keys(sizes).sort()).toEqual(['fs-base', 'fs-hero', 'fs-lg', 'fs-micro']);
    });

    it('never drops below a legible floor', () => {
        for (const [name, size] of Object.entries(scale())) {
            expect(size, name).toBeGreaterThanOrEqual(10);
        }
    });

    it('keeps the steps clearly apart, so each has an obvious job', () => {
        const sizes = scale();
        expect(sizes['fs-base']).toBeGreaterThan(sizes['fs-micro'] * 1.2);
        expect(sizes['fs-lg']).toBeGreaterThan(sizes['fs-base'] * 1.2);
        expect(sizes['fs-hero']).toBeGreaterThan(sizes['fs-lg'] * 1.5);
    });

    it('confines the dot-matrix face to the room code', () => {
        // It is a display face, not a UI face. Letting it loose on prose is
        // what made Cyrillic unreadable, so its blast radius stays this small.
        const app = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
        const blocks = (theme + app).split(/(?<=\})\n/);
        const escaped = blocks
            // `var(--font-display)`, not the `:root` declaration that defines it.
            .filter(block => /^[^{]*\{[^}]*var\(--font-display\)/.test(block))
            .map(block => block.split('{')[0].trim())
            .filter(selector => !/\.(input--code|shell__code-value)/.test(selector));
        expect(escaped, 'dot-matrix face used outside the room code').toEqual([]);
    });

    it('has no hardcoded font sizes left in either stylesheet', () => {
        for (const [label, css] of [
            ['theme.css', theme],
            ['app.css', app],
        ] as const) {
            const strays = [...css.matchAll(/font-size:\s*\d+px|font:\s*\d+\s+\d+px/g)].map(m => m[0]);
            expect(strays, label).toEqual([]);
        }
    });
});
